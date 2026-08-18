export function validateCreativeStudioResult(result = {}) {
  const errors = [];
  if (!result.execution) errors.push('Missing execution plan.');
  if (!result.health) errors.push('Missing project health.');
  if (!result.renderJob) errors.push('Missing render job.');
  if (!result.campaign) errors.push('Missing campaign plan.');
  if (!result.run) errors.push('Missing pipeline run.');

  if (result.execution && result.execution.ready === false) errors.push('Execution plan is not ready.');
  if (result.health && result.health.ready === false) errors.push('Project health is not ready.');
  if (result.renderValidation && result.renderValidation.valid === false) errors.push('Render job validation failed.');
  if (result.run?.status === 'blocked') errors.push('Pipeline run is blocked.');

  const outputs = Array.isArray(result.run?.outputs) ? result.run.outputs : [];
  if (outputs.some((output) => output?.status === 'failed')) errors.push('Pipeline contains failed outputs.');

  return { valid: errors.length === 0, errors };
}
