/* Bikeztagram AI — unified Creative Engine contracts. Provider/model agnostic. */
const text = v => String(v ?? '').trim();
const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const clamp = (v, min, max, fallback = min) => Math.max(min, Math.min(max, num(v, fallback)));
const ratio = ['9:16','1:1','16:9'];

export function buildCreativeBrief({ prompt = '', duration = 15, aspectRatio = '9:16', outputCount = 1, assets = [] } = {}) {
  return {
    version:'creative-brief-v2', prompt:text(prompt), duration:clamp(duration,3,600,15),
    aspectRatio:ratio.includes(aspectRatio) ? aspectRatio : '9:16',
    outputCount:Math.max(1,Math.min(10,Math.floor(num(outputCount,1)))),
    story:{ hook:'', build:'', reveal:'', escalation:'', climax:'', outro:'' },
    visual:{ style:'', camera:'', lighting:'', environment:'', motion:'', palette:'' },
    music:{ request:'', genre:'', bpm:null, mood:'', energy:null, sections:[], events:[] },
    assets:{ realMedia:Array.isArray(assets)?assets:[], generatedScenes:[], generatedInserts:[] },
    generation:{ allowTextToVideo:true, allowImageToVideo:true, allowSubjectReference:true, allowGeneratedAudio:true },
    constraints:{ preserveIdentity:true, preserveUserAssets:true, originalGeneration:true },
    revision:{ requested:false, reasons:[], attempts:0 }
  };
}

export function buildGenerationRequest({ type, prompt='', duration=3, assets=[], subjectIds=[], timelineSlot=null, direction={} } = {}) {
  const allowed=['music','text-to-video','image-to-video','subject-scene','infill','transition','establishing-shot','insert'];
  if(!allowed.includes(type)) throw new Error(`Unsupported creative generation type: ${type}`);
  return { version:'generation-request-v2', id:`gen-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, type,
    prompt:text(prompt), duration:clamp(duration,.5,120,3), assets:Array.isArray(assets)?assets:[], subjectIds:Array.isArray(subjectIds)?subjectIds:[], timelineSlot,
    direction:{camera:text(direction.camera),motion:text(direction.motion),lighting:text(direction.lighting),environment:text(direction.environment)},
    originalOnly:true, status:'queued' };
}

export function buildCreativeJob(brief,{media=[],generationRequests=[]}={}) {
  const safe = brief?.version?.startsWith('creative-brief-') ? brief : buildCreativeBrief(brief||{});
  return { version:'creative-job-v2', id:`job-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, status:'planned', brief:safe,
    media:Array.isArray(media)?media:[], generationRequests:Array.isArray(generationRequests)?generationRequests:[],
    stages:['understand','direct','music','scenes','assemble','render','qa','revise','export'], revision:{attempts:0,maxAttempts:3} };
}
