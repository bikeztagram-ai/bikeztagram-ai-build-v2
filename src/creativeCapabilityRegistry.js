/* BIKEZTAGRAM AI — capability registry.
   Keeps the creative runtime extensible: prompt planning, real media, local worlds,
   AI providers and audio are capabilities rather than hard-coded editor features.
*/

const registry = new Map();

export function registerCreativeCapability(capability = {}) {
  const id = String(capability.id || '').trim();
  if (!id) throw new Error('Creative capability requires an id.');
  registry.set(id, {
    id,
    kind: capability.kind || 'creative',
    label: capability.label || id,
    description: capability.description || '',
    input: capability.input || [],
    output: capability.output || [],
    providers: capability.providers || ['local'],
    priority: Number(capability.priority || 0),
    available: typeof capability.available === 'function' ? capability.available : () => true,
    execute: typeof capability.execute === 'function' ? capability.execute : null,
  });
  return registry.get(id);
}

export function getCreativeCapability(id) {
  return registry.get(String(id || '')) || null;
}

export function listCreativeCapabilities(context = {}) {
  return [...registry.values()]
    .filter((item) => {
      try { return item.available(context) !== false; } catch { return false; }
    })
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .map(({ execute, ...publicCapability }) => publicCapability);
}

export function resolveCreativeCapabilities(requested = [], context = {}) {
  const wanted = Array.isArray(requested) ? requested : [requested];
  const available = listCreativeCapabilities(context);
  return wanted
    .map((id) => available.find((item) => item.id === id))
    .filter(Boolean);
}

export async function executeCreativeCapability(id, input, context = {}) {
  const capability = getCreativeCapability(id);
  if (!capability || typeof capability.execute !== 'function') {
    throw new Error(`Creative capability is unavailable: ${id}`);
  }
  if (capability.available(context) === false) {
    throw new Error(`Creative capability is not currently available: ${id}`);
  }
  return capability.execute(input, context);
}

export function createCapabilityManifest() {
  return listCreativeCapabilities().map((item) => ({
    id: item.id,
    kind: item.kind,
    label: item.label,
    providers: item.providers,
    input: item.input,
    output: item.output,
  }));
}
