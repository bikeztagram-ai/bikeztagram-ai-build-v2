#!/usr/bin/env node
/** Plan independent product work packages for concurrent specialist Builders. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const registryPath=path.join(root,'builder/brain/autobot-fleet.json');
const objectivesPath=path.join(root,'builder/brain/feature-objectives.json');
const directivePath=path.join(root,'builder/brain/autobot-product-directive.md');
const output=path.join(root,'builder/working/autobot-parallel-plan.json');
const model=process.env.AUTOBOT_DISCOVERY_MODEL||process.env.LOCAL_AI_MODEL||'qwen2.5-coder:7b';
const host=(process.env.OLLAMA_HOST||'http://127.0.0.1:11434').replace(/\/$/,'');
const allowedBots=(process.env.AUTOBOT_PARALLEL_BOTS||'director-builder,timeline-builder').split(',').map(s=>s.trim()).filter(Boolean);
function readJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function inventory(){return fs.readdirSync(path.join(root,'src'),{withFileTypes:true}).filter(e=>e.isFile()&&/\.(js|jsx|ts|tsx)$/.test(e.name)).map(e=>`src/${e.name}`).sort();}
function clean(raw){const text=String(raw||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();const a=text.indexOf('{');const b=text.lastIndexOf('}');if(a<0||b<=a)throw new Error('planner model did not return JSON');return JSON.parse(text.slice(a,b+1));}
function validate(item,bot,seenTitles,seenFiles,inv,library){
  const p={botId:bot.id,title:String(item.title||'').trim(),whyNow:String(item.whyNow||'').trim(),files:Array.isArray(item.files)?item.files.map(String).map(s=>s.trim()).filter(Boolean):[],acceptance:Array.isArray(item.acceptance)?item.acceptance.map(String).map(s=>s.trim()).filter(Boolean):[],constraints:Array.isArray(item.constraints)?item.constraints.map(String).map(s=>s.trim()).filter(Boolean):[],priority:Number(item.priority)};
  if(!p.title||!p.whyNow||!p.acceptance.length||!p.files.length||!Number.isFinite(p.priority))throw new Error(`${bot.id}: incomplete work package`);
  if(seenTitles.has(p.title.toLowerCase()))throw new Error(`${bot.id}: duplicate work package title`);
  const owned=new Set(bot.ownsFiles||[]);for(const f of p.files){if(!inv.includes(f))throw new Error(`${bot.id}: nonexistent product file ${f}`);if(!owned.has(f))throw new Error(`${bot.id}: scope escapes specialist ownership: ${f}`);if(seenFiles.has(f))throw new Error(`${bot.id}: scope overlaps another parallel worker: ${f}`);}
  if(library.some(o=>String(o?.title||'').trim().toLowerCase()===p.title.toLowerCase()))throw new Error(`${bot.id}: planner repeated an existing objective title`);
  const banned=/\b(builder|workflow|github|vercel|autobot|orchestrat|repair bot|qa bot|reviewer|self-improvement|infrastructure|validator|gate|secret|credential)\b/i;if(banned.test(`${p.title} ${p.whyNow} ${p.acceptance.join(' ')}`))throw new Error(`${bot.id}: proposed non-product work`);
  seenTitles.add(p.title.toLowerCase());for(const f of p.files)seenFiles.add(f);return p;
}
async function main(){
  const registry=readJson(registryPath,null);if(!registry)throw new Error('fleet registry missing');if(registry.coordination?.maxConcurrentWorkers<2)throw new Error('parallel planning is blocked until the fleet activation gate explicitly authorizes at least two concurrent workers');
  const bots=(registry.bots||[]).filter(b=>allowedBots.includes(b.id)&&b.specialistBuilder===true&&b.status==='verified');if(bots.length<2)throw new Error('at least two verified specialist Builders are required');
  const directive=fs.readFileSync(directivePath,'utf8');const library=readJson(objectivesPath,{objectives:[]});const inv=inventory();const prompt=`You are the Bikeztagram Product Discovery Planner. Produce ONE independent missing user-facing capability for EACH specialist below. Work from the end goal, product directive, current source inventory and existing roadmap, but do not simply repeat existing objectives. Each package must be implementable only inside that specialist's declared files and packages MUST NOT overlap. Prefer genuinely new capability over polish of an already listed objective. Return JSON object {packages:[{botId,title,whyNow,files,acceptance,constraints,priority}]}. No infrastructure or AutoBot work.\n\nDIRECTIVE:\n${directive}\n\nEXISTING OBJECTIVES:\n${JSON.stringify(library.objectives||[])}\n\nSOURCE INVENTORY:\n${inv.join('\n')}\n\nSPECIALISTS:\n${JSON.stringify(bots.map(b=>({id:b.id,role:b.role,ownsFiles:b.ownsFiles,owns:b.owns})))} `;
  const response=await fetch(`${host}/api/chat`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:prompt}],stream:false,format:'json',options:{temperature:0.25}})});
  const bodyText=await response.text();
  if(!response.ok){let detail='';try{const errorBody=JSON.parse(bodyText);detail=String(errorBody.error||'').trim();}catch{}throw new Error(`planner model HTTP ${response.status}${detail?`: ${detail}`:''}`);}
  let body;try{body=JSON.parse(bodyText);}catch{throw new Error('planner model returned invalid HTTP JSON');}
  const raw=clean(body?.message?.content??body?.response??'');const byId=new Map((raw.packages||[]).map(p=>[String(p.botId),p]));const seenTitles=new Set(),seenFiles=new Set();const packages=bots.map(bot=>{const item=byId.get(bot.id);if(!item)throw new Error(`planner omitted ${bot.id}`);return validate(item,bot,seenTitles,seenFiles,inv,library);});
  const plan={schemaVersion:1,source:'evidence-based-parallel-product-discovery',generatedAt:new Date().toISOString(),workers:packages};fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({ok:true,status:'parallel-plan-created',workers:packages.map(p=>({botId:p.botId,title:p.title,files:p.files}))}));
}
main().catch(error=>{console.error(`[parallel-planner] ${error.message}`);process.exit(1);});
