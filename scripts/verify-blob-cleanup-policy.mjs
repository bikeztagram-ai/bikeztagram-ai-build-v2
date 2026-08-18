import assert from 'node:assert/strict';

const TEMP_PREFIX = 'videos/';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function shouldDelete(blob, now) {
  if (!blob?.pathname?.startsWith(TEMP_PREFIX)) return false;
  const uploadedAt = new Date(blob.uploadedAt).getTime();
  return Number.isFinite(uploadedAt) && now - uploadedAt >= MAX_AGE_MS;
}

const now = Date.now();
assert.equal(shouldDelete({ pathname: 'videos/old.mp4', uploadedAt: new Date(now - 25 * 60 * 60 * 1000).toISOString() }, now), true);
assert.equal(shouldDelete({ pathname: 'videos/new.mp4', uploadedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString() }, now), false);
assert.equal(shouldDelete({ pathname: 'saved/final.mp4', uploadedAt: new Date(now - 48 * 60 * 60 * 1000).toISOString() }, now), false);

console.log('blob-cleanup-policy: PASS');
