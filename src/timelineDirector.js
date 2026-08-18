/* BIKEZTAGRAM AI — universal cinematic timeline director
   Product layer only. This module refines an AI edit plan into a deliberate
   film-style sequence. It never touches Blob, Gemini, upload, or analysis code.

   Story coherence and audio timing are advisory director layers: source footage
   remains authoritative and the renderer still owns final execution safety.
*/

import { buildStoryDirection } from './directorStoryModel.js';
import { buildVisualBeatPlan, nearestBeat } from './audioBeatMap.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const lower = (value) => String(value || '').toLowerCase();

function creativeFlags(prompt) {
  const p = lower(prompt);
  return {
    action: /action|chase|race|speed|pursuit|fight|battle|aggressive|energetic/.test(p),
    trailer: /trailer|cinematic|film|movie|commercial|advert|promo/.test(p),
    dark: /dark|moody|night|dramatic|gritty|noir|mysterious|horror/.test(p),
    emotional: /emotional|romantic|beautiful|heartfelt|nostalgic|sentimental/.test(p),
    social: /tiktok|reel|shorts|viral|social/.test(p),
    comedy: /funny|comedy|comic|humorous|meme/.test(p)
  };
}

function roleFor(index, total, flags) {
  if (index === 0) return 'hook';
  if (index === total - 1) return 'hero-ending';
  if (flags.comedy && index === total - 1) return 'payoff';
  if (flags.action) return index % 3 === 0 ? 'build' : 'action';
  if (flags.emotional) return index === 1 ? 'emotional-build' : 'emotional-beat';
  return index === 1 ? 'build' : index === total - 2 ? 'peak' : 'story-beat';
}

function motionFor(role, index, flags, existing) {
  if (existing && existing !== 'static') return existing;
  if (role === 'hook') return flags.action ? 'slow-push' : 'slow-pull';
  if (role === 'build') return index % 2 ? 'pan-right' : 'slow-push';
  if (role === 'action') return index % 2 ? 'orbit' : 'pan-left';
  if (role === 'peak') return 'zoom-punch';
  if (role === 'hero-ending') return 'slow-push';
  if (role === 'emotional-build') return 'slow-pull';
  return index % 2 ? 'pan-right' : 'slow-push';
}

function transitionFor(index, total, flags, existing) {
  if (index === 0) return 'fade-in';
  if (index === total - 1) return flags.dark ? 'dip-black' : 'fade-out';
  if (existing && existing !== 'hard-cut' && existing !== 'crossfade') return existing;
  if (flags.action) return index % 3 === 0 ? 'whip-right' : index % 2 ? 'zoom-punch' : 'flash-cut';
  if (flags.dark) return index % 2 ? 'dip-black' : 'crossfade';
  if (flags.emotional) return 'crossfade';
  if (flags.comedy) return index % 2 ? 'hard-cut' : 'flash-cut';
  return index % 3 === 1 ? 'crossfade' : 'hard-cut';
}

function storyAwareRole(scene, index, total, flags) {
  const supplied = lower(scene?.storyRole || scene?.role);
  if (supplied === 'hook') return 'hook';
  if (supplied === 'hero') return 'hero-ending';
  if (supplied === 'escalation') return 'action';
  if (supplied === 'build') return 'build';
  if (supplied === 'release') return 'release';
  if (supplied) return supplied;
  return roleFor(index, total, flags);
}

function storyTreatment(role, index, total, flags, existing) {
  const base = existing || {};
  const result = { ...base };
  if (role === 'hook') {
    result.motionIntensity = Math.min(num(result.motionIntensity, 0.8), 0.85);
    result.pacingIntent = 'hook';
  } else if (role === 'build') {
    result.motionIntensity = Math.max(num(result.motionIntensity, 0.8), 0.8);
    result.pacingIntent = 'build';
  } else if (role === 'action' || role === 'escalation') {
    result.motionIntensity = Math.max(num(result.motionIntensity, 0.9), 1.05);
    result.pacingIntent = 'escalate';
  } else if (role === 'release') {
    result.motionIntensity = Math.min(num(result.motionIntensity, 0.85), 0.85);
    result.pacingIntent = 'breathe';
  } else if (role === 'hero-ending') {
    result.motionIntensity = Math.min(num(result.motionIntensity, 0.85), 0.9);
    result.pacingIntent = 'resolve';
  } else {
    result.pacingIntent = flags.emotional ? 'breathe' : index === total - 1 ? 'resolve' : 'build';
  }
  return result;
}

export function refineCinematicTimeline(cuts, options = {}) {
  if (!Array.isArray(cuts) || !cuts.length) return [];
  const flags = creativeFlags(options.creativePrompt);
  const total = cuts.length;
  const suppliedStory = buildStoryDirection(cuts, { beatMap: options.beatMap });
  const storyRoles = new Map(suppliedStory.roles.map((role) => [role.id, role.role]));
  const beatPlan = options.beatMap ? buildVisualBeatPlan(cuts, options.beatMap) : [];

  return cuts.map((original, index) => {
    const cut = { ...original };
    const previous = index > 0 ? cuts[index - 1] : null;
    const currentSource = Number.isInteger(Number(cut?.mediaIndex)) ? Number(cut.mediaIndex) : cut.mediaIndex;
    const role = storyRoles.get(cut.id) || storyAwareRole(cut, index, total, flags);
    const beat = beatPlan[index];

    cut.role = role;
    cut.storyRole = role === 'hero-ending' ? 'hero' : role === 'action' ? 'escalation' : role;
    cut.storyOrder = index + 1;
    cut.mediaIndex = Number.isInteger(currentSource) ? currentSource : cut.mediaIndex;
    cut.motionStyle = motionFor(role, index, flags, cut.motionStyle);
    cut.transition = transitionFor(index, total, flags, cut.transition);

    const story = storyTreatment(role, index, total, flags, cut);
    const baseIntensity = num(story.motionIntensity, 0.9);
    cut.motionIntensity = Number(clamp(
      role === 'action' || role === 'peak' || role === 'escalation' ? Math.max(baseIntensity, 1.05) :
      role === 'hero-ending' ? Math.min(baseIntensity, 0.9) : baseIntensity,
      0.35,
      1.6
    ).toFixed(2));

    let speed = clamp(num(cut.speed, 1), 0.5, 1.75);
    if (flags.action && (role === 'action' || role === 'peak' || role === 'escalation')) speed = Math.max(speed, 1.12);
    if (role === 'hook' || role === 'hero-ending' || role === 'release' || flags.emotional) speed = Math.min(speed, 0.92);
    cut.speed = Number(speed.toFixed(2));

    if (flags.action && (role === 'action' || role === 'peak' || role === 'escalation')) {
      cut.speedEnd = Number(clamp(speed * 0.82, 0.55, 1.55).toFixed(2));
    } else if (role === 'hero-ending' || role === 'release' || flags.emotional) {
      cut.speedEnd = Number(clamp(speed * 0.88, 0.5, 1.35).toFixed(2));
    } else {
      cut.speedEnd = Number(clamp(speed * 1.02, 0.5, 1.75).toFixed(2));
    }

    cut.stabilization = cut.stabilization !== false;
    cut.colorGrade = cut.colorGrade || (flags.dark ? 'dark-cinematic' : flags.emotional ? 'warm-cinematic' : 'cinematic');
    cut.coverage = {
      role,
      preserveSubject: true,
      avoidUnnecessaryRepeat: Number.isInteger(currentSource) && Number.isInteger(Number(previous?.mediaIndex)) && currentSource === Number(previous.mediaIndex),
      cameraIntent: cut.motionStyle,
      pacingIntent: story.pacingIntent,
      storyScore: suppliedStory.coherence.score
    };

    if (beat) {
      const nearest = nearestBeat(beat.startTime, options.beatMap, { prefer: role === 'hook' ? 'downbeat' : role === 'action' || role === 'escalation' ? 'any' : 'any' });
      cut.beatSync = {
        beatIndex: nearest?.index ?? beat.beatIndex,
        beatTime: nearest?.time ?? beat.beatTime,
        action: beat.action,
        snapDistance: nearest ? Number(Math.abs(nearest.time - beat.startTime).toFixed(4)) : null,
        syncMode: role === 'action' || role === 'escalation' ? 'impact-target' : role === 'hero-ending' ? 'resolve-target' : 'advisory'
      };
    }

    return cut;
  });
}

export function timelineSummary(cuts) {
  if (!Array.isArray(cuts) || !cuts.length) return { cuts: 0, duration: 0, roles: [], storyScore: 0 };
  return {
    cuts: cuts.length,
    duration: Number(cuts.reduce((sum, cut) => sum + num(cut.duration, 0), 0).toFixed(2)),
    roles: cuts.map((cut) => cut.role || 'story-beat'),
    storyScore: Math.round(cuts.reduce((sum, cut) => sum + num(cut.coverage?.storyScore, 0), 0) / cuts.length)
  };
}
