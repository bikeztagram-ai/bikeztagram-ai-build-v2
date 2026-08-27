/* Creative Director -> executable cinematic runtime bridge. */
import { buildCinematicTreatments } from './cinematicTreatment.js';
import { buildRenderCue } from './cinematicRuntime.js';

const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function buildExecutableScenePlan({ scenePlan = {}, creativePrompt = '', targetDuration = 15, beats = [] } = {}) {
  const slots = Array.isArray(scenePlan.slots) ? scenePlan.slots : [];
  const treatment = buildCinematicTreatments({
    moments: slots.map((slot, index) => ({
      ...slot,
      id: slot.id || `scene-${index + 1}`,
      duration: n(slot.duration, 2),
      editorialRole: slot.role,
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
    const motion = treatmentInfo.motion === 'speed-ramp' ? 'cinematic' : treatmentInfo.motion;
    const transitionMap = {
      'impact-cut': 'flash-cut',
      'match-cut': 'crossfade',
      'rhythmic-cut': 'hard-cut'
    };
    return {
      ...item,
      id: item.id || `scene-${index + 1}`,
      start,
      end: cursor,
      duration,
      motion,
      transition: transitionMap[treatmentInfo.transition] || treatmentInfo.transition,
      composition: treatmentInfo.composition,
      intensity: treatmentInfo.intensity,
      motionIntensity: treatmentInfo.intensity === 'high' ? 1.25 : treatmentInfo.intensity === 'rising' ? 1 : 0.8,
      speed: treatmentInfo.motion === 'speed-ramp' ? 1 : 1,
      speedEnd: treatmentInfo.motion === 'speed-ramp' ? 1.7 : 1
    };
  });

  const renderCues = clips.map((clip, index) => buildRenderCue(clip, index, clips.length, beats));
  return {
    version: 'executable-scene-plan-v1',
    targetDuration: treatment.targetDuration,
    totalDuration: Number(cursor.toFixed(2)),
    treatments: treatment,
    clips,
    renderCues,
    sourceStrategy: scenePlan.strategy || 'real media first; generated inserts only where useful'
  };
}
