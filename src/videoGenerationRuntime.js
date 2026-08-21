/* Bikeztagram AI — provider/model-agnostic video generation runtime.
 * Supports text-to-video, image-to-video, subject-aware generation and
 * timeline inserts without coupling the Creative Engine to one model.
 */

const text = (value) => String(value ?? '').trim();

export function createVideoGenerationRequest({
  prompt = '', duration = 3, aspectRatio = '9:16',
  imageRefs = [], subjectRefs = [], style = '', camera = '', motion = '',
  environment = '', continuityKey = '', purpose = 'generated-scene',
} = {}) {
  const safeDuration = Math.max(1, Math.min(20, Number(duration) || 3));
  const safeRatio = ['9:16', '1:1', '16:9'].includes(aspectRatio) ? aspectRatio : '9:16';
  return {
    version: 'video-generation-request-v1',
    prompt: text(prompt),
    duration: safeDuration,
    aspectRatio: safeRatio,
    imageRefs: Array.isArray(imageRefs) ? imageRefs.filter(Boolean) : [],
    subjectRefs: Array.isArray(subjectRefs) ? subjectRefs.filter(Boolean) : [],
    style: text(style),
    camera: text(camera),
    motion: text(motion),
    environment: text(environment),
    continuityKey: text(continuityKey),
    purpose: text(purpose) || 'generated-scene',
  };
}

export function buildVideoGenerationAdapter({ generate, fallback } = {}) {
  return {
    async generateScene(request) {
      if (typeof generate === 'function') {
        const result = await generate(request);
        if (result?.videoUrl || result?.videoDataUrl || result?.blob) return { ...result, source: 'model', request };
      }
      if (typeof fallback === 'function') {
        const result = await fallback(request);
        if (result) return { ...result, source: 'fallback', request };
      }
      return { source: 'unavailable', videoUrl: null, request };
    },
  };
}

export function buildGeneratedTimelineInsert({ request, start = 0, end = 3, replace = false } = {}) {
  const safeStart = Math.max(0, Number(start) || 0);
  const safeEnd = Math.max(safeStart + 0.25, Number(end) || safeStart + (request?.duration || 3));
  return {
    version: 'generated-timeline-insert-v1',
    type: 'generated-scene',
    source: 'ai-video-runtime',
    start: Number(safeStart.toFixed(3)),
    end: Number(safeEnd.toFixed(3)),
    duration: Number((safeEnd - safeStart).toFixed(3)),
    replace: Boolean(replace),
    request,
  };
}
