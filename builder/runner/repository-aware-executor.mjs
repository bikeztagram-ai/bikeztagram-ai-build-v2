#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { appendAudit, verifyAuditLog } from '../quality/audit-log.mjs';
const root=process.cwd(),minutes=+(process.env.BUILDER_MAX_MINUTES||15),units=+(process.env.BUILDER_MAX_UNITS||1000),started=Date.now();
const left=()=>Math.max(0,minutes-(Date.now()-started)/60000),stateFile=path.join(root,'builder/working/deterministic-autobot.json');
const run=(file,args=[],env={})=>{const r=spawnSync(process.execPath,[file,...args],{cwd:root,stdio:'inherit',env:{...process.env,...env}});return r.error?1:(r.status??1)};
let verified=0,features=0,iterations=0,failures=0;
function index(){const r=run('builder/runner/repository-index.mjs');if(r!==0)throw Error('repository knowledge index failed')}
function deterministic(){const env={BUILDER_MAX_MINUTES:String(Math.max(1,Math.min(4,Math.floor(left())))),BUILDER_MAX_UNITS:String(Math.max(1,units-verified))};const r=run('builder/runner/deterministic-executor.mjs',[],env);try{const s=JSON.parse(fs.readFileSync(stateFile,'utf8'));verified+=(s.verifiedThisRun||[]).length}catch{}return r}
function feature(){features++;const slice=Math.max(1,Math.min(10,Math.floor(left())));return run('builder/runner/repository-aware-feature-brain.mjs',[],{BUILDER_MAX_MINUTES:String(slice),AUTOBOT_FEATURE_PASSES:String(process.env.AUTOBOT_FEATURE_PASSES_PER_SLICE||2),LOCAL_AI_MODEL:process.env.LOCAL_AI_MODEL||'qwen3:8b'})}
fs.mkdirSync(path.join(root,'builder/working'),{recursive:true});index();appendAudit('repository-aware-run-started',{minutes,units,repositoryIndex:true});
while(left()>1&&verified<units){iterations++;const d=deterministic();if(d!==0)failures++;if(left()<=1)break;const f=feature();if(f!==0)failures++;if(left()<=1)break;index();if(d!==0&&f!==0&&iterations>=2)break}
const summary={verified,features,iterations,failures,elapsedMinutes:Number(((Date.now()-started)/60000).toFixed(2))};appendAudit('repository-aware-run-finished',summary);const audit=verifyAuditLog();if(!audit.valid)process.exit(3);console.log(`[autobot] repository-aware run finished: ${JSON.stringify(summary)}`);
