/* BIKEZTAGRAM AI — master director timeline compiler.
   One deterministic handoff between the production blueprint, story direction,
   audio timing and renderer. It never changes source timestamps merely to force beat sync. */

import { buildAudioAwareTimeline, buildBeatDrivenTreatment } from './audioDirectorSync.js';
import { buildStoryDirection, assignStoryRoles } from './directorStoryModel.js';

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

function extendToTarget(scenes, targetDuration, sourceDuration) {
  const target = Math.max(0.5, num(targetDuration, 15));
  const current = scenes.reduce((sum, scene) => sum + Math.max(0.5, num(scene.duration, 0.5)), 0);
  const remainder = Number((target - current).toFixed(3));
  if (remainder <= 0.05) return scenes;
  const last = scenes[scenes.length - 1];
  return [
    ...scenes,
    {
      id: 'scene-duration-hold', sourceType: 'uploaded', purpose: 'real-hero-hold',
      startTime: Math.max(0, num(sourceDuration, 0) - 0.08), duration: remainder,
      endTime: Math.max(0, num(sourceDuration, 0)), motionStyle: 'slow-pull',
      motionIntensity: 0.35, speed: 0.78, speedEnd: 0.72,
      colorGrade: last?.colorGrade || 'dark-cinematic', transitionIn: 'fade-in', transitionOut: 'fade-out',
      stabilization: true, text: '', holdLastFrame: true,
      continuityNotes: 'Controlled end hold used only when the verified source is shorter than the requested output duration.'
    }
  ];
}

export function compileDirectorTimeline(productionPlan, { bpm = 112, offsetSeconds = 0 } = {}) {
  if (!productionPlan?.scenes?.length) throw new Error('Production blueprint contains no scenes.');
  const sourceDuration = num(productionPlan.sourceAnalysis?.durationSeconds, 0);
  const targetDuration = num(productionPlan.targetDuration, 15);
  const sourceScenes = productionPlan.scenes.filter((scene) => scene?.sourceType === 'uploaded');
  if (!sourceScenes.length) throw new Error('Production blueprint contains no renderable uploaded scenes.');

  const scenes = extendToTarget(sourceScenes, targetDuration, sourceDuration);
  const storyScenes = assignStoryRoles(scenes);
  const storyDirection = buildStoryDirection(storyScenes);

  const audioTimeline = buildAudioAwareTimeline(storyScenes, {
    durationSeconds: targetDuration, bpm, offsetSeconds, snapToleranceSeconds: 0.16
  });

  const cuts = audioTimeline.cuts.map((scene, index) => {
    const audioTreatment = buildBeatDrivenTreatment(scene, index, audioTimeline.cuts.length);
    const requestedSpeed = clamp(num(scene.speed, 1), 0.5, 1.5);
    const requestedSpeedEnd = clamp(num(scene.speedEnd, requestedSpeed), 0.5, 1.5);
    const speed = clamp(speedFor(scene, audioTreatment, 'speed', requestedSpeed), 0.5, 1.5);
    const speedEnd = clamp(speedFor(scene, audioTreatment, 'speedEnd', requestedSpeedEnd), 0.5, 1.5);
    const colorGrade = scene.colorGrade || (productionPlan.style?.dark ? 'dark-cinematic' : 'cinematic');
    const storyRole = scene.storyRole || 'story-beat';

    return {
      mediaIndex: 0, mediaId: 'video-0',
      startTime: clamp(num(scene.startTime), 0, 3600),
      duration: clamp(num(scene.duration, 1), 0.5, 8),
      purpose: scene.purpose || 'real-cinematic-beat', storyRole,
      storyOrder: scene.storyOrder || index + 1,
      sourceType: 'uploaded', generated: false,
      transition: normaliseTransition(scene, index, audioTimeline.cuts.length, audioTreatment),
      motionStyle: normaliseMotion(scene, index, audioTimeline.cuts.length, audioTreatment),
      motionIntensity: clamp(num(scene.motionIntensity, 0.65) * (audioTreatment.motionBias === 'stronger' ? 1.18 : 1), 0.2, 1.5),
      speed, speedEnd, colorGrade,
      stabilization: scene.stabilization !== false,
      text: scene.text || '', holdLastFrame: scene.holdLastFrame === true,
      audioSync: scene.audioSync, beatTreatment: audioTreatment,
      directorIntent: {
        role: storyRole,
        pacing: storyRole === 'escalation' ? 'increase-energy' : storyRole === 'hero' ? 'resolve' : storyRole === 'hook' ? 'capture-attention' : storyRole === 'release' ? 'breathe' : 'build',
        preserveSubject: true
      }
    };
  });

  return {
    version: '1.3', title: productionPlan.title || 'AI Director Production',
    style: productionPlan.style || {}, creativePrompt: productionPlan.creativeRequest || '',
    targetDuration, duration: Number(cuts.reduce((sum, cut) => sum + cut.duration, 0).toFixed(2)), cuts,
    story: storyDirection,
    audio: { bpm: audioTimeline.bpm, offsetSeconds: audioTimeline.offsetSeconds, durationSeconds: audioTimeline.durationSeconds, beatMap: audioTimeline.beatMap, policy: audioTimeline.policy },
    source: 'bikeztagram-master-director-timeline'
  };
}
