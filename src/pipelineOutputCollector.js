function normaliseOutputStatus(output = {}) {
  if (output.status === 'failed' || output.error) return 'failed';
  if (output.status === 'ready' && output.url) return 'ready';
  return 'pending';
}

export function collectPipelineOutput(output = {}, kind = 'primary') {
  return {
    kind,
    id: output.id || null,
    url: output.url || null,
    mime: output.mime || null,
    duration: output.duration ?? null,
    width: output.width ?? null,
    height: output.height ?? null,
    status: normaliseOutputStatus(output),
  };
}

export function appendOutput(run = {}, output, kind = 'primary') {
  return { ...run, outputs: [...(run.outputs || []), collectPipelineOutput(output, kind)] };
}
