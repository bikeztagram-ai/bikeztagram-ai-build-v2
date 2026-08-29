#!/usr/bin/env node
/**
 * Feature-level local engineer. Unlike the legacy single-file brain, this
 * worker takes one existing product objective, reads all declared runtime
 * files, and asks the local model for one coherent multi-file change.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.cwd();
const minutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '60', 10);
const model = process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:3b';
const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const timeoutSeconds = Math.max(60, Number.parseInt(process.env.LOCAL_AI_FEATURE_TIMEOUT_SECONDS || '180', 10));
const maxFeatures = Math.max(1, Number.parseInt(process.env.AUTOBOT_FEATURE_PASSES || '12', 10));
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

function save() { fs.mkdirSync(path.dirname(statePath),{recursive:true}); fs.writeFileSync(statePath,JSON.stringify({version:1,completed:[...completed],failed:state.failed||{},updatedAt:new Date().toISOString()},null,2)+'\n'); }
function context(obj) {
  const chunks=[`OBJECTIVE: ${obj.title}\nPriority: ${obj.priority}\nAcceptance:\n- ${obj.acceptance.join('\n- ')}\nConstraints:\n- ${obj.constraints.join('\n- ')}`];
  for(const p of obj.files) chunks.push(`===== ${p} =====\n${read(p,3500)}`);
  chunks.push(`===== PROJECT MEMORY =====\n${read('builder/quality/project-memory.md',2200)}`);
  chunks.push(`===== LESSONS =====\n${read('builder/quality/lessons.md',1800)}`);
  return chunks.join('\n\n').slice(0,15500);
}
function choose() { return objectives.filter(o=>!completed.has(o.id)).sort((a,b)=>(b.priority||0)-(a.priority||0))[0]; }
function modelCall(obj) {
  const prompt=`Implement ONE coherent, production-quality increment of this Bikeztagram objective. You may modify ONLY the files listed for the objective. Prefer the smallest set of those files necessary, but if the behaviour genuinely crosses files, change them coherently in one patch. Preserve exports and contracts. Do not add dependencies. Do not modify builder infrastructure, workflows, secrets, configuration, or protected paths. Do not invent media or APIs. Do not return commentary. Return ONLY a valid unified git diff beginning with diff --git.\n\n${context(obj)}`;
  const body=JSON.stringify({model,stream:false,keep_alive:'10m',options:{temperature:0.05,num_ctx:8192,num_predict:3500},messages:[{role:'system',content:'You are the senior software engineer for Bikeztagram AI. Produce real working code, not plans or placeholders. Respect the supplied objective and acceptance criteria.'},{role:'user',content:prompt}]});
  const sec=Math.min(timeoutSeconds,Math.max(60,Math.floor(left()*60)));
  const r=spawnSync('curl',['-sS','--fail','--max-time',String(sec),`${host}/api/chat`,'-H','Content-Type: application/json','-d',body],{cwd:root,encoding:'utf8'});
  if(r.status!==0) throw new Error(r.stderr||`model request failed (${r.status})`);
  return JSON.parse(r.stdout)?.message?.content||'';
}
function clean(s){const m=s.match(/```(?:diff|patch)?\s*([\s\S]*?)```/i);const x=m?m[1]:s;const i=x.indexOf('diff --git ');return i>=0?x.slice(i).trim():'';}
function validPatch(p,obj){
  if(!p||!p.includes('diff --git ')) return false;
  const allowed=new Set(obj.files);
  const paths=[...p.matchAll(/^diff --git a\/(.*?) b\/(.*?)$/gm)].map(m=>m[2]);
  if(!paths.length||paths.some(x=>!allowed.has(x))) return false;
  const add=p.split('\n').filter(x=>x.startsWith('+')&&!x.startsWith('+++'));
  const del=p.split('\n').filter(x=>x.startsWith('-')&&!x.startsWith('---'));
  if(add.filter(x=>!/^\+\s*(?:\/\/|\/\*|\*|#|$)/.test(x)).length<3) return false;
  return add.length<=260&&del.length<=260;
}
function apply(p){const f=file('.autobot-feature.patch');fs.writeFileSync(f,p);try{run('git',['apply','--index','--whitespace=fix',f],{stdio:'inherit'});}finally{fs.rmSync(f,{force:true});}}

if(process.env.LOCAL_AI_READY!=='1'){console.error('[autobot] local AI unavailable; feature brain refuses paid fallback');process.exit(2);}

for(let n=1;n<=maxFeatures&&left()>1;n++){
  const obj=choose();
  if(!obj){console.log('[autobot] feature backlog exhausted');break;}
  console.log(`[autobot] FEATURE ${n}/${maxFeatures}: ${obj.id} — ${left().toFixed(1)} minutes remaining — model=${model}`);
  try {
    const patch=clean(modelCall(obj));
    if(!validPatch(patch,obj)) throw new Error('model returned an invalid, empty, or out-of-scope feature patch');
    apply(patch);
    run('git',['diff','--check'],{stdio:'inherit'});
    run('npm',['run','build'],{stdio:'inherit',timeout:Math.min(900000,Math.max(60000,Math.floor(left()*60000)))});
    completed.add(obj.id); save();
    console.log(`[autobot] VERIFIED FEATURE: ${obj.id}`);
  } catch(e) {
    state.failed ||= {}; state.failed[obj.id]={message:e.message,at:new Date().toISOString()}; save();
    console.error(`[autobot] feature ${obj.id} failed: ${e.message}`);
    // Never loop forever on one objective. The next objective can continue.
    completed.add(obj.id); save();
  }
}
console.log(`[autobot] feature brain finished; verified=${completed.size}; elapsed=${((Date.now()-started)/60000).toFixed(2)}m`);
