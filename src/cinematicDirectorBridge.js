/* Creative Director -> executable cinematic runtime bridge. */
import { buildCinematicTreatments } from './cinematicTreatment.js';
import { buildRenderCue, validateRenderCueTrack } from './cinematicRuntime.js';

const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const normalizeMotion = (motion, index = 0) => {
  const value = String(motion || '').toLowerCase();
  if (value === 'push-in' || value === 'slow-push-in' || value === 'gentle-push') return 'slow-push';
  if (value === 'slow-orbit') return 'orbit';
  if (value === 'lateral-pan') return index % 2 ? 'pan-right' : 'pan-left';
  if (value === 'subtle-drift') return 'parallax';
  if (value === 'speed-ramp') return 'cinematic';
  return value;
};

const normalizeTransition = (transition, index, total) => {
  const value = String(transition || '').toLowerCase();
  if (value === 'impact-cut') return 'flash-cut';
  if (value === 'match-cut') return 'crossfade';
  if (value === 'rhythmic-cut' || value === 'clean-cut') return 'hard-cut';
  if (value === 'fade') return index === total - 1 ? 'fade-out' : 'fade-in';
  return value;
};

const cameraForRole = (role) => ({
  hook: 'immediate-attention',
  build: 'controlled-cinematic',
  action: 'escalate-motion',
  reveal: 'controlled-reveal',
  'hero-ending': 'hold-and-settle',
  emotional: 'intimate-hold',
  variation: 'controlled-cinematic'
}[String(role || '').toLowerCase()] || 'controlled-cinematic');

export function buildExecutableScenePlan({ scenePlan = {}, creativePrompt = '', targetDuration = 15, beats = [] } = {}) {
  const slots = Array.isArray(scenePlan.slots) ? scenePlan.slots : [];
  const treatment = buildCinematicTreatments({
    moments: slots.map((slot, index) => ({
      ...slot,
      id: slot.id || `scene-${index + 1}`,
      duration: n(slot.duration, 2),
      editorialRole: slot.role || slot.editorialRole || slot.purpose || slot.intent,
      sourceType: slot.generation === 'preferred' ? 'generated' : 'uploaded',
      subjectType: slot.subjectType || slot.subjectFamily || 'unknown'
    })),
    creativePrompt,
    targetDuration
  });

  let cursor = 0;
  const clips = treatment.items.map((item, index) => {
    const duration = item.treatmentDuration;
    const start = cursor;
    cursor += duration;
    const treatmentInfo = item.cinematicTreatment || {};
    const role = String(item.editorialRole || 'variation').toLowerCase();
    return {
      ...item,
      id: item.id || `scene-${index + 1}`,
      start,
      end: cursor,
      duration,
      role,
      editorialRole: role,
      cameraIntent: item.cameraIntent || cameraForRole(role),
      motion: normalizeMotion(treatmentInfo.motion, index),
      transition: normalizeTransition(treatmentInfo.transition, index, treatment.items.length),
      composition: treatmentInfo.composition,
      intensity: treatmentInfo.intensity,
      motionIntensity: treatmentInfo.intensity === 'high' ? 1.25 : treatmentInfo.intensity === 'rising' ? 1 : 0.8,
      speed: treatmentInfo.motion === 'speed-ramp' ? 1 : 1,
      speedEnd: treatmentInfo.motion === 'speed-ramp' ? 1.7 : 1
    };
  });

  const renderCues = clips.map((clip, index) => buildRenderCue(clip, index, clips.length, beats));
  const cuts = renderCues.map((cue, index) => {
    const clip = clips[index];
    return {
      id: cue.id || `cut-${index + 1}`,
      mediaId: cue.mediaId,
      mediaIndex: clips.findIndex(item => item.id === cue.id),
      sourceType: cue.sourceType,
      generated: Boolean(cue.generated),
      generationPrompt: cue.generationPrompt || '',
      startTime: cue.sourceStart,
      duration: cue.outputDuration,
      purpose: cue.editorialRole,
      role: clip.role,
      editorialRole: clip.editorialRole,
      cameraIntent: clip.cameraIntent,
      transition: cue.transition,
      motionStyle: cue.motion,
      motionIntensity: cue.motionIntensity,
      colorGrade: cue.colorGrade,
      speed: cue.speed,
      speedEnd: cue.speedEnd,
      beatAnchor: cue.beatAnchor,
      directorExecution: {
        version: 'director-render-runtime-v1',
        role: clip.role,
        cameraIntent: clip.cameraIntent,
        motionStyle: cue.motion,
        transition: cue.transition
      }
    };
  });
  const validation = validateRenderCueTrack(renderCues);
  if (!validation.valid) throw new Error(`Executable cinematic cue validation failed: ${validation.errors.join('; ')}`);

  return {
    version: 'executable-scene-plan-v1',
    targetDuration: treatment.targetDuration,
    totalDuration: Number(cursor.toFixed(2)),
    treatments: treatment,
    clips,
    renderCues,
    cuts,
    sourceStrategy: scenePlan.strategy || 'real media first; generated inserts only where useful'
  };
}
