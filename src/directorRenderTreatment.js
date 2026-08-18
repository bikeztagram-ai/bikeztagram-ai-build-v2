/* BIKEZTAGRAM AI — renderer-side director treatment adapter.
   Pure deterministic mapping from director intent to executable visual treatment.
   It does not alter Blob, Gemini, upload, API, or music-provider configuration. */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function getDirectorRenderTreatment(cut = {}) {
  const role = String(cut.storyRole || cut.directorIntent?.role || '').toLowerCase();
  const beatRole = String(cut.beatTreatment?.role || '').toLowerCase();
  const effectiveRole = role || beatRole || 'build';

  if (effectiveRole === 'hook') {
    return {
      role: 'hook',
      speedStart: 0.92,
      speedEnd: 1.02,
      motionBoost: 0.9,
      transition: 'fade-in',
      visualEnergy: 'controlled-entry'
    };
  }

  if (effectiveRole === 'escalation' || effectiveRole === 'impact') {
    return {
      role: 'escalation',
      speedStart: 1.12,
      speedEnd: 1.30,
      motionBoost: 1.18,
      transition: 'flash-cut',
      visualEnergy: 'impact'
    };
  }

  if (effectiveRole === 'hero' || effectiveRole === 'resolve') {
    return {
      role: 'hero',
      speedStart: 0.88,
      speedEnd: 0.76,
      motionBoost: 0.92,
      transition: 'fade-out',
      visualEnergy: 'resolve'
    };
  }

  if (effectiveRole === 'release') {
    return {
      role: 'release',
      speedStart: 0.94,
      speedEnd: 0.90,
      motionBoost: 0.94,
      transition: 'crossfade',
      visualEnergy: 'breathe'
    };
  }

  return {
    role: 'build',
    speedStart: 1,
    speedEnd: 1.06,
    motionBoost: 1,
    transition: 'hard-cut',
    visualEnergy: 'build'
  };
}

export function applyDirectorRenderTreatment(cut = {}) {
  const treatment = getDirectorRenderTreatment(cut);
  const requestedStart = Number(cut.speed);
  const requestedEnd = Number(cut.speedEnd);
  const baseIntensity = Number(cut.motionIntensity);
  return {
    ...cut,
    speed: clamp(Number.isFinite(requestedStart) ? requestedStart : treatment.speedStart, 0.5, 1.5),
    speedEnd: clamp(Number.isFinite(requestedEnd) ? requestedEnd : treatment.speedEnd, 0.5, 1.5),
    motionIntensity: clamp((Number.isFinite(baseIntensity) ? baseIntensity : 0.65) * treatment.motionBoost, 0.2, 1.5),
    transition: cut.transition || treatment.transition,
    directorVisualEnergy: treatment.visualEnergy
  };
}
