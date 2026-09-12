#!/usr/bin/env node
/** Smoke-test the dormant recovery boundary without activating Repair/QA/Reviewer. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
const registryPath=path.join(root,'builder','brain','autobot-fleet.json');
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
if(registry.enabled!==false||registry.coordination?.mode!=='plan-only')throw new Error('Recovery gate smoke test requires the production fleet to remain disabled and plan-only.');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bikeztagram-recovery-gate-'));
try{
  const result=spawnSync(process.execPath,['builder/runner/autobot-fleet-recovery.mjs','recover'],{cwd:root,encoding:'utf8',env:{...process.env,AUTOBOT_FAILURE_QUEUE_PATH:path.join(temp,'queue.jsonl')}});
  if(result.status===0)throw new Error('Recovery unexpectedly executed while the fleet was disabled.');
  const combined=`${result.stdout||''}\n${result.stderr||''}`;
  if(!combined.includes('AutoBot fleet execution is disabled'))throw new Error(`Recovery failed for an unexpected reason: ${combined}`);
  console.log(JSON.stringify({ok:true,disabled:true,planOnly:true,recoveryBlocked:true,workersNotExecuted:true}));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
