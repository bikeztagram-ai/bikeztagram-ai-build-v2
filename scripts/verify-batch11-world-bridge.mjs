import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const world=fs.readFileSync(new URL('../src/worldScene.js',import.meta.url),'utf8');

assert.match(app,/productionPlanToRenderPlan\(sourcePlan, hasWorldBridge = false\)/);
assert.match(app,/world-fill-0/);
assert.match(app,/needsWorldBridge/);
assert.match(app,/renderWorldScene\(\{ file, sourceUrl, prompt, duration: 6/);
assert.match(app,/mediaItems\.push\(\{ id: 'world-fill-0'/);
assert.match(world,/export async function renderWorldScene/);
assert.match(world,/canvas\.captureStream\(30\)/);
assert.match(world,/recorder\.start\(500\)/);
assert.match(world,/recorder\.stop\(\)/);

console.log('batch11-world-bridge: PASS');
