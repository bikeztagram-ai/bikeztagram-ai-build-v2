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
assert(reviewer.includes('autobot-reviewer'),'Reviewer identity marker missing');
assert(reviewer.includes('AUTOBOT_REVIEW_BASE_COMMIT')&&reviewer.includes('AUTOBOT_REVIEW_COMMIT'),'Reviewer must accept explicit base and candidate commits');
assert(reviewer.includes("git(['diff','--name-only',`${base}..${candidate}`])"),'Reviewer must inspect the exact candidate diff');
assert(reviewer.includes("protectedPaths=['builder/runner/aider-feature-brain.mjs','.github/workflows/autonomous-builder-v2-fast.yml','builder/brain/feature-objectives.json']"),'Reviewer must protect core Builder/workflow/objective infrastructure');
assert(reviewer.includes("git(['worktree','add','--detach',tempDir,candidate])"),'Reviewer must inspect the candidate in an isolated worktree');
assert(reviewer.includes("git(['worktree','remove','--force',tempDir])"),'Reviewer must remove its isolated worktree');
assert(reviewer.includes('fixed-story-template')&&reviewer.includes('missing-evidence-selection')&&reviewer.includes('missing-duration-input'),'Reviewer must challenge the known cinematic failure modes');
assert(reviewer.includes("status=findings.some(f=>f.severity==='critical')?'reject':findings.some(f=>f.severity==='high')?'needs-repair':'pass'"),'Reviewer must produce an auditable disposition');
assert(reviewer.includes("automaticMerge:false")&&reviewer.includes("automaticPush:false"),'Reviewer must never merge or push');
assert(reviewer.includes('npm run build'),'Reviewer must independently run the candidate build');
const bot=registry.bots.find(item=>item.id==='reviewer');
assert(bot?.entrypoint===reviewerFile,'registry reviewer entrypoint must exactly match implementation path');
assert(bot?.status==='verified','reviewer must be registry-marked verified only after its contract exists');
assert(bot?.protected===false,'reviewer must remain unprotected');
assert(doc.includes('Adversarial Reviewer Bot'),'foundation doc must describe the Reviewer');
execFileSync(process.execPath,['--check',reviewerFile],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,reviewerEntrypoint:reviewerFile,dispositions:['pass','needs-repair','reject'],isolatedCandidateWorktree:true,protectedInfrastructure:true,automaticMerge:false,automaticPush:false,buildVerification:true}));
