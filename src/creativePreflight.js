export function runCreativePreflight(project = {}) {
  const checks = [
    ['intent', Boolean(project.intent)],
    ['source', Boolean(project.assets?.length || project.media?.length)],
    ['story', Boolean(project.story || project.blueprint)],
    ['look', Boolean(project.treatment || project.visualLook)],
    ['timeline', Boolean(project.editPlan)],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  return { ready: failed.length === 0, checks: Object.fromEntries(checks), blockers: failed };
}
