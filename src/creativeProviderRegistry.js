/* Provider-neutral registry. Providers implement contracts; the product never depends on a named vendor. */
const registry = new Map();
const FORBIDDEN_PROVIDER = /gemini|google-genai|googleai/i;

const normalise = (provider = {}) => ({
  id: String(provider.id || '').trim(),
  label: String(provider.label || provider.id || '').trim(),
  capabilities: [...new Set(Array.isArray(provider.capabilities) ? provider.capabilities.map(String) : [])],
  priority: Number.isFinite(Number(provider.priority)) ? Number(provider.priority) : 100,
  available: typeof provider.available === 'function' ? provider.available : () => true,
  generate: typeof provider.generate === 'function' ? provider.generate : null,
  metadata: provider.metadata || {},
});

export function registerCreativeProvider(provider) {
  const item = normalise(provider);
  if (!item.id) throw new Error('Creative provider requires an id.');
  if (FORBIDDEN_PROVIDER.test(item.id) || FORBIDDEN_PROVIDER.test(item.label) || FORBIDDEN_PROVIDER.test(JSON.stringify(item.metadata))) throw new Error(`Forbidden provider integration: ${item.id}`);
  if (!item.capabilities.length) throw new Error(`Creative provider ${item.id} requires capabilities.`);
  registry.set(item.id, item);
  return item;
}

export function unregisterCreativeProvider(id) { return registry.delete(id); }
export function listCreativeProviders(capability = null) {
  return [...registry.values()]
    .filter(p => !capability || p.capabilities.includes(capability))
    .sort((a, b) => a.priority - b.priority)
    .map(({ generate, available, ...publicProvider }) => publicProvider);
}

export function resolveCreativeProvider(capability, { preferred = [], allowFallback = true } = {}) {
  const wanted = [...new Set(preferred.filter(Boolean))];
  const candidates = [...registry.values()].filter(p => p.capabilities.includes(capability));
  for (const id of wanted) {
    const candidate = candidates.find(p => p.id === id);
    if (candidate && candidate.available()) return candidate;
  }
  if (allowFallback) return candidates.find(p => p.available()) || null;
  return null;
}

export async function generateWithCreativeProvider(capability, request, options = {}) {
  const provider = resolveCreativeProvider(capability, options);
  if (!provider?.generate) throw new Error(`No executable provider is available for capability: ${capability}`);
  return provider.generate(request);
}

export function clearCreativeProviders() { registry.clear(); }
