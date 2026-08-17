/* BIKEZTAGRAM AI — deterministic preflight before expensive generation/export. */

export function evaluateCreativeQuality({ project = {}, plan = {}, assets = [], targetDuration = 0 } = {}) {
  const checks = {
    hasAssets: assets.length > 0 || (project.assets || []).length > 0,
    hasIntent: Boolean(project.intent || plan.intent),
    hasStory: Boolean(project.story || plan.story || plan.beats),
    hasTreatment: Boolean(project.treatment || plan.treatment || project.look),
    durationValid: Number(targetDuration || plan.duration || project.intent?.duration || 0) >= 3,
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  return { valid: failed.length === 0, score: (Object.keys(checks).length - failed.length) / Object.keys(checks).length, failed };
}
