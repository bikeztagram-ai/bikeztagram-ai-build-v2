/* BIKEZTAGRAM AI — internal zero-cost video engine
 *
 * This module is deliberately independent from Blob upload, Gemini upload,
 * and the proven renderer. It is the foundation for Bikeztagram's own
 * browser-based editor: a production blueprint is converted into a timeline
 * that the local rendering layer can execute.
 */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function effectForScene(scene, index) {
  const text = [scene?.purpose, scene?.description, scene?.prompt].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('reveal')) return { motion: 'slow-push', intensity: 0.95 };
  if (text.includes('action') || text.includes('chase') || text.includes('speed')) return { motion: index % 2 ? 'pan-right' : 'pan-left', intensity: 1.1 };
  if (text.includes('hero') || text.includes('ending')) return { motion: 'slow-pull', intensity: 0.8 };
  if (text.includes('detail') || text.includes('close')) return { motion: 'slow-push', intensity: 0.7 };
  return { motion: 'cinematic', intensity: 0.85 };
}

function transitionFor(index, total, scene) {
  if (index === 0) return 'fade-in';
  if (index === total - 1) return 'fade-out';
  const text = String(scene?.transition || scene?.description || '').toLowerCase();
  if (text.includes('whip left')) return 'whip-left';
  if (text.includes('whip right')) return 'whip-right';
  if (text.includes('flash')) return 'flash-cut';
  if (text.includes('black')) return 'dip-black';
  if (text.includes('dissolve') || text.includes('crossfade')) return 'crossfade';
  return 'hard-cut';
}

/**
 * Convert the AI Production Blueprint into an executable internal timeline.
 * No network request is made here and no external editor is required.
 */
export function createInternalTimeline(productionPlan, editPlan) {
  const scenes = Array.isArray(productionPlan?.scenes) ? productionPlan.scenes : [];
  if (!scenes.length) {
    return {
      version: 1,
      engine: 'bikeztagram-local',
      duration: asNumber(editPlan?.duration, 0),
      tracks: [{ id: 'video-main', type: 'video', clips: (editPlan?.cuts || []).map((cut, index) => ({ ...cut, id: `clip-${index + 1}`, sourceType: 'uploaded' })) }]
    };
  }

  const total = scenes.length;
  let cursor = 0;
  const clips = scenes.map((scene, index) => {
    const duration = clamp(asNumber(scene?.duration, 2.5), 0.5, 8);
    const effect = effectForScene(scene, index);
    const sourceType = scene?.sourceType === 'generated' ? 'generated' : 'uploaded';
    const clip = {
      id: `scene-${index + 1}`,
      sourceType,
      sourceIndex: Number.isInteger(scene?.sourceIndex) ? scene.sourceIndex : 0,
      start: cursor,
      duration,
      end: cursor + duration,
      purpose: scene?.purpose || (index === 0 ? 'opening' : index === total - 1 ? 'hero-ending' : 'cinematic'),
      prompt: sourceType === 'generated' ? String(scene?.generationPrompt || scene?.prompt || '') : '',
      motion: effect.motion,
      motionIntensity: effect.intensity,
      speed: clamp(asNumber(scene?.speed, 1), 0.5, 1.5),
      transition: transitionFor(index, total, scene),
      colorGrade: scene?.colorGrade || productionPlan?.colorGrade || 'dark-cinematic',
      continuity: scene?.continuity || 'preserve subject appearance and cinematic direction'
    };
    cursor += duration;
    return clip;
  });

  return {
    version: 1,
    engine: 'bikeztagram-local',
    title: productionPlan?.title || 'Bikeztagram AI Edit',
    creativeDirection: productionPlan?.creativeDirection || '',
    duration: cursor,
    tracks: [{ id: 'video-main', type: 'video', clips }],
    audio: { mode: 'original-local', ducking: true },
    generatedSceneCount: clips.filter((clip) => clip.sourceType === 'generated').length,
    uploadedSceneCount: clips.filter((clip) => clip.sourceType === 'uploaded').length
  };
}

export function describeInternalTimeline(timeline) {
  const clips = timeline?.tracks?.[0]?.clips || [];
  const generated = clips.filter((clip) => clip.sourceType === 'generated').length;
  const uploaded = clips.filter((clip) => clip.sourceType === 'uploaded').length;
  return `${clips.length} scenes • ${uploaded} real • ${generated} generated/procedural • ${asNumber(timeline?.duration).toFixed(1)}s • Bikeztagram local engine`;
}
