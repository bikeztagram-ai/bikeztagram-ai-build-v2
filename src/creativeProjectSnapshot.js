/* Version project state so revisions can be compared and safely restored. */
export function snapshotProject(project = {}, label = 'checkpoint') {
  return { id:`snap-${Date.now()}`, label, createdAt:new Date().toISOString(), project:JSON.parse(JSON.stringify(project)) };
}
export function appendSnapshot(history = [], project = {}, label = 'checkpoint', limit = 20) {
  return [...history, snapshotProject(project,label)].slice(-Math.max(1,limit));
}
export function restoreSnapshot(history = [], id) { const found = history.find((s)=>s.id===id); return found ? JSON.parse(JSON.stringify(found.project)) : null; }
