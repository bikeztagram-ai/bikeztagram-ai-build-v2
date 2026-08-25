const VALID_ORIGINS = new Set(['USER_UPLOADED', 'USER_CREATED', 'LICENSED', 'PUBLIC_DOMAIN', 'AI_GENERATED', 'UNKNOWN']);

/**
 * Build a machine-readable provenance record for a media asset.
 * This is an origin/history signal, not proof of ownership or legality.
 */
export function createProvenanceRecord(asset = {}) {
  const origin = VALID_ORIGINS.has(asset.origin) ? asset.origin : 'UNKNOWN';
  return {
    version: '1.0.0',
    origin,
    sourceId: asset.sourceId ? String(asset.sourceId) : null,
    creatorProvided: Boolean(asset.creatorProvided),
    rightsStatus: asset.rightsStatus ?? 'UNVERIFIED',
    consentStatus: asset.consentStatus ?? 'UNVERIFIED',
    aiGenerated: origin === 'AI_GENERATED' || Boolean(asset.aiGenerated),
    edited: Boolean(asset.edited),
    parentAssetIds: Array.isArray(asset.parentAssetIds) ? asset.parentAssetIds.map(String) : [],
  };
}

/**
 * Decide whether an asset is eligible for a requested operation.
 * UNKNOWN is intentionally not treated as automatically safe.
 */
export function evaluateAssetRights(record, operation = 'EDIT') {
  const rights = record?.rightsStatus ?? 'UNVERIFIED';
  const consent = record?.consentStatus ?? 'UNVERIFIED';

  if (rights === 'DENIED' || consent === 'DENIED') {
    return { decision: 'BLOCK', code: 'RIGHTS_OR_CONSENT_DENIED' };
  }

  if (operation === 'DECEPTIVE_IDENTITY' && consent !== 'VERIFIED') {
    return { decision: 'BLOCK', code: 'IDENTITY_CONSENT_REQUIRED' };
  }

  if (rights === 'UNVERIFIED' || consent === 'UNVERIFIED') {
    return { decision: 'REVIEW', code: 'RIGHTS_OR_CONSENT_UNVERIFIED' };
  }

  return { decision: 'ALLOW', code: 'RIGHTS_AND_CONSENT_VERIFIED' };
}

export function buildExportProvenance(project = {}) {
  const assets = Array.isArray(project.assets) ? project.assets : [];
  return {
    schema: 'bikeztagram.provenance.v1',
    generatedAt: new Date().toISOString(),
    projectId: project.projectId ? String(project.projectId) : null,
    aiDisclosure: Boolean(project.aiGenerated || assets.some((asset) => asset?.aiGenerated)),
    assets: assets.map(createProvenanceRecord),
  };
}
