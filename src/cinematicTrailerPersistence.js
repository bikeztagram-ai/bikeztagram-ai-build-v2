/* BIKEZTAGRAM AI — local-only cinematic trailer persistence. */

const PREFIX = 'bikeztagram.cinematic.trailer.';

export function saveTrailerManifest(manifest) {
  if (!manifest?.id || typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(`${PREFIX}${manifest.id}`, JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function loadTrailerManifest(id) {
  if (!id || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function deleteTrailerManifest(id) {
  if (!id || typeof localStorage === 'undefined') return false;
  try {
    localStorage.removeItem(`${PREFIX}${id}`);
    return true;
  } catch {
    return false;
  }
}

export function listTrailerManifests() {
  if (typeof localStorage === 'undefined') return [];
  const manifests = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(PREFIX)) continue;
      try { manifests.push(JSON.parse(localStorage.getItem(key))); } catch {}
    }
  } catch {}
  return manifests.filter(Boolean).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}
