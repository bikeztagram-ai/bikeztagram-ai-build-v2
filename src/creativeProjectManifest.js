/* BIKEZTAGRAM AI — canonical project contract joining intent, assets, treatment, edit and outputs. */

export function createCreativeProject(input = {}) {
  return {
    version: 1,
    id: input.id || null,
    intent: input.intent || null,
    subject: input.subject || { type: 'general' },
    assets: Array.isArray(input.assets) ? [...input.assets] : [],
    story: input.story || null,
    treatment: input.treatment || null,
    look: input.look || null,
    editPlan: input.editPlan || null,
    generation: input.generation || { shots: [] },
    outputs: Array.isArray(input.outputs) ? [...input.outputs] : [],
    creativeDna: input.creativeDna || null,
    feedback: Array.isArray(input.feedback) ? [...input.feedback] : [],
  };
}

export function validateCreativeProject(project) {
  const errors = [];
  if (!project || project.version !== 1) errors.push('Unsupported project manifest.');
  if (!Array.isArray(project?.assets)) errors.push('Assets must be an array.');
  if (!project?.intent) errors.push('Creative intent is missing.');
  return { valid: errors.length === 0, errors };
}
