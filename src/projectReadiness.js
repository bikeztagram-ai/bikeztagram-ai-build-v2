export function checkProjectReadiness(project = {}) {
  const checks = {
    intent: Boolean(project.intent),
    source: Boolean(project.assets?.length || project.sourceMedia?.length),
    direction: Boolean(project.story || project.blueprint || project.treatment),
    edit: Boolean(project.editPlan),
    output: Boolean(project.output || project.campaign)
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return { ready: passed >= 4, checks, score: passed / Object.keys(checks).length };
}
