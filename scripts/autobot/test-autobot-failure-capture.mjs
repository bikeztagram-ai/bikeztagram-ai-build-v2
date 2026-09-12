#!/usr/bin/env node
/**
 * End-to-end smoke test for the Builder failure -> Failure Queue capture path.
 * Uses a disposable git repository and synthetic failure evidence; it never
 * touches builder/working in the checkout running the test and never activates
 * Repair, QA, Reviewer, or fleet execution.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'autobot-capture-smoke-'));
const run=(command,args,cwd=tempRoot)=>execFileSync(command,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(relative,content)=>{const file=path.join(tempRoot,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content+'\n');};
try{
  run('git',['init','-q']);
  run('git',['config','user.email','autobot-smoke@example.invalid']);
  run('git',['config','user.name','AutoBot Capture Smoke']);
  write('src/test-fixture.js','export const fixture="before";');
  write('builder/brain/task-library.json',JSON.stringify({tasks:[{id:'smoke-task',files:['src/test-fixture.js'],implementation:['update fixture']}]}));
  write('builder/working/deterministic-autobot.json',JSON.stringify({schemaVersion:1,status:'blocked',currentTask:'smoke-task',blockedTask:'smoke-task',objectiveId:'smoke-objective',error:'synthetic Builder failure for capture smoke test'}));
  write('builder/working/deterministic-autobot-evidence.json',JSON.stringify({units:[{id:'smoke-unit',status:'failed'}]}));
  fs.mkdirSync(path.join(tempRoot,'builder','runner'),{recursive:true});
  fs.copyFileSync(path.join(repoRoot,'builder/runner/autobot-fleet-recovery.mjs'),path.join(tempRoot,'builder/runner/autobot-fleet-recovery.mjs'));
  fs.copyFileSync(path.join(repoRoot,'builder/runner/autobot-failure-queue.mjs'),path.join(tempRoot,'builder/runner/autobot-failure-queue.mjs'));
  run('git',['add','.']);
  run('git',['commit','-qm','fixture']);
  write('src/test-fixture.js','export const fixture="after";');
  const output=JSON.parse(run(process.execPath,['builder/runner/autobot-fleet-recovery.mjs','capture']));
  const queuePath=path.join(tempRoot,'builder/working/autobot-failure-queue.jsonl');
  const records=fs.readFileSync(queuePath,'utf8').trim().split(/\r?\n/).map(JSON.parse);
  if(output.status!=='open'||output.source!=='autobot-fleet-recovery')throw new Error('capture did not return an open fleet failure record');
  if(!records.some(record=>record.id===output.id&&record.status==='open'))throw new Error('captured failure was not persisted to the authoritative queue');
  if(!output.files.includes('src/test-fixture.js'))throw new Error('captured repair scope did not include the failing task file');
  if(output.evidence?.length!==2)throw new Error('captured evidence paths were not preserved');
  console.log(JSON.stringify({ok:true,status:output.status,id:output.id,files:output.files,evidence:output.evidence,queueRecords:records.length,recoveryNotActivated:true},null,2));
}finally{
  fs.rmSync(tempRoot,{recursive:true,force:true});
}
