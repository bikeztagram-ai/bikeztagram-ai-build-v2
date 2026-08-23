import { createCreativeSession, transitionCreativeSession, recordCreativeEvidence, appendRevision } from './creativeSessionStateV1.js';

const noop = async value => value;

export async function executeCreativeSession({ request, assets = [], targetDuration = 15, existingSession = null, director = noop, musicDirector = noop, sceneDirector = noop, assembler = noop, renderer = noop, qa = noop, exporter = noop, maxRevisions = 2, onEvent = () => {} } = {}) {
  let session = existingSession || createCreativeSession({ request, assets, targetDuration });
  const emit = event => { onEvent(event, session); };
  const run = async (stage, fn, patch = {}) => {
    session = transitionCreativeSession(session, stage, patch);
    emit({ type: 'stage:start', stage });
    try { const result = await fn(session); emit({ type: 'stage:complete', stage }); return result; }
    catch (error) { session = transitionCreativeSession(session, 'blocked', { error: { message: error?.message || String(error), stage } }); emit({ type: 'stage:error', stage, error: session.error }); throw error; }
  };

  if (!session.brief) session = transitionCreativeSession(session, 'brief', { brief: await director({ mode: 'brief', request: session.request, assets: session.assets, targetDuration: session.targetDuration }) });
  if (!session.direction) session = transitionCreativeSession(session, 'direction', { direction: await director({ mode: 'direction', request: session.request, brief: session.brief, assets: session.assets, targetDuration: session.targetDuration }) });

  if (!session.music?.result || !session.scenes?.results?.length) {
    session = transitionCreativeSession(session, 'music', { music: { ...session.music, request: await musicDirector({ request: session.request, brief: session.brief, direction: session.direction, targetDuration: session.targetDuration }) } });
    session = transitionCreativeSession(session, 'scenes', { scenes: { ...session.scenes, requests: await sceneDirector({ request: session.request, brief: session.brief, direction: session.direction, assets: session.assets, targetDuration: session.targetDuration }) } });
    const [musicResult, sceneResults] = await Promise.all([
      musicDirector({ mode: 'execute', request: session.music.request, targetDuration: session.targetDuration }),
      sceneDirector({ mode: 'execute', requests: session.scenes.requests, assets: session.assets, targetDuration: session.targetDuration })
    ]);
    session = transitionCreativeSession(session, 'scenes', { music: { ...session.music, result: musicResult }, scenes: { ...session.scenes, results: sceneResults } });
    session = recordCreativeEvidence(session, 'generation', { music: Boolean(musicResult), scenes: Array.isArray(sceneResults) ? sceneResults.length : 0 });
  }

  session = await run('assembly', async current => assembler({ request: current.request, brief: current.brief, direction: current.direction, music: current.music.result, scenes: current.scenes.results, assets: current.assets, targetDuration: current.targetDuration }), { timeline: null });
  session.timeline = await assembler({ request: session.request, brief: session.brief, direction: session.direction, music: session.music.result, scenes: session.scenes.results, assets: session.assets, targetDuration: session.targetDuration });

  let attempts = 0;
  while (attempts <= maxRevisions) {
    attempts += 1;
    session = await run('render', async current => renderer({ timeline: current.timeline, music: current.music.result, assets: current.assets }), { render: null });
    session.render = await renderer({ timeline: session.timeline, music: session.music.result, assets: session.assets });
    session = await run('qa', async current => qa({ render: current.render, timeline: current.timeline, direction: current.direction, music: current.music.result }), { qa: null });
    session.qa = await qa({ render: session.render, timeline: session.timeline, direction: session.direction, music: session.music.result });
    if (session.qa?.verdict === 'pass' || session.qa?.pass === true || attempts > maxRevisions) break;
    session = transitionCreativeSession(session, 'revision');
    session = appendRevision(session, { attempt: attempts, reasons: session.qa?.reasons || [], verdict: session.qa?.verdict || 'revise' });
    session.direction = await director({ mode: 'revision', request: session.request, brief: session.brief, direction: session.direction, qa: session.qa, assets: session.assets, targetDuration: session.targetDuration });
    session.music.result = await musicDirector({ mode: 'revise', request: session.music.request, direction: session.direction, qa: session.qa, targetDuration: session.targetDuration });
    session.scenes.results = await sceneDirector({ mode: 'revise', requests: session.scenes.requests, direction: session.direction, qa: session.qa, assets: session.assets, targetDuration: session.targetDuration });
    session.timeline = await assembler({ request: session.request, brief: session.brief, direction: session.direction, music: session.music.result, scenes: session.scenes.results, assets: session.assets, targetDuration: session.targetDuration });
  }

  session = await run('export', async current => exporter({ render: current.render, timeline: current.timeline, sessionId: current.sessionId }), { export: null });
  session.export = await exporter({ render: session.render, timeline: session.timeline, sessionId: session.sessionId });
  session = transitionCreativeSession(session, 'complete');
  return session;
}
