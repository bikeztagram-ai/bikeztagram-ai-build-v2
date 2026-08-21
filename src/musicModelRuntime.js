/*
 * Bikeztagram AI — local/open music model runtime boundary.
 *
 * The Creative Engine owns this contract. A runtime may be a browser-capable
 * model, a self-hosted worker, a local GPU service, or another explicitly
 * configured adapter. The UI never needs to know which model produced audio.
 */

const text = (value) => String(value ?? '').trim();

export function createMusicRuntimeCapabilities({
  id = 'unconfigured',
  label = 'Unconfigured music runtime',
  local = false,
  supports = [],
  maxDuration = null,
} = {}) {
  const allowed = new Set([
    'text-to-music',
    'melody-conditioned',
    'audio-conditioned',
    'image-conditioned',
    'video-conditioned',
    'vocals',
    'instrumental',
    'stems',
    'extend',
    'replace-section',
    'remix',
    'style-transfer',
  ]);
  return {
    id: text(id) || 'unconfigured',
    label: text(label) || 'Unconfigured music runtime',
    local: Boolean(local),
    supports: Array.from(new Set((Array.isArray(supports) ? supports : []).filter(value => allowed.has(value)))),
    maxDuration: Number.isFinite(Number(maxDuration)) ? Number(maxDuration) : null,
  };
}

export function selectMusicRuntime(runtimes = [], request = {}) {
  const candidates = (Array.isArray(runtimes) ? runtimes : [])
    .map(runtime => ({ ...runtime, capabilities: runtime.capabilities || createMusicRuntimeCapabilities(runtime) }))
    .filter(runtime => runtime.capabilities.supports.includes('text-to-music'));

  const needsReference = Boolean(request?.references?.audio || request?.references?.image || request?.references?.video);
  const preferred = candidates.find(runtime => {
    if (needsReference) {
      return ['audio', 'image', 'video'].some(type => request.references?.[type] && runtime.capabilities.supports.includes(`${type}-conditioned`));
    }
    return true;
  });

  return preferred || candidates.find(runtime => runtime.capabilities.local) || candidates[0] || null;
}

export async function generateWithMusicRuntime(runtime, request, { onEvent } = {}) {
  if (!runtime || typeof runtime.generate !== 'function') {
    return { status: 'unavailable', audioUrl: null, request, runtime: runtime?.capabilities?.id || null };
  }

  onEvent?.({ type: 'generation-start', runtime: runtime.capabilities?.id || 'unknown' });
  try {
    const result = await runtime.generate(request);
    if (!result?.audioUrl && !result?.audioDataUrl && !result?.blob) {
      return { status: 'empty', audioUrl: null, request, runtime: runtime.capabilities?.id || null };
    }
    onEvent?.({ type: 'generation-complete', runtime: runtime.capabilities?.id || 'unknown' });
    return { ...result, status: 'ready', request, runtime: runtime.capabilities?.id || null };
  } catch (error) {
    onEvent?.({ type: 'generation-error', runtime: runtime.capabilities?.id || 'unknown', message: text(error?.message || error) });
    return { status: 'error', audioUrl: null, request, runtime: runtime.capabilities?.id || null, error: text(error?.message || error) };
  }
}
