#!/usr/bin/env node
/**
 * Feature-level local engineer.
 * Implements real product objectives, verifies them, and records failures.
 * Designed for CPU-only hosted runners: give the local model enough time to
 * answer, retry failed objectives, and never report work that was not verified.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

const root = process.cwd();
const minutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '60', 10);
const model = process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:3b';
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const timeoutSeconds = Math.max(180, Number.parseInt(process.env.LOCAL_AI_FEATURE_TIMEOUT_SECONDS || '480', 10));
const maxFeatures = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_PASSES || '12', 10));
const maxAttemptsPerFeature = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_MAX_ATTEMPTS || '2', 10));
const started = Date.now();
const left = () => Math.max(0, minutes - (Date.now() - started) / 60000);
const file = p => path.join(root, p);
const read = (p, max = 5000) => { const f=file(p); if(!fs.existsSync(f)) return ''; const s=fs.readFileSync(f,'utf8'); return s.length<=max?s:`${s.slice(0,max)}\n...[truncated]...`; };
const run = (cmd,args,opts={}) => execFileSync(cmd,args,{cwd:root,encoding:'utf8',...opts});

const objectives = JSON.parse(read('builder/brain/feature-objectives.json', 30000)).objectives || [];
const statePath=file('builder/working/feature-brain-state.json');
let state={completed:[],failed:{}};
try { state=JSON.parse(fs.readFileSync(statePath,'utf8')); } catch {}
const completed=new Set(state.completed || []);
const attemptsThisRun=new Map();
function save() { fs.mkdirSync(path.dirname(statePath),{recursive:true}); fs.writeFileSync(statePath,JSON.stringify({version:1,completed:[...completed],failed:state.failed||{},updatedAt:new Date().toISOString()},null,2)+'\n'); }
function context(obj, compact=false) {
  const chunks=[`OBJECTIVE: ${obj.title}\nPriority: ${obj.priority}\nAcceptance:\n- ${obj.acceptance.join('\n- ')}\nConstraints:\n- ${obj.constraints.join('\n- ')}`];
  for(const p of obj.files) chunks.push(`===== ${p} =====\n${read(p,compact?2800:4500)}`);
  chunks.push(`===== PROJECT MEMORY =====\n${read('builder/quality/project-memory.md',compact?1600:2600)}`);
  chunks.push(`===== LESSONS =====\n${read('builder/quality/lessons.md',compact?1400:2200)}`);
  return chunks.join('\n\n').slice(0,compact?11500:18500);
}
function choose() {
  const available=objectives.filter(o=>!completed.has(o.id)&&(attemptsThisRun.get(o.id)||0)<maxAttemptsPerFeature);
  if(!available.length) return null;
  return available.sort((a,b)=>{
    const af=state.failed?.[a.id]?.attempts||0, bf=state.failed?.[b.id]?.attempts||0;
    return ((b.priority||0)-bf*8)-((a.priority||0)-af*8);
  })[0];
}
function modelCall(obj, compact=false) {
  const previous=state.failed?.[obj.id]?.message||'none';
  const prompt=`You are the primary implementation engineer for Bikeztagram AI. Implement ONE coherent, production-quality increment of this exact objective. This is real product work, not planning. You may modify ONLY the files listed for the objective. Prefer the smallest set of those files necessary, but if behaviour genuinely crosses files, change them coherently. Preserve exports/contracts. Do not add dependencies. Do not modify builder infrastructure, workflows, secrets, Vercel infrastructure, or protected paths. Do not invent media or APIs. Do not return commentary. Return ONLY a valid unified git diff beginning with diff --git. If a previous attempt failed, diagnose and fix the underlying issue rather than repeating it. Use the acceptance criteria as the definition of done.\n\n${context(obj,compact)}\n\nPREVIOUS ATTEMPT RESULT: ${previous}`;
  const body=JSON.stringify({model,stream:false,keep_alive:'10m',options:{temperature:0.05,num_ctx:compact?6144:8192,num_predict:compact?1800:2600},messages:[{role:'system',content:'You are a senior software engineer. Write real maintainable production code and respect the supplied objective.'},{role:'user',content:prompt}]});
  const sec=Math.min(timeoutSeconds,Math.max(60,Math.floor(left()*60)));
  return new Promise((resolve,reject)=>{
    const child=spawn('curl',['-sS','--fail','--connect-timeout','20','--max-time',String(sec),`${host}/api/chat`,'-H','Content-Type: application/json','-d',body],{cwd:root});
    let stdout=''; let stderr=''; let settled=false;
    const finish=(err,value)=>{if(settled)return;settled=true;clearTimeout(timer);err?reject(err):resolve(value);};
    child.stdout.on('data',d=>{stdout+=d.toString();});
    child.stderr.on('data',d=>{stderr+=d.toString();});
    child.on('error',e=>finish(e));
    child.on('close',(code,signal)=>{
      if(code!==0) return finish(new Error(stderr.trim()||`local model request failed (${code||signal||'unknown'})`));
      try { const parsed=JSON.parse(stdout); finish(null,parsed?.message?.content||''); }
      catch { finish(new Error('local model returned invalid JSON')); }
    });
    const timer=setTimeout(()=>{try{child.kill('SIGTERM');}catch{};finish(new Error(`local model request timed out after ${sec}s`));},sec*1000+2000);
  });
}
function clean(s){const m=s.match(/```(?:diff|patch)?\s*([\s\S]*?)```/i);const x=m?m[1]:s;const i=x.indexOf('diff --git ');return i>=0?x.slice(i).trim():'';}
function validPatch(p,obj){
  if(!p||!p.includes('diff --git ')) return false;
  const allowed=new Set(obj.files);
  const paths=[...p.matchAll(/^diff --git a\/(.*?) b\/(.*?)$/gm)].map(m=>m[2]);
  if(!paths.length||paths.some(x=>!allowed.has(x))) return false;
  const add=p.split('\n').filter(x=>x.startsWith('+')&&!x.startsWith('+++'));
  const del=p.split('\n').filter(x=>x.startsWith('-')&&!x.startsWith('---'));
  const codeAdded=add.filter(x=>!/^\+\s*(?:\/\/|\/\*|\*|#|$)/.test(x));
  return codeAdded.length>=3&&add.length<=300&&del.length<=300;
}
function apply(p){const f=file('.autobot-feature.patch');fs.writeFileSync(f,p);try{run('git',['apply','--index','--whitespace=fix',f],{stdio:'inherit'});}finally{fs.rmSync(f,{force:true});}}
function resetFailedPatch(){run('git',['reset','--hard','HEAD'],{stdio:'inherit'});run('git',['clean','-fd','-e','.git'],{stdio:'inherit'});}

if(process.env.LOCAL_AI_READY!=='1'){console.error('[autobot] local AI unavailable; feature brain refuses paid fallback');process.exit(2);}
for(let n=1;n<=maxFeatures&&left()>1;n++){
  const obj=choose();
  if(!obj){console.log('[autobot] no further eligible feature objective is available in this run');break;}
  const attempt=(attemptsThisRun.get(obj.id)||0)+1; attemptsThisRun.set(obj.id,attempt);
  console.log(`[autobot] FEATURE ${n}/${maxFeatures}: ${obj.id} — attempt ${attempt}/${maxAttemptsPerFeature} — ${left().toFixed(1)}m remaining — model=${model}`);
  try {
    let response;
    try { response=await modelCall(obj,false); }
    catch(e) {
      console.error(`[autobot] primary model attempt failed: ${e.message}`);
      if(left()>3 && attempt<maxAttemptsPerFeature) response=await modelCall(obj,true); else throw e;
    }
    const patch=clean(response);
    if(!validPatch(patch,obj)) throw new Error('model returned an invalid, empty, or out-of-scope feature patch');
    apply(patch);
    run('git',['diff','--check'],{stdio:'inherit'});
    run('npm',['run','build'],{stdio:'inherit',timeout:Math.min(900000,Math.max(60000,Math.floor(left()*60000)))});
    completed.add(obj.id); delete state.failed?.[obj.id]; save();
    console.log(`[autobot] VERIFIED FEATURE: ${obj.id}`);
  } catch(e) {
    state.failed ||= {}; state.failed[obj.id]={message:e.message,at:new Date().toISOString(),attempts:(state.failed[obj.id]?.attempts||0)+1}; save();
    try { resetFailedPatch(); } catch(resetError) { console.error(`[autobot] reset failed: ${resetError.message}`); process.exit(2); }
    console.error(`[autobot] feature ${obj.id} failed and was reset: ${e.message}`);
  }
}
save();
console.log(`[autobot] feature brain finished; verified=${completed.size}; attemptedThisRun=${[...attemptsThisRun.values()].reduce((a,b)=>a+b,0)}; elapsed=${((Date.now()-started)/60000).toFixed(2)}m`);
