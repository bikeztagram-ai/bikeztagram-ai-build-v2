/* BIKEZTAGRAM AI — resumable trailer session model. £0-only. */

const STORAGE_PREFIX = 'bikeztagram.cinematic.session.';

export function createTrailerSession(plan, id = `trailer-${Date.now()}`) {
  return { version: 1, id, status: 'ready', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), plan, shots: (plan?.shots || []).map((shot) => ({ ...shot, id: shot.id, status: 'pending', attempts: 0, error: null })), results: [], output: null };
}

export function updateTrailerSession(session, patch = {}) { return { ...session, ...patch, updatedAt: new Date().toISOString() }; }

export function updateTrailerShot(session, shotId, patch = {}) {
  const shots = (session.shots || []).map((shot) => shot.id === shotId ? { ...shot, ...patch } : shot);
  const failed = shots.some((shot) => shot.status === 'failed');
  const complete = shots.length > 0 && shots.every((shot) => shot.status === 'complete');
  return updateTrailerSession(session, { shots, status: failed ? 'error' : complete ? 'complete' : 'generating' });
}

export function markShotStarted(session, shotId) {
  const current = (session.shots || []).find((shot) => shot.id === shotId);
  return updateTrailerShot(session, shotId, { status: 'generating', attempts: (current?.attempts || 0) + 1, error: null });
}

export function markShotCompleted(session, shotId, metadata = {}) { return updateTrailerShot(session, shotId, { status: 'complete', error: null, ...metadata }); }
export function markShotFailed(session, shotId, error) { return updateTrailerShot(session, shotId, { status: 'failed', error: error?.message || String(error) }); }
export function getNextPendingShot(session) { const pending = (session?.shots || []).find((shot) => shot.status === 'pending' || shot.status === 'generating'); return pending ? { ...pending, ...(session.plan?.shots || []).find((shot) => shot.id === pending.id) } : null; }
export function isTrailerComplete(session) { return Array.isArray(session?.shots) && session.shots.length > 0 && session.shots.every((shot) => shot.status === 'complete'); }

export function saveTrailerSession(session) { if (!session?.id) throw new Error('Trailer session requires an id.'); localStorage.setItem(STORAGE_PREFIX + session.id, JSON.stringify(session)); return session; }
export function loadTrailerSession(id) { if (!id) return null; try { const raw = localStorage.getItem(STORAGE_PREFIX + id); return raw ? JSON.parse(raw) : null; } catch { return null; } }
export function removeTrailerSession(id) { if (id) localStorage.removeItem(STORAGE_PREFIX + id); }
