import assert from 'node:assert/strict';
import { createProjectSnapshot, restoreSources } from '../src/projectPersistence.js';

const snapshot = createProjectSnapshot({
  prompt: 'test',
  sources: [
    { id: 'local-1', name: 'local.mp4', type: 'video/mp4', url: 'blob:https://example.test/temporary-id' },
    { id: 'remote-1', name: 'remote.mp4', type: 'video/mp4', url: 'https://cdn.example.test/media/remote.mp4' }
  ]
});

const local = snapshot.sources.find(source => source.id === 'local-1');
const remote = snapshot.sources.find(source => source.id === 'remote-1');

assert.equal(local.url, null, 'temporary blob URLs must never be persisted as durable media references');
assert.equal(local.sourceUrl, null, 'temporary blob source URLs must never be persisted');
assert.equal(local.restorableMedia, false, 'temporary local media must be marked non-restorable');
assert.equal(remote.url, 'https://cdn.example.test/media/remote.mp4', 'durable HTTPS media references may be persisted');
assert.equal(remote.restorableMedia, true, 'durable HTTPS media references must remain restorable');

const restored = restoreSources(snapshot.sources);
assert.equal(restored.find(source => source.id === 'local-1').missingMedia, true, 'local media must require re-selection after reload');
assert.equal(restored.find(source => source.id === 'remote-1').missingMedia, false, 'durable remote media must remain restorable');

console.log('Batch 89 persistence media-reference regression: PASS');
