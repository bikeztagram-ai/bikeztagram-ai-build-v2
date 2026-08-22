// Bikeztagram AI — Creative Engine media bridge.
// Converts uploaded assets + director intent into a provider-neutral creative brief.
// No network calls. Keeps media understanding independent from any provider.

const mediaKind = (asset) => String(asset?.type || '').startsWith('video/') ? 'video' : String(asset?.type || '').startsWith('image/') ? 'image' : 'unknown';
const safe = (value, fallback = '') => String(value ?? fallback).trim();

export function summariseCreativeAssets(assets = []) {
  return assets.map((asset, index) => ({
    id: asset?.id || `asset-${index}`,
    index,
    name: safe(asset?.name, `asset-${index}`),
    kind: mediaKind(asset),
    mimeType: safe(asset?.mimeType || asset?.type, 'application/octet-stream'),
    duration: Number.isFinite(Number(asset?.duration)) ? Number(asset.duration) : null,
    width: Number.isFinite(Number(asset?.width)) ? Number(asset.width) : null,
    height: Number.isFinite(Number(asset?.height)) ? Number(asset.height) : null,
    sourceUrl: safe(asset?.sourceUrl || asset?.url),
    generated: Boolean(asset?.generated),
    subjectId: safe(asset?.subjectId),
  }));
}

export function buildCreativeBrief({ request = '', assets = [], analysis = null } = {}) {
  const media = summariseCreativeAssets(assets);
  const images = media.filter((x) => x.kind === 'image').length;
  const videos = media.filter((x) => x.kind === 'video').length;
  return {
    version: 1,
    request: safe(request, 'Create the strongest possible film from the supplied media.'),
    assetSummary: { total: media.length, images, videos, mixed: images > 0 && videos > 0 },
    assets: media,
    analysis: analysis || null,
    generationPolicy: {
      preferUploadedAuthenticMedia: true,
      generateOnlyWhenCreativelyUseful: true,
      preserveReferenceSubjects: true,
      originalWorldsOnly: true,
      avoidCopyrightImitatingStyles: true,
    },
  };
}

export function buildSceneRequests(brief, plan = {}) {
  const cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
  return cuts.filter((cut) => cut?.generated || cut?.sourceType === 'generated' || cut?.generationPrompt)
    .map((cut, index) => ({
      id: `generated-scene-${index}`,
      type: 'video-scene',
      prompt: safe(cut.generationPrompt, `${brief.request} — original cinematic scene.`),
      duration: Math.max(1, Number(cut.duration) || 2),
      sourceIndex: Number.isInteger(Number(cut.mediaIndex ?? cut.sourceIndex)) ? Number(cut.mediaIndex ?? cut.sourceIndex) : null,
      subjectId: brief.assets.find((a) => a.index === Number(cut.mediaIndex ?? cut.sourceIndex))?.subjectId || '',
      originalWorld: true,
    }));
}

export function buildMusicRequest(brief, music = {}) {
  return {
    type: 'original-music',
    prompt: brief.request,
    duration: Math.max(1, Number(music.duration || 15)),
    bpm: Number(music.bpm) || null,
    mood: safe(music.mood, 'cinematic'),
    energy: Math.max(0, Math.min(1, Number(music.energy ?? 0.65))),
    sections: Array.isArray(music.sections) ? music.sections : [],
    originalOnly: true,
  };
}
