#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
const root=process.cwd(); const read=p=>fs.readFileSync(path.join(root,p),'utf8'); const failures=[];
const workflow=read('.github/workflows/autonomous-builder-v2.yml'); const scheduler=read('.github/workflows/autonomous-builder-scheduler.yml'); const sustained=read('builder/runner/long-run-executor.mjs'); const feature=read('builder/runner/feature-brain.mjs'); const deterministic=read('builder/runner/deterministic-executor.mjs');
if(/GEMINI_API_KEY|gemini-cli|gemini-3/i.test(workflow+scheduler+sustained+feature+deterministic)) failures.push('forbidden AI provider reference in active AutoBot runtime');
if(/gh\s+pr\s+merge|gh\s+pr\s+approve/i.test(workflow+sustained+feature+deterministic)) failures.push('automatic merge/approval path detected');
if(/vercel\s+(deploy|promote)|vercel\.com\/api/i.test(workflow+sustained+feature+deterministic)) failures.push('automatic production deployment path detected');
if(!/cancel-in-progress:\s*false/.test(workflow)||!/cancel-in-progress:\s*false/.test(scheduler)) failures.push('AutoBot concurrency must not cancel active work');
if(!workflow.includes('LOCAL_AI_MODEL')||!workflow.includes('actions/cache@v4')) failures.push('local model configuration/cache missing');
if(!workflow.includes('segment-2')||!workflow.includes('gh pr create')||!workflow.includes('--draft')) failures.push('resumable review workflow contract missing');
if(!sustained.includes('verifyAuditLog')) failures.push('sustained runner missing audit verification');
if(!feature.includes('maxAttemptsPerFeature')||!feature.includes('resetFailedPatch')) failures.push('feature engineer recovery contract missing');
if(!deterministic.includes('allowedTask')||!deterministic.includes('dependsOn')) failures.push('deterministic executor safety/dependency contract missing');
if(failures.length){console.error(failures.map(f=>`FAIL: ${f}`).join('\n'));process.exit(1)}
console.log('AutoBot safety contract PASS');
