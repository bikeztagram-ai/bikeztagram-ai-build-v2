/* BIKEZTAGRAM AI — asset analysis contract. Domain-neutral by design. */

export const SUBJECT_TYPES = Object.freeze(['person','vehicle','travel','property','product','food','fashion','fitness','pet','gaming','music','business','event','nature','general']);

export function analyseCreativeAsset(asset = {}) {
  const text = `${asset.name || ''} ${asset.description || ''} ${Array.isArray(asset.tags) ? asset.tags.join(' ') : ''}`.toLowerCase();
  const subject = SUBJECT_TYPES.find((type) => text.includes(type)) || 'general';
  return {
    id: asset.id || null,
    subjectType: subject,
    duration: Number(asset.duration) || null,
    orientation: asset.width && asset.height ? (asset.width > asset.height ? 'landscape' : asset.width < asset.height ? 'portrait' : 'square') : 'unknown',
    creativeSignals: { hasDescription: Boolean(asset.description), hasTags: Array.isArray(asset.tags) && asset.tags.length > 0 },
  };
}

export function buildAssetCreativeProfile(assets = []) {
  return assets.map(analyseCreativeAsset);
}
