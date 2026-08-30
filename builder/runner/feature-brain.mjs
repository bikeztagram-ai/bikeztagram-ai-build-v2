#!/usr/bin/env node
/**
 * Feature-level local engineer V3.
 * Uses small structured file edits instead of fragile model-generated git diffs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

const root = process.cwd();
const minutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '60', 10);
const model = process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:3b';
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const timeoutSeconds = Math.max(120, Number.parseInt(process.env.LOCAL_AI_FEATURE_TIMEOUT_SECONDS || '300', 10));
const maxFeatures = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_PASSES || '3', 10));
const maxAttemptsPerFeature = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_MAX_ATTEMPTS || '2', 10));
const started = Date.now();
const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const file = p => path.join(root, p);
const read = (p, max = 9000) => { const f=file(p); if(!fs.existsSync(f)) return ''; const s=fs.readFileSync(f,'utf8'); return s.length<=max?s:`${s.slice(0,max)}\n...[truncated]...`; };
const run = (cmd,args,opts={}) => execFileSync(cmd,args,{cwd:root,encoding:'utf8',...opts});

const objectives = JSON.parse(read('builder/brain/feature-objectives.json', 40000)).objectives || [];
const statePath=file('builder/working/feature-brain-state.json');
let state={completed:[],failed:{}};
try { state=JSON.parse(fs.readFileSync(statePath,'utf8')); } catch {}
const completed=new Set(state.completed || []);
const attemptsThisRun=new Map();
function save() { fs.mkdirSync(path.dirname(statePath),{recursive:true}); fs.writeFileSync(statePath,JSON.stringify({version:2,completed:[...completed],failed:state.failed||{},updatedAt:new Date().toISOString()},null,2)+'\n'); }
function context(obj, error='') {
  const chunks=[`OBJECTIVE: ${obj.title}\nPriority: ${obj.priority}\nAcceptance:\n- ${obj.acceptance.join('\n- ')}\nConstraints:\n- ${obj.constraints.join('\n- ')}`];
  for(const p of obj.files) chunks.push(`===== ${p} =====\n${read(p)}`);
  chunks.push(`===== PROJECT MEMORY =====\n${read('builder/quality/project-memory.md',3000)}`);
  chunks.push(`===== LESSONS =====\n${read('builder/quality/lessons.md',2600)}`);
  if(error) chunks.push(`===== PREVIOUS FAILURE =====\n${error}`);
  return chunks.join('\n\n').slice(0,26000);
}
function choose() {
  const available=objectives.filter(o=>!completed.has(o.id)&&(attemptsThisRun.get(o.id)||0)<maxAttemptsPerFeature);
  if(!available.length) return null;
  return available.sort((a,b)=>{
    const af=state.failed?.[a.id]?.attempts||0, bf=state.failed?.[b.id]?.attempts||0;
    return ((b.priority||0)-bf*8)-((a.priority||0)-af*8);
  })[0];
}
function extractJson(text){
  const fenced=text.match(/```(?:json)?\s*([\s\S]*?)```/i); const raw=(fenced?fenced[1]:text).trim();
  const start=raw.indexOf('{'), end=raw.lastIndexOf('}');
  if(start<0||end<start) throw new Error('model returned no JSON edit plan');
  return JSON.parse(raw.slice(start,end+1));
}
function modelCall(obj, error='') {
  const prompt=`You are the implementation engineer for Bikeztagram AI. Implement ONE small, production-quality increment of this exact objective. Do real code work, not planning. You may edit ONLY the listed files. Do not add dependencies. Do not modify builder infrastructure, workflows, secrets, Vercel infrastructure, or protected paths. Return ONLY JSON, no markdown. The JSON must be {"edits":[{"file":"path","operation":"replace|insert_after|insert_before|append","find":"short exact existing text","replace":"new text"}],"summary":"brief"}. Prefer ONE small edit. For replace/insert operations, find must be an exact substring copied from the supplied file. Keep replacements focused and syntactically valid. Use append only when adding a self-contained export/helper at the end of a file. Preserve existing exports/contracts. Acceptance criteria define done.\n\n${context(obj,error)}`;
  const body=JSON.stringify({model,stream:false,keep_alive:'10m',options:{temperature:0.05,num_ctx:8192,num_predict:2200},messages:[{role:'system',content:'You are a senior software engineer. Return only the requested JSON edit plan.'},{role:'user',content:prompt}]});
  const sec=Math.min(timeoutSeconds,Math.max(60,Math.floor(left()*60)));
  return new Promise((resolve,reject)=>{
    const child=spawn('curl',['-sS','--fail','--connect-timeout','20','--max-time',String(sec),`${host}/api/chat`,'-H','Content-Type: application/json','-d',body],{cwd:root});
    let stdout='',stderr='',settled=false;
    const finish=(err,value)=>{if(settled)return;settled=true;clearTimeout(timer);err?reject(err):resolve(value);};
    child.stdout.on('data',d=>stdout+=d.toString()); child.stderr.on('data',d=>stderr+=d.toString());
    child.on('error',e=>finish(e));
    child.on('close',(code,signal)=>{if(code!==0)return finish(new Error(stderr.trim()||`local model request failed (${code||signal||'unknown'})`));try{finish(null,extractJson(JSON.parse(stdout)?.message?.content||''));}catch(e){finish(e);}});
    const timer=setTimeout(()=>{try{child.kill('SIGTERM')}catch{};finish(new Error(`local model request timed out after ${sec}s`));},sec*1000+2000);
  });
}
function applyEdits(plan,obj){
  if(!plan||!Array.isArray(plan.edits)||plan.edits.length<1||plan.edits.length>3) throw new Error('model returned invalid edit count');
  const allowed=new Set(obj.files); const backups=new Map();
  try {
    for(const edit of plan.edits){
      if(!allowed.has(edit.file)) throw new Error(`out-of-scope file: ${edit.file}`);
      const target=file(edit.file); const original=fs.readFileSync(target,'utf8'); backups.set(edit.file,original);
      const needle=String(edit.find??''); const replacement=String(edit.replace??'');
      if(edit.operation==='append'){fs.writeFileSync(target,original+replacement);continue;}
      const idx=original.indexOf(needle); if(!needle||idx<0) throw new Error(`exact edit anchor not found in ${edit.file}`);
      const next=edit.operation==='insert_after'?original.slice(0,idx+needle.length)+replacement+original.slice(idx+needle.length):edit.operation==='insert_before'?original.slice(0,idx)+replacement+original.slice(idx):original.slice(0,idx)+replacement+original.slice(idx+needle.length);
      fs.writeFileSync(target,next);
    }
    run('git',['diff','--check'],{stdio:'inherit'});
  } catch(e){for(const [p,content] of backups)fs.writeFileSync(file(p),content);throw e;}
}
function resetFailed(){run('git',['reset','--hard','HEAD'],{stdio:'inherit'});run('git',['clean','-fd','-e','.git'],{stdio:'inherit'});}

if(process.env.LOCAL_AI_READY!=='1'){console.error('[autobot] local AI unavailable; feature brain refuses paid fallback');process.exit(2);}
for(let n=1;n<=maxFeatures&&left()>1;n++){
  const obj=choose(); if(!obj) break;
  const attempt=(attemptsThisRun.get(obj.id)||0)+1; attemptsThisRun.set(obj.id,attempt);
  console.log(`[autobot] FEATURE ${n}/${maxFeatures}: ${obj.id} — attempt ${attempt}/${maxAttemptsPerFeature} — ${left().toFixed(1)}m remaining — model=${model}`);
  let lastError=''; let verified=false;
  try {
    for(let repair=0;repair<maxAttemptsPerFeature&&!verified;repair++){
      const plan=await modelCall(obj,lastError); console.log(`[autobot] model plan: ${plan.summary||'no summary'}`); applyEdits(plan,obj);
      try {
        run('npm',['run','build'],{stdio:'inherit',timeout:Math.min(900000,Math.max(60000,Math.floor(left()*60000)))});
        for(const command of obj.verify||[]) { const parts=command.split(/\s+/).filter(Boolean); if(!parts.length) throw new Error('empty verification command'); run(parts.shift(),parts,{stdio:'inherit'}); }
        verified=true;
      } catch(e) {
        lastError=`Verification failed after your change: ${e.message}`; resetFailed();
        if(repair+1>=maxAttemptsPerFeature) throw e;
        console.error('[autobot] verification failed; asking model to repair.');
      }
    }
    completed.add(obj.id); delete state.failed?.[obj.id]; save(); console.log(`[autobot] VERIFIED FEATURE: ${obj.id}`);
  } catch(e) {
    state.failed ||= {}; state.failed[obj.id]={message:lastError||e.message,at:new Date().toISOString(),attempts:(state.failed[obj.id]?.attempts||0)+1}; save(); try{resetFailed();}catch{} console.error(`[autobot] feature ${obj.id} failed and was reset: ${lastError||e.message}`);
  }
}
save(); console.log(`[autobot] feature brain finished; verified=${completed.size}; attemptedThisRun=${[...attemptsThisRun.values()].reduce((a,b)=>a+b,0)}; elapsed=${((Date.now()-started)/60000).toFixed(2)}m`);
