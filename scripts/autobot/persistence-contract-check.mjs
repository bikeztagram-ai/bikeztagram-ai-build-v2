#!/usr/bin/env node
import fs from 'node:fs';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const persistence = fs.readFileSync('src/projectPersistence.js', 'utf8');
const worker = fs.readFileSync('scripts/autobot/persistence-runtime.mjs', 'utf8');
const checks = {
  persistenceModuleImported: app.includes("from './projectPersistence.js'"),
  lifecycleMarkerPresent: app.includes('BIKEZTAGRAM_PERSISTENCE_LIFECYCLE'),
  snapshotCreation: app.includes('createProjectSnapshot'),
  loadOnLifecycle: app.includes('loadProject()'),
  saveOnLifecycle: app.includes('saveProject(createProjectSnapshot'),
  atomicSlots: persistence.includes('SLOT_A') && persistence.includes('SLOT_B') && persistence.includes('POINTER'),
  fileObjectsExcluded: persistence.includes("key === 'file'") && persistence.includes('instanceof File'),
  fallbackRecovery: persistence.includes('const fallback = readSlot'),
  workerTargetsApp: worker.includes("const file = 'src/App.jsx'"),
  workerRefusesUnknownShape: worker.includes('refusing blind edit')
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({status: failed.length ? 'failed' : 'passed', checks, failed, generatedAt: new Date().toISOString()}, null, 2));
if (failed.length) process.exit(2);
