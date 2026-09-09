#!/usr/bin/env node
import { getSocialExportProfiles } from '../../src/socialExport.js';

const profiles = getSocialExportProfiles();
if (!profiles || typeof profiles !== 'object') throw new Error('Profile metadata API missing');
for (const id of ['portrait', 'square', 'landscape']) {
  if (!profiles[id]) throw new Error(`Missing ${id} profile`);
}
console.log('[autobot] Export profile contract present for portrait, square and landscape.');
