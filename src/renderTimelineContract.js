/* BIKEZTAGRAM AI — unified render timeline contract.
   Normalises visual treatment and audio relationships without changing Blob/Gemini configuration.
   The renderer can consume this contract directly once its adapter is wired in.
*/

import { buildBeatMap, nearestBeat } from './audioBeatMap.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function numeric(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normaliseScene(scene, index, sourceDuration) {
  const startTime = clamp(numeric(scene?.startTime, 0), 0, Math.max(0, sourceDuration - 0.1));
  const requestedDuration = Math.max(0.5, numeric(scene?.duration, 1.5));
  const sourceAvailable = Math.max(0.5, sourceDuration - startTime);
  const speed = clamp(numeric(scene?.speed, 1), 0.5, 1.5);
  const speedEnd = clamp(numeric(scene?.speedEnd, speed), 0.5, 1.5);
  const sourceConsumption = requestedDuration * Math.max(speed, speedEnd);
  const safeDuration = Math.min(requestedDuration, sourceAvailable / Math.max(speed, speedEnd));

  return {
    id: scene?.id || `cut-${String(index + 1).padStart(2, '0')}`,
    mediaId: scene?.mediaId || 'video-0',
    mediaIndex: Number.isInteger(scene?.mediaIndex) ? scene.mediaIndex : 0,
    sourceType: scene?.sourceType || 'uploaded',
    generated: scene?.generated === true,
    startTime: Number(startTime.toFixed(3)),
    duration: Number(Math.max(0.5, safeDuration).toFixed(3)),
    requestedDuration: Number(requestedDuration.toFixed(3)),
    sourceConsumption: Number(Math.min(sourceConsumption, sourceAvailable).toFixed(3)),
    purpose: scene?.purpose || 'real-cinematic-beat',
    motionStyle: scene?.motionStyle || 'slow-push',
    motionIntensity: clamp(numeric(scene?.motionIntensity, 0.65), 0, 1.5),
    speed: Number(speed.toFixed(3)),
    speedEnd: Number(speedEnd.toFixed(3)),
    transition: scene?.transition || 'hard-cut',
    colorGrade: scene?.colorGrade || 'cinematic',
    stabilization: scene?.stabilization !== false,
    text: scene?.text || '',
    generationPrompt: scene?.generationPrompt || '',
    sourceConsumptionLimited: safeDuration + 0.001 < requestedDuration
  };
}

export function compileRenderTimeline({ scenes = [], sourceDuration = 0, targetDuration = 15, bpm = 112, beatOffset = 0 } = {}) {
  const source = Math.max(0.1, numeric(sourceDuration, 0.1));
  const target = Math.max(0.5, numeric(targetDuration, 15));
  const realScenes = scenes.filter((scene) => scene?.sourceType !== 'generated');
  const normalised = realScenes.map((scene, index) => normaliseScene(scene, index, source));
  const beatMap = buildBeatMap({ durationSeconds: target, bpm, offsetSeconds: beatOffset });

  const timeline = normalised.map((scene, index) => {
    const beat = nearestBeat(scene.startTime, beatMap, { prefer: index === 0 ? 'downbeat' : 'any' });
    const snapDistance = beat ? Math.abs(beat.time - scene.startTime) : Infinity;
    return {
      ...scene,
      sequenceIndex: index,
      beat: beat ? { index: beat.index, time: beat.time, accent: beat.accent, snapDistance: Number(snapDistance.toFixed(3)) } : null,
      beatSyncEligible: snapDistance <= 0.18,
      visualRole: index === 0 ? 'hook' : index === normalised.length - 1 ? 'resolve' : scene.purpose.includes('action') ? 'impact' : 'cut'
    };
  });

  const duration = Number(timeline.reduce((sum, scene) => sum + scene.duration, 0).toFixed(3));
  return {
    version: '1.0',
    sourceDuration: source,
    targetDuration: target,
    plannedDuration: duration,
    durationDelta: Number((target - duration).toFixed(3)),
    bpm: beatMap.bpm,
    beatMap,
    scenes: timeline,
    policies: {
      realFootageFirst: true,
      generatedScenesExcludedUntilGenerationAdapterReady: true,
      neverReadBeyondSource: true,
      preserveSourceIdentity: true,
      beatSyncIsAdvisory: true
    }
  };
}

export function isRenderTimelineReady(timeline) {
  const errors = [];
  if (!timeline?.scenes?.length) errors.push('Render timeline contains no executable real-footage scenes.');
  if (timeline?.scenes?.some((scene) => scene.duration < 0.5)) errors.push('Render timeline contains a sub-0.5s scene.');
  if (timeline?.scenes?.some((scene) => scene.sourceConsumptionLimited)) errors.push('One or more scenes exceed available source footage after speed treatment.');
  if (timeline?.scenes?.some((scene) => scene.startTime >= timeline.sourceDuration)) errors.push('A scene starts outside the source duration.');
  return { ready: errors.length === 0, errors };
}
