#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const workflow=fs.readFileSync('.github/workflows/bikeztagram-proven-autobot-fleet.yml','utf8');
const worker=fs.readFileSync('builder/runner/proven-fleet-worker.mjs','utf8');
const recovery=fs.readFileSync('builder/runner/proven-builder-recovery.mjs','utf8');
const manifest=fs.readFileSync('builder/runner/autobot-completed-work.mjs','utf8');
for(const [needle,label] of [['matrix: {worker: [proven-a, proven-b]}','two proven workers'],['node builder/runner/proven-fleet-worker.mjs','proven worker engine'],['proven-builder-recovery.mjs','repair route'],['autobot-completed-work.mjs','completed-work inbox']]) if(!workflow.includes(needle)) throw new Error(`Missing ${label} contract.`);
if(!worker.includes('long-run-executor.mjs')) throw new Error('Fleet worker is not using the proven long-run executor.');
if(!worker.includes('task-library.json')||!worker.includes('roadmap.json')) throw new Error('Fleet worker package isolation is incomplete.');
if(!recovery.includes('autobot-fleet-recovery.mjs')||!recovery.includes('verified-candidate')) throw new Error('Recovery chain is not connected.');
if(!manifest.includes('onlyVerifiedCandidatesEnterCandidates')) throw new Error('Completed-work safety policy missing.');
for(const file of ['builder/runner/proven-fleet-worker.mjs','builder/runner/proven-builder-recovery.mjs','scripts/autobot/create-parallel-proven-packages.mjs','scripts/autobot/write-proven-worker-outcome.mjs','scripts/autobot/publish-proven-worker-candidate.mjs']) execFileSync('node',['--check',file]);
console.log('parallel proven AutoBot contract: PASS');
