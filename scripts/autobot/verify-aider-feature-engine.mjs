#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const runner=fs.readFileSync('builder/runner/aider-feature-brain.mjs','utf8');
const controller=fs.readFileSync('builder/runner/long-run-executor.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/autonomous-builder-v2-fast.yml','utf8');
const objectives=JSON.parse(fs.readFileSync('builder/brain/feature-objectives.json','utf8')).objectives||[];

const checks=[
 ['Aider adapter exists',runner.includes('aider')&&runner.includes('aider-repo-map-v7-bounded-learning')],
 ['objective file schema',runner.includes('feature-objectives.json')&&runner.includes('obj?.files')],
 ['dependency schema',runner.includes('o?.dependsOn')],
 ['bounded passes',runner.includes('AUTOBOT_FEATURE_PASSES')],
 ['hard deadline',runner.includes('configuredDeadline')&&runner.includes('AUTOBOT_FEATURE_DEADLINE_EPOCH_MS')&&runner.includes('remainingMs()')],
 ['bounded Aider process',runner.includes('spawnSync')&&runner.includes('timeout')&&runner.includes('configuredCallMax')],
 ['bounded Aider API',runner.includes('const apiTimeout=')&&runner.includes('`--timeout=${apiTimeout}`')],
 ['scoped Aider files',runner.includes('...aiderFiles')&&runner.includes('scopedFiles(obj)')],
 ['focused product subtree',runner.includes("aiderScope.every(file=>file.startsWith('src/'))")&&runner.includes("path.join(root,'src')")],
 ['reduced repo-map scope',runner.includes('--subtree-only')&&runner.includes('--map-tokens=512')],
 ['Aider cannot edit gitignore',runner.includes('--no-gitignore')],
 ['runtime artifacts excluded',runner.includes('isRuntimeArtifact')&&runner.includes('.aider.chat.history.md')],
 ['objective paths validated',runner.includes('validateObjective')&&runner.includes('objective file missing')&&runner.includes('safeRelative')],
 ['clean attempt baseline',runner.includes('dirty-worktree-before-attempt')],
 ['diff verification',runner.includes("['diff','--check']")],
 ['build verification',runner.includes("['run','build']")],
 ['scope enforcement',runner.includes('scope/protection violation')&&runner.includes("['restore','--',file]")],
 ['protected objective recovery',runner.includes('feature-objectives.json')&&runner.includes("'restore','--','builder/brain/feature-objectives.json'")],
 ['no automatic commits',runner.includes('--no-auto-commits')&&runner.includes('--no-dirty-commits')],
 ['failure learning',runner.includes('recordFailure')&&runner.includes('recentLearning')&&runner.includes('aider-feature-brain-learning.json')],
 ['self-improvement planner',runner.includes('buildSelfImprovementBrief')&&fs.existsSync('builder/runner/self-improvement-planner.mjs')],
 ['controller can select Aider',controller.includes("process.env.AUTOBOT_FEATURE_ENGINE==='aider'")&&controller.includes('aider-feature-brain.mjs')],
 ['controller owns shared deadline',controller.includes('runDeadline')&&controller.includes('AUTOBOT_FEATURE_DEADLINE_EPOCH_MS')],
 ['controller bounds child processes',controller.includes('spawnSync')&&controller.includes('timeout')&&controller.includes('childTimeoutMs')],
 ['controller uses current protocol',controller.includes('aider-repo-map-v7-bounded-learning')],
 ['workflow installs Aider',workflow.includes('aider-chat')],
 ['workflow selects Aider',workflow.includes('AUTOBOT_FEATURE_ENGINE=aider')],
 ['workflow keeps self-evolution lock',workflow.includes('AUTOBOT_FEATURE_FOCUS=self-improvement-only')],
 ['workflow keeps fast model defaults',workflow.includes('qwen2.5-coder:3b')&&workflow.includes('LOCAL_AI_PROXY_NUM_CTX=4096')&&workflow.includes('LOCAL_AI_PROXY_NUM_PREDICT=900')],
 ['workflow verifies self-improvement boundary',workflow.includes('verify-self-improvement-boundary')],
 ['workflow keeps production verification',workflow.includes('verify:autobot-production-gate')],
 ['all objectives have explicit file scopes',objectives.every(o=>o?.kind==='self-improvement'||(Array.isArray(o?.files)&&o.files.length>0))],
 ['self-improvement objective is explicit',objectives.some(o=>o?.kind==='self-improvement')]
];

const failures=checks.filter(([,ok])=>!ok).map(([name])=>name);
if(failures.length){console.error(`Aider feature-engine contract FAIL: ${failures.join(', ')}`);process.exit(1);}
assert.equal(failures.length,0);
console.log(`Aider feature-engine contract PASS: ${checks.length}/${checks.length}`);
