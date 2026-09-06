/* BIKEZTAGRAM AI — autonomous render/inspect/revise controller. */
import { renderProject } from './renderer.js';
import { applyAudioBeatSyncToPlan } from './renderAudioBridge.js';
import { attachGeneratedAudioToVideo } from './finalAudioMux.js';
import { validateRenderedVideo, buildDirectorQAReport } from './qa.js';
import { resolveOutputPreset } from './outputPresets.js';
import { transcodeRenderedFilmToPreset } from './outputPresetTranscoder.js';
import { applyDirectorRenderCues } from './directorRenderRuntime.js';
import { evaluateCinematicOutput } from './cinematicQualityEvaluator.js';
function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

export function revisePlanAfterQA(plan, qa) {
  const cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
  if (!cuts.length) return { plan, changed: false, reasons: ['no-cuts'] };
  const reasons = [], revisedCuts = cuts.map((cut) => ({ ...cut }));
  if (qa?.verdict === 'FAIL_TOO_DARK' || number(qa?.frameQA?.averageLuma, 99) < 18) { reasons.push('increase-output-luminance'); revisedCuts.forEach((cut) => { if (String(cut.colorGrade || '').toLowerCase().includes('dark')) cut.colorGrade = 'cinematic'; }); }
  if (qa?.verdict === 'FAIL_DECODE') reasons.push('renderer-decode-failure');
  if (number(qa?.durationDifferenceSeconds, 0) > 1.5) { reasons.push('correct-editorial-duration'); const expected = Math.max(1, number(qa?.expectedDurationSeconds, plan.targetDuration || plan.duration || 15)); const actual = Math.max(.1, number(qa?.durationSeconds, expected)); const scale = expected / actual; revisedCuts.forEach((cut) => { cut.duration = Math.max(.5, Number((number(cut.duration, 1) * scale).toFixed(3))); }); }
  if (qa?.playbackAdvanced === false) reasons.push('renderer-playback-failure');
  if (qa?.verdict === 'FAIL_NO_AUDIO') reasons.push('final-audio-attachment-failed');
  const nextPlan = reasons.length ? { ...plan, cuts: revisedCuts, qaRevision: { version: 'render-qa-revision-v5', reasons, pass: 1 } } : plan;
  return reasons.length ? { plan: applyDirectorRenderCues(nextPlan), changed: true, reasons } : { plan, changed: false, reasons: [] };
}

export function revisePlanAfterCinematicQuality(plan, quality) {
  const cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
  if (!cuts.length || quality?.verdict !== 'REJECT') return { plan, changed: false, reasons: [] };
  const issues = Array.isArray(quality.issues) ? quality.issues : [];
  const revisedCuts = cuts.map((cut, index) => ({ ...cut }));
  const reasons = [];
  if (issues.some((x) => /motion variety/i.test(x))) {
    reasons.push('increase-motion-variety');
    revisedCuts.forEach((cut, index) => { if (!cut.motionStyle) cut.motionStyle = ['static','slow-push','lateral-pan','orbit'][index % 4]; });
  }
  if (issues.some((x) => /transition variety/i.test(x))) {
    reasons.push('increase-transition-variety');
    revisedCuts.forEach((cut, index) => { if (!cut.transition) cut.transition = index === 0 ? 'fade-in' : index === revisedCuts.length - 1 ? 'fade-out' : ['hard-cut','match-cut','impact-cut'][index % 3]; });
  }
  if (issues.some((x) => /duration|pacing/i.test(x))) {
    reasons.push('rebalance-pacing');
    const target = Math.max(3, number(plan.targetDuration || plan.duration, 15));
    const perShot = Math.max(.7, Math.min(4, target / revisedCuts.length));
    revisedCuts.forEach((cut) => { cut.duration = Number(perShot.toFixed(2)); });
  }
  if (issues.some((x) => /hook|opening/i.test(x)) && revisedCuts[0]) { reasons.push('strengthen-hook'); revisedCuts[0].role = 'hook'; revisedCuts[0].purpose = 'hook'; }
  if (issues.some((x) => /ending|payoff/i.test(x)) && revisedCuts.at(-1)) { reasons.push('strengthen-ending'); revisedCuts.at(-1).role = 'hero-ending'; revisedCuts.at(-1).purpose = 'hero-ending'; }
  if (!reasons.length) return { plan, changed: false, reasons: [] };
  return { plan: applyDirectorRenderCues({ ...plan, cuts: revisedCuts, cinematicQualityRevision: { version: 'cinematic-quality-revision-v1', reasons, previousScore: quality.score } }), changed: true, reasons };
}

export async function renderInspectImprove({ mediaItems, plan, expectedDuration, onProgress, maxAttempts = 2 } = {}) {
  if (!Array.isArray(mediaItems) || !mediaItems.length) throw new Error('Render loop requires media items.');
  if (!plan?.cuts?.length && !plan?.scenes?.length) throw new Error('Render loop requires an executable plan.');
  const renderMediaItems = mediaItems.map((item) => item?.file ? { ...item, sourceUrl: undefined } : item);
  let currentPlan = applyDirectorRenderCues(plan); const attempts = []; const limit = Math.max(1, Math.min(3, maxAttempts));
  for (let attempt = 1; attempt <= limit; attempt += 1) {
    currentPlan = applyDirectorRenderCues(currentPlan);
    if (currentPlan?.music?.audioAnalysis || currentPlan?.music?.beatGrid || currentPlan?.soundtrack?.audioAnalysis || currentPlan?.soundtrack?.beatGrid) {
      const beatSync = applyAudioBeatSyncToPlan(currentPlan);
      currentPlan = beatSync.plan;
      onProgress?.({ stage: 'beat-sync', attempt, value: beatSync.enabled ? 100 : 0, beats: beatSync.beats || 0 });
    }
    const rendered = await renderProject(renderMediaItems, currentPlan, (value) => onProgress?.({ stage: 'render', attempt, value }));
    if (!(rendered instanceof Blob) || rendered.size === 0) throw new Error(`Render attempt ${attempt} produced an empty video.`);
    const musicUrl = currentPlan?.music?.audioDataUrl || currentPlan?.soundtrack?.audioDataUrl || currentPlan?.audio?.url;
    let output = rendered;
    let audioAttached = false;
    if (musicUrl) {
      onProgress?.({ stage: 'audio', attempt, value: 0 });
      const audioResult = await attachGeneratedAudioToVideo(rendered, musicUrl, { onProgress: (value) => onProgress?.({ stage: 'audio', attempt, value }) });
      if (audioResult.attached && audioResult.blob?.size) { output = audioResult.blob; audioAttached = true; currentPlan = { ...currentPlan, music: { ...(currentPlan.music || {}), finalAudioAttached: true, finalAudioMimeType: audioResult.mimeType, finalAudioDuration: audioResult.duration } }; }
      else { currentPlan = { ...currentPlan, music: { ...(currentPlan.music || {}), finalAudioAttached: false, finalAudioWarning: audioResult.reason || 'audio-mux-unavailable' } }; }
      onProgress?.({ stage: 'audio', attempt, value: 100, attached: audioAttached });
    }
    const outputPreset = resolveOutputPreset(currentPlan?.outputPreset, currentPlan?.creativePrompt || '');
    if (outputPreset.id !== 'portrait') { onProgress?.({ stage: 'format', attempt, value: 0, preset: outputPreset.id }); output = await transcodeRenderedFilmToPreset(output, outputPreset.id, currentPlan?.creativePrompt || ''); currentPlan = { ...currentPlan, outputPreset: outputPreset.id, outputWidth: outputPreset.width, outputHeight: outputPreset.height, outputAspectRatio: outputPreset.aspectRatio }; onProgress?.({ stage: 'format', attempt, value: 100, preset: outputPreset.id }); }
    else currentPlan = { ...currentPlan, outputPreset: 'portrait', outputWidth: outputPreset.width, outputHeight: outputPreset.height, outputAspectRatio: outputPreset.aspectRatio };
    let qa;
    try { qa = await validateRenderedVideo(output, expectedDuration || currentPlan.targetDuration || currentPlan.duration || 15, { requireAudio: Boolean(musicUrl) }); }
    catch (error) { qa = { passed: false, verdict: 'FAIL_DECODE', error: error?.message || String(error), expectedDurationSeconds: expectedDuration || currentPlan.targetDuration || currentPlan.duration || 15 }; }
    const cinematicQuality = evaluateCinematicOutput(currentPlan, { duration: qa?.durationSeconds, audio: { present: musicUrl ? audioAttached : true, durationAligned: qa?.durationDifferenceSeconds == null || Math.abs(number(qa.durationDifferenceSeconds)) <= 1.5, beatAligned: Boolean(currentPlan?.music?.beatSyncApplied) || undefined } });
    attempts.push({ attempt, bytes: output.size, qa, cinematicQuality, audioExpected: Boolean(musicUrl), audioAttached, beatSyncApplied: Boolean(currentPlan?.music?.beatSyncApplied), outputPreset: outputPreset.id, outputWidth: outputPreset.width, outputHeight: outputPreset.height, directorRuntime: currentPlan?.directorRuntime?.version || null });
    onProgress?.({ stage: 'qa', attempt, value: 100, qa, cinematicQuality });
    currentPlan = { ...currentPlan, cinematicQuality };
    const qaPass = qa.passed && (qa.verdict === 'PASS' || qa.verdict === 'PASS_WITH_DURATION_DIFFERENCE');
    const qualityPass = cinematicQuality.verdict !== 'REJECT';
    if (qaPass && qualityPass) return { output, plan: currentPlan, qa, cinematicQuality, attempts, improved: attempt > 1 };
    if (attempt >= limit) return { output, plan: currentPlan, qa, cinematicQuality, attempts, improved: attempt > 1 };
    const qaRevision = revisePlanAfterQA(currentPlan, qa);
    const qualityRevision = revisePlanAfterCinematicQuality(qaRevision.changed ? qaRevision.plan : currentPlan, cinematicQuality);
    if (!qaRevision.changed && !qualityRevision.changed) return { output, plan: currentPlan, qa, cinematicQuality, attempts, improved: attempt > 1 };
    currentPlan = qualityRevision.changed ? qualityRevision.plan : qaRevision.plan;
    onProgress?.({ stage: 'revise', attempt, value: 100, reasons: [...qaRevision.reasons, ...qualityRevision.reasons] });
  }
  throw new Error('Render quality loop ended without a render result.');
}
export function buildRenderLoopReport({ file, analysis, productionPlan, renderPlan, result } = {}) { return buildDirectorQAReport({ file, analysis, productionPlan, renderPlan, renderQA: result?.qa || null, cinematicQuality: result?.cinematicQuality || null }); }
