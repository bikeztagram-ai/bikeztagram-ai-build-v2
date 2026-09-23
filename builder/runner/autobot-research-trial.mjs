#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';

const strategy=process.env.AUTOBOT_RESEARCH_STRATEGY||'aider-direct';
const model=process.env.LOCAL_AI_MODEL||'qwen2.5-coder:7b';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'autobot-research-'));
const file=path.join(root,'trial.js');
const fixture="export function motionForRole(role){\n  if(role==='action') return 1;\n  if(role==='reveal') return 1;\n  return 1;\n}\n";
fs.writeFileSync(file,fixture);
const task="In trial.js make the smallest production-safe change so action returns 1.2, reveal returns 1.08, and hero returns 0.9. Preserve the existing function and add no unrelated code. Materialize the edit.";
const started=performance.now();
let command=[]; let status='failed'; let note='';
try {
  if(strategy.startsWith('aider-')){
    const args=['--model','ollama_chat/'+model,'--message',task,'--yes-always','--no-git','--no-show-model-warnings','--timeout','180'];
    if(strategy==='aider-diff') args.push('--edit-format','diff','--map-tokens','1024');
    if(strategy==='aider-udiff') args.push('--edit-format','udiff','--map-tokens','1024');
    if(strategy==='aider-whole') args.push('--edit-format','whole','--map-tokens','0');
    if(strategy==='aider-scoped') args.push('--edit-format','diff','--map-tokens','512');
    if(strategy==='aider-architect') args.push('--architect','--editor-edit-format','editor-diff','--map-tokens','512');
    args.push(file); command=['aider',...args];
  } else if(strategy==='direct-ollama-json'){
    command=['curl','--fail','--silent','--show-error','--max-time','120','http://127.0.0.1:11434/api/chat','-H','Content-Type: application/json','-d',JSON.stringify({model,stream:false,messages:[{role:'user',content:task+' Return JSON only; do not edit files.'}],options:{num_ctx:2048,num_predict:256}})];
    note='model-only JSON planning trial; intentionally not trusted to edit the fixture';
  } else if(strategy==='openhands-sdk'){
    command=['python','-c',"from openhands.sdk import LLM; print('OPENHANDS_SDK_IMPORT_OK'); print(LLM(model='"+model+"'))"];
    note='adapter/import trial; full workspace execution is recorded separately before promotion';
  } else if(strategy==='evolution-selected'){
    const hint=process.env.AUTOBOT_EVOLUTION_TRIAL_PLAN||'No Evolution plan supplied; use bounded scoped diff.';
    command=['aider','--model','ollama_chat/'+model,'--message',task+' Evolution trial id: '+hint,'--yes-always','--no-git','--no-show-model-warnings','--timeout','180','--edit-format','diff','--map-tokens','512',file];
  } else if(strategy==='deterministic-control'){
    fs.writeFileSync(file,"export function motionForRole(role){\n  if(role==='action') return 1.2;\n  if(role==='reveal') return 1.08;\n  if(role==='hero') return 0.9;\n  return 1;\n}\n");
    status='success'; note='control path; no LLM used';
  }
  if(command.length){
    const r=spawnSync(command[0],command.slice(1),{cwd:root,env:process.env,encoding:'utf8',timeout:190000});
    if(r.status!==0) note=(r.stderr||r.stdout||'process failed').slice(-3000); else status='success';
    if(strategy==='direct-ollama-json') status='failed';
    if(strategy==='openhands-sdk') status=r.status===0?'adapter-ready':'failed';
  }
} catch(e){ note=String(e.message||e); }
const source=fs.readFileSync(file,'utf8');
const syntax=spawnSync('node',['--check',file],{encoding:'utf8'});
const behavioral=spawnSync('node',['--input-type=module','-e',"import {motionForRole} from "+JSON.stringify(file)+"; if(motionForRole('action')!==1.2||motionForRole('reveal')!==1.08||motionForRole('hero')!==0.9) process.exit(1)"],{encoding:'utf8'});
const result={schemaVersion:'autobot-research-trial-v1',strategy,status,durationMs:Math.round(performance.now()-started),diff:source===fixture?0:1,syntaxPassed:syntax.status===0,behaviorPassed:behavioral.status===0,qualityPassed:source!==fixture&&syntax.status===0&&behavioral.status===0,model,command:command[0]||'deterministic',note};
fs.writeFileSync(process.env.AUTOBOT_RESEARCH_RESULT||path.join(process.cwd(),'autobot-research-result.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
process.exit(0);
