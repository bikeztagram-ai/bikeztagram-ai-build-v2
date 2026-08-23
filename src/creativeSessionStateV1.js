const STAGES = ['intake','brief','direction','music','scenes','assembly','render','qa','revision','export','complete','blocked'];
const TERMINAL = new Set(['complete','blocked']);

export function createCreativeSession({ request = '', assets = [], targetDuration = 15, sessionId = `creative-${Date.now()}-${Math.random().toString(36).slice(2,8)}` } = {}) {
  return {
    version: 1,
    sessionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stage: 'intake',
    request: String(request || '').trim(),
    targetDuration: Math.max(1, Number(targetDuration) || 15),
    assets: assets.map((asset, index) => ({ id: asset?.id || `asset-${index}`, type: asset?.type || 'unknown', name: asset?.name || `asset-${index}`, sourceUrl: asset?.sourceUrl || asset?.url || '', subjectId: asset?.subjectId || null })),
    brief: null,
    direction: null,
    music: { request: null, result: null, evidence: null },
    scenes: { requests: [], results: [], evidence: null },
    timeline: null,
    render: null,
    qa: null,
    revisions: [],
    export: null,
    events: []
  };
}

export function transitionCreativeSession(session, stage, patch = {}) {
  if (!session || !STAGES.includes(stage)) throw new Error(`Invalid creative session stage: ${stage}`);
  if (TERMINAL.has(session.stage) && stage !== session.stage) throw new Error(`Cannot transition terminal session from ${session.stage} to ${stage}`);
  const next = { ...session, ...patch, stage, updatedAt: new Date().toISOString() };
  next.events = [...(session.events || []), { at: next.updatedAt, type: 'stage', from: session.stage, to: stage }];
  return next;
}

export function recordCreativeEvidence(session, kind, evidence) {
  const event = { at: new Date().toISOString(), type: 'evidence', kind, evidence };
  return { ...session, updatedAt: event.at, events: [...(session.events || []), event] };
}

export function appendRevision(session, revision) {
  const item = { id: `revision-${(session.revisions?.length || 0) + 1}`, at: new Date().toISOString(), ...revision };
  return { ...session, updatedAt: item.at, revisions: [...(session.revisions || []), item], events: [...(session.events || []), { at: item.at, type: 'revision', revision: item }] };
}

export function canResumeCreativeSession(session) {
  return Boolean(session?.sessionId) && !TERMINAL.has(session?.stage);
}

export function summarizeCreativeSession(session) {
  return { sessionId: session.sessionId, stage: session.stage, assetCount: session.assets?.length || 0, revisionCount: session.revisions?.length || 0, hasMusic: Boolean(session.music?.result), generatedSceneCount: session.scenes?.results?.length || 0, hasTimeline: Boolean(session.timeline), qaVerdict: session.qa?.verdict || null, complete: session.stage === 'complete' };
}

export { STAGES };
