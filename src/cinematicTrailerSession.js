/* BIKEZTAGRAM AI — resumable trailer session model. £0-only. */

const STORAGE_PREFIX = 'bikeztagram.cinematic.session.';

export function createTrailerSession(plan, id = `trailer-${Date.now()}`) {
  return {
    version: 1,
    id,
    status: 'ready',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plan,
    shots: (plan?.shots || []).map((shot) => ({ id: shot.id, status: 'pending', attempts: 0, error: null })),
    output: null,
  };
}

export function updateTrailerSession(session, patch = {}) {
  return { ...session, ...patch, updatedAt: new Date().toISOString() };
}

export function updateTrailerShot(session, shotId, patch = {}) {
  const shots = (session.shots || []).map((shot) => shot.id === shotId ? { ...shot, ...patch } : shot);
  const failed = shots.some((shot) => shot.status === 'failed');
  const complete = shots.length > 0 && shots.every((shot) => shot.status === 'complete');
  return updateTrailerSession(session, { shots, status: failed ? 'error' : complete ? 'complete' : 'generating' });
}

export function saveTrailerSession(session) {
  if (!session?.id) throw new Error('Trailer session requires an id.');
  localStorage.setItem(STORAGE_PREFIX + session.id, JSON.stringify(session));
  return session;
}

export function loadTrailerSession(id) {
  if (!id) return null;
  try { const raw = localStorage.getItem(STORAGE_PREFIX + id); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function removeTrailerSession(id) {
  if (id) localStorage.removeItem(STORAGE_PREFIX + id);
}
