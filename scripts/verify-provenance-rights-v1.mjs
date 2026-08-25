import assert from 'node:assert/strict';
import { createProvenanceRecord, evaluateAssetRights, buildExportProvenance } from '../src/safety/provenance.js';

const verified = createProvenanceRecord({
  origin: 'USER_UPLOADED',
  sourceId: 'asset-1',
  rightsStatus: 'VERIFIED',
  consentStatus: 'VERIFIED',
});
assert.equal(verified.origin, 'USER_UPLOADED');
assert.equal(evaluateAssetRights(verified).decision, 'ALLOW');

const unknown = createProvenanceRecord({ origin: 'UNKNOWN' });
assert.equal(evaluateAssetRights(unknown).decision, 'REVIEW');

const denied = createProvenanceRecord({ rightsStatus: 'DENIED', consentStatus: 'VERIFIED' });
assert.equal(evaluateAssetRights(denied).decision, 'BLOCK');

const identity = createProvenanceRecord({ rightsStatus: 'VERIFIED', consentStatus: 'UNVERIFIED' });
assert.equal(evaluateAssetRights(identity, 'DECEPTIVE_IDENTITY').decision, 'BLOCK');

const exportRecord = buildExportProvenance({
  projectId: 'project-1',
  assets: [verified, createProvenanceRecord({ origin: 'AI_GENERATED' })],
});
assert.equal(exportRecord.schema, 'bikeztagram.provenance.v1');
assert.equal(exportRecord.assets.length, 2);
assert.equal(exportRecord.aiDisclosure, true);

console.log('PASS: provenance/rights v1');
