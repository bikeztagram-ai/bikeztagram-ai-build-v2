import { renderProject as renderProjectUnsafe } from './renderer.js';
import { assessRenderExecution } from './renderExecutionPolicy.js';

export async function renderProject(mediaItems, plan, onProgress) {
  const sourceDuration = Number(plan?.sourceDuration ?? plan?.executionReadiness?.sourceDuration ?? 0);
  const readiness = assessRenderExecution(plan, Number(plan?.targetDuration) || 15, { sourceDuration });
  if (!readiness.ready) {
    throw new Error(`Render execution blocked: ${readiness.errors.join(' ')}`);
  }

  const output = await renderProjectUnsafe(mediaItems, plan, onProgress);
  if (!(output instanceof Blob) || output.size === 0) {
    throw new Error('Render execution completed without a usable video Blob.');
  }
  return output;
}
