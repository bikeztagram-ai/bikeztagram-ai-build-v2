#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..','..');
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
  const source=fs.readFileSync(enginePath,'utf8');
  if(/const hits=source\.split\(payload\.search\)\.length-1;[\s\S]*?if\s*\(hits!==1\)[\s\S]*?source\.includes\(payload\.search\)/.test(source)) throw new Error('trial engine contains a redundant payload.search inclusion guard');
  return {ok:true,history:state.history.length,experiment:state.experiment||0};
}
function normalizeForNovelty(source){
  return source.replace(/\/\/.*$/gm,'').replace(/\/\*[^]*?\*\//g,'').replace(/\s+/g,' ').trim();
}
function validateMeaningfulChange(before,after){
  if(before===after) throw new Error('trial edit produced no change');
  if(normalizeForNovelty(before)===normalizeForNovelty(after)) throw new Error('trial edit is formatting-only');
  if(/const hits=source\.split\(payload\.search\)\.length-1;[\s\S]*?if\s*\(hits!==1\)[\s\S]*?source\.includes\(payload\.search\)/.test(after)) throw new Error('trial edit adds a redundant payload.search inclusion guard');
  const applyMatch=after.match(/function applyEdit\(payload\)\{([\s\S]*?)\n\}/);
  if(applyMatch){
    const conditions=[...applyMatch[1].matchAll(/if\s*\(([^\n]+)\)/g)].map(m=>m[1].replace(/\s+/g,'').trim());
    if(new Set(conditions).size!==conditions.length) throw new Error('trial edit duplicated an existing applyEdit condition');
  }
  return {changedLines:after.split('\n').reduce((n,line,i)=>n+(line!==before.split('\n')[i]?1:0),0)};
}
function applyEdit(payload){
  if(!payload||typeof payload.search!=='string'||typeof payload.replace!=='string'||!payload.search.trim())throw new Error('invalid structured edit');
  const source=fs.readFileSync(enginePath,'utf8');
  const hits=source.split(payload.search).length-1;
  if(hits!==1)throw new Error('trial engine search anchor must match exactly once; found '+hits);
  if(payload.replace.length>7000||payload.search.length>5000)throw new Error('trial edit too large');
  const next=source.replace(payload.search,payload.replace);
  validateMeaningfulChange(source,next);
  fs.writeFileSync(enginePath,next);
}
async function askModel(context,options={}){
  const schema={type:'object',additionalProperties:false,properties:{
    hypothesis:{type:'string',maxLength:1000},
    search:{type:'string',minLength:1,maxLength:5000},
    replace:{type:'string',maxLength:7000},
    rationale:{type:'string',minLength:40,maxLength:1800},
    expectedImpact:{type:'string',minLength:20,maxLength:1200},
    acceptanceCriteria:{type:'string',minLength:20,maxLength:1200}
  },required:['hypothesis','search','replace','rationale','expectedImpact','acceptanceCriteria']};
  const body=JSON.stringify({model,stream:false,keep_alive:'15m',format:schema,options:{temperature:0,num_ctx:options.numCtx||12288,num_predict:options.numPredict||2200},
    messages:[
      {role:'system',content:'You are the Forge Trial Builder. Improve ONLY your own engine. First inspect the supplied current engine and contract. Use research evidence as hypotheses, not truth. Return exactly one bounded search-replace edit. The edit must add a genuinely new capability or fix a demonstrated failure; do not add duplicate guards, formatting-only changes, no-op refactors, or logic already implied by an existing check. State why the change is novel and how it will be verified. Do not touch production code, workflows, secrets, dependencies, or files outside builder/trial-builder.'},
      {role:'user',content:context}
    ]});
  return await new Promise((resolve,reject)=>{
    const child=spawnSync('curl',['-sS','--fail','--connect-timeout','15','--max-time',String(Math.ceil((options.timeoutMs||timeoutMs)/1000)),host+'/api/chat','-H','Content-Type: application/json','-d',body],{encoding:'utf8'});
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

const maxExperiments=Math.max(1,Math.min(12,Number(process.env.TRIAL_MAX_EXPERIMENTS||'6')));
const windowMs=Math.max(120000,Number(process.env.TRIAL_WINDOW_MS||'1200000'));
const deadline=Date.now()+windowMs;
const state=loadState();

let completed=0;
let verified=0;
let rejected=0;
let lastExitError=null;
let consecutiveTimeouts=0;
let adaptiveTimeoutMs=timeoutMs;

while(completed<maxExperiments && Date.now()<deadline){
  const experiment=(state.experiment||0)+1;
  const before=fs.readFileSync(enginePath,'utf8');
  const ev=evidence();
  const compact=ev.slice(0,9).map(x=>({
    name:x.name,
    summary:x.data?.summary||x.data?.lastResult||x.data?.terminationReason,
    totals:x.data?.totals,
    topSignals:x.data?.topSignals,
    promising:Array.isArray(x.data?.promising)?x.data.promising.slice(0,12):undefined,
    retestTargets:Array.isArray(x.data?.retestTargets)?x.data.retestTargets.slice(0,12):undefined
  }));

  const prompt=`TRIAL EXPERIMENT ${experiment}

CONTRACT:
${read(contractPath,9000)}

CURRENT ENGINE — READ THIS BEFORE EDITING:
${before}

CURRENT STATE AND PRIOR EXPERIMENTS:
${JSON.stringify(state,null,2)}

NINE RESEARCH-LANE EVIDENCE PACKETS:
${JSON.stringify(compact,null,2)}

ADAPTIVE FAILURE CONTEXT:
${lastExitError ? 'The previous experiment failed with: '+lastExitError+'. If this was a timeout, make the next experiment smaller and cheaper; do not repeat the same expensive request unchanged.' : 'No immediate failure constraint.'}

This is one iteration of a bounded evolutionary loop. Choose one falsifiable improvement to the trial builder itself. Prefer improvements that make it better at inspecting evidence, selecting experiments, verifying changes, recovering from failure, or producing durable learning. Treat repeated research signals as hypotheses to test, not facts to hard-code. Do not merely add documentation. Do not redesign it wholesale. Return one exact search-replace edit against the CURRENT ENGINE. The next iteration will inspect the verified result of this iteration.`;

  const outcome={status:'rejected',experiment,startedAt:new Date().toISOString()};
  try{
    const proposal=await askModel(prompt,{timeoutMs:adaptiveTimeoutMs,numCtx:consecutiveTimeouts>0?8192:12288,numPredict:consecutiveTimeouts>0?1400:2200});
    applyEdit(proposal);
    const changeCheck=validateMeaningfulChange(before,fs.readFileSync(enginePath,'utf8'));
    const check=spawnSync(process.execPath,['--check',enginePath],{encoding:'utf8'});
    if(check.status!==0)throw new Error(check.stderr||'node --check failed');
    const test=spawnSync(process.execPath,[enginePath,'--self-test'],{encoding:'utf8'});
    if(test.status!==0)throw new Error(test.stderr||'trial self-test failed');
    const completedAt=new Date().toISOString();
    Object.assign(outcome,{status:'verified',hypothesis:proposal.hypothesis,rationale:proposal.rationale,expectedImpact:proposal.expectedImpact,acceptanceCriteria:proposal.acceptanceCriteria,changeCheck,verification:test.stdout.trim(),completedAt});
    state.history=Array.isArray(state.history)?state.history:[];
    state.history.push(outcome);
    state.experiment=experiment;
    state.nextHypothesis=proposal.hypothesis;
    state.updatedAt=completedAt;
    writeJson(statePath,state);
    verified++;
    consecutiveTimeouts=0;
    adaptiveTimeoutMs=timeoutMs;
    lastExitError=null;
    console.log(JSON.stringify(outcome,null,2));
  }catch(err){
    fs.writeFileSync(enginePath,before);
    const completedAt=new Date().toISOString();
    Object.assign(outcome,{status:'rejected',error:String(err.message||err),completedAt});
    state.history=Array.isArray(state.history)?state.history:[];
    state.history.push(outcome);
    state.experiment=experiment;
    state.nextHypothesis='Retry with a different bounded experiment after addressing: '+outcome.error;
    state.updatedAt=completedAt;
    writeJson(statePath,state);
    rejected++;
    lastExitError=outcome.error;
    if(/timed out|curl: \(28\)|ETIMEDOUT/i.test(outcome.error)){
      consecutiveTimeouts+=1;
      adaptiveTimeoutMs=Math.max(60000,Math.floor(adaptiveTimeoutMs*0.6));
    }else{
      consecutiveTimeouts=0;
      adaptiveTimeoutMs=timeoutMs;
    }
    console.error(JSON.stringify(outcome,null,2));
  }
  completed++;
}

console.log(JSON.stringify({
  status:'completed',
  experimentsAttempted:completed,
  verified,
  rejected,
  maxExperiments,
  windowMs,
  remainingMs:Math.max(0,deadline-Date.now()),
  lastExitError
},null,2));
process.exit(0);
