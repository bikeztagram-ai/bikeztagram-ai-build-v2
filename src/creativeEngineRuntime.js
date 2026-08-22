// Bikeztagram AI — executable Creative Engine runtime facade.
import { createCreativeJob, planCreativeParallelism, recordGenerationEvidence, checkpointCreativeJob, applyBoundedRevision, finaliseCreativeSnapshot } from './creativeEngineControlPlane.js';
import { buildCreativeBrief, buildMusicRequest, buildSceneRequests, summariseCreativeAssets } from './creativeEngineMediaBridge.js';

export async function runCreativeEngine({ request, assets = [], targetDuration = 15, director, music, scenes, assemble, render, qa, exportFilm, maxRevisionAttempts = 2 } = {}) {
  let job = createCreativeJob({ request, assets, targetDuration });
  const mediaBrief = buildCreativeBrief({ request, assets });
  job = { ...job, brief: { ...job.brief, ...mediaBrief }, assets: summariseCreativeAssets(assets) };

  if (director) {
    job = { ...job, brief: { ...job.brief, ...(await director(job.brief, job.assets)) }, updatedAt: new Date().toISOString() };
  }
  job = checkpointCreativeJob(planCreativeParallelism(job), 'music+scenes');

  const musicRequest = buildMusicRequest(job.brief, { duration: targetDuration, ...(job.brief.music || {}) });
  const sceneRequests = buildSceneRequests(job.brief, job.brief.plan || {});
  const [musicResult, sceneResult] = await Promise.all([
    music ? music({ ...job.brief, request: musicRequest }, job.assets) : Promise.resolve(null),
    scenes ? scenes({ ...job.brief, requests: sceneRequests }, job.assets) : Promise.resolve([]),
  ]);
  job = recordGenerationEvidence(job, { kind: 'music', request: musicRequest, result: musicResult ? 'completed' : 'not-configured' });
  job = recordGenerationEvidence(job, { kind: 'video', requests: sceneRequests, result: sceneResult ? 'completed' : 'not-configured' });
  job.outputs.music = musicResult;
  job.outputs.scenes = sceneResult || [];
  job = checkpointCreativeJob(job, 'assemble', { musicReady: Boolean(musicResult), scenesReady: Boolean(sceneResult), generatedSceneCount: sceneRequests.length });

  const timeline = assemble ? await assemble({ job, music: musicResult, scenes: sceneResult }) : { music: musicResult, scenes: sceneResult };
  job.outputs.timeline = timeline;
  job = checkpointCreativeJob(job, 'render', { timelineReady: Boolean(timeline) });
  const renderResult = render ? await render({ job, timeline }) : null;
  job.outputs.render = renderResult;
  let qaResult = qa ? await qa({ job, timeline, render: renderResult }) : { score: 1 };

  while (true) {
    const revision = applyBoundedRevision(job, qaResult?.scores || qaResult, maxRevisionAttempts);
    if (revision.decision !== 'revise') break;
    job = revision.job;
    job = checkpointCreativeJob(job, 'revise', { weaknesses: revision.weaknesses });
    if (director) job.brief = { ...job.brief, ...(await director({ ...job.brief, revision: revision.weaknesses }, job.assets)) };
    const revisedSceneRequests = buildSceneRequests(job.brief, job.brief.plan || {});
    if (music) job.outputs.music = await music({ ...job.brief, request: buildMusicRequest(job.brief, { duration: targetDuration, ...(job.brief.music || {}) }) }, job.assets);
    if (scenes) job.outputs.scenes = await scenes({ ...job.brief, requests: revisedSceneRequests }, job.assets);
    if (assemble) job.outputs.timeline = await assemble({ job, music: job.outputs.music, scenes: job.outputs.scenes, revision: revision.weaknesses });
    if (render) job.outputs.render = await render({ job, timeline: job.outputs.timeline, revision: revision.weaknesses });
    qaResult = qa ? await qa({ job, timeline: job.outputs.timeline, render: job.outputs.render }) : { score: 1 };
  }
  job.outputs.qa = qaResult;
  return finaliseCreativeSnapshot(job, { timeline: job.outputs.timeline, qa: qaResult, render: job.outputs.render, exportInfo: exportFilm ? await exportFilm(job) : null });
}
