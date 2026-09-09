#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const runner=fs.readFileSync('builder/runner/aider-feature-brain.mjs','utf8');
const controller=fs.readFileSync('builder/runner/long-run-executor.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/autonomous-builder-v2-fast.yml','utf8');
const checks=[
  ['Aider adapter exists',runner.includes("aider")&&runner.includes('aider-repo-map-v1')],
  ['repository-aware objective selection',runner.includes('feature-objectives.json')&&runner.includes('allowedFiles')],
  ['bounded passes',runner.includes('AUTOBOT_FEATURE_PASSES')],
  ['diff verification',runner.includes("git",['diff','--check'])||runner.includes("'diff','--check'")],
  ['no automatic commits',runner.includes('--no-auto-commits')],
  ['controller can select Aider',controller.includes("AUTOBOT_FEATURE_ENGINE === 'aider'")&&controller.includes('aider-feature-brain.mjs')],
  ['workflow installs Aider',workflow.includes('aider-chat')],
  ['workflow selects Aider',workflow.includes('AUTOBOT_FEATURE_ENGINE=aider')],
  ['workflow keeps production verification',workflow.includes('verify:autobot-production-gate')]
];
for(const [name,ok] of checks)assert.ok(ok,name);
console.log(`Aider feature-engine contract PASS: ${checks.length}/${checks.length}`);
