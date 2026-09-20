#!/usr/bin/env node
/**
 * AutoBot R&D — evidence-first product research lane.
 *
 * R&D never edits, commits, pushes or changes validators. It researches the
 * current Bikeztagram product state, objective library and recent AutoBot
 * failures, then writes a compact research brief consumed by the Planner.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const output=process.env.AUTOBOT_RND_OUTPUT||path.join(root,'builder','working','autobot-rnd-brief.json');
const model=process.env.AUTOBOT_RND_MODEL||process.env.AUTOBOT_DISCOVERY_MODEL||process.env.LOCAL_AI_MODEL||'qwen2.5-coder:3b';
const host=(process.env.OLLAMA_HOST||'http://127.0.0.1:11434').replace(/\/$/,'');
const timeoutMs=Math.max(15_000,Number(process.env.AUTOBOT_RND_TIMEOUT_MS||60_000));
const objectivePath=path.join(root,'builder','brain','feature-objectives.json');
const queuePath=process.env.AUTOBOT_FAILURE_QUEUE_PATH||path.join(root,'builder','working','autobot-failure-queue.jsonl');
const sourceFiles=fs.readdirSync(path.join(root,'src'),{withFileTypes:true}).filter(x=>x.isFile()&&/\.(js|jsx|ts|tsx)$/.test(x.name)).map(x=>`src/${x.name}`).sort();
function readJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function parseJsonl(file){if(!fs.existsSync(file))return [];return fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(line=>{try{return JSON.parse(line)}catch{return null}}).filter(Boolean);}
function objectiveList(){const x=readJson(objectivePath,{objectives:[]});return Array.isArray(x)?x:(x.objectives||[]);}
function sourceEvidence(){
  const preferred=['src/director.js','src/executableTimeline.js','src/editorialRhythm.js','src/aiEditPlanner.js','src/renderer.js'];
  return preferred.filter(file=>sourceFiles.includes(file)).map(file=>{
    try{
      const content=fs.readFileSync(path.join(root,file),'utf8');
      return {file,lines:content.split(/\r?\n/).length,excerpt:content.slice(0,3200)};
    }catch{return null;}
  }).filter(Boolean);
}
function recentFailures(){
  const records=parseJsonl(queuePath), latest=new Map();
  for(const r of records)if(r.id)latest.set(r.id,r);
  return [...latest.values()].slice(-12).map(r=>({id:r.id,status:r.status,stage:r.stage,error:r.error,files:r.files||[],repairHint:r.repairHint||null}));
}
function deterministicBrief(reason){
  const objectives=objectiveList().filter(o=>Array.isArray(o.files)&&o.files.some(f=>sourceFiles.includes(f))).slice(0,8);
  const failures=recentFailures();
  return {
    schemaVersion:'autobot-rnd-v1',
    source:'deterministic-evidence-fallback',
    generatedAt:new Date().toISOString(),
    researchQuestion:'What product capability should the next specialist cycle investigate and implement without repeating already-satisfied work?',
    findings:[
      {id:'rnd-product-objectives',type:'product-gap',evidence:'feature-objectives.json',summary:`There are ${objectives.length} scoped product objectives available for evidence-based decomposition.`},
      {id:'rnd-failure-patterns',type:'reliability-signal',evidence:'autobot-failure-queue.jsonl',summary:`There are ${failures.length} recent durable failure records; recovery evidence must influence future work selection.`}
    ],
    recommendations:objectives.slice(0,4).map((o,i)=>({rank:i+1,title:o.title,files:o.files,whyNow:'Research candidate from the product objective library; validate current implementation before editing.',acceptanceHints:(o.acceptance||[]).filter(x=>!/^npm run build|^perform an adversarial|^test /i.test(String(x))).slice(0,4),evidence:['builder/brain/feature-objectives.json']})),
    risks:failures.filter(f=>f.status==='blocked'||f.status==='rejected').slice(0,4).map(f=>({failureId:f.id,stage:f.stage,error:f.error,files:f.files})),
    fallbackReason:reason||null,
    requiresHumanReview:true
  };
}
async function aiResearch(){
  const objectives=objectiveList().map(o=>({id:o.id,title:o.title,files:o.files,acceptance:o.acceptance,priority:o.priority})).slice(0,24);
  const failures=recentFailures();
  const sourceState=sourceEvidence();
  const prompt=[
    'You are the Bikeztagram R&D analyst. Research the current product state using the supplied objective library and failure evidence.',
    'Return ONLY JSON with schema {"findings":[{"id":"","type":"product-gap|risk|opportunity","summary":"","evidence":[]}],"recommendations":[{"rank":1,"title":"","files":[],"whyNow":"","acceptanceHints":[],"evidence":[]}],"risks":[{"summary":"","evidence":[]}]}',
    'Find genuinely useful user-facing product improvements, not AutoBot infrastructure. Prefer capabilities that are implementable in the registered specialist scopes.',
    'Do not claim a feature exists unless evidence supports it. Do not invent media, providers or capabilities. Do not propose weakening tests or gates.',
    'Current source files: '+JSON.stringify(sourceFiles),
    'Current production source evidence excerpts: '+JSON.stringify(sourceState),
    'Objective library: '+JSON.stringify(objectives),
    'Recent failure evidence: '+JSON.stringify(failures)
  ].join('\n');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(`${host}/api/chat`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:prompt}],stream:false,format:'json',options:{temperature:0.1,num_ctx:4096,num_predict:900}}),signal:controller.signal});
    const text=await response.text();if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const body=JSON.parse(text);const raw=body?.message?.content??body?.response??'';
    const start=raw.indexOf('{'),end=raw.lastIndexOf('}');if(start<0||end<=start)throw new Error('R&D model did not return JSON');
    const data=JSON.parse(raw.slice(start,end+1));
    if(!Array.isArray(data.findings)||!Array.isArray(data.recommendations)||!Array.isArray(data.risks))throw new Error('R&D JSON schema incomplete');
    return data;
  }finally{clearTimeout(timer);}
}
async function main(){
  let data,source='ai-research',failure=null;
  try{data=await aiResearch();}catch(error){failure=String(error?.message||error);console.warn(`[autobot-rnd] AI research unavailable: ${failure}; using deterministic evidence fallback`);data=deterministicBrief(failure);source='deterministic-evidence-fallback';}
  const result={schemaVersion:'autobot-rnd-v1',source,generatedAt:new Date().toISOString(),researchQuestion:'What evidence-backed product work should the next specialist cycle pursue?',sourceEvidenceFiles:sourceEvidence().map(item=>item.file),findings:data.findings.slice(0,8),recommendations:data.recommendations.slice(0,8),risks:data.risks.slice(0,8),fallbackReason:failure,requiresHumanReview:true};
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({ok:true,schemaVersion:result.schemaVersion,source,recommendations:result.recommendations.length,findings:result.findings.length,risks:result.risks.length,output}));
}
main().catch(error=>{console.error(`[autobot-rnd] FATAL: ${error.message}`);process.exit(1);});
