#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const runnerPath='builder/runner/aider-feature-brain.mjs';
const controllerPath='builder/runner/long-run-executor.mjs';
const workflowPath='.github/workflows/autonomous-builder-v2-fast.yml';
const directivePath='builder/brain/autobot-product-directive.md';
const objectivesPath='builder/brain/feature-objectives.json';
const runner=fs.readFileSync(runnerPath,'utf8');
const controller=fs.readFileSync(controllerPath,'utf8');
const workflow=fs.readFileSync(workflowPath,'utf8');
const directive=fs.readFileSync(directivePath,'utf8');
const objectivesDocument=JSON.parse(fs.readFileSync(objectivesPath,'utf8'));
const objectives=objectivesDocument.objectives||[];

const expectedProtocol='aider-repo-map-v4';
const expectedPasses=2;
const expectedMapTokens=768;
const expectedSliceMinutes=20;

const checks=[
 ['Aider adapter exists',runner.includes('aider')],
 ['runner uses current protocol',runner.includes(`const protocol=process.env.AUTOBOT_FEATURE_PROTOCOL||'${expectedProtocol}'`)],
 ['controller uses current protocol',controller.includes(`process.env.AUTOBOT_FEATURE_PROTOCOL||'${expectedProtocol}'`)],
 ['workflow declares current protocol',workflow.includes(`AUTOBOT_FEATURE_PROTOCOL: ${expectedProtocol}`)],
 ['workflow exports current protocol',workflow.includes(`echo 'AUTOBOT_FEATURE_PROTOCOL=${expectedProtocol}'`)],
 ['no stale Aider v3 protocol',!runner.includes('aider-repo-map-v3')&&!controller.includes('aider-repo-map-v3')&&!workflow.includes('aider-repo-map-v3')],
 ['objective file schema',runner.includes('feature-objectives.json')&&runner.includes('obj?.files')],
 ['dependency schema',runner.includes('o?.dependsOn')||runner.includes('o.dependsOn')],
 ['bounded passes',runner.includes('AUTOBOT_FEATURE_PASSES')&&runner.includes(`||${expectedPasses}`)],
 ['controller passes through configured count',controller.includes('AUTOBOT_FEATURE_PASSES:String(featurePassesPerSlice)')],
 ['workflow config is two-pass',workflow.includes('AUTOBOT_FEATURE_PASSES_PER_SLICE: 2')],
 ['hard deadline',runner.includes('configuredDeadline')&&runner.includes('AUTOBOT_FEATURE_DEADLINE_EPOCH_MS')&&runner.includes('remainingMs()')],
 ['bounded Aider process',runner.includes('spawnSync')&&runner.includes('timeout')&&runner.includes('perCallMaxMs')],
 ['bounded Aider API',runner.includes('const apiTimeout=')&&runner.includes('Math.floor(timeout/1000)')&&runner.includes('`--timeout=${apiTimeout}`')],
 ['scoped Aider files',runner.includes('...aiderFiles')&&runner.includes('scopedFiles(obj)')],
 ['focused product subtree',runner.includes("files.every(file=>file.startsWith('src/'))")&&runner.includes("path.join(root,'src')")],
 ['current repo-map scope',runner.includes(`--map-tokens=${expectedMapTokens}`)&&runner.includes('--subtree-only')],
 ['no stale repo-map scope',!runner.includes('--map-tokens=512')],
 ['Aider cannot edit gitignore',runner.includes('--no-gitignore')],
 ['diff verification',runner.includes("['diff','--check']")],
 ['build verification',runner.includes("['run','build']")],
 ['scope enforcement',runner.includes('unauthorized modified paths')&&runner.includes("['restore','--',file]")],
 ['protected objective recovery',runner.includes('protected feature-objectives.json')&&runner.includes("'restore','--','builder/brain/feature-objectives.json'")],
 ['no automatic commits',runner.includes('--no-auto-commits')&&runner.includes('--no-dirty-commits')],
 ['product directive loaded',runner.includes('autobot-product-directive.md')&&runner.includes('productDirective')],
 ['adversarial review is explicit',runner.includes('ADVERSARIAL REVIEW/IMPROVEMENT PASS')&&runner.includes('adversarialReviewEnabled')],
 ['directive contains adversarial review rules',directive.includes('Self-improvement is part of the work')&&directive.includes('After a coherent change passes its first verification')],
 ['directive contains dynamic story rules',directive.includes('Story structure must be dynamic')&&directive.includes('arbitrary four-shot bottleneck')],
 ['objective schema version is current',objectivesDocument.version===5],
 ['all objectives have explicit file scopes',objectives.every(o=>Array.isArray(o.files)&&o.files.length>0)],
 ['all scoped objective files exist',objectives.every(o=>o.files.every(file=>fs.existsSync(file)))],
 ['all objectives require adversarial review',objectives.every(o=>(o.acceptance||[]).some(item=>String(item).toLowerCase().includes('adversarial')))],
 ['workflow validates directive',workflow.includes('test -f builder/brain/autobot-product-directive.md')],
 ['workflow validates Aider state recovery',workflow.includes('verify-aider-state-recovery.mjs')],
 ['workflow keeps production verification',workflow.includes('verify:autobot-production-gate')],
 ['workflow installs Aider',workflow.includes('aider-chat')],
 ['workflow selects Aider',workflow.includes('AUTOBOT_FEATURE_ENGINE: aider')],
 ['workflow uses current feature slice',workflow.includes(`AUTOBOT_FEATURE_SLICE_MINUTES: ${expectedSliceMinutes}`)]
];

const failures=checks.filter(([,ok])=>!ok).map(([name])=>name);
if(failures.length){console.error(`Aider feature-engine contract FAIL: ${failures.join(', ')}`);process.exit(1);}
assert.equal(failures.length,0);
console.log(`Aider feature-engine contract PASS: ${checks.length}/${checks.length}; protocol=${expectedProtocol}; mapTokens=${expectedMapTokens}; passes=${expectedPasses}`);
