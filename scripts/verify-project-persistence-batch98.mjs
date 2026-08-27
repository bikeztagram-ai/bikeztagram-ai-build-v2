/**
 * Verification script for Batch 98: Real Project Persistence & Recovery
 */
import assert from 'node:assert';
import { serializeProjectState, saveProjectState, loadProjectState, migrateProjectState, clearProjectState } from '../src/projectPersistence.js';

// Mock localStorage for Node testing
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new LocalStorageMock();

console.log('🧪 Starting Batch 98 Project Persistence & Recovery Verification...');

// Test 1: Serialization excludes raw File objects and retains metadata
const mockFile = { name: 'clip1.mp4', type: 'video/mp4', size: 1024 };
const mockState = {
  prompt: 'Cinematic bike ride at sunset',
  sources: [{ id: 'source-0', name: 'clip1.mp4', type: 'video/mp4', url: 'https://blob.url/clip1.mp4', file: mockFile }],
  analysis: { title: 'Sunset Ride', summary: 'Gorgeous evening footage' },
  plan: { cuts: [{ startTime: 0, duration: 3 }] },
  productionPlan: { scenes: [{ mediaIndex: 0 }] },
  soundtrack: { bpm: 120, audioAvailable: true },
  autoCaptions: true,
  captionResult: { captionCount: 2 },
  exportInfo: null
};

const serialized = serializeProjectState(mockState);
assert.equal(serialized.schemaVersion, 1);
assert.equal(serialized.project.prompt, 'Cinematic bike ride at sunset');
assert.equal(serialized.project.sources.length, 1);
assert.equal(serialized.project.sources[0].url, 'https://blob.url/clip1.mp4');
assert.equal(serialized.project.sources[0].file, undefined, 'Raw File object must not be persisted');
console.log('✅ Test 1 Passed: Serialization clean & correct.');

// Test 2: Save and Load roundtrip
clearProjectState();
const saveResult = saveProjectState(mockState);
assert.equal(saveResult.success, true);

const loadResult = loadProjectState();
assert.equal(loadResult.success, true);
assert.equal(loadResult.state.prompt, 'Cinematic bike ride at sunset');
assert.equal(loadResult.state.sources.length, 1);
assert.equal(loadResult.meta.missingMedia, false);
console.log('✅ Test 2 Passed: Save and Load roundtrip successful.');

// Test 3: Schema migration
const legacyData = {
  schemaVersion: 0,
  prompt: 'Legacy project prompt',
  sources: []
};
const migrated = migrateProjectState(legacyData);
assert.equal(migrated.schemaVersion, 1);
assert.equal(migrated.project.prompt, 'Legacy project prompt');
console.log('✅ Test 3 Passed: Schema migration successful.');

// Test 4: Corruption and last-known-good backup recovery
clearProjectState();
saveProjectState(mockState); // First save populates primary
saveProjectState(mockState); // Second save populates backup with first save
// Now corrupt primary storage with invalid JSON
localStorage.setItem('bikeztagram_project_state_v1', '{ invalid json ...');

const recoveryResult = loadProjectState();
assert.equal(recoveryResult.success, true);
assert.equal(recoveryResult.state.prompt, 'Cinematic bike ride at sunset');
console.log('✅ Test 4 Passed: Last-known-good backup recovery from corruption successful.');

// Test 5: Truthful missing-media state detection
clearProjectState();
const incompleteState = {
  prompt: 'Test missing media',
  sources: [{ id: 'source-0', name: 'missing.mp4', url: '' }]
};
saveProjectState(incompleteState);
const missingLoad = loadProjectState();
assert.equal(missingLoad.success, true);
assert.equal(missingLoad.meta.missingMedia, true);
console.log('✅ Test 5 Passed: Missing-media state correctly flagged.');

clearProjectState();
console.log('🎉 All Batch 98 Persistence & Recovery Verification checks passed successfully!');
