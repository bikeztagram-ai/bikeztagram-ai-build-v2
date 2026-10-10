const DB_NAME = 'bikeztagram-video-cache';
const STORE = 'generated-videos';
const DB_VERSION = 1;
const MAX_CACHE_BYTES = 120 * 1024 * 1024;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Video cache request failed.'));
  });
}
function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local video cache.'));
  });
}
async function digest(value) {
  const text = String(value || '');
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(text);
    const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16);
}
export async function createVideoCacheKey({ provider, prompt, duration, ratio, promptImage = '' } = {}) {
  const imageHash = promptImage ? await digest(promptImage) : 'no-reference';
  return 'video-v1-' + await digest(JSON.stringify({ provider, prompt: String(prompt || '').trim(), duration: Number(duration) || 0, ratio: String(ratio || ''), imageHash }));
}
export async function getCachedVideo(key) {
  try {
    const db = await openDb();
    if (!db) return null;
    const tx = db.transaction(STORE, 'readonly');
    const entry = await requestResult(tx.objectStore(STORE).get(key));
    db.close();
    if (!entry || !(entry.blob instanceof Blob)) return null;
    if (Date.now() - Number(entry.createdAt || 0) > MAX_AGE_MS) {
      void deleteCachedVideo(key);
      return null;
    }
    return entry;
  } catch (error) {
    console.warn('[VIDEO CACHE] Read skipped:', error?.message || error);
    return null;
  }
}
export async function putCachedVideo(key, blob, metadata = {}) {
  if (!key || !(blob instanceof Blob) || !blob.size) return false;
  try {
    const db = await openDb();
    if (!db) return false;
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.put({ key, blob, metadata, size: blob.size, createdAt: Date.now() });
    const allRequest = store.getAll();
    allRequest.onsuccess = () => {
      const entries = (allRequest.result || []).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
      let total = entries.reduce((sum, entry) => sum + Number(entry.size || entry.blob?.size || 0), 0);
      for (const entry of entries) {
        if (total <= MAX_CACHE_BYTES) break;
        store.delete(entry.key);
        total -= Number(entry.size || entry.blob?.size || 0);
      }
    };
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error || new Error('Video cache write failed.')); tx.onabort = () => reject(tx.error || new Error('Video cache write aborted.')); });
    db.close();
    return true;
  } catch (error) {
    console.warn('[VIDEO CACHE] Write skipped:', error?.message || error);
    return false;
  }
}
export async function deleteCachedVideo(key) {
  try {
    const db = await openDb();
    if (!db) return false;
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
    db.close();
    return true;
  } catch { return false; }
}
