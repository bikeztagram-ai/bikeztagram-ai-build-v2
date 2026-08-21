/* Bikeztagram AI Creative Engine — top-level direction contract.
   This is provider-agnostic orchestration data. It does not call a model by itself. */

const text = (value) => String(value ?? '').trim();
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));

export function buildCreativeBrief({ prompt = '', duration = 15, aspectRatio = '9:16', outputCount = 1 } = {}) {
  return {
    version: 'creative-brief-v1',
    prompt: text(prompt),
    duration: clamp(duration, 3, 600),
    aspectRatio: ['9:16', '1:1', '16:9'].includes(aspectRatio) ? aspectRatio : '9:16',
    outputCount: Math.max(1, Math.min(10, Math.floor(Number(outputCount) || 1))),
    story: { hook: '', build: '', reveal: '', escalation: '', climax: '', outro: '' },
    visual: { style: '', camera: '', lighting: '', environment: '', motion: '' },
    music: { request: '', genre: '', bpm: null, energy: null, drops: [], sections: [] },
    assets: { realMedia: [], generatedScenes: [], generatedInserts: [] },
    generation: { allowTextToVideo: true, allowImageToVideo: true, allowSubjectReference: true, allowGeneratedAudio: true },
    constraints: { preserveIdentity: true, preserveUserAssets: true, originalGeneration: true },
    revision: { requested: false, reasons: [] }
  };
}

export function buildGenerationRequest({ type, prompt, duration, assets = [], subjectIds = [], timelineSlot = null } = {}) {
  const allowed = ['music', 'text-to-video', 'image-to-video', 'infill', 'transition', 'establishing-shot', 'insert'];
  if (!allowed.includes(type)) throw new Error(`Unsupported creative generation type: ${type}`);
  return {
    version: 'generation-request-v1',
    id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    prompt: text(prompt),
    duration: clamp(duration, 0.5, 120),
    assets: Array.isArray(assets) ? assets : [],
    subjectIds: Array.isArray(subjectIds) ? subjectIds : [],
    timelineSlot,
    originalOnly: true,
    status: 'queued'
  };
}

export function buildCreativeJob(brief, { media = [], generationRequests = [] } = {}) {
  const safeBrief = brief?.version === 'creative-brief-v1' ? brief : buildCreativeBrief(brief || {});
  return {
    version: 'creative-job-v1',
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'planned',
    brief: safeBrief,
    media: Array.isArray(media) ? media : [],
    generationRequests: Array.isArray(generationRequests) ? generationRequests : [],
    stages: ['analyse', 'direct', 'generate-music', 'generate-scenes', 'assemble', 'render', 'qa', 'revise', 'export'],
    revision: { attempts: 0, maxAttempts: 3 }
  };
}
