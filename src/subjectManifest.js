/* Bikeztagram AI subject identity manifest.
   Keeps user-supplied people, bikes, vehicles, products and environments addressable
   across generated scenes without tying the app to a specific generation model. */

const text = (value) => String(value ?? '').trim();

export function buildSubjectManifest(mediaItems = []) {
  const items = Array.isArray(mediaItems) ? mediaItems : [];
  return {
    version: 'subject-manifest-v1',
    subjects: items.map((item, index) => ({
      id: text(item?.subjectId) || `subject-${index + 1}`,
      label: text(item?.subjectLabel) || text(item?.name) || `asset-${index + 1}`,
      type: text(item?.subjectType) || 'unknown',
      sourceAssetIds: [item?.id || item?.sourceId || `asset-${index + 1}`],
      referenceUrls: [item?.sourceUrl || item?.url].filter(Boolean),
      preserveIdentity: true,
      preserveAppearance: true,
      preserveDistinctiveFeatures: true
    }))
  };
}

export function mergeSubjectReferences(manifest, references = []) {
  const map = new Map((manifest?.subjects || []).map(subject => [subject.id, { ...subject }]));
  for (const reference of Array.isArray(references) ? references : []) {
    if (!reference?.subjectId) continue;
    const current = map.get(reference.subjectId) || { id: reference.subjectId, sourceAssetIds: [] };
    map.set(reference.subjectId, {
      ...current,
      ...reference,
      sourceAssetIds: [...new Set([...(current.sourceAssetIds || []), ...(reference.sourceAssetIds || [])])],
      referenceUrls: [...new Set([...(current.referenceUrls || []), ...(reference.referenceUrls || [])])]
    });
  }
  return { version: 'subject-manifest-v1', subjects: [...map.values()] };
}
