const STORAGE_PREFIX = 'bikeztagram-ai:project:v2';
const SLOT_A = `${STORAGE_PREFIX}:a`;
const SLOT_B = `${STORAGE_PREFIX}:b`;
const POINTER = `${STORAGE_PREFIX}:pointer`;
const SCHEMA_VERSION = 1;

const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = value => Number.isFinite(Number(value));

function serialiseSource(source) {
  if (!isObject(source)) return null;
  return {
    id: source.id || null,
    name: source.name || null,
    type: source.type || null,
    mimeType: source.mimeType || source.type || null,
    pathname: source.pathname || null,
    sourceUrl: source.sourceUrl || source.url || null,
    url: source.url || source.sourceUrl || null,
    size: finite(source.file?.size) ? Number(source.file.size) : null,
    lastModified: finite(source.file?.lastModified) ? Number(source.file.lastModified) : null,
    restorableMedia: Boolean(source.sourceUrl || source.url)
  };
}

function sanitise(value, depth = 0) {
  if (depth > 8 || value == null) return value ?? null;
  if (typeof value === 'function' || typeof value === 'bigint') return null;
  if (value instanceof Blob || value instanceof File) return null;
  if (Array.isArray(value)) return value.slice(0, 100).map(item => sanitise(item, depth + 1));
  if (!isObject(value)) return value;
  const out = {};
  for (const [key, item] of Object.entries(value).slice(0, 200)) {
    if (key === 'file' || key === 'blob' || key === 'File' || key === 'mediaBlob') continue;
    out[key] = sanitise(item, depth + 1);
  }
  return out;
}

export function createProjectSnapshot({ prompt, sources, analysis, plan, productionPlan, soundtrack, exportInfo, editorState = {} }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    creativeBrief: String(prompt || ''),
    sources: (sources || []).map(serialiseSource).filter(Boolean),
    analysis: sanitise(analysis),
    plan: sanitise(plan),
    productionPlan: sanitise(productionPlan),
    soundtrack: sanitise(soundtrack),
    exportInfo: sanitise(exportInfo),
    editorState: sanitise(editorState),
  };
}

function validate(snapshot) {
  if (!isObject(snapshot) || snapshot.schemaVersion !== SCHEMA_VERSION) return { ok: false, reason: 'unsupported-schema' };
  if (typeof snapshot.creativeBrief !== 'string' || !Array.isArray(snapshot.sources)) return { ok: false, reason: 'invalid-shape' };
  if (snapshot.sources.some(source => !isObject(source) || typeof source.id !== 'string')) return { ok: false, reason: 'invalid-source' };
  return { ok: true };
}

function readSlot(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return validate(parsed).ok ? parsed : null;
  } catch { return null; }
}

export function saveProject(snapshot) {
  if (typeof window === 'undefined') return { ok: false, reason: 'no-window' };
  const validation = validate(snapshot);
  if (!validation.ok) return { ok: false, reason: validation.reason };
  try {
    const active = window.localStorage.getItem(POINTER) === 'b' ? 'b' : 'a';
    const next = active === 'a' ? 'b' : 'a';
    const key = next === 'a' ? SLOT_A : SLOT_B;
    const payload = JSON.stringify(snapshot);
    window.localStorage.setItem(key, payload);
    const written = readSlot(key);
    if (!written) return { ok: false, reason: 'write-verification-failed' };
    window.localStorage.setItem(POINTER, next);
    return { ok: true, savedAt: snapshot.savedAt, slot: next };
  } catch (error) {
    return { ok: false, reason: error?.name === 'QuotaExceededError' ? 'storage-quota' : 'storage-write-failed' };
  }
}

export function loadProject() {
  if (typeof window === 'undefined') return { ok: false, reason: 'no-window' };
  const preferred = window.localStorage.getItem(POINTER) === 'b' ? 'b' : 'a';
  const first = readSlot(preferred === 'a' ? SLOT_A : SLOT_B);
  if (first) return { ok: true, snapshot: migrate(first), recovered: false };
  const fallback = readSlot(preferred === 'a' ? SLOT_B : SLOT_A);
  if (fallback) return { ok: true, snapshot: migrate(fallback), recovered: true };
  return { ok: false, reason: 'no-valid-project' };
}

function migrate(snapshot) {
  if (snapshot.schemaVersion === SCHEMA_VERSION) return snapshot;
  return { ...snapshot, schemaVersion: SCHEMA_VERSION };
}

export function restoreSources(snapshotSources = []) {
  return snapshotSources.map(source => ({
    ...source,
    file: null,
    missingMedia: !source.url && !source.sourceUrl,
    restorableMedia: Boolean(source.url || source.sourceUrl)
  }));
}

export function clearProjectPersistence() {
  if (typeof window === 'undefined') return;
  [SLOT_A, SLOT_B, POINTER].forEach(key => window.localStorage.removeItem(key));
}

export { SCHEMA_VERSION };
