function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function numberOr(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function firstDefined(...values) { return values.find((value) => value !== undefined && value !== null); }

function normaliseTransition(value, index, total) {
  const text = String(value || '').toLowerCase();
  if (index === 0) return 'fade-in';
  if (index === total - 1 && text.includes('fade')) return 'fade-out';
  if (text.includes('whip') && text.includes('left')) return 'whip-left';
  if (text.includes('whip') && text.includes('right')) return 'whip-right';
  if (text.includes('flash')) return 'flash-cut';
  if (text.includes('dip') || text.includes('black')) return 'dip-black';
  if (text.includes('cross') || text.includes('dissolve')) return 'crossfade';
  if (text.includes('fade')) return 'fade';
  return index % 3 === 1 ? 'crossfade' : 'hard-cut';
}

function inferMotion(value, moment, index) {
  const text = [value, moment?.description, moment?.reason].filter(Boolean).join(' ').toLowerCase();
  if (text.includes('pan left') || text.includes('move left')) return 'pan-left';
  if (text.includes('pan right') || text.includes('move right')) return 'pan-right';
  if (text.includes('tilt up') || text.includes('upward')) return 'tilt-up';
  if (text.includes('tilt down') || text.includes('downward')) return 'tilt-down';
  if (text.includes('pull back') || text.includes('pull-out') || text.includes('pull out')) return 'slow-pull';
  if (text.includes('push in') || text.includes('push-in') || text.includes('push')) return 'slow-push';
  if (text.includes('orbit') || text.includes('arc')) return index % 2 === 0 ? 'slow-push' : 'pan-right';
  if (text.includes('static') || text.includes('locked')) return 'static';
  return index % 3 === 1 ? 'pan-right' : 'slow-push';
}

function inferPurpose(moment, index, total) {
  const explicit = String(moment?.purpose || '').trim();
  if (explicit) return explicit;
  const text = [moment?.description, moment?.reason].filter(Boolean).join(' ').toLowerCase();
  if (index === 0) return 'opening';
  if (index === total - 1) return 'hero-ending';
  if (text.includes('action') || text.includes('acceleration') || text.includes('corner') || text.includes('riding') || text.includes('passing')) return 'action';
  if (text.includes('reveal') || text.includes('three-quarter') || text.includes('side profile')) return 'reveal';
  if (text.includes('detail') || text.includes('exhaust') || text.includes('tank') || text.includes('front')) return 'detail';
  return 'cinematic';
}

function inferSpeed(recommendation, moment, purpose) {
  let speed = numberOr(moment?.speed, numberOr(recommendation?.speed, 1));
  speed = clamp(speed, 0.5, 1.5);
  const text = [moment?.description, moment?.reason].filter(Boolean).join(' ').toLowerCase();
  if (recommendation?.slowMotion && speed >= 0.95) speed = 0.65;
  if (purpose === 'action' || text.includes('fast') || text.includes('acceleration')) speed = Math.max(speed, 1.05);
  if (purpose === 'hero-ending' && recommendation?.slowMotion) speed = Math.min(speed, 0.72);
  return clamp(speed, 0.5, 1.5);
}

function getMoments(analysis) {
  if (Array.isArray(analysis?.bestMoments)) return analysis.bestMoments;
  if (Array.isArray(analysis?.cuts)) return analysis.cuts;
  if (Array.isArray(analysis?.plan?.cuts)) return analysis.plan.cuts;
  return [];
}

function makeCut({ startTime, duration, purpose, index, total, moment = {}, recommendation = {}, transitionRecommendation = '', motionRecommendation = '', analysis, options, text = '' }) {
  const motion = inferMotion([moment.motionStyle, moment.motion, motionRecommendation, analysis?.shot?.cameraMovement].filter(Boolean).join(' '), moment, index);
  const speed = inferSpeed(recommendation, moment, purpose);
  return {
    mediaIndex: 0,
    mediaId: 'video-0',
    startTime: Math.max(0, Number(startTime.toFixed(2))),
    duration: Number(clamp(duration, 0.5, 8).toFixed(2)),
    purpose,
    speed,
    transition: normaliseTransition(moment.transition || transitionRecommendation, index, total),
    motionStyle: motion,
    motionIntensity: purpose === 'hero-ending' ? 0.75 : purpose === 'action' ? 1.1 : 0.9,
    stabilization: true,
    colorGrade: firstDefined(moment.colorGrade, analysis?.colorGrade, options.colorGrade, 'dark-cinematic'),
    text,
    textIn: index === 0 ? 0.10 : 0.14,
    textOut: index === 0 ? 0.82 : 0.88,
    textStyle: 'cinematic'
  };
}

function buildCutsFromFinalDirector(analysis, options) {
  const directed = analysis?.aiEditPlan;
  if (!directed?.cuts?.length) return null;
  const maxCuts = clamp(numberOr(options.maxCuts, 8), 1, 30);
  const sourceMoments = getMoments(analysis);
  const cuts = [];
  for (let index = 0; index < directed.cuts.length && cuts.length < maxCuts; index++) {
    const directedCut = directed.cuts[index] || {};
    const momentIndex = Number(directedCut.momentIndex);
    const source = Number.isInteger(momentIndex) && sourceMoments[momentIndex] ? sourceMoments[momentIndex] : sourceMoments[index] || {};
    const sourceStart = numberOr(source?.start, 0);
    const sourceEnd = numberOr(source?.end, sourceStart + 4);
    const startTime = clamp(numberOr(directedCut.startTime, sourceStart), sourceStart, Math.max(sourceStart, sourceEnd - 0.1));
    const duration = Math.min(clamp(numberOr(directedCut.duration, sourceEnd - startTime), 0.5, 4), Math.max(0.5, sourceEnd - startTime));
    const purpose = String(directedCut.purpose || source?.purpose || 'cinematic');
    cuts.push(makeCut({ startTime, duration, purpose, index, total: directed.cuts.length, moment: { ...source, ...directedCut }, recommendation: analysis?.editingRecommendation || {}, transitionRecommendation: directedCut.transition || source?.transition, motionRecommendation: directedCut.motionStyle || source?.motionStyle, analysis, options, text: String(directedCut.text || source?.text || '') }));
  }
  return cuts.length ? cuts : null;
}

function buildStoryFallbackCuts(analysis, options) {
  const sourceDuration = clamp(numberOr(analysis?.durationInSeconds, 11), 3, 60);
  const targetDuration = clamp(numberOr(options.targetDuration, 15), 5, 60);
  const usableDuration = Math.min(sourceDuration, targetDuration);
  const moments = getMoments(analysis);
  const recommendation = analysis?.editingRecommendation || {};
  const transitionRecommendation = analysis?.transitionRecommendation || '';
  const motionRecommendation = analysis?.motionRecommendation || '';
  const best = moments.slice(0, Math.max(1, Math.min(6, moments.length)));
  const desiredCount = Math.min(numberOr(options.maxCuts, 8), usableDuration >= 9 ? 5 : usableDuration >= 6 ? 4 : 3);
  const slots = [];
  for (let i = 0; i < desiredCount; i++) {
    const segment = usableDuration / desiredCount;
    const start = i === desiredCount - 1 ? Math.max(0, usableDuration - segment) : i * segment;
    const duration = Math.max(0.5, Math.min(segment * 1.05, usableDuration - start));
    slots.push({ start, duration });
  }

  const cuts = slots.map((slot, index) => {
    const moment = best[index] || {};
    const momentStart = numberOr(firstDefined(moment.start, moment.startTime), NaN);
    const momentEnd = numberOr(firstDefined(moment.end, moment.endTime), NaN);
    const hasValidMoment = Number.isFinite(momentStart) && Number.isFinite(momentEnd) && momentEnd > momentStart;
    const startTime = hasValidMoment ? clamp(momentStart, 0, Math.max(0, sourceDuration - 0.5)) : slot.start;
    const maxMomentDuration = hasValidMoment ? Math.min(4, momentEnd - startTime) : slot.duration;
    const purpose = inferPurpose(moment, index, desiredCount);
    let text = String(moment.text || '').trim();
    if (!text && index === 0 && analysis?.textRecommendation?.useText) text = String(analysis.textRecommendation.text || '').trim();
    if (purpose === 'hero-ending' && index > 0 && !moment.text) text = '';
    return makeCut({ startTime, duration: Math.min(slot.duration, Math.max(0.5, maxMomentDuration)), purpose, index, total: desiredCount, moment, recommendation, transitionRecommendation, motionRecommendation, analysis, options, text });
  });
  return cuts;
}

function buildCutsFromMoments(analysis, options) {
  const moments = getMoments(analysis);
  if (!moments.length) return buildStoryFallbackCuts(analysis, options);
  const recommendation = analysis?.editingRecommendation || {};
  const textRecommendation = analysis?.textRecommendation || {};
  const transitionRecommendation = analysis?.transitionRecommendation || '';
  const motionRecommendation = analysis?.motionRecommendation || '';
  const maxCuts = clamp(numberOr(options.maxCuts, 8), 1, 30);
  const targetDuration = clamp(numberOr(options.targetDuration, 15), 5, 60);
  const cuts = [];
  let totalDuration = 0;
  for (let index = 0; index < moments.length && cuts.length < maxCuts; index++) {
    const moment = moments[index] || {};
    const start = Math.max(0, numberOr(firstDefined(moment.start, moment.startTime), 0));
    const end = numberOr(firstDefined(moment.end, moment.endTime), NaN);
    let duration = Number.isFinite(end) && end > start ? end - start : numberOr(recommendation.suggestedDuration, 2.5);
    duration = clamp(duration, 0.5, 8);
    const remaining = targetDuration - totalDuration;
    if (remaining <= 0 && cuts.length >= 3) break;
    if (remaining > 0) duration = Math.min(duration, remaining);
    if (duration < 0.5 && cuts.length > 0) break;
    const purpose = inferPurpose(moment, index, moments.length);
    let text = String(moment.text || '').trim();
    if (!text && index === 0 && textRecommendation.useText) text = String(textRecommendation.text || '').trim();
    if (purpose === 'hero-ending' && index > 0 && !moment.text) text = '';
    cuts.push(makeCut({ startTime: start, duration, purpose, index, total: Math.min(moments.length, maxCuts), moment, recommendation, transitionRecommendation, motionRecommendation, analysis, options, text }));
    totalDuration += duration;
  }
  if (cuts.length < 3 && numberOr(analysis?.durationInSeconds, 0) >= 3) return buildStoryFallbackCuts(analysis, options);
  return cuts;
}

export function createAIEditPlan(analysis, options = {}) {
  const targetDuration = clamp(numberOr(options.targetDuration, 15), 5, 60);
  const finalDirectorCuts = buildCutsFromFinalDirector(analysis, options);
  const cuts = finalDirectorCuts || buildCutsFromMoments(analysis, { ...options, targetDuration });
  if (!cuts.length) cuts.push({ mediaIndex: 0, mediaId: 'video-0', startTime: 0, duration: Math.min(targetDuration, 3), purpose: 'cinematic', speed: 1, transition: 'fade-in', motionStyle: 'slow-push', motionIntensity: 0.8, stabilization: true, colorGrade: options.colorGrade || 'dark-cinematic', text: '', textIn: 0.1, textOut: 0.9, textStyle: 'cinematic' });
  const duration = cuts.reduce((sum, cut) => sum + numberOr(cut.duration, 0), 0);
  return { title: analysis?.subject?.motorcycleModel ? `${analysis.subject.motorcycleModel} — AI Cinematic Edit` : 'AI Cinematic Motorcycle Edit', style: analysis?.aiEditPlan?.style || 'cinematic motorcycle trailer', colorGrade: analysis?.aiEditPlan?.colorGrade || analysis?.colorGrade || options.colorGrade || 'dark-cinematic', stabilization: true, textOverlay: analysis?.aiEditPlan?.textOverlay || (analysis?.textRecommendation?.useText ? String(analysis.textRecommendation.text || '') : ''), cuts, duration, targetDuration, source: finalDirectorCuts ? 'gemini-final-director' : 'bikeztagram-local-director', generatedAt: new Date().toISOString() };
}

export function describeAIEditPlan(plan) {
  if (!plan?.cuts?.length) return 'No AI edit plan available.';
  const duration = plan.cuts.reduce((sum, cut) => sum + numberOr(cut.duration, 0), 0);
  const motionCount = plan.cuts.filter((cut) => String(cut.motionStyle || '').toLowerCase() !== 'static').length;
  const transitions = plan.cuts.filter((cut) => String(cut.transition || 'hard-cut') !== 'hard-cut').length;
  return `AI edit plan: ${plan.cuts.length} cuts • Total duration: ${duration.toFixed(1)}s • ${motionCount} cinematic motion shots • ${transitions} styled transitions • Source: ${plan.source || 'AI'}`;
}