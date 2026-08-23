import { createCreativeSession, transitionCreativeSession, recordCreativeEvidence, appendRevision } from './creativeSessionStateV1.js';

const noop = async value => value;

export async function executeCreativeSession({ request, assets = [], targetDuration = 15, existingSession = null, director = noop, musicDirector = noop, sceneDirector = noop, assembler = noop, renderer = noop, qa = noop, exporter = noop, maxRevisions = 2, onEvent = () => {} } = {}) {
  let session = existingSession || createCreativeSession({ request, assets, targetDuration });
  const emit = event => onEvent(event, session);
  const stage = (name, patch = {}) => { session = transitionCreativeSession(session, name, patch); emit({ type: 'stage:start', stage: name }); };
  const complete = name => emit({ type: 'stage:complete', stage: name });
  const fail = (name, error) => { session = transitionCreativeSession(session, 'blocked', { error: { message: error?.message || String(error), stage: name } }); emit({ type: 'stage:error', stage: name, error: session.error }); throw error; };
  const run = async (name, fn, patch = {}) => { stage(name, patch); try { const result = await fn(session); complete(name); return result; } catch (error) { return fail(name, error); } };

  if (!session.brief) session.brief = await run('brief', current => director({ mode: 'brief', request: current.request, assets: current.assets, targetDuration: current.targetDuration }));
  if (!session.direction) session.direction = await run('direction', current => director({ mode: 'direction', request: current.request, brief: current.brief, assets: current.assets, targetDuration: current.targetDuration }));

  if (!session.music?.result || !session.scenes?.results?.length) {
    stage('music');
    const [musicRequest, sceneRequests] = await Promise.all([
      musicDirector({ mode: 'plan', request: session.request, brief: session.brief, direction: session.direction, targetDuration: session.targetDuration }),
      sceneDirector({ mode: 'plan', request: session.request, brief: session.brief, direction: session.direction, assets: session.assets, targetDuration: session.targetDuration })
    ]).catch(error => fail('music', error));
    session.music.request = musicRequest;
    session.scenes.requests = sceneRequests;
    complete('music');

    stage('scenes');
    const [musicResult, sceneResults] = await Promise.all([
      musicDirector({ mode: 'execute', request: musicRequest, targetDuration: session.targetDuration }),
      sceneDirector({ mode: 'execute', requests: sceneRequests, assets: session.assets, targetDuration: session.targetDuration })
    ]).catch(error => fail('scenes', error));
    session.music.result = musicResult;
    session.scenes.results = sceneResults;
    session = recordCreativeEvidence(session, 'generation', { music: Boolean(musicResult), scenes: Array.isArray(sceneResults) ? sceneResults.length : 0 });
    complete('scenes');
  }

  session.timeline = await run('assembly', current => assembler({ request: current.request, brief: current.brief, direction: current.direction, music: current.music.result, scenes: current.scenes.results, assets: current.assets, targetDuration: current.targetDuration }));

  for (let attempt = 1; attempt <= maxRevisions + 1; attempt += 1) {
    session.render = await run('render', current => renderer({ timeline: current.timeline, music: current.music.result, assets: current.assets }), { render: null });
    session.qa = await run('qa', current => qa({ render: current.render, timeline: current.timeline, direction: current.direction, music: current.music.result }), { qa: null });
    if (session.qa?.verdict === 'pass' || session.qa?.pass === true || attempt > maxRevisions) break;
    session = transitionCreativeSession(session, 'revision');
    session = appendRevision(session, { attempt, reasons: session.qa?.reasons || [], verdict: session.qa?.verdict || 'revise' });
    session.direction = await director({ mode: 'revision', request: session.request, brief: session.brief, direction: session.direction, qa: session.qa, assets: session.assets, targetDuration: session.targetDuration });
    const [musicResult, sceneResults] = await Promise.all([
      musicDirector({ mode: 'revise', request: session.music.request, direction: session.direction, qa: session.qa, targetDuration: session.targetDuration }),
      sceneDirector({ mode: 'revise', requests: session.scenes.requests, direction: session.direction, qa: session.qa, assets: session.assets, targetDuration: session.targetDuration })
    ]);
    session.music.result = musicResult;
    session.scenes.results = sceneResults;
    session.timeline = await assembler({ request: session.request, brief: session.brief, direction: session.direction, music: musicResult, scenes: sceneResults, assets: session.assets, targetDuration: session.targetDuration });
  }

  session.export = await run('export', current => exporter({ render: current.render, timeline: current.timeline, sessionId: current.sessionId }), { export: null });
  session = transitionCreativeSession(session, 'complete');
  emit({ type: 'session:complete' });
  return session;
}
