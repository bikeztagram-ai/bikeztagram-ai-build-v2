/* BIKEZTAGRAM AI — autonomous render/inspect/revise controller. */
import { renderProject } from './renderer.js';
import { attachGeneratedAudioToVideo } from './finalAudioMux.js';
import { validateRenderedVideo, buildDirectorQAReport } from './qa.js';
function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
export function revisePlanAfterQA(plan, qa) {
  const cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
  if (!cuts.length) return { plan, changed: false, reasons: ['no-cuts'] };
  const reasons = [], revisedCuts = cuts.map((cut) => ({ ...cut }));
  if (qa?.verdict === 'FAIL_TOO_DARK' || number(qa?.frameQA?.averageLuma, 99) < 18) { reasons.push('increase-output-luminance'); revisedCuts.forEach((cut) => { if (String(cut.colorGrade || '').toLowerCase().includes('dark')) cut.colorGrade = 'cinematic'; }); }
  if (qa?.verdict === 'FAIL_DECODE') reasons.push('renderer-decode-failure');
  if (number(qa?.durationDifferenceSeconds, 0) > 1.5) { reasons.push('correct-editorial-duration'); const expected = Math.max(1, number(qa?.expectedDurationSeconds, plan.targetDuration || plan.duration || 15)); const actual = Math.max(.1, number(qa?.durationSeconds, expected)); const scale = expected / actual; revisedCuts.forEach((cut) => { cut.duration = Math.max(.5, Number((number(cut.duration, 1) * scale).toFixed(3))); }); }
  if (qa?.playbackAdvanced === false) reasons.push('renderer-playback-failure');
  return reasons.length ? { plan: { ...plan, cuts: revisedCuts, qaRevision: { version: 'render-qa-revision-v1', reasons, pass: 1 } }, changed: true, reasons } : { plan, changed: false, reasons: [] };
}
export async function renderInspectImprove({ mediaItems, plan, expectedDuration, onProgress, maxAttempts = 2 } = {}) {
  if (!Array.isArray(mediaItems) || !mediaItems.length) throw new Error('Render loop requires media items.');
  if (!plan?.cuts?.length && !plan?.scenes?.length) throw new Error('Render loop requires an executable plan.');
  // Gemini still receives the public Blob URL for analysis, but the browser renderer
  // should prefer the original local File whenever it is available. This avoids making
  // final rendering depend on Blob CORS/range/codec behaviour and keeps the upload layer
  // protected while making the render path deterministic on the user's device.
  const renderMediaItems = mediaItems.map((item) => item?.file ? { ...item, sourceUrl: undefined } : item);
  let currentPlan = plan; const attempts = []; const limit = Math.max(1, Math.min(3, maxAttempts));
  for (let attempt = 1; attempt <= limit; attempt += 1) {
    const rendered = await renderProject(renderMediaItems, currentPlan, (value) => onProgress?.({ stage: 'render', attempt, value }));
    if (!(rendered instanceof Blob) || rendered.size === 0) throw new Error(`Render attempt ${attempt} produced an empty video.`);

    let output = rendered;
    const audioDataUrl = currentPlan?.music?.audioDataUrl || currentPlan?.soundtrack?.audioDataUrl;
    if (audioDataUrl) {
      onProgress?.({ stage: 'audio', attempt, value: 0 });
      const audioResult = await attachGeneratedAudioToVideo(rendered, audioDataUrl, { onProgress: (value) => onProgress?.({ stage: 'audio', attempt, value }) });
      if (audioResult.attached && audioResult.blob?.size) {
        output = audioResult.blob;
        currentPlan = { ...currentPlan, music: { ...(currentPlan.music || {}), finalAudioAttached: true, finalAudioMimeType: audioResult.mimeType, finalAudioDuration: audioResult.duration } };
        onProgress?.({ stage: 'audio', attempt, value: 100 });
      } else {
        currentPlan = { ...currentPlan, music: { ...(currentPlan.music || {}), finalAudioAttached: false, finalAudioWarning: audioResult.reason || 'Audio mux unavailable; visual render preserved.' } };
        console.warn('[RENDER] Generated soundtrack could not be attached:', audioResult.reason || 'unknown reason');
      }
    }

    let qa; try { qa = await validateRenderedVideo(output, expectedDuration || currentPlan.targetDuration || currentPlan.duration || 15); } catch (error) { qa = { passed: false, verdict: 'FAIL_DECODE', error: error?.message || String(error), expectedDurationSeconds: expectedDuration || currentPlan.targetDuration || currentPlan.duration || 15 }; }
    attempts.push({ attempt, bytes: output.size, qa, audioAttached: Boolean(currentPlan?.music?.finalAudioAttached) }); onProgress?.({ stage: 'qa', attempt, value: 100, qa });
    if (qa.passed && qa.verdict === 'PASS') return { output, plan: currentPlan, qa, attempts, improved: attempt > 1 };
    if (attempt >= limit) return { output, plan: currentPlan, qa, attempts, improved: attempt > 1 };
    const revision = revisePlanAfterQA(currentPlan, qa); if (!revision.changed) return { output, plan: currentPlan, qa, attempts, improved: attempt > 1 };
    currentPlan = revision.plan; onProgress?.({ stage: 'revise', attempt, value: 100, reasons: revision.reasons });
  }
  throw new Error('Render quality loop ended without a render result.');
}
export function buildRenderLoopReport({ file, analysis, productionPlan, renderPlan, result } = {}) { return buildDirectorQAReport({ file, analysis, productionPlan, renderPlan, renderQA: result?.qa || null }); }
