/* BIKEZTAGRAM AI — autonomous render/inspect/revise controller.
   Rendering remains browser-local; this module only orchestrates the existing
   renderer and QA contracts and produces a revised plan when QA fails.
*/
import { renderProject } from './renderer.js';
import { validateRenderedVideo, buildDirectorQAReport } from './qa.js';

function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

export function revisePlanAfterQA(plan, qa) {
  const cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
  if (!cuts.length) return { plan, changed: false, reasons: ['no-cuts'] };
  const reasons = [];
  const revisedCuts = cuts.map((cut, index) => ({ ...cut }));
  if (qa?.verdict === 'FAIL_TOO_DARK' || number(qa?.frameQA?.averageLuma, 99) < 18) {
    reasons.push('increase-output-luminance');
    revisedCuts.forEach((cut) => {
      const grade = String(cut.colorGrade || '').toLowerCase();
      if (grade.includes('dark')) cut.colorGrade = 'cinematic';
      else cut.colorGrade = cut.colorGrade || 'cinematic';
    });
  }
  if (number(qa?.durationDifferenceSeconds, 0) > 1.5) {
    reasons.push('correct-editorial-duration');
    const expected = Math.max(1, number(qa?.expectedDurationSeconds, plan.targetDuration || plan.duration || 15));
    const actual = Math.max(.1, number(qa?.durationSeconds, expected));
    const scale = expected / actual;
    revisedCuts.forEach((cut) => { cut.duration = Math.max(.5, Number((number(cut.duration, 1) * scale).toFixed(3))); });
  }
  if (qa?.playbackAdvanced === false) reasons.push('renderer-playback-failure');
  if (reasons.length) {
    return { plan: { ...plan, cuts: revisedCuts, qaRevision: { version: 'render-qa-revision-v1', reasons, pass: 1 } }, changed: true, reasons };
  }
  return { plan, changed: false, reasons: [] };
}

export async function renderInspectImprove({ mediaItems, plan, expectedDuration, onProgress, maxAttempts = 2 } = {}) {
  if (!Array.isArray(mediaItems) || !mediaItems.length) throw new Error('Render loop requires media items.');
  if (!plan?.cuts?.length && !plan?.scenes?.length) throw new Error('Render loop requires an executable plan.');
  let currentPlan = plan;
  const attempts = [];
  for (let attempt = 1; attempt <= Math.max(1, Math.min(3, maxAttempts)); attempt += 1) {
    const output = await renderProject(mediaItems, currentPlan, (value) => onProgress?.({ stage: 'render', attempt, value }));
    if (!(output instanceof Blob) || output.size === 0) throw new Error(`Render attempt ${attempt} produced an empty video.`);
    let qa;
    try { qa = await validateRenderedVideo(output, expectedDuration || currentPlan.targetDuration || currentPlan.duration || 15); }
    catch (error) { qa = { passed: false, verdict: 'FAIL_DECODE', error: error?.message || String(error), expectedDurationSeconds: expectedDuration || currentPlan.targetDuration || 15 }; }
    attempts.push({ attempt, bytes: output.size, qa });
    onProgress?.({ stage: 'qa', attempt, value: 100, qa });
    if (qa.passed && qa.verdict !== 'NEEDS_IMPROVEMENT') return { output, plan: currentPlan, qa, attempts, improved: attempt > 1 };
    if (attempt >= Math.max(1, Math.min(3, maxAttempts))) break;
    const revision = revisePlanAfterQA(currentPlan, qa);
    if (!revision.changed) break;
    currentPlan = revision.plan;
    onProgress?.({ stage: 'revise', attempt, value: 100, reasons: revision.reasons });
  }
  const last = attempts[attempts.length - 1];
  return { output: last ? await rerenderFromLast(mediaItems, currentPlan, expectedDuration, onProgress, last.attempt) : null, plan: currentPlan, qa: last?.qa || null, attempts, improved: attempts.length > 1 };
}

async function rerenderFromLast(mediaItems, plan, expectedDuration, onProgress, attempt) {
  const output = await renderProject(mediaItems, plan, (value) => onProgress?.({ stage: 'final-render', attempt: attempt + 1, value }));
  if (!(output instanceof Blob) || output.size === 0) throw new Error('Final revised render produced an empty video.');
  return output;
}

export function buildRenderLoopReport({ file, analysis, productionPlan, renderPlan, result } = {}) {
  const renderQA = result?.qa || null;
  return buildDirectorQAReport({ file, analysis, productionPlan, renderPlan, renderQA });
}
