import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMultiPlatformPlan } from '../src/platformReframe.js';
import { allTimelineSourcesReady } from '../src/mediaSourceResolver.js';
import { rankMedia, scoreMedia } from '../src/director.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }
function assertLocalImports(relative) {
  const source = read(relative); const importer = path.dirname(path.join(root, relative));
  const matches = source.matchAll(/(?:from\s*|import\s*\()(['"])(\.\.?\/[^'"]+)\1/g);
  for (const match of matches) { let target = path.resolve(importer, match[2]); if (!path.extname(target)) target += '.js'; assert.ok(fs.existsSync(target), `${relative} imports missing local module ${match[2]}`); }
}
for (const file of ['src/App.jsx','src/renderer.js','src/director.js','src/aiEditPlanner.js','src/twoStageDirector.js','src/platformReframe.js','src/mediaSourceResolver.js']) assertLocalImports(file);
const renderer = read('src/renderer.js');
assert.match(renderer,/canvas\.captureStream\(30\)/); assert.match(renderer,/createMediaStreamDestination\(\)/); assert.match(renderer,/new MediaStream\(\[/); assert.match(renderer,/createMediaElementSource\(element\)/); assert.match(renderer,/MediaRecorder/); assert.match(renderer,/Public Blob source failed; retrying local File source/); assert.match(renderer,/URL\.revokeObjectURL\(source\.url\)/); assert.match(renderer,/recorder\.onstop/);
const platform = buildMultiPlatformPlan({ subject:{focalPoint:{x:.62,y:.48}} });
assert.equal(platform.platforms.length,5); assert.equal(platform.preserveTimeline,true); assert.equal(platform.preserveSourceTimestamps,true); assert.equal(platform.platforms.every((item)=>item.safeArea.keepSubjectVisible),true); assert.equal(platform.platforms.every((item)=>item.crop.focalPoint.x===.62),true);
const media=[{sourceUrl:'blob:source',type:'video/mp4'}]; assert.equal(allTimelineSourcesReady([{sourceType:'uploaded',mediaIndex:0}],media).ready,true); assert.equal(allTimelineSourcesReady([{sourceType:'uploaded',mediaIndex:9}],media).ready,false);
const actionClip=scoreMedia({name:'cornering-action.mp4',type:'video/mp4',duration:8,width:1920,height:1080}); const weakClip=scoreMedia({name:'blurry-test.mp4',type:'video/mp4',duration:.5,width:1920,height:1080}); assert.ok(actionClip>weakClip);
const ranked=rankMedia([{name:'blurry-test.mp4',type:'video/mp4',duration:1},{name:'hero-reveal.mp4',type:'video/mp4',duration:6}]); assert.equal(ranked[0].name,'hero-reveal.mp4'); assert.ok(Number.isFinite(ranked[0]._directorScore));
assert.equal(fs.existsSync(path.join(root,'.github/workflows/autonomous-control.yml')),false);
console.log('core-render-static-verification: PASS');
