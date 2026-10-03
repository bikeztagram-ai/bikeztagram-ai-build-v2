#!/usr/bin/env node
import { getSocialExportProfiles } from '../../src/socialExport.js';
const profiles=getSocialExportProfiles();
if(!profiles||typeof profiles!=='object')throw new Error('Profile metadata API missing');
for(const id of ['portrait','square','landscape']){
 const profile=profiles[id];
 if(!profile)throw new Error(`Missing ${id} profile`);
 if(!Number.isFinite(Number(profile.width))||!Number.isFinite(Number(profile.height)))throw new Error(`Invalid ${id} dimensions`);
 if(!profile.aspectRatio)throw new Error(`Missing ${id} aspect ratio`);
}
console.log('[autobot] Export profile contract present for portrait, square and landscape.');
