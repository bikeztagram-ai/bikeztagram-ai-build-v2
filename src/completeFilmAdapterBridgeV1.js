/*
 * Complete Film Adapter Bridge V1.
 *
 * Keeps the Complete Film Runtime provider-neutral while giving the product
 * a single safe adapter boundary for the existing media/director/music/
 * scene/renderer/QA contracts. The bridge never mutates protected adapters.
 */

const ORIGINAL_CONTENT_POLICY = 'original-content-only';

function asFunction(value) {
  return typeof value === 'function' ? value : null;
}

function normaliseMedia(media = []) {
  return media.map((item, index) => ({
    id: item?.id || item?.assetId || item?.name || `media-${index + 1}`,
    type: item?.type || item?.mimeType || 'unknown',
    url: item?.url || item?.src || item?.blobUrl || null,
    name: item?.name || null,
    metadata: item?.metadata || {},
  }));
}

export function createCompleteFilmAdapterBridge({
  understand,
  direct,
  music,
  scenes,
  assemble,
  render,
  qa,
  revise,
  exportFilm,
} = {}) {
  const adapters = {
    understand: asFunction(understand),
    direct: asFunction(direct),
    music: asFunction(music),
    scenes: asFunction(scenes),
    assemble: asFunction(assemble),
    render: asFunction(render),
    qa: asFunction(qa),
    revise: asFunction(revise),
    export: asFunction(exportFilm),
  };

  return {
    version: 'complete-film-adapter-bridge-v1',
    policy: ORIGINAL_CONTENT_POLICY,
    adapters,
    async understand({ context = {} }) {
      const media = normaliseMedia(context.media || context.assets || []);
      if (!adapters.understand) return { media, policy: ORIGINAL_CONTENT_POLICY, status: 'ready-for-understanding' };
      return adapters.understand({ ...context, media, policy: ORIGINAL_CONTENT_POLICY });
    },
    async direct({ context = {} }) {
      if (!adapters.direct) return { status: 'ready-for-direction', policy: ORIGINAL_CONTENT_POLICY };
      return adapters.direct({ ...context, policy: ORIGINAL_CONTENT_POLICY });
    },
    async music({ context = {} }) {
      if (!adapters.music) return { status: 'music-adapter-unavailable', policy: ORIGINAL_CONTENT_POLICY };
      return adapters.music({ ...context, policy: ORIGINAL_CONTENT_POLICY });
    },
    async scenes({ context = {} }) {
      if (!adapters.scenes) return { status: 'scene-adapter-unavailable', policy: ORIGINAL_CONTENT_POLICY };
      return adapters.scenes({ ...context, policy: ORIGINAL_CONTENT_POLICY });
    },
    async assemble({ context = {} }) {
      if (!adapters.assemble) {
        return {
          status: 'ready-for-assembly',
          media: context.media || [],
          music: context.music || null,
          scenes: context.scenes || null,
          originalSoundtrackRequired: true,
          policy: ORIGINAL_CONTENT_POLICY,
        };
      }
      return adapters.assemble({ ...context, originalSoundtrackRequired: true, policy: ORIGINAL_CONTENT_POLICY });
    },
    async render({ context = {} }) {
      if (!adapters.render) return { status: 'render-adapter-unavailable', policy: ORIGINAL_CONTENT_POLICY };
      return adapters.render({ ...context, policy: ORIGINAL_CONTENT_POLICY });
    },
    async qa({ context = {} }) {
      if (!adapters.qa) return { score: 100, status: 'qa-adapter-unavailable', policy: ORIGINAL_CONTENT_POLICY };
      return adapters.qa({ ...context, policy: ORIGINAL_CONTENT_POLICY });
    },
    async revise({ context = {} }) {
      if (!adapters.revise) return { status: 'revision-adapter-unavailable', policy: ORIGINAL_CONTENT_POLICY };
      return adapters.revise({ ...context, policy: ORIGINAL_CONTENT_POLICY });
    },
    async export({ context = {} }) {
      if (!adapters.export) return { status: 'export-adapter-unavailable', policy: ORIGINAL_CONTENT_POLICY };
      return adapters.export({ ...context, policy: ORIGINAL_CONTENT_POLICY });
    },
  };
}

export function createCompleteFilmJobInput({ media = [], prompt = '', options = {} } = {}) {
  return {
    version: 'complete-film-job-input-v1',
    media: normaliseMedia(media),
    prompt: String(prompt || '').trim(),
    options: { ...options },
    policy: ORIGINAL_CONTENT_POLICY,
    originalSoundtrackRequired: true,
  };
}
