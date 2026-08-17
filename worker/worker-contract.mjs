/* BIKEZTAGRAM AI — zero-cost generation worker contract.
 *
 * Keeps the web app independent of a particular GPU host. A worker exposes
 * /health and /generate; the web layer can use any legitimately free or
 * user-owned GPU machine that implements this contract.
 */

export function normalizeWorkerUrl(value) {
  const raw = String(value || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Worker URL must use HTTP or HTTPS');
  }
  return url.toString().replace(/\/$/, '');
}

export function buildHealthUrl(workerUrl) {
  return `${normalizeWorkerUrl(workerUrl)}/health`;
}

export function buildGenerationRequest({ prompt, seconds = 5, width = 832, height = 480, seed = null } = {}) {
  const cleanPrompt = String(prompt || '').trim();
  if (cleanPrompt.length < 3) throw new Error('Generation prompt must contain at least 3 characters');
  const body = {
    prompt: cleanPrompt,
    seconds: Math.max(1, Math.min(5, Number(seconds) || 5)),
    width: Math.max(256, Math.min(1280, Number(width) || 832)),
    height: Math.max(256, Math.min(720, Number(height) || 480)),
  };
  if (seed !== null && seed !== undefined && seed !== '') body.seed = Number(seed);
  return body;
}

export function assertWorkerHealth(payload) {
  if (!payload?.ok) throw new Error('Worker health check failed');
  if (payload.engine !== 'Wan2.1-T2V-1.3B') throw new Error('Unsupported worker engine');
  if (payload.zeroCostOnly !== true) throw new Error('Worker does not declare zero-cost mode');
  return true;
}
