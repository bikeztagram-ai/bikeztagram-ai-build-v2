#!/usr/bin/env node
/** Plan independent product work packages for concurrent specialist Builders. */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const registryPath=path.join(root,'builder/brain/autobot-fleet.json');
const objectivesPath=path.join(root,'builder/brain/feature-objectives.json');
const completedObjectivesPath=path.join(root,'builder/brain/autobot-completed-specialist-objectives.json');
const rndPath=process.env.AUTOBOT_RND_INPUT||path.join(root,'builder','working','autobot-rnd-brief.json');
const output=path.join(root,'builder/working/autobot-parallel-plan.json');
const model=process.env.AUTOBOT_DISCOVERY_MODEL||process.env.LOCAL_AI_MODEL||'qwen2.5-coder:3b';
const host=(process.env.OLLAMA_HOST||'http://127.0.0.1:11434').replace(/\/$/,'');
const requestTimeoutMs=Number(process.env.AUTOBOT_DISCOVERY_TIMEOUT_MS||20000);
const allowedBots=(process.env.AUTOBOT_PARALLEL_BOTS||'director-builder,timeline-builder').split(',').map(s=>s.trim()).filter(Boolean);
function readJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function inventory(){return fs.readdirSync(path.join(root,'src'),{withFileTypes:true}).filter(e=>e.isFile()&&/\.(js|jsx|ts|tsx)$/.test(e.name)).map(e=>`src/${e.name}`).sort();}
function clean(raw){const text=String(raw||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();const a=text.indexOf('{');const b=text.lastIndexOf('}');if(a<0||b<=a)throw new Error('planner model did not return JSON');return JSON.parse(text.slice(a,b+1));}
function objectivesFromLibrary(library){return Array.isArray(library)?library:Array.isArray(library?.objectives)?library.objectives:[];}
function acceptanceSignalsSatisfied(objective){
  const signals=objective?.implementationSignals;
  if(!signals||typeof signals!=='object')return [];
  const satisfied=[];
  for(const [clause,rule] of Object.entries(signals)){
    const file=String(rule?.file||'');
    const source=String(rule?.source||'');
    if(!file||!source)continue;
    try{
      const content=fs.readFileSync(path.join(root,file),'utf8');
      if(content.includes(source))satisfied.push(String(clause).trim().toLowerCase());
    }catch{}
  }
  return satisfied.filter(Boolean);
}
function staleAcceptanceTitles(library){
  const out=new Set();
  for(const objective of objectivesFromLibrary(library)){
    const title=String(objective?.title||'').trim();
    for(const clause of acceptanceSignalsSatisfied(objective)){
      out.add(`${title} — ${clause}`.toLowerCase());
    }
  }
  return out;
}
function completedSpecialistTitles(){
  const titles=new Set();
  try{
    const log=execFileSync('git',['log','-n','150','--format=%s'],{cwd:root,encoding:'utf8'});
    for(const line of log.split(/\r?\n/)){
      const m=line.match(/^autobot(?:-specialist)?\s*\((?:director-builder|timeline-builder)\):\s*(.+?)(?:\s+\(#\d+\))?$/i);
      if(m)titles.add(m[1].trim().toLowerCase());
    }
  }catch{}
  // Persistent runs may have valid specialist handoffs that are not yet
  // represented by a conventional commit subject. Treat those objectives as
  // attempted/consumed so deterministic planner fallback cannot churn the
  // same objective after an AI-discovery timeout or recovery cycle.
  try{
    const persistentRoot=path.join(root,'builder','working','persistent');
    if(fs.existsSync(persistentRoot)){
      for(const cycle of fs.readdirSync(persistentRoot,{withFileTypes:true})){
        if(!cycle.isDirectory()||!/^cycle-\d+$/.test(cycle.name))continue;
        for(const bot of ['director-builder','timeline-builder']){
          const handoff=path.join(persistentRoot,cycle.name,bot,'autobot-specialist-handoff.json');
          const data=readJson(handoff,null);
          const title=String(data?.objective?.title||data?.objectiveTitle||'').trim().toLowerCase();
          if(title)titles.add(title);
        }
      }
    }
  }catch{}
  return [...titles];
}
function completedObjectiveRegistry(){
  const data=readJson(completedObjectivesPath,{objectives:[]});
  const entries=Array.isArray(data)?data:data.objectives;
  return entries.map(x=>String(x?.title??x??'').trim().toLowerCase()).filter(Boolean);
}
function validate(item,bot,seenTitles,seenFiles,inv,library,completedTitles,staleAcceptanceTitles=new Set()){
  const p={botId:bot.id,title:String(item.title||'').trim(),whyNow:String(item.whyNow||'').trim(),files:Array.isArray(item.files)?item.files.map(String).map(s=>s.trim()).filter(Boolean):[],acceptance:Array.isArray(item.acceptance)?item.acceptance.map(String).map(s=>s.trim()).filter(Boolean):[],constraints:Array.isArray(item.constraints)?item.constraints.map(String).map(s=>s.trim()).filter(Boolean):[],priority:Number(item.priority)};
  if(!p.title||!p.whyNow||!p.acceptance.length||!p.files.length||!Number.isFinite(p.priority))throw new Error(`${bot.id}: incomplete work package`);
  if(seenTitles.has(p.title.toLowerCase()))throw new Error(`${bot.id}: duplicate work package title`);
  const owned=new Set(bot.ownsFiles||[]);for(const f of p.files){if(!inv.includes(f))throw new Error(`${bot.id}: nonexistent product file ${f}`);if(!owned.has(f))throw new Error(`${bot.id}: scope escapes specialist ownership: ${f}`);if(seenFiles.has(f))throw new Error(`${bot.id}: scope overlaps another parallel worker: ${f}`);}
  const objectives=objectivesFromLibrary(library);if(objectives.some(o=>String(o?.title||'').trim().toLowerCase()===p.title.toLowerCase()))throw new Error(`${bot.id}: planner repeated an existing objective title`);if(completedTitles.has(p.title.toLowerCase()))throw new Error(`${bot.id}: planner repeated a completed specialist objective from git history`);if(staleAcceptanceTitles.has(p.title.toLowerCase()))throw new Error(`${bot.id}: planner selected an acceptance slice already satisfied by the current product runtime`);
  const banned=/\b(builder|workflow|github|vercel|autobot|orchestrat|repair bot|qa bot|reviewer|self-improvement|infrastructure|validator|gate|secret|credential)\b/i;if(banned.test(`${p.title} ${p.whyNow} ${p.acceptance.join(' ')}`))throw new Error(`${bot.id}: proposed non-product work`);
  seenTitles.add(p.title.toLowerCase());for(const f of p.files)seenFiles.add(f);return p;
}
function fallback(bot,library,inventoryFiles,completedTitles=new Set(),reservedTitles=new Set(),staleAcceptanceTitles=new Set(),rnd={recommendations:[]}) {
  const existing=new Set(objectivesFromLibrary(library).map(o=>String(o?.title||'').trim().toLowerCase()));
  const completed=completedTitles instanceof Set?completedTitles:new Set(completedTitles);
  const candidates={
    'director-builder':[
      {title:'Prompt-sensitive role weighting',whyNow:'Make creative-brief language visibly influence the director scoring weights for story roles, so action, reveal and calm requests change which available shots are selected.',files:['src/director.js'],acceptance:['creative intent changes role-specific scoring using existing media evidence','selection remains diverse and avoids duplicate source use','the resulting score is consumed by the production story decision path','single-source and rich-media inputs remain usable','npm run build passes'],constraints:['preserve existing director contracts','never invent media','keep story structure dynamic'],priority:92},
      {title:'Evidence-weighted subject diversity',whyNow:'Improve shot selection variety by balancing visual evidence against repeated subject families instead of allowing one strong subject to dominate the story.',files:['src/director.js'],acceptance:['subject repetition affects candidate scoring without blocking useful media','visual evidence remains part of the final score','selected shots remain consumed by the production edit plan','single-source inputs remain usable','npm run build passes'],constraints:['preserve existing director contracts','never invent media','keep diversity deterministic'],priority:91}
    ],
    'timeline-builder':[
      {title:'Source-aware trim continuity',whyNow:'Make executable timeline trims adapt safely to source duration metadata so cuts do not request more source media than is available.',files:['src/executableTimeline.js'],acceptance:['trim end is bounded by available source duration when metadata exists','short clips remain executable after normalization','duration budgeting remains deterministic','the normalized trims reach rendering through directorExecution','npm run build passes'],constraints:['preserve timeline contracts','never invent source media','keep provider-neutral execution'],priority:92},
      {title:'Energy-aware motion intensity',whyNow:'Tie executable motion intensity to editorial role and energy so action beats feel more dynamic while calmer beats retain controlled movement.',files:['src/executableTimeline.js'],acceptance:['motion intensity responds deterministically to role and creative intent','action and calm sequences produce different executable motion values','normalized motion remains within safe bounds','directorExecution carries the chosen intensity to rendering','npm run build passes'],constraints:['preserve timeline contracts','keep motion bounded','do not alter provider abstraction'],priority:91}
    ]
  };
  const pool=[];
  const availableFiles=new Set(Array.isArray(inventoryFiles)?inventoryFiles:[]);
  const invForRnd=availableFiles;
  const rndRecommendations=Array.isArray(rnd?.recommendations)?rnd.recommendations:[];
  for(const recommendation of rndRecommendations){
    const title=String(recommendation?.title||'').trim();
    const files=(Array.isArray(recommendation?.files)?recommendation.files:[]).map(String).filter(Boolean);
    const targetFile=files.find(file=>(bot.ownsFiles||[]).includes(file)&&invForRnd.has(file));
    if(!title||!targetFile)continue;
    pool.push({
      title:`R&D — ${title}`,
      whyNow:String(recommendation?.whyNow||'Evidence-first R&D identified this product opportunity; validate it against the current runtime before editing.').trim(),
      files:[targetFile],
      acceptance:(Array.isArray(recommendation?.acceptanceHints)?recommendation.acceptanceHints:[]).map(String).filter(Boolean).slice(0,4).concat(['the change affects the real production decision path rather than existing only as metadata','npm run build passes']),
      constraints:['preserve existing product contracts','validate R&D claims against current source evidence','never weaken quality gates'],
      priority:Math.max(60,100-(Number(recommendation?.rank)||8))
    });
  }
  pool.push(...(candidates[bot.id]||[]));
  const owned=new Set((bot.ownsFiles||[]).map(String));
  
  // After the small known fallbacks are exhausted, deterministically decompose
  // the product objective library into one acceptance slice at a time. This
  // keeps long runs productive when local AI discovery is temporarily
  // unavailable, while git history prevents the same slice being repeated.
  for(const objective of objectivesFromLibrary(library)){
    const title=String(objective?.title||'').trim();
    if(!title)continue;
    const objectiveFiles=(Array.isArray(objective.files)?objective.files:[]).map(String).filter(f=>owned.has(f)&&availableFiles.has(f));
    // Deterministic decomposition must target a file the specialist fallback can implement.
    const preferredFiles=bot.id==='timeline-builder'
      ? ['src/executableTimeline.js','src/editorialRhythm.js']
      : bot.id==='director-builder'
        ? ['src/director.js']
        : [];
    const targetFile=preferredFiles.find(f=>objectiveFiles.includes(f))||null;
    if(!targetFile)continue;
    for(const acceptance of (Array.isArray(objective.acceptance)?objective.acceptance:[])){
      const clause=String(acceptance||'').trim();
      if(!clause||/^(verify|test|exercise|perform an adversarial|npm run build)\b/i.test(clause))continue;
      const generatedTitle=`${title} — ${clause}`;
      pool.push({
        title:generatedTitle,
        whyNow:`Implement the product capability represented by this uncompleted acceptance slice: ${clause}.`,
        files:[targetFile],
        acceptance:[
          clause,
          'the change affects the real production decision path rather than existing only as metadata',
          'npm run build passes'
        ],
        constraints:Array.isArray(objective.constraints)?objective.constraints.map(String):[],
        priority:Math.max(50,Number(objective.priority)||50)
      });
    }
  }

  const candidate=pool.find(item=>{
    const title=String(item.title||'').toLowerCase();
    return !existing.has(title)&&!completed.has(title)&&!reservedTitles.has(title)&&!staleAcceptanceTitles.has(title);
  });
  if(!candidate)throw new Error(`${bot.id}: no unused deterministic product-gap fallback remains`);
  return candidate;
}
async function aiPlan(bots,library,inv,completedTitles,rnd){
  const objectiveTitles=objectivesFromLibrary(library).map(o=>String(o?.title||'').trim()).filter(Boolean);
  const stale=Array.from(staleAcceptanceTitles(library));
  const completed=Array.from(completedTitles);
  const specialistBrief=bots.map(b=>({id:b.id,role:b.role,ownsFiles:b.ownsFiles}));
  const prompt=`Return ONLY JSON: {"packages":[{"botId":"...","title":"...","whyNow":"...","files":["..."],"acceptance":["..."],"constraints":["..."],"priority":90}]}. Create one genuinely new user-facing product capability per specialist. Prefer the smallest useful file scope: use exactly one owned product file unless the capability genuinely cannot be implemented in one file. Do not repeat these existing objectives: ${JSON.stringify(objectiveTitles)}. Do not repeat these already-completed specialist objectives from git history: ${JSON.stringify(completed)}. If a capability is already implemented, choose a different product gap instead of trying to edit the same behavior again. Do not select these already-satisfied acceptance slices: ${JSON.stringify(stale)}. Use only owned files. Specialists: ${JSON.stringify(specialistBrief)}. Source files: ${JSON.stringify(inv)}. R&D research is evidence, not implementation authority: use it to discover product gaps, cross-check it against the current source/objective state, and reject unsupported claims. R&D findings: ${JSON.stringify(rnd.findings||[])}. R&D recommendations: ${JSON.stringify(rnd.recommendations||[])}. R&D risks: ${JSON.stringify(rnd.risks||[])}. No infrastructure, automation, CI, or provider work.`;
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
  const library=readJson(objectivesPath,{objectives:[]});const inv=inventory();const staleAcceptance=staleAcceptanceTitles(library);const completedTitles=new Set([...completedSpecialistTitles(),...completedObjectiveRegistry()]);const rnd=readJson(rndPath,{schemaVersion:'autobot-rnd-v1',findings:[],recommendations:[],risks:[]});let rawPackages=[];let source='ai-discovery';let aiFailure='';
  try{rawPackages=await aiPlan(bots,library,inv,completedTitles,rnd);if(!Array.isArray(rawPackages)||!rawPackages.length)throw new Error('AI planner returned no usable packages');}
  catch(error){aiFailure=String(error?.message||error);source='deterministic-product-gap-fallback';console.warn(`[parallel-planner] AI discovery unavailable: ${aiFailure}; using deterministic product-gap fallback`);rawPackages=[];}
  const byId=new Map(rawPackages.map(p=>[String(p.botId),p]));const seenTitles=new Set(),seenFiles=new Set();const packages=bots.map(bot=>{
    let item=byId.get(bot.id);
    try{
      if(!item)item=fallback(bot,library,inv,completedTitles,seenTitles,staleAcceptance,rnd);
      return validate(item,bot,seenTitles,seenFiles,inv,library,completedTitles,staleAcceptance);
    }catch(error){
      const aiError=String(error?.message||error);
      if(source==='ai-discovery'){aiFailure=aiFailure?\`${aiFailure}; ${bot.id}: ${aiError}\`:\`${bot.id}: ${aiError}\`;}
      const replacement=fallback(bot,library,inv,completedTitles,seenTitles,staleAcceptance,rnd);
      source=source==='ai-discovery'?'hybrid-ai-deterministic':source;
      return validate(replacement,bot,seenTitles,seenFiles,inv,library,completedTitles,staleAcceptance);
    }
  });
  const plan={schemaVersion:1,source,generatedAt:new Date().toISOString(),discovery:{model,aiFailure:aiFailure||null,completedSpecialistObjectives:Array.from(completedTitles),rndSource:rnd.source||null,rndRecommendationCount:Array.isArray(rnd.recommendations)?rnd.recommendations.length:0,rndRiskCount:Array.isArray(rnd.risks)?rnd.risks.length:0},workers:packages};fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({ok:true,status:'parallel-plan-created',source,workers:packages.map(p=>({botId:p.botId,title:p.title,files:p.files}))}));
}
main().catch(error=>{console.error(`[parallel-planner] ${error.message}`);process.exit(1);});
