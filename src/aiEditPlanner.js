function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function text(value) {
  return String(value || '').trim();
}

function momentsFrom(analysis) {
  if (Array.isArray(analysis?.bestMoments)) return analysis.bestMoments;
  if (Array.isArray(analysis?.cuts)) return analysis.cuts;
  if (Array.isArray(analysis?.plan?.cuts)) return analysis.plan.cuts;
  return [];
}

function creativeMode(prompt) {
  const p = text(prompt).toLowerCase();
  return {
    action: /action|chase|aggressive|fast|race|speed|pursuit/.test(p),
    trailer: /trailer|cinematic|film|movie|teaser/.test(p),
    reveal: /reveal|launch|introduction|introduce/.test(p),
    dark: /dark|moody|night|dramatic|gritty/.test(p),
    epic: /epic|huge|massive|blockbuster/.test(p),
    game: /game|open world|gta|grand theft/.test(p),
    horror: /horror|scary|creepy|eerie/.test(p)
  };
}

function purposeFor(moment, index, total, mode) {
  const explicit = text(moment?.purpose);
  if (explicit) return explicit;
  const s = [moment?.description, moment?.reason].filter(Boolean).join(' ').toLowerCase();
  if (index === 0) return 'opening';
  if (index === total - 1) return 'hero-ending';
  if (mode.action || /action|accelerat|riding|corner|passing|speed/.test(s)) return 'action';
  if (mode.reveal || /reveal|profile|three-quarter/.test(s)) return 'reveal';
  if (/detail|tank|exhaust|front|wheel|engine/.test(s)) return 'detail';
  return 'cinematic-build';
}

function motionFor(moment, purpose, index, mode) {
  const s = [moment?.motionStyle, moment?.motion, moment?.description, moment?.reason].filter(Boolean).join(' ').toLowerCase();
  if (/pan left|move left/.test(s)) return 'pan-left';
  if (/pan right|move right/.test(s)) return 'pan-right';
  if (/tilt up|upward/.test(s)) return 'tilt-up';
  if (/tilt down|downward/.test(s)) return 'tilt-down';
  if (/pull back|pull out|zoom out/.test(s)) return 'slow-pull';
  if (/push in|push-in|zoom in/.test(s)) return 'slow-push';
  if (purpose === 'action' || mode.action) return index % 2 ? 'pan-right' : 'slow-push';
  if (purpose === 'hero-ending') return 'slow-push';
  return index % 3 === 1 ? 'pan-right' : 'slow-push';
}

function transitionFor(index, total, mode) {
  if (index === 0) return 'fade-in';
  if (index === total - 1) return 'fade-out';
  if (mode.action) return index % 2 ? 'whip-right' : 'flash-cut';
  if (mode.dark || mode.horror) return index % 2 ? 'dip-black' : 'crossfade';
  return index % 3 === 1 ? 'crossfade' : 'hard-cut';
}

function speedFor(purpose, moment, mode) {
  let speed = num(moment?.speed, 1);
  if (purpose === 'action' || mode.action) speed = Math.max(speed, 1.12);
  if (purpose === 'hero-ending') speed = Math.min(speed, 0.78);
  if (/slow|dramatic|reveal/.test([moment?.description, moment?.reason].join(' ').toLowerCase())) speed = Math.min(speed, 0.78);
  return clamp(speed, 0.5, 1.5);
}

function makeCut(moment, index, total, analysis, options, mode) {
  const sourceDuration = clamp(num(analysis?.durationInSeconds, 11), 3, 60);
  const sourceStart = clamp(num(moment?.start ?? moment?.startTime, 0), 0, Math.max(0, sourceDuration - 0.5));
  const sourceEnd = num(moment?.end ?? moment?.endTime, sourceStart + 3);
  const available = Math.max(0.5, sourceEnd - sourceStart);
  const purpose = purposeFor(moment, index, total, mode);
  const requested = num(moment?.duration, Math.min(3, available));
  const duration = clamp(Math.min(requested, available), 0.5, Math.min(6, options.targetDuration));
  let overlay = text(moment?.text);
  if (!overlay && index === 0 && analysis?.textRecommendation?.useText) overlay = text(analysis.textRecommendation.text);
  if (purpose === 'hero-ending' && !moment?.text) overlay = '';
  return {
    mediaIndex: 0,
    mediaId: 'video-0',
    startTime: Number(sourceStart.toFixed(2)),
    duration: Number(duration.toFixed(2)),
    purpose,
    speed: speedFor(purpose, moment, mode),
    transition: transitionFor(index, total, mode),
    motionStyle: motionFor(moment, purpose, index, mode),
    motionIntensity: purpose === 'action' ? 1.1 : purpose === 'hero-ending' ? 0.75 : 0.9,
    stabilization: true,
    colorGrade: mode.dark || mode.horror ? 'dark-cinematic' : text(moment?.colorGrade) || text(analysis?.colorGrade) || options.colorGrade || 'dark-cinematic',
    text: overlay,
    textIn: 0.1,
    textOut: 0.88,
    textStyle: 'cinematic'
  };
}

function storyFallback(analysis, options, mode) {
  const duration = Math.min(clamp(num(analysis?.durationInSeconds, 11), 3, 60), options.targetDuration);
  const count = duration >= 10 ? 5 : duration >= 7 ? 4 : 3;
  const segment = duration / count;
  const moments = momentsFrom(analysis);
  return Array.from({ length: count }, (_, index) => {
    const fallback = { start: index * segment, end: Math.min(duration, (index + 1) * segment) };
    return makeCut(moments[index] || fallback, index, count, analysis, options, mode);
  });
}

export function createAIEditPlan(analysis, options = {}) {
  const targetDuration = clamp(num(options.targetDuration, 15), 5, 60);
  const mode = creativeMode(options.creativePrompt);
  const moments = momentsFrom(analysis);
  let cuts = [];

  if (analysis?.aiEditPlan?.cuts?.length) {
    const directed = analysis.aiEditPlan.cuts.slice(0, clamp(num(options.maxCuts, 8), 1, 30));
    cuts = directed.map((directedCut, index) => {
      const sourceIndex = Number.isInteger(Number(directedCut.momentIndex)) ? Number(directedCut.momentIndex) : index;
      const moment = { ...(moments[sourceIndex] || {}), ...directedCut };
      return makeCut(moment, index, directed.length, analysis, { ...options, targetDuration }, mode);
    });
  } else if (moments.length) {
    const limited = moments.slice(0, clamp(num(options.maxCuts, 8), 1, 30));
    cuts = limited.map((moment, index) => makeCut(moment, index, limited.length, analysis, { ...options, targetDuration }, mode));
    if (cuts.length < 3 && num(analysis?.durationInSeconds, 0) >= 3) cuts = storyFallback(analysis, { ...options, targetDuration }, mode);
  } else {
    cuts = storyFallback(analysis, { ...options, targetDuration }, mode);
  }

  if (!cuts.length) cuts = [{ mediaIndex: 0, mediaId: 'video-0', startTime: 0, duration: Math.min(3, targetDuration), purpose: 'opening', speed: 1, transition: 'fade-in', motionStyle: 'slow-push', motionIntensity: 0.8, stabilization: true, colorGrade: options.colorGrade || 'dark-cinematic', text: '', textIn: 0.1, textOut: 0.9, textStyle: 'cinematic' }];

  const duration = cuts.reduce((sum, cut) => sum + num(cut.duration, 0), 0);
  const style = mode.action ? 'cinematic action trailer' : mode.horror ? 'dark cinematic suspense' : mode.game ? 'original open-world game-inspired cinematic' : mode.reveal ? 'cinematic reveal trailer' : 'cinematic motorcycle trailer';
  return {
    title: analysis?.subject?.motorcycleModel ? `${analysis.subject.motorcycleModel} — AI Cinematic Edit` : 'AI Cinematic Edit',
    style,
    creativePrompt: text(options.creativePrompt),
    colorGrade: mode.dark || mode.horror ? 'dark-cinematic' : text(analysis?.colorGrade) || options.colorGrade || 'dark-cinematic',
    stabilization: true,
    textOverlay: text(analysis?.textRecommendation?.text),
    cuts,
    duration,
    targetDuration,
    source: 'bikeztagram-local-director',
    generatedAt: new Date().toISOString()
  };
}

export function describeAIEditPlan(plan) {
  if (!plan?.cuts?.length) return 'No AI edit plan available.';
  const duration = plan.cuts.reduce((sum, cut) => sum + num(cut.duration, 0), 0);
  const motion = plan.cuts.filter((cut) => cut.motionStyle !== 'static').length;
  const transitions = plan.cuts.filter((cut) => cut.transition !== 'hard-cut').length;
  return `AI edit plan: ${plan.cuts.length} cuts • Total duration: ${duration.toFixed(1)}s • ${motion} cinematic motion shots • ${transitions} styled transitions • Source: ${plan.source || 'AI'}`;
}
