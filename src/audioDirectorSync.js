/* BIKEZTAGRAM AI — audio-aware visual timeline contract.
   This layer deliberately does not alter the existing music provider. It maps an
   already-built visual sequence onto musical time so the director, renderer and
   future audio compositor can share the same timing contract. */

import { buildBeatMap, nearestBeat } from './audioBeatMap.js';

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roleFor(index, count, purpose = '') {
  const p = String(purpose || '').toLowerCase();
  if (index === 0) return 'hook';
  if (/action|impact|accelerat|chase|speed|race|pursuit/.test(p)) return 'impact';
  if (index === count - 1) return 'resolve';
  return 'cut';
}

export function buildAudioAwareTimeline(cuts = [], { durationSeconds = 15, bpm = 112, offsetSeconds = 0, snapToleranceSeconds = 0.16 } = {}) {
  const safeCuts = Array.isArray(cuts) ? cuts : [];
  const beatMap = buildBeatMap({ durationSeconds, bpm, offsetSeconds });
  let timelineTime = 0;

  const timelineCuts = safeCuts.map((cut, index) => {
    const duration = Math.max(0.1, number(cut?.duration, 0.1));
    const beat = nearestBeat(timelineTime, beatMap, { prefer: index === 0 ? 'downbeat' : 'any' });
    const snapDistance = beat ? Math.abs(beat.time - timelineTime) : Infinity;
    const shouldSnap = Number.isFinite(snapDistance) && snapDistance <= snapToleranceSeconds;
    const role = roleFor(index, safeCuts.length, cut?.purpose);
    const start = shouldSnap ? beat.time : timelineTime;
    const nextBeat = nearestBeat(start + duration, beatMap);
    const sync = {
      role,
      timelineStart: Number(start.toFixed(4)),
      timelineEnd: Number((start + duration).toFixed(4)),
      beatIndex: beat?.index ?? null,
      beatTime: beat?.time ?? null,
      snapDistance: Number.isFinite(snapDistance) ? Number(snapDistance.toFixed(4)) : null,
      snapped: shouldSnap,
      endBeatIndex: nextBeat?.index ?? null,
      endBeatTime: nextBeat?.time ?? null
    };

    timelineTime += duration;
    return { ...cut, audioSync: sync };
  });

  return {
    version: '1.0',
    bpm: beatMap.bpm,
    durationSeconds: beatMap.durationSeconds,
    offsetSeconds: beatMap.offsetSeconds,
    beatMap,
    cuts: timelineCuts,
    policy: {
      sourceTimingIsAuthoritative: true,
      audioSyncAffectsTimelineOnly: true,
      neverMoveSourceTimestampToAchieveBeatSync: true,
      futureAudioRendererMayUseBeatEvents: true
    }
  };
}

export function buildBeatDrivenTreatment(cut, index, totalCuts) {
  const sync = cut?.audioSync;
  const role = sync?.role || roleFor(index, totalCuts, cut?.purpose);
  const beatStrength = sync?.beatIndex != null && sync.beatIndex % 4 === 0 ? 'downbeat' : 'beat';

  if (role === 'impact') {
    return {
      role,
      beatStrength,
      speedBias: 'accelerate-into-beat',
      transitionBias: 'impact-cut',
      motionBias: 'stronger',
      holdAfterBeat: true
    };
  }
  if (role === 'hook') {
    return {
      role,
      beatStrength,
      speedBias: 'controlled-entry',
      transitionBias: 'fade-in',
      motionBias: 'subtle',
      holdAfterBeat: false
    };
  }
  if (role === 'resolve') {
    return {
      role,
      beatStrength,
      speedBias: 'decelerate-after-beat',
      transitionBias: 'hero-rise',
      motionBias: 'smooth',
      holdAfterBeat: true
    };
  }
  return {
    role,
    beatStrength,
    speedBias: 'steady',
    transitionBias: 'cinematic-blend',
    motionBias: 'moderate',
    holdAfterBeat: false
  };
}
