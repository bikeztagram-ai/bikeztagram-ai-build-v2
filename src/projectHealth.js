export function assessProjectHealth(project = {}) {
  const campaign = project.campaign;
  const hasCampaign = Array.isArray(campaign)
    ? campaign.length > 0
    : Array.isArray(campaign?.deliverables) && campaign.deliverables.length > 0;

  const checks = {
    assets: Array.isArray(project.assets) && project.assets.length > 0,
    intent: Boolean(project.intent),
    story: Boolean(project.story || project.blueprint),
    look: Boolean(project.treatment || project.visualLook),
    edit: Boolean(project.editPlan),
    output: Boolean(project.outputs || project.output),
    campaign: hasCampaign,
  };

  const passed = Object.values(checks).filter(Boolean).length;
  return {
    ready: passed === Object.keys(checks).length,
    score: passed / Object.keys(checks).length,
    checks,
  };
}
