/* BIKEZTAGRAM AI — user director profile foundation. */

const DEFAULT_PROFILE = {
  pacing: 0.65,
  cameraMotion: 0.45,
  transitionEnergy: 0.55,
  slowMotion: 0.25,
  subjectFocus: 0.85,
  cinematicGrade: 0.75,
};

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, Number(v) || 0));

export function createDirectorProfile(overrides = {}) {
  return { ...DEFAULT_PROFILE, ...overrides };
}

export function updateDirectorProfile(profile, feedback = {}) {
  const current = createDirectorProfile(profile);
  const next = { ...current };
  for (const key of Object.keys(DEFAULT_PROFILE)) {
    if (feedback[key] == null) continue;
    const target = clamp(feedback[key]);
    next[key] = Number((current[key] * 0.8 + target * 0.2).toFixed(3));
  }
  return next;
}

export function describeDirectorProfile(profile) {
  const p = createDirectorProfile(profile);
  return {
    pacing: p.pacing,
    cameraMotion: p.cameraMotion,
    transitionEnergy: p.transitionEnergy,
    slowMotion: p.slowMotion,
    subjectFocus: p.subjectFocus,
    cinematicGrade: p.cinematicGrade,
  };
}
