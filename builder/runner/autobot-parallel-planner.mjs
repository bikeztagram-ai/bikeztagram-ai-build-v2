#!/usr/bin/env node
/** Plan independent product work packages for concurrent specialist Builders. */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const registryPath=path.join(root,'builder/brain/autobot-fleet.json');
const objectivesPath=path.join(root,'builder/brain/feature-objectives.json');
const output=path.join(root,'builder/working/autobot-parallel-plan.json');
const model=process.env.AUTOBOT_DISCOVERY_MODEL||process.env.LOCAL_AI_MODEL||'qwen2.5-coder:3b';
const host=(process.env.OLLAMA_HOST||'http://127.0.0.1:11434').replace(/\/$/,'');
const requestTimeoutMs=Number(process.env.AUTOBOT_DISCOVERY_TIMEOUT_MS||20000);
const allowedBots=(process.env.AUTOBOT_PARALLEL_BOTS||'director-builder,timeline-builder').split(',').map(s=>s.trim()).filter(Boolean);
function readJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function inventory(){return fs.readdirSync(path.join(root,'src'),{withFileTypes:true}).filter(e=>e.isFile()&&/\.(js|jsx|ts|tsx)$/.test(e.name)).map(e=>`src/${e.name}`).sort();}
function clean(raw){const text=String(raw||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();const a=text.indexOf('{');const b=text.lastIndexOf('}');if(a<0||b<=a)throw new Error('planner model did not return JSON');return JSON.parse(text.slice(a,b+1));}
function objectivesFromLibrary(library){return Array.isArray(library)?library:Array.isArray(library?.objectives)?library.objectives:[];}
function completedSpecialistTitles(){
  try{
    const log=execFileSync('git',['log','-n','100','--format=%s'],{cwd:root,encoding:'utf8'});
    return log.split(/\r?\n/).map(line=>{
      const m=line.match(/^autobot\\((?:director-builder|timeline-builder)\\):\\s*(.+?)(?:\\s+\\(#\\d+\\))?$/i);
      return m?m[1].trim().toLowerCase():'';
    }).filter(Boolean);
  }catch{return [];}
}
function validate(item,bot,seenTitles,seenFiles,inv,library,completedTitles){
  const p={botId:bot.id,title:String(item.title||'').trim(),whyNow:String(item.whyNow||'').trim(),files:Array.isArray(item.files)?item.files.map(String).map(s=>s.trim()).filter(Boolean):[],acceptance:Array.isArray(item.acceptance)?item.acceptance.map(String).map(s=>s.trim()).filter(Boolean):[],constraints:Array.isArray(item.constraints)?item.constraints.map(String).map(s=>s.trim()).filter(Boolean):[],priority:Number(item.priority)};
  if(!p.title||!p.whyNow||!p.acceptance.length||!p.files.length||!Number.isFinite(p.priority))throw new Error(`${bot.id}: incomplete work package`);
  if(seenTitles.has(p.title.toLowerCase()))throw new Error(`${bot.id}: duplicate work package title`);
  const owned=new Set(bot.ownsFiles||[]);for(const f of p.files){if(!inv.includes(f))throw new Error(`${bot.id}: nonexistent product file ${f}`);if(!owned.has(f))throw new Error(`${bot.id}: scope escapes specialist ownership: ${f}`);if(seenFiles.has(f))throw new Error(`${bot.id}: scope overlaps another parallel worker: ${f}`);}
  const objectives=objectivesFromLibrary(library);if(objectives.some(o=>String(o?.title||'').trim().toLowerCase()===p.title.toLowerCase()))throw new Error(`${bot.id}: planner repeated an existing objective title`);if(completedTitles.has(p.title.toLowerCase()))throw new Error(`${bot.id}: planner repeated a completed specialist objective from git history`);
  const banned=/\b(builder|workflow|github|vercel|autobot|orchestrat|repair bot|qa bot|reviewer|self-improvement|infrastructure|validator|gate|secret|credential)\b/i;if(banned.test(`${p.title} ${p.whyNow} ${p.acceptance.join(' ')}`))throw new Error(`${bot.id}: proposed non-product work`);
  seenTitles.add(p.title.toLowerCase());for(const f of p.files)seenFiles.add(f);return p;
}
function fallback(bot,library){
  const existing=objectivesFromLibrary(library).map(o=>String(o?.title||'').toLowerCase());
  const candidates={
    'director-builder':{title:'Adaptive hook-to-payoff shot scoring',whyNow:'Give the director a stronger user-visible way to rank the opening hook and final payoff from the available media instead of relying on a fixed story shape.',files:['src/director.js'],acceptance:['hook and payoff scores use available media evidence','selection remains diverse and avoids duplicate source use','scores are emitted by director story data consumed by the production edit plan','single-source and rich-media inputs remain usable','npm run build passes'],constraints:['preserve existing director contracts','never invent media','keep story structure dynamic'],priority:94},
    'timeline-builder':{title:'Cadence-aware transition density',whyNow:'Improve visible editorial rhythm by adapting cut and transition density to shot duration and sequence energy rather than applying uniform timing.',files:['src/executableTimeline.js','src/editorialRhythm.js','src/renderer.js'],acceptance:['transition density responds to editorial cadence','short and rich timelines remain executable','duration budget remains deterministic','timing decisions are consumed by rendering','npm run build passes'],constraints:['preserve timeline contracts','do not invent source media','keep transitions executable and provider-neutral'],priority:93}
  };
  const candidate=candidates[bot.id];if(!candidate)throw new Error(`${bot.id}: no deterministic product-gap fallback`);
  if(existing.includes(candidate.title.toLowerCase()))throw new Error(`${bot.id}: fallback objective already exists`);
  return candidate;
}
async function aiPlan(bots,library,inv,completedTitles){
  const objectiveTitles=objectivesFromLibrary(library).map(o=>String(o?.title||'').trim()).filter(Boolean);
  const completed=Array.from(completedTitles);
  const specialistBrief=bots.map(b=>({id:b.id,role:b.role,ownsFiles:b.ownsFiles}));
  const prompt=`Return ONLY JSON: {"packages":[{"botId":"...","title":"...","whyNow":"...","files":["..."],"acceptance":["..."],"constraints":["..."],"priority":90}]}. Create one genuinely new user-facing product capability per specialist. Prefer the smallest useful file scope: use exactly one owned product file unless the capability genuinely cannot be implemented in one file. Do not repeat these existing objectives: ${JSON.stringify(objectiveTitles)}. Do not repeat these already-completed specialist objectives from git history: ${JSON.stringify(completed)}. If a capability is already implemented, choose a different product gap instead of trying to edit the same behavior again. Use only owned files. Specialists: ${JSON.stringify(specialistBrief)}. Source files: ${JSON.stringify(inv)}. No infrastructure, automation, CI, or provider work.`;
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),requestTimeoutMs);
  try{
    const response=await fetch(`${host}/api/chat`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:prompt}],stream:false,format:'json',options:{temperature:0.1,num_ctx:2048,num_predict:420}}),signal:controller.signal});
    const bodyText=await response.text();if(!response.ok)throw new Error(`HTTP ${response.status}`);let body;try{body=JSON.parse(bodyText);}catch{throw new Error('invalid HTTP JSON');}
    const raw=clean(body?.message?.content??body?.response??'');return raw.packages||[];
  }finally{clearTimeout(timeout);}
}
async function main(){
  const registry=readJson(registryPath,null);if(!registry)throw new Error('fleet registry missing');if(registry.coordination?.maxConcurrentWorkers<2)throw new Error('parallel planning is blocked until the fleet activation gate explicitly authorizes at least two concurrent workers');
  const bots=(registry.bots||[]).filter(b=>allowedBots.includes(b.id)&&b.specialistBuilder===true&&b.status==='verified');if(bots.length<2)throw new Error('at least two verified specialist Builders are required');
  const library=readJson(objectivesPath,{objectives:[]});const inv=inventory();const completedTitles=new Set(completedSpecialistTitles());let rawPackages=[];let source='ai-discovery';let aiFailure='';
  try{rawPackages=await aiPlan(bots,library,inv,completedTitles);if(!Array.isArray(rawPackages)||rawPackages.length<bots.length)throw new Error('AI planner returned too few packages');}
  catch(error){aiFailure=String(error?.message||error);source='deterministic-product-gap-fallback';console.warn(`[parallel-planner] AI discovery unavailable: ${aiFailure}; using deterministic product-gap fallback`);rawPackages=bots.map(bot=>fallback(bot,library));}
  const byId=new Map(rawPackages.map(p=>[String(p.botId),p]));const seenTitles=new Set(),seenFiles=new Set();const packages=bots.map(bot=>{const item=byId.get(bot.id)||fallback(bot,library);return validate(item,bot,seenTitles,seenFiles,inv,library,completedTitles);});
  const plan={schemaVersion:1,source,generatedAt:new Date().toISOString(),discovery:{model,aiFailure:aiFailure||null,completedSpecialistObjectives:Array.from(completedTitles)},workers:packages};fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({ok:true,status:'parallel-plan-created',source,workers:packages.map(p=>({botId:p.botId,title:p.title,files:p.files}))}));
}
main().catch(error=>{console.error(`[parallel-planner] ${error.message}`);process.exit(1);});
