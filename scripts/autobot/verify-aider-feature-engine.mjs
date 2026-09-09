#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
const runner=fs.readFileSync('builder/runner/aider-feature-brain.mjs','utf8');
const controller=fs.readFileSync('builder/runner/long-run-executor.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/autonomous-builder-v2-fast.yml','utf8');
const objectives=JSON.parse(fs.readFileSync('builder/brain/feature-objectives.json','utf8')).objectives||[];
const checks=[
 ['Aider adapter exists',runner.includes('aider')&&runner.includes('aider-repo-map-v3')],
 ['objective file schema',runner.includes('feature-objectives.json')&&runner.includes('obj?.files')],
 ['dependency schema',runner.includes('o?.dependsOn')||runner.includes('o.dependsOn')],
 ['bounded passes',runner.includes('AUTOBOT_FEATURE_PASSES')],
 ['hard deadline',runner.includes('deadline=Date.now()+requestedMinutes*60_000')&&runner.includes('remainingMs()')],
 ['bounded Aider process',runner.includes('spawnSync')&&runner.includes('timeout')&&runner.includes('perCallMaxMs')],
 ['bounded Aider API',runner.includes('--timeout=${aiderApiTimeoutSeconds}')&&runner.includes('AUTOBOT_AIDER_API_TIMEOUT_SECONDS')],
 ['scoped Aider files',runner.includes('...aiderFiles')&&runner.includes('scopedFiles(obj)')],
 ['focused product subtree',runner.includes("files.every(file=>file.startsWith('src/'))")&&runner.includes("path.join(root,'src')")],
 ['reduced repo-map scope',runner.includes('--subtree-only')&&runner.includes('--map-tokens=512')],
 ['Aider cannot edit gitignore',runner.includes('--no-gitignore')],
 ['diff verification',runner.includes("['diff','--check']")],
 ['build verification',runner.includes("['run','build']")],
 ['scope enforcement',runner.includes('unauthorized modified paths')&&runner.includes('git restore')],
 ['no automatic commits',runner.includes('--no-auto-commits')&&runner.includes('--no-dirty-commits')],
 ['controller can select Aider',controller.includes("AUTOBOT_FEATURE_ENGINE === 'aider'")&&controller.includes('aider-feature-brain.mjs')],
 ['controller uses current protocol',controller.includes('aider-repo-map-v3')],
 ['workflow installs Aider',workflow.includes('aider-chat')],
 ['workflow selects Aider',workflow.includes('AUTOBOT_FEATURE_ENGINE=aider')],
 ['workflow keeps production verification',workflow.includes('verify:autobot-production-gate')],
 ['all objectives have explicit file scopes',objectives.every(o=>Array.isArray(o.files)&&o.files.length>0)]
];
for(const [name,ok] of checks)assert.ok(ok,name);
console.log(`Aider feature-engine contract PASS: ${checks.length}/${checks.length}`);
