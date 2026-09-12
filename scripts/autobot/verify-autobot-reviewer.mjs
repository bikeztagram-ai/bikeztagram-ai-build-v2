#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
const reviewerFile='builder/runner/autobot-reviewer.mjs';
const registryFile='builder/brain/autobot-fleet.json';
const docFile='builder/brain/autobot-fleet-foundation.md';
const reviewer=fs.readFileSync(path.join(root,reviewerFile),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,registryFile),'utf8'));
const doc=fs.readFileSync(path.join(root,docFile),'utf8');
function assert(condition,message){if(!condition)throw new Error(message);}
assert(reviewer.includes("from './autobot-failure-queue.mjs'"),'Reviewer must use the authoritative failure queue for repair handoff');
assert(reviewer.includes('autobot-reviewer'),'Reviewer identity marker missing');
assert(reviewer.includes('AUTOBOT_REVIEW_BASE_COMMIT')&&reviewer.includes('AUTOBOT_REVIEW_COMMIT'),'Reviewer must accept explicit base and candidate commits');
assert(reviewer.includes("git(['diff','--name-only',`${base}..${candidate}`])"),'Reviewer must inspect the exact candidate diff');
assert(reviewer.includes('fixed-story-template')&&reviewer.includes('missing-evidence-selection')&&reviewer.includes('missing-duration-input'),'Reviewer must challenge known cinematic failure modes');
assert(reviewer.includes("status=findings.some(f=>f.severity==='critical')?'reject':findings.some(f=>f.severity==='high')?'needs-repair':'pass'"),'Reviewer must produce an auditable disposition');
assert(reviewer.includes("automaticMerge:false")&&reviewer.includes("automaticPush:false"),'Reviewer must never merge or push');
assert(reviewer.includes("appendFailure({source:'autobot-reviewer'"),'needs-repair must create a durable queue handoff');
assert(reviewer.includes('failureId'),'review evidence must retain the queue handoff id');
assert(reviewer.includes('repairHint'),'review handoff must provide Repair Bot guidance');
assert(reviewer.includes('npm run build'),'Reviewer must independently run the candidate build');
const bot=registry.bots.find(item=>item.id==='reviewer');
assert(bot?.entrypoint===reviewerFile&&bot?.status==='verified'&&bot?.protected===false,'registry reviewer contract must exactly match implementation');
assert(doc.includes('Adversarial Reviewer Bot'),'foundation doc must describe the Reviewer');
execFileSync(process.execPath,['--check',reviewerFile],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,reviewerEntrypoint:reviewerFile,repairHandoff:'autobot-failure-queue.jsonl',dispositions:['pass','needs-repair','reject'],automaticMerge:false,automaticPush:false}));
