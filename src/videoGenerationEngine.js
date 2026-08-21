/* Bikeztagram AI Video Generation Engine.
   A stable product-owned contract for text-to-video, image-to-video and subject-aware scenes.
   Runtime/model implementations remain replaceable. */

const text = (value) => String(value ?? '').trim();
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));

export function createVideoGenerationRequest({ type = 'text-to-video', prompt = '', duration = 3, aspectRatio = '9:16', referenceAssets = [], subjectIds = [], camera = '', motion = '', environment = '' } = {}) {
  const allowed = ['text-to-video', 'image-to-video', 'subject-scene', 'infill', 'transition', 'establishing-shot', 'insert'];
  if (!allowed.includes(type)) throw new Error(`Unsupported video generation type: ${type}`);
  return {
    version: 'video-generation-request-v1',
    id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    prompt: text(prompt),
    duration: clamp(duration, 0.5, 60),
    aspectRatio: ['9:16', '1:1', '16:9'].includes(aspectRatio) ? aspectRatio : '9:16',
    referenceAssets: Array.isArray(referenceAssets) ? referenceAssets : [],
    subjectIds: Array.isArray(subjectIds) ? subjectIds : [],
    direction: { camera: text(camera), motion: text(motion), environment: text(environment) },
    constraints: { preserveSubjectIdentity: subjectIds.length > 0, originalOnly: true },
    status: 'queued'
  };
}

export function buildVideoGenerationAdapter({ generate } = {}) {
  return {
    async generateScene(request, context = {}) {
      if (typeof generate !== 'function') return { request, status: 'unavailable', source: null };
      const result = await generate(request, context);
      if (!result?.videoUrl && !result?.blob && !result?.videoBlob) throw new Error('Video generation adapter returned no video output.');
      return { ...result, request, status: 'ready', source: result.source || 'model' };
    }
  };
}

export function buildSceneTimelineInsert({ request, asset, startTime = 0, role = 'generated-scene' } = {}) {
  if (!request?.version || !asset) throw new Error('Generated scene insertion requires a request and asset.');
  return {
    version: 'generated-scene-insert-v1',
    role,
    startTime: Number(startTime) || 0,
    duration: Number(request.duration) || 1,
    source: asset,
    generated: true,
    requestId: request.id,
    subjectIds: request.subjectIds || [],
    originalOnly: true
  };
}
