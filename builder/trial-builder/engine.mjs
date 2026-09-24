#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const dir=path.join(root,'builder','trial-builder');
const enginePath=path.join(dir,'engine.mjs');
const statePath=path.join(dir,'state.json');
const contractPath=path.join(dir,'CONTRACT.md');
const evidenceDir=process.env.TRIAL_RESEARCH_DIR||path.join(root,'builder','working','trial-research');
const model=process.env.LOCAL_AI_MODEL||'qwen2.5-coder:7b';
const host=process.env.OLLAMA_HOST||'http://127.0.0.1:11434';
const timeoutMs=Math.max(60000,Number(process.env.TRIAL_MODEL_TIMEOUT_MS||'180000'));

function read(p,max=30000){if(!fs.existsSync(p))return'';const s=fs.readFileSync(p,'utf8');return s.length<=max?s:s.slice(0,max)+'\n...[trimmed]...';}
function writeJson(p,v){fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');}
function loadState(){try{return JSON.parse(read(statePath))}catch{return {schemaVersion:1,experiment:0,history:[],nextHypothesis:'initialise',updatedAt:null}}}
function evidence(){
  if(!fs.existsSync(evidenceDir))return [];
  return fs.readdirSync(evidenceDir).filter(n=>n.endsWith('.json')).map(name=>{
    try{return {name,data:JSON.parse(read(path.join(evidenceDir,name),18000))}}catch{return {name,data:{parseError:true}}}
  });
}
function selfTest(){
  const required=[enginePath,contractPath,statePath];
  for(const p of required)if(!fs.existsSync(p))throw new Error('missing trial file: '+path.relative(root,p));
  const state=loadState();
  if(state.schemaVersion!==1)throw new Error('unsupported trial state schema');
  if(!Array.isArray(state.history))throw new Error('trial history must be an array');
  if(typeof state.nextHypothesis!=='string')throw new Error('nextHypothesis must be a string');
  if(!/builder\/trial-builder/.test(enginePath))throw new Error('trial path guard failed');
  return {ok:true,history:state.history.length,experiment:state.experiment||0};
}
function applyEdit(payload){
  if(!payload||typeof payload.search!=='string'||typeof payload.replace!=='string'||!payload.search.trim())throw new Error('invalid structured edit');
  const source=fs.readFileSync(enginePath,'utf8');
  const hits=source.split(payload.search).length-1;
  if(hits!==1)throw new Error('trial engine search anchor must match exactly once; found '+hits);
  if(payload.replace.length>7000||payload.search.length>5000)throw new Error('trial edit too large');
  fs.writeFileSync(enginePath,source.replace(payload.search,payload.replace));
}
async function askModel(context){
  const schema={type:'object',additionalProperties:false,properties:{
    hypothesis:{type:'string',maxLength:1000},
    search:{type:'string',minLength:1,maxLength:5000},
    replace:{type:'string',maxLength:7000},
    rationale:{type:'string',maxLength:1800}
  },required:['hypothesis','search','replace','rationale']};
  const body=JSON.stringify({model,stream:false,keep_alive:'15m',format:schema,options:{temperature:0,num_ctx:12288,num_predict:2200},
    messages:[
      {role:'system',content:'You are the Forge Trial Builder. Improve ONLY your own engine. First inspect the supplied current engine and contract. Use research evidence as hypotheses, not truth. Return exactly one bounded search-replace edit. Do not touch production code, workflows, secrets, dependencies, or files outside builder/trial-builder.'},
      {role:'user',content:context}
    ]});
  return await new Promise((resolve,reject)=>{
    const child=spawnSync('curl',['-sS','--fail','--connect-timeout','15','--max-time',String(Math.ceil(timeoutMs/1000)),host+'/api/chat','-H','Content-Type: application/json','-d',body],{encoding:'utf8'});
    if(child.status!==0) return reject(new Error(child.stderr||'trial model call failed'));
    let outer;try{outer=JSON.parse(child.stdout)}catch(e){return reject(e)}
    const raw=outer.message?.content||'';
    try{resolve(JSON.parse(raw))}catch(e){reject(new Error('trial model returned invalid structured JSON: '+e.message))}
  });
}

if(process.argv.includes('--self-test')){
  console.log(JSON.stringify(selfTest(),null,2));
  process.exit(0);
}

if(process.env.LOCAL_AI_READY!=='1')throw new Error('local AI unavailable; trial builder refuses paid fallback');
const before=fs.readFileSync(enginePath,'utf8');
const state=loadState();
const ev=evidence();
const compact=ev.slice(0,9).map(x=>({name:x.name,summary:x.data?.summary||x.data?.lastResult||x.data?.terminationReason||x.data?.experiments||x.data})).slice(0,9);
const prompt=`TRIAL EXPERIMENT ${(state.experiment||0)+1}

CONTRACT:
${read(contractPath,9000)}

CURRENT ENGINE — READ THIS BEFORE EDITING:
${before}

CURRENT STATE:
${JSON.stringify(state,null,2)}

NINE RESEARCH-LANE EVIDENCE PACKETS:
${JSON.stringify(compact,null,2)}

Choose one falsifiable improvement to the trial builder itself. Prefer improvements that make it better at inspecting evidence, selecting experiments, verifying changes, recovering from failure, or producing durable learning. Do not merely add documentation. Do not redesign it wholesale. Return one exact search-replace edit against the CURRENT ENGINE.`;

let outcome={status:'rejected',experiment:(state.experiment||0)+1,startedAt:new Date().toISOString()};
try{
  const proposal=await askModel(prompt);
  applyEdit(proposal);
  const check=spawnSync(process.execPath,['--check',enginePath],{encoding:'utf8'});
  if(check.status!==0)throw new Error(check.stderr||'node --check failed');
  const test=spawnSync(process.execPath,[enginePath,'--self-test'],{encoding:'utf8'});
  if(test.status!==0)throw new Error(test.stderr||'trial self-test failed');
  outcome={...outcome,status:'verified',hypothesis:proposal.hypothesis,rationale:proposal.rationale,verification:test.stdout.trim(),completedAt:new Date().toISOString()};
  state.history=Array.isArray(state.history)?state.history:[];state.history.push(outcome);
  state.experiment=outcome.experiment;state.nextHypothesis=proposal.hypothesis;state.updatedAt=outcome.completedAt;writeJson(statePath,state);
  console.log(JSON.stringify(outcome,null,2));
}catch(err){
  fs.writeFileSync(enginePath,before);
  outcome={...outcome,status:'rejected',error:String(err.message||err),completedAt:new Date().toISOString()};
  state.history=Array.isArray(state.history)?state.history:[];state.history.push(outcome);
  state.experiment=outcome.experiment;state.nextHypothesis='Retry with a different bounded experiment after addressing: '+outcome.error;state.updatedAt=outcome.completedAt;writeJson(statePath,state);
  console.error(JSON.stringify(outcome,null,2));
  process.exit(1);
}
