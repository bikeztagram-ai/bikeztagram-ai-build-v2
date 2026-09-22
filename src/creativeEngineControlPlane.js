// Bikeztagram AI — Creative Engine control plane.
// Local-first, provider-neutral orchestration contract. This module deliberately
// does not modify the protected renderer, Blob, or Gemini infrastructure.

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function createCreativeJob({ request = '', assets = [], targetDuration = 15, preferences = {} } = {}) {
  if (!String(request).trim()) throw new Error('Creative request is required.');
  return {
    id: id('creative'), version: 1, status: 'planned', createdAt: now(), updatedAt: now(),
    brief: { request: String(request).trim(), targetDuration: Number(targetDuration) || 15, preferences: { ...preferences } },
    assets: assets.map((asset, index) => ({ id: asset.id || `asset-${index}`, name: asset.name || `asset-${index}`, type: asset.type || 'unknown', url: asset.url || '', source: 'uploaded' })),
    stages: ['understand', 'direct', 'music', 'scenes', 'assemble', 'render', 'qa', 'revise', 'export'],
    outputs: { music: null, scenes: [], timeline: null, render: null, qa: null, export: null },
    attempts: [], provenance: [], resume: { stage: 'understand', checkpoint: null },
  };
}

export function planCreativeParallelism(job, { musicWorker = 'local-music', videoWorker = 'local-video' } = {}) {
  const music = { id: id('music'), kind: 'music', worker: musicWorker, dependsOn: ['direct'], status: 'ready' };
  const video = { id: id('video'), kind: 'video', worker: videoWorker, dependsOn: ['direct'], status: 'ready' };
  return { ...job, updatedAt: now(), parallelJobs: [music, video], resume: { ...job.resume, stage: 'music+scenes' } };
}

export function selectWorker(workers = [], kind, { localFirst = true } = {}) {
  const candidates = workers.filter((worker) => worker.enabled !== false && worker.kinds?.includes(kind));
  candidates.sort((a, b) => {
    const local = Number(Boolean(b.local) && localFirst) - Number(Boolean(a.local) && localFirst);
    return local || (Number(b.priority) || 0) - (Number(a.priority) || 0);
  });
  return candidates[0] || null;
}

export function recordGenerationEvidence(job, evidence) {
  return { ...job, updatedAt: now(), provenance: [...(job.provenance || []), { id: id('evidence'), timestamp: now(), ...evidence }] };
}

export function checkpointCreativeJob(job, stage, payload = {}) {
  return { ...job, updatedAt: now(), resume: { stage, checkpoint: { timestamp: now(), ...payload } } };
}

export function applyBoundedRevision(job, qa = {}, maxAttempts = 2) {
  const attempts = Array.isArray(job.attempts) ? job.attempts : [];
  if (attempts.length >= maxAttempts) return { job, decision: 'stop', reason: 'maximum revision attempts reached' };
  const weaknesses = Object.entries(qa).filter(([, value]) => Number(value) < 0.7).map(([key]) => key);
  if (!weaknesses.length) return { job, decision: 'accept', reason: 'quality threshold met' };
  const revision = { attempt: attempts.length + 1, requestedAt: now(), weaknesses, status: 'planned' };
  return { job: { ...job, updatedAt: now(), attempts: [...attempts, revision], resume: { stage: 'revise', checkpoint: revision } }, decision: 'revise', weaknesses };
}

export function finaliseCreativeSnapshot(job, { timeline, qa, render, exportInfo } = {}) {
  return { ...job, updatedAt: now(), status: 'complete', outputs: { ...job.outputs, timeline: timeline || job.outputs.timeline, qa: qa || job.outputs.qa, render: render || job.outputs.render, export: exportInfo || job.outputs.export }, resume: { stage: 'export', checkpoint: { timestamp: now() } } };
}
