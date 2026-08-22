// Bikeztagram AI — executable Creative Engine runtime facade.
import { createCreativeJob, planCreativeParallelism, recordGenerationEvidence, checkpointCreativeJob, applyBoundedRevision, finaliseCreativeSnapshot } from './creativeEngineControlPlane.js';
import { buildCreativeBrief, buildMusicRequest, buildSceneRequests, summariseCreativeAssets } from './creativeEngineMediaBridge.js';
import { directOriginalMusic, synthesizeOriginalWav, musicToCutEvents } from './inHouseMusicDirector.js';
import { materialiseGeneratedScenes, validateCreativeTimeline, beatAlignTimeline } from './creativeSceneTimeline.js';

export async function runCreativeEngine({ request, assets = [], targetDuration = 15, director, music, scenes, assemble, render, qa, exportFilm, maxRevisionAttempts = 2 } = {}) {
  let job = createCreativeJob({ request, assets, targetDuration });
  const mediaBrief = buildCreativeBrief({ request, assets });
  job = { ...job, brief: { ...job.brief, ...mediaBrief }, assets: summariseCreativeAssets(assets) };
  if (director) job = { ...job, brief: { ...job.brief, ...(await director(job.brief, job.assets)) }, updatedAt: new Date().toISOString() };
  job = checkpointCreativeJob(planCreativeParallelism(job), 'music+scenes');

  const musicRequest = buildMusicRequest(job.brief, { duration: targetDuration, ...(job.brief.music || {}) });
  const sceneRequests = buildSceneRequests(job.brief, job.brief.plan || {});
  const localMusicPlan = directOriginalMusic({ request: musicRequest.prompt, duration: musicRequest.duration, mood: musicRequest.mood, energy: musicRequest.energy, bpm: musicRequest.bpm || 110 });
  const [musicResult, sceneResult] = await Promise.all([
    music ? music({ ...job.brief, request: musicRequest, localPlan: localMusicPlan }) : Promise.resolve({ plan: localMusicPlan, audio: synthesizeOriginalWav(localMusicPlan) }),
    scenes ? scenes({ ...job.brief, requests: sceneRequests }, job.assets) : Promise.resolve([]),
  ]);
  job = recordGenerationEvidence(job, { kind: 'music', request: musicRequest, result: musicResult ? 'completed' : 'not-configured', localFallback: true });
  job = recordGenerationEvidence(job, { kind: 'video', requests: sceneRequests, result: sceneResult ? 'completed' : 'not-configured' });
  job.outputs.music = musicResult;
  job.outputs.musicPlan = localMusicPlan;
  job.outputs.scenes = sceneResult || [];
  job = checkpointCreativeJob(job, 'assemble', { musicReady: Boolean(musicResult), scenesReady: Boolean(sceneResult), generatedSceneCount: sceneRequests.length });

  const rawTimeline = assemble ? await assemble({ job, music: musicResult, musicPlan: localMusicPlan, scenes: sceneResult }) : { music: musicResult, scenes: sceneResult };
  const materialised = materialiseGeneratedScenes({ uploaded: job.assets, generated: sceneResult, cuts: rawTimeline.cuts || rawTimeline.timeline || [] });
  const beatLocked = beatAlignTimeline(materialised.timeline, musicToCutEvents(localMusicPlan));
  const timeline = { ...rawTimeline, items: materialised.items, timeline: beatLocked, musicPlan: localMusicPlan };
  const timelineCheck = validateCreativeTimeline({ ...materialised, timeline: beatLocked });
  if (!timelineCheck.ok) throw new Error(`Creative timeline validation failed: ${timelineCheck.failures.join(', ')}`);
  job.outputs.timeline = timeline;
  job = checkpointCreativeJob(job, 'render', { timelineReady: true, beatLocked: beatLocked.length > 0 });
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
    const revisedMusicPlan = directOriginalMusic({ request: job.brief.request, duration: targetDuration, mood: job.brief.music?.mood || 'cinematic', energy: Number(job.brief.music?.energy ?? .65), bpm: Number(job.brief.music?.bpm) || 110 });
    if (music) job.outputs.music = await music({ ...job.brief, request: buildMusicRequest(job.brief, { duration: targetDuration, ...(job.brief.music || {}) }), localPlan: revisedMusicPlan }); else job.outputs.music = { plan: revisedMusicPlan, audio: synthesizeOriginalWav(revisedMusicPlan) };
    if (scenes) job.outputs.scenes = await scenes({ ...job.brief, requests: revisedSceneRequests }, job.assets);
    if (assemble) { const revisedRaw = await assemble({ job, music: job.outputs.music, musicPlan: revisedMusicPlan, scenes: job.outputs.scenes, revision: revision.weaknesses }); const revisedMaterialised = materialiseGeneratedScenes({ uploaded: job.assets, generated: job.outputs.scenes, cuts: revisedRaw.cuts || revisedRaw.timeline || [] }); const revisedTimeline = beatAlignTimeline(revisedMaterialised.timeline, musicToCutEvents(revisedMusicPlan)); job.outputs.timeline = { ...revisedRaw, items: revisedMaterialised.items, timeline: revisedTimeline, musicPlan: revisedMusicPlan }; }
    if (render) job.outputs.render = await render({ job, timeline: job.outputs.timeline, revision: revision.weaknesses });
    qaResult = qa ? await qa({ job, timeline: job.outputs.timeline, render: job.outputs.render }) : { score: 1 };
  }
  job.outputs.qa = qaResult;
  return finaliseCreativeSnapshot(job, { timeline: job.outputs.timeline, qa: qaResult, render: job.outputs.render, exportInfo: exportFilm ? await exportFilm(job) : null });
}
