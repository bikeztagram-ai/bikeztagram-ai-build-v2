/* BIKEZTAGRAM AI — render source preparation.
   Converts already-resolved execution sources into renderer-ready descriptors.
   It never uploads, generates, deletes, or changes Blob/Gemini configuration. */

export function prepareRenderMediaSource(executionCut = {}) {
  const source = executionCut.source || executionCut.assetUrl;
  const type = String(executionCut.type || executionCut.generatedMediaType || 'video').toLowerCase();
  if (!source) return { ready: false, reason: 'Render source URL is missing.' };

  if (type.startsWith('image/')) return { ready: true, kind: 'image', url: source, revoke: false };
  if (type === 'image' || type === 'still' || type === 'photo') return { ready: true, kind: 'image', url: source, revoke: false };
  if (type.startsWith('video/')) return { ready: true, kind: 'video', url: source, revoke: false };
  if (type === 'video') return { ready: true, kind: 'video', url: source, revoke: false };

  return { ready: false, reason: `Unsupported render media type: ${type}.` };
}

export function isImageRenderSource(source) {
  return source?.ready === true && source.kind === 'image';
}

export function isVideoRenderSource(source) {
  return source?.ready === true && source.kind === 'video';
}
