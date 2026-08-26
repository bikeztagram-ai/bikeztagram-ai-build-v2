/* BIKEZTAGRAM AI — internal zero-cost video engine
 *
 * This module is deliberately independent from Blob upload, Gemini upload,
 * and the proven renderer. It converts the Director/production blueprint
 * into a deterministic timeline while preserving editorial intent all the
 * way to the local rendering layer.
 */

import { buildRenderCueTrack } from './cinematicRuntime.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const asString = (value, fallback = '') => String(value ?? fallback).trim();

function effectForScene(scene, index) {
  const text = [scene?.purpose, scene?.description, scene?.prompt].filter(Boolean).join(' ').toLowerCase();
  const explicitMotion = asString(scene?.motionStyle || scene?.motion || scene?.cameraMotion);
  const explicitIntensity = Number(scene?.motionIntensity ?? scene?.intensity);
  if (explicitMotion) {
    return {
      motion: explicitMotion,
      intensity: Number.isFinite(explicitIntensity) ? clamp(explicitIntensity, 0.35, 1.6) : 0.85
    };
  }
  if (text.includes('reveal')) return { motion: 'slow-push', intensity: 0.95 };
  if (text.includes('action') || text.includes('chase') || text.includes('speed')) return { motion: index % 2 ? 'pan-right' : 'pan-left', intensity: 1.1 };
  if (text.includes('hero') || text.includes('ending')) return { motion: 'slow-pull', intensity: 0.8 };
  if (text.includes('detail') || text.includes('close')) return { motion: 'slow-push', intensity: 0.7 };
  return { motion: 'cinematic', intensity: 0.85 };
}

function transitionFor(index, total, scene) {
  if (index === 0) return asString(scene?.transition || scene?.transitionIn, 'fade-in');
  if (index === total - 1 && !scene?.transition && !scene?.transitionIn) return 'fade-out';
  const text = asString(scene?.transition || scene?.transitionIn || scene?.description).toLowerCase();
  if (text.includes('whip left')) return 'whip-left';
  if (text.includes('whip right')) return 'whip-right';
  if (text.includes('flash')) return 'flash-cut';
  if (text.includes('black')) return 'dip-black';
  if (text.includes('dissolve') || text.includes('crossfade')) return 'crossfade';
  return asString(scene?.transition || scene?.transitionIn, 'hard-cut');
}

function editorialRoleFor(scene, index, total) {
  return asString(scene?.editorialRole || scene?.storyRole || scene?.role, index === 0 ? 'hook' : index === total - 1 ? 'hero-ending' : 'cinematic');
}

function sourceProvenance(scene, sourceType) {
  return {
    sourceType,
    mediaId: scene?.mediaId ?? null,
    sourceIndex: Number.isInteger(scene?.sourceIndex) ? scene.sourceIndex : null,
    sourceStart: Number.isFinite(Number(scene?.sourceStart ?? scene?.startTime)) ? Number(scene?.sourceStart ?? scene?.startTime) : null,
    sourceEnd: Number.isFinite(Number(scene?.sourceEnd ?? scene?.endTime)) ? Number(scene?.sourceEnd ?? scene?.endTime) : null,
    generated: sourceType === 'generated',
    generationPrompt: sourceType === 'generated' ? asString(scene?.generationPrompt || scene?.prompt) : ''
  };
}

export function createInternalTimeline(productionPlan, editPlan) {
  const scenes = Array.isArray(productionPlan?.scenes) ? productionPlan.scenes : [];
  if (!scenes.length) {
    const cuts = Array.isArray(editPlan?.cuts) ? editPlan.cuts : [];
    const clips = cuts.map((cut, index) => ({
      ...cut,
      id: cut.id || `clip-${index + 1}`,
      editorialOrder: index,
      editorialRole: asString(cut.editorialRole || cut.storyRole, index === 0 ? 'hook' : index === cuts.length - 1 ? 'hero-ending' : 'cinematic'),
      sourceType: cut.sourceType === 'generated' ? 'generated' : 'uploaded',
      sourceProvenance: sourceProvenance(cut, cut.sourceType === 'generated' ? 'generated' : 'uploaded'),
      transition: asString(cut.transition || cut.transitionIn, index === 0 ? 'fade-in' : 'hard-cut'),
      transitionDuration: clamp(asNumber(cut.transitionDuration, 0.2), 0, 1),
      start: asNumber(cut.start, 0),
      duration: clamp(asNumber(cut.duration, 2), 0.5, 8),
      end: asNumber(cut.start, 0) + clamp(asNumber(cut.duration, 2), 0.5, 8)
    }));
    const timeline = {
      version: 2,
      engine: 'bikeztagram-local',
      duration: asNumber(editPlan?.duration, clips.reduce((sum, clip) => sum + clip.duration, 0)),
      tracks: [{ id: 'video-main', type: 'video', clips }],
      editorialContract: { ordered: true, rolesPreserved: true, sourceProvenancePreserved: true },
      audio: { mode: 'original-local', ducking: true }
    };
    return { ...timeline, renderCues: buildRenderCueTrack(timeline, editPlan?.beats || editPlan?.beatTimes || []) };
  }

  const total = scenes.length;
  let cursor = 0;
  const clips = scenes.map((scene, index) => {
    const duration = clamp(asNumber(scene?.duration, 2.5), 0.5, 8);
    const effect = effectForScene(scene, index);
    const sourceType = scene?.sourceType === 'generated' ? 'generated' : 'uploaded';
    const role = editorialRoleFor(scene, index, total);
    const transition = transitionFor(index, total, scene);
    const transitionDuration = clamp(asNumber(scene?.transitionDuration, 0.2), 0, Math.min(1, duration * 0.45));
    const beatIndex = Number.isInteger(scene?.beatIndex) ? scene.beatIndex : null;
    const beatTime = Number.isFinite(Number(scene?.beatTime ?? scene?.beatStart)) ? Number(scene?.beatTime ?? scene?.beatStart) : null;
    const clip = {
      id: `scene-${index + 1}`,
      editorialOrder: index,
      editorialRole: role,
      sourceType,
      sourceIndex: Number.isInteger(scene?.sourceIndex) ? scene.sourceIndex : 0,
      sourceProvenance: sourceProvenance(scene, sourceType),
      start: cursor,
      duration,
      end: cursor + duration,
      purpose: scene?.purpose || role,
      prompt: sourceType === 'generated' ? asString(scene?.generationPrompt || scene?.prompt) : '',
      motion: effect.motion,
      motionIntensity: effect.intensity,
      speed: clamp(asNumber(scene?.speed, 1), 0.25, 2.5),
      speedEnd: clamp(asNumber(scene?.speedEnd, scene?.speed ?? 1), 0.25, 2.5),
      transition,
      transitionDuration,
      colorGrade: scene?.colorGrade || productionPlan?.colorGrade || 'dark-cinematic',
      continuity: scene?.continuity || 'preserve subject appearance and cinematic direction',
      beatAnchor: beatTime == null && beatIndex == null ? null : { beatIndex, beatTime }
    };
    cursor += duration;
    return clip;
  });

  const timeline = {
    version: 2,
    engine: 'bikeztagram-local',
    title: productionPlan?.title || 'Bikeztagram AI Edit',
    creativeDirection: productionPlan?.creativeDirection || '',
    duration: cursor,
    tracks: [{ id: 'video-main', type: 'video', clips }],
    audio: { mode: 'original-local', ducking: true },
    editorialContract: {
      ordered: true,
      rolesPreserved: true,
      directorMotionPreserved: true,
      transitionsPreserved: true,
      sourceProvenancePreserved: true,
      beatAnchorsPreserved: clips.some((clip) => clip.beatAnchor)
    },
    generatedSceneCount: clips.filter((clip) => clip.sourceType === 'generated').length,
    uploadedSceneCount: clips.filter((clip) => clip.sourceType === 'uploaded').length
  };
  return { ...timeline, renderCues: buildRenderCueTrack(timeline, productionPlan?.beats || productionPlan?.beatTimes || []) };
}

export function validateInternalTimeline(timeline) {
  const clips = timeline?.tracks?.find((track) => track?.type === 'video')?.clips || [];
  const errors = [];
  clips.forEach((clip, index) => {
    if (clip.editorialOrder !== index) errors.push(`clip ${index + 1}: editorial order mismatch`);
    if (!(Number(clip.duration) >= 0.5)) errors.push(`clip ${index + 1}: invalid duration`);
    if (index > 0 && Number(clip.start) < Number(clips[index - 1].end) - 0.001) errors.push(`clip ${index + 1}: timeline overlap`);
    if (!clip.sourceProvenance) errors.push(`clip ${index + 1}: missing source provenance`);
    if (!clip.motion) errors.push(`clip ${index + 1}: missing motion decision`);
    if (!clip.transition) errors.push(`clip ${index + 1}: missing transition decision`);
  });
  const cueErrors = Array.isArray(timeline?.renderCues) ? timeline.renderCues.filter((cue) => !cue?.id).map((_, index) => `render cue ${index + 1}: missing id`) : ['render cue track missing'];
  errors.push(...cueErrors);
  return { valid: errors.length === 0, errors, clipCount: clips.length };
}

export function describeInternalTimeline(timeline) {
  const clips = timeline?.tracks?.[0]?.clips || [];
  const generated = clips.filter((clip) => clip.sourceType === 'generated').length;
  const uploaded = clips.filter((clip) => clip.sourceType === 'uploaded').length;
  const roles = [...new Set(clips.map((clip) => clip.editorialRole).filter(Boolean))];
  return `${clips.length} scenes • ${uploaded} real • ${generated} generated/procedural • ${asNumber(timeline?.duration).toFixed(1)}s • ${roles.length} story roles • ${timeline?.renderCues?.length || 0} render cues • Bikeztagram local engine`;
}
