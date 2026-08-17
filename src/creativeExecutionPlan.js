/* BIKEZTAGRAM AI — executable plan bridge. */

export function buildExecutionPlan(project = {}) {
  const errors = [];
  if (!project.intent) errors.push('Missing creative intent.');
  if (!project.story && !project.blueprint) errors.push('Missing story/blueprint.');
  if (!project.treatment && !project.visualLook) errors.push('Missing treatment/look.');
  const shots = project.editPlan?.tracks?.video || project.editPlan?.shots || [];
  return {
    version: 1,
    ready: errors.length === 0,
    errors,
    stages: [
      { id: 'analyse', status: project.assets ? 'ready' : 'pending' },
      { id: 'direct', status: project.story || project.blueprint ? 'ready' : 'pending' },
      { id: 'generate', status: shots.length ? 'ready' : 'pending', shotCount: shots.length },
      { id: 'edit', status: project.editPlan ? 'ready' : 'pending' },
      { id: 'quality', status: 'pending' },
      { id: 'export', status: 'pending' },
    ],
  };
}
