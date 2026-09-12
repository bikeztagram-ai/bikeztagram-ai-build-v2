#!/usr/bin/env node
/** Verify the independent QA worker contract and registry wiring. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const qaFile='builder/runner/autobot-qa.mjs';
const queueFile='builder/runner/autobot-failure-queue.mjs';
const registryFile='builder/brain/autobot-fleet.json';
const docFile='builder/brain/autobot-fleet-foundation.md';
const qa=fs.readFileSync(path.join(root,qaFile),'utf8');
const queue=fs.readFileSync(path.join(root,queueFile),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,registryFile),'utf8'));
const doc=fs.readFileSync(path.join(root,docFile),'utf8');
function assert(condition,message){if(!condition)throw new Error(message);}
assert(qa.includes('AutoBot QA Bot'),'QA identity marker missing');
assert(qa.includes("from './autobot-failure-queue.mjs'"),'QA must discover the exact durable queue runner path');
assert(qa.includes("readFailures({status:'repaired'})"),'QA must consume only REPAIRED handoffs');
assert(qa.includes("transitionFailure(record.id,'verified'"),'QA must be the worker that closes a successful repair handoff');
assert(qa.includes("transitionFailure(record.id,'rejected'"),'QA must reject failed repair handoffs');
assert(qa.includes('repairBaseCommit'),'QA must consume the exact recorded repair base commit');
assert(qa.includes("const base=git(['rev-parse',record.repairBaseCommit])"),'QA must resolve the recorded repair base through git');
assert(qa.includes("git(['worktree','add','--detach',worktree,base])"),'QA must reconstruct the repair in an isolated worktree');
assert(qa.includes("git(['diff','--name-only',`${base}..${commit}`])"),'QA must inspect the committed repair diff independently');
assert(qa.includes("const unauthorized=changed.filter(file=>!record.files.includes(file))"),'QA must enforce the original failure scope');
assert(qa.includes("git diff --check")||qa.includes("['diff','--check']"),'QA must verify reconstructed patch integrity');
assert(qa.includes('npm run build'),'QA must verify the reconstructed build');
assert(qa.includes('npm run verify:autobot-product-change-quality'),'QA must run product-quality verification');
assert(!qa.includes("git(['merge'"),'QA must not merge repairs');
assert(!qa.includes("git(['push'"),'QA must not push repairs');
assert(doc.includes('independent QA'),'fleet documentation must describe independent QA');
const qaBot=registry.bots.find(bot=>bot.id==='qa');
assert(qaBot?.entrypoint===qaFile,'registry QA entrypoint must exactly match the implementation path');
assert(qaBot?.status==='verified','QA must be registry-marked verified only after its contract exists');
assert(qaBot?.protected===false,'QA must remain unprotected');
assert(queue.includes("repaired:new Set(['verified','rejected','blocked'])"),'queue must expose the repaired-to-QA transition contract');
assert(queue.includes('repairBaseCommit:normalise(input.repairBaseCommit)'),'queue must preserve the repair base for QA');
execFileSync(process.execPath,['--check',qaFile],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,['--check',queueFile],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,qaEntrypoint:qaFile,consumes:'repaired',successTransition:'verified',failureTransition:'rejected',isolatedWorktree:true,automaticPush:false,automaticMerge:false,independentBuild:true,productQualityGuard:true}));
