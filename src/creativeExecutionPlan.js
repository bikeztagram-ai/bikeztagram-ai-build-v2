/* BIKEZTAGRAM AI — executable plan bridge. */

export function buildExecutionPlan(project = {}) {
  const errors = [];
  if (!project.intent) errors.push('Missing creative intent.');
  if (!project.story && !project.blueprint) errors.push('Missing story/blueprint.');
  if (!project.treatment && !project.visualLook) errors.push('Missing treatment/look.');
  const shots = project.editPlan?.tracks?.video || project.editPlan?.shots || [];
  const hasAssets = Array.isArray(project.assets) && project.assets.length > 0;
  const hasShots = shots.length > 0;
  const hasOutputs = Boolean(project.outputs || project.output);
  const hasCampaign = Array.isArray(project.campaign) && project.campaign.length > 0;
  const stages = [
    { id: 'analyse', status: hasAssets ? 'ready' : 'pending' },
    { id: 'direct', status: project.story || project.blueprint ? 'ready' : 'pending' },
    { id: 'generate', status: hasShots ? 'ready' : 'pending', shotCount: shots.length },
    { id: 'edit', status: project.editPlan ? 'ready' : 'pending' },
    { id: 'quality', status: 'pending' },
    { id: 'export', status: hasOutputs ? 'ready' : 'pending' },
    { id: 'campaign', status: hasCampaign ? 'ready' : 'pending' },
  ];
  return { version: 3, ready: errors.length === 0 && hasShots, errors, stages, readiness: { hasAssets, hasShots, hasOutputs, hasCampaign } };
}
