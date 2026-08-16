import { refineCinematicTimeline } from './timelineDirector.js';

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
    action: /action|chase|aggressive|fast|race|speed|pursuit|fight|battle|adventure/.test(p),
    trailer: /trailer|cinematic|film|movie|teaser|commercial|advert|promo/.test(p),
    reveal: /reveal|launch|introduction|introduce|unveil|showcase/.test(p),
    dark: /dark|moody|night|dramatic|gritty|noir|mysterious/.test(p),
    epic: /epic|huge|massive|blockbuster|monumental|spectacular/.test(p),
    game: /game|open world|gta|grand theft|gaming/.test(p),
    horror: /horror|scary|creepy|eerie|terrifying|suspense/.test(p),
    funny: /funny|comedy|comic|humorous|meme/.test(p),
    emotional: /emotional|romantic|beautiful|heartfelt|nostalgic|sentimental/.test(p),
    energetic: /energetic|punchy|viral|tiktok|reel|shorts|high energy/.test(p)
  };
}

function subjectLabel(analysis) {
  const subject = analysis?.subject || {};
  return text(subject.description)
    || text(subject.primarySubject)
    || text(subject.motorcycleModel)
    || text(analysis?.subjectDescription)
    || text(analysis?.contentType)
    || 'the uploaded media';
}

function purposeFor(moment, index, total, mode) {
  const explicit = text(moment?.purpose);
  if (explicit) return explicit;
  const s = [moment?.description, moment?.reason, moment?.action, moment?.event].filter(Boolean).join(' ').toLowerCase();
  if (index === 0) return 'opening';
  if (index === total - 1) return 'hero-ending';
  if (mode.funny && /reaction|expression|unexpected|fail|surprise/.test(s)) return 'payoff';
  if (mode.action || /action|accelerat|riding|corner|passing|speed|movement|chase|fight|impact/.test(s)) return 'action';
  if (mode.reveal || /reveal|profile|three-quarter|show|unveil|detail/.test(s)) return 'reveal';
  if (/detail|close-up|macro|texture|face|eyes|object|product/.test(s)) return 'detail';
  if (mode.emotional || /emotion|smile|laugh|sad|beautiful|sunset|landscape/.test(s)) return 'emotional-beat';
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
  if (purpose === 'action' || mode.action || mode.energetic) return index % 2 ? 'pan-right' : 'slow-push';
  if (purpose === 'hero-ending') return 'slow-push';
  if (purpose === 'detail') return index % 2 ? 'slow-push' : 'slow-pull';
  return index % 3 === 1 ? 'pan-right' : 'slow-push';
}

function transitionFor(index, total, mode) {
  if (index === 0) return 'fade-in';
  if (index === total - 1) return 'fade-out';
  if (mode.action || mode.energetic) return index % 2 ? 'whip-right' : 'flash-cut';
  if (mode.dark || mode.horror) return index % 2 ? 'dip-black' : 'crossfade';
  if (mode.funny) return index % 2 ? 'hard-cut' : 'flash-cut';
  return index % 3 === 1 ? 'crossfade' : 'hard-cut';
}

function speedFor(purpose, moment, mode) {
  let speed = num(moment?.speed, 1);
  if (purpose === 'action' || mode.action || mode.energetic) speed = Math.max(speed, 1.12);
  if (purpose === 'hero-ending' || purpose === 'emotional-beat') speed = Math.min(speed, 0.82);
  if (/slow|dramatic|reveal|emotional|beautiful/.test([moment?.description, moment?.reason].join(' ').toLowerCase())) speed = Math.min(speed, 0.78);
  if (mode.funny && purpose === 'payoff') speed = Math.max(speed, 1.08);
  return clamp(speed, 0.5, 1.5);
}

function gradeFor(analysis, moment, options, mode) {
  if (mode.dark || mode.horror) return 'dark-cinematic';
  if (mode.emotional) return text(moment?.colorGrade) || 'warm-cinematic';
  if (mode.funny) return text(moment?.colorGrade) || 'natural';
  return text(moment?.colorGrade)
    || text(analysis?.colorGrade)
    || options.colorGrade
    || 'cinematic';
}

function makeCut(moment, index, total, analysis, options, mode, forcedStart = null, forcedDuration = null) {
  const sourceDuration = clamp(num(analysis?.durationInSeconds, 11), 3, 60);
  const sourceStart = forcedStart == null
    ? clamp(num(moment?.start ?? moment?.startTime, 0), 0, Math.max(0, sourceDuration - 0.5))
    : clamp(forcedStart, 0, Math.max(0, sourceDuration - 0.5));
  const sourceEnd = num(moment?.end ?? moment?.endTime, sourceStart + 3);
  const available = Math.max(0.5, sourceEnd - sourceStart);
  const purpose = purposeFor(moment, index, total, mode);
  const requested = forcedDuration == null ? num(moment?.duration, Math.min(3, available)) : forcedDuration;
  const duration = forcedDuration == null
    ? clamp(Math.min(requested, available), 0.5, Math.min(6, options.targetDuration))
    : clamp(requested, 0.5, Math.min(6, options.targetDuration));
  let overlay = text(moment?.text);
  if (!overlay && index === 0 && analysis?.textRecommendation?.useText) overlay = text(analysis.textRecommendation.text);
  if (purpose === 'hero-ending' && !moment?.text) overlay = '';
  return {
    mediaIndex: Number.isInteger(Number(moment?.mediaIndex)) ? Number(moment.mediaIndex) : 0,
    mediaId: text(moment?.mediaId) || 'video-0',
    startTime: Number(sourceStart.toFixed(2)),
    duration: Number(duration.toFixed(2)),
    purpose,
    speed: speedFor(purpose, moment, mode),
    transition: transitionFor(index, total, mode),
    motionStyle: motionFor(moment, purpose, index, mode),
    motionIntensity: purpose === 'action' ? 1.1 : purpose === 'hero-ending' ? 0.75 : 0.9,
    stabilization: true,
    colorGrade: gradeFor(analysis, moment, options, mode),
    text: overlay,
    textIn: 0.1,
    textOut: 0.88,
    textStyle: 'cinematic'
  };
}

function storyFallback(analysis, options, mode) {
  const sourceDuration = clamp(num(analysis?.durationInSeconds, 11), 3, 60);
  const duration = Math.min(sourceDuration, options.targetDuration);
  const count = duration >= 10 ? 5 : duration >= 7 ? 4 : 3;
  const segment = duration / count;
  const moments = momentsFrom(analysis);
  return Array.from({ length: count }, (_, index) => {
    const fallback = { start: index * segment, end: Math.min(duration, (index + 1) * segment) };
    return makeCut(moments[index] || fallback, index, count, analysis, options, mode, fallback.start, segment);
  });
}

function ensureUsefulDuration(cuts, analysis, options, mode) {
  const sourceDuration = clamp(num(analysis?.durationInSeconds, 11), 3, 60);
  const target = Math.min(sourceDuration, options.targetDuration);
  const current = cuts.reduce((sum, cut) => sum + num(cut.duration, 0), 0);
  if (current >= Math.min(target, 7) || sourceDuration < 7) return cuts;

  const fallback = storyFallback(analysis, options, mode);
  const needed = Math.max(3, Math.min(5, fallback.length));
  const supplemented = [];
  for (let i = 0; i < needed; i += 1) {
    const preferred = cuts[i];
    const segment = fallback[i];
    if (preferred) supplemented.push(preferred);
    else supplemented.push({ ...segment, purpose: i === needed - 1 ? 'hero-ending' : segment.purpose });
  }
  const total = supplemented.reduce((sum, cut) => sum + num(cut.duration, 0), 0);
  if (total < target * 0.7) return fallback;
  return supplemented;
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
  } else {
    cuts = storyFallback(analysis, { ...options, targetDuration }, mode);
  }

  if (cuts.length < 3 || cuts.reduce((sum, cut) => sum + num(cut.duration, 0), 0) < Math.min(targetDuration, 7)) {
    cuts = ensureUsefulDuration(cuts, analysis, { ...options, targetDuration }, mode);
  }

  if (!cuts.length) cuts = storyFallback(analysis, { ...options, targetDuration }, mode);

  cuts = refineCinematicTimeline(cuts, { creativePrompt: options.creativePrompt });

  const duration = cuts.reduce((sum, cut) => sum + num(cut.duration, 0), 0);
  const subject = subjectLabel(analysis);
  const style = mode.action
    ? 'cinematic action edit'
    : mode.horror
      ? 'dark cinematic suspense'
      : mode.game
        ? 'original interactive-world cinematic'
        : mode.funny
          ? 'fast comedic social edit'
          : mode.emotional
            ? 'emotional cinematic story'
            : mode.reveal
              ? 'cinematic reveal edit'
              : mode.trailer
                ? 'cinematic trailer'
                : 'cinematic creative edit';

  return {
    title: `${subject} — AI Cinematic Edit`,
    style,
    creativePrompt: text(options.creativePrompt),
    subject,
    mediaType: text(analysis?.mediaType) || 'mixed-media',
    colorGrade: gradeFor(analysis, {}, options, mode),
    stabilization: true,
    textOverlay: text(analysis?.textRecommendation?.text),
    cuts,
    duration,
    targetDuration,
    source: 'bikeztagram-universal-director',
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
