/* BIKEZTAGRAM AI — master director timeline compiler.
   One deterministic handoff between the production blueprint, audio timing and renderer.
   It never changes source timestamps merely to force beat sync. */

import { buildAudioAwareTimeline, buildBeatDrivenTreatment } from './audioDirectorSync.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function normaliseTransition(scene, index, count, audioTreatment) {
  if (index === 0) return 'fade-in';
  if (index === count - 1) return 'fade-out';
  if (audioTreatment?.transitionBias === 'impact-cut') return 'flash-cut';
  const requested = String(scene?.transitionIn || '').toLowerCase();
  if (requested.includes('dip')) return 'dip-black';
  if (requested.includes('flash') || requested.includes('impact')) return 'flash-cut';
  return index % 2 ? 'crossfade' : 'hard-cut';
}

function normaliseMotion(scene, index, count, audioTreatment) {
  const requested = String(scene?.motionStyle || '').trim();
  if (requested) return requested;
  if (audioTreatment?.motionBias === 'stronger') return index % 2 ? 'pan-right' : 'slow-push';
  if (index === count - 1) return 'slow-pull';
  return index % 2 ? 'pan-right' : 'slow-push';
}

function speedFor(scene, audioTreatment, key, fallback) {
  const requested = num(scene?.[key], fallback);
  if (audioTreatment?.speedBias === 'accelerate-into-beat' && key === 'speedEnd') return Math.max(requested, 1.12);
  if (audioTreatment?.speedBias === 'decelerate-after-beat' && key === 'speedEnd') return Math.min(requested, 0.86);
  return requested;
}

export function compileDirectorTimeline(productionPlan, { bpm = 112, offsetSeconds = 0 } = {}) {
  if (!productionPlan?.scenes?.length) throw new Error('Production blueprint contains no scenes.');

  const scenes = productionPlan.scenes.filter((scene) => scene?.sourceType === 'uploaded');
  if (!scenes.length) throw new Error('Production blueprint contains no renderable uploaded scenes.');

  const audioTimeline = buildAudioAwareTimeline(scenes, {
    durationSeconds: num(productionPlan.targetDuration, 15),
    bpm,
    offsetSeconds,
    snapToleranceSeconds: 0.16
  });

  const cuts = audioTimeline.cuts.map((scene, index) => {
    const audioTreatment = buildBeatDrivenTreatment(scene, index, audioTimeline.cuts.length);
    const requestedSpeed = clamp(num(scene.speed, 1), 0.5, 1.5);
    const requestedSpeedEnd = clamp(num(scene.speedEnd, requestedSpeed), 0.5, 1.5);
    const speed = clamp(speedFor(scene, audioTreatment, 'speed', requestedSpeed), 0.5, 1.5);
    const speedEnd = clamp(speedFor(scene, audioTreatment, 'speedEnd', requestedSpeedEnd), 0.5, 1.5);

    return {
      mediaIndex: 0,
      mediaId: 'video-0',
      startTime: clamp(num(scene.startTime), 0, 3600),
      duration: clamp(num(scene.duration, 1), 0.5, 4),
      purpose: scene.purpose || 'real-cinematic-beat',
      sourceType: 'uploaded',
      generated: false,
      transition: normaliseTransition(scene, index, audioTimeline.cuts.length, audioTreatment),
      motionStyle: normaliseMotion(scene, index, audioTimeline.cuts.length, audioTreatment),
      motionIntensity: clamp(num(scene.motionIntensity, 0.65) * (audioTreatment.motionBias === 'stronger' ? 1.18 : 1), 0.2, 1.5),
      speed,
      speedEnd,
      colorGrade: scene.colorGrade || productionPlan.style?.dark ? (scene.colorGrade || 'dark-cinematic') : (scene.colorGrade || 'cinematic'),
      stabilization: scene.stabilization !== false,
      text: scene.text || '',
      audioSync: scene.audioSync,
      beatTreatment: audioTreatment
    };
  });

  return {
    version: '1.1',
    title: productionPlan.title || 'AI Director Production',
    style: productionPlan.style || {},
    creativePrompt: productionPlan.creativeRequest || '',
    targetDuration: num(productionPlan.targetDuration, 15),
    duration: Number(cuts.reduce((sum, cut) => sum + cut.duration, 0).toFixed(2)),
    cuts,
    audio: {
      bpm: audioTimeline.bpm,
      offsetSeconds: audioTimeline.offsetSeconds,
      durationSeconds: audioTimeline.durationSeconds,
      beatMap: audioTimeline.beatMap,
      policy: audioTimeline.policy
    },
    source: 'bikeztagram-master-director-timeline'
  };
}
