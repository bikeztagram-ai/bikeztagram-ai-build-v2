/* Bikeztagram AI — capability-first model registry.
 * Keeps model choice separate from creative direction so open/local runtimes
 * can replace one another without changing the product contract.
 */

const normalise = (value) => String(value ?? '').trim().toLowerCase();

export function registerModel(registry, model) {
  const entry = {
    id: String(model?.id || '').trim(),
    label: String(model?.label || model?.id || '').trim(),
    modality: String(model?.modality || '').trim(),
    local: Boolean(model?.local),
    capabilities: Array.from(new Set(Array.isArray(model?.capabilities) ? model.capabilities.map(normalise).filter(Boolean) : [])),
    licence: String(model?.licence || 'unknown').trim(),
    commercialUse: model?.commercialUse === true,
    configured: model?.configured !== false,
  };
  if (!entry.id) return registry;
  return { ...(registry || {}), [entry.id]: entry };
}

export function discoverEligibleModels(registry = {}, { modality, required = [], localFirst = true } = {}) {
  const needed = Array.isArray(required) ? required.map(normalise).filter(Boolean) : [];
  return Object.values(registry || {})
    .filter(model => model.configured !== false)
    .filter(model => !modality || normalise(model.modality) === normalise(modality))
    .filter(model => needed.every(capability => model.capabilities.includes(capability)))
    .filter(model => model.commercialUse !== false)
    .sort((a, b) => {
      if (localFirst && a.local !== b.local) return a.local ? -1 : 1;
      if (a.capabilities.length !== b.capabilities.length) return b.capabilities.length - a.capabilities.length;
      return a.label.localeCompare(b.label);
    });
}

export function explainModelSelection(model, required = []) {
  if (!model) return { selected: null, reason: 'No configured model satisfies the requested capabilities.' };
  const missing = (Array.isArray(required) ? required : []).filter(capability => !model.capabilities.includes(normalise(capability)));
  return {
    selected: model.id,
    local: model.local,
    missing,
    reason: missing.length ? 'Selected model is the closest available match.' : 'Selected model satisfies the requested capabilities.',
  };
}
