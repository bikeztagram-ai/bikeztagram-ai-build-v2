#!/usr/bin/env node
/** Evidence-based product discovery. Produces a bounded product work proposal; never edits product code. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const out=path.join(root,'builder/working/autobot-discovered-objective.json');
const objectivesPath=path.join(root,'builder/brain/feature-objectives.json');
const directivePath=path.join(root,'builder/brain/autobot-product-directive.md');
const model=process.env.AUTOBOT_DISCOVERY_MODEL||process.env.LOCAL_AI_MODEL||'qwen2.5-coder:7b';
const ollamaHost=(process.env.OLLAMA_HOST||'http://127.0.0.1:11434').replace(/\/$/,'');

function readJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function sourceInventory(){
  const src=path.join(root,'src');
  return fs.readdirSync(src,{withFileTypes:true}).filter(e=>e.isFile()&&/\.(js|jsx|ts|tsx)$/.test(e.name)).map(e=>`src/${e.name}`).sort();
}
function cleanProposal(raw){
  const text=String(raw||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  const start=text.indexOf('{'); const end=text.lastIndexOf('}');
  if(start<0||end<=start)throw new Error('discovery model did not return JSON');
  const value=JSON.parse(text.slice(start,end+1));
  const proposal={title:String(value.title||'').trim(),whyNow:String(value.whyNow||'').trim(),files:Array.isArray(value.files)?value.files.map(String).map(s=>s.trim()).filter(Boolean):[],acceptance:Array.isArray(value.acceptance)?value.acceptance.map(String).map(s=>s.trim()).filter(Boolean):[],constraints:Array.isArray(value.constraints)?value.constraints.map(String).map(s=>s.trim()).filter(Boolean):[],priority:Number(value.priority)};
  if(!proposal.title||!proposal.whyNow||!proposal.acceptance.length||!Number.isFinite(proposal.priority))throw new Error('discovery proposal is incomplete');
  if(proposal.files.length<1)throw new Error('discovery proposal has no product scope');
  const inventory=new Set(sourceInventory());
  for(const file of proposal.files){if(!file.startsWith('src/')||file.includes('..')||!inventory.has(file))throw new Error(`discovery proposed invalid/nonexistent product file: ${file}`);}
  const library=readJson(objectivesPath,{objectives:[]}).objectives||[];
  const duplicate=library.some(o=>String(o?.title||'').trim().toLowerCase()===proposal.title.toLowerCase());
  if(duplicate)throw new Error('discovery proposal duplicates an existing objective title');
  const banned=/\b(builder|workflow|github|vercel|autobot|orchestrat|repair bot|qa bot|reviewer|self-improvement|infrastructure|validator|gate|secret|credential)\b/i;
  if(banned.test(`${proposal.title} ${proposal.whyNow} ${proposal.acceptance.join(' ')}`))throw new Error('discovery proposed infrastructure/orchestration work instead of product work');
  return proposal;
}
async function main(){
  const directive=fs.readFileSync(directivePath,'utf8');
  const library=readJson(objectivesPath,{objectives:[]});
  const inventory=sourceInventory();
  const prompt=`You are Bikeztagram's Product Discovery Planner, not an implementation worker. Find ONE high-value missing user-facing product capability that should be built next. Work from the product directive and actual source inventory, not just the existing objective list. Do not propose infrastructure, orchestration, AutoBot changes, tests-only work, dependency changes, or refinement of an already listed objective. Prefer a genuinely missing capability that moves the app toward a polished universal cinematic creative editor. The proposal must be implementable within existing src files and must not invent unsupported provider capabilities. Return JSON only with exactly: title, whyNow, files, acceptance, constraints, priority. files must contain existing src/* files.\n\nPRODUCT DIRECTIVE:\n${directive}\n\nEXISTING OBJECTIVES:\n${JSON.stringify(library.objectives||[])}\n\nSOURCE INVENTORY:\n${inventory.join('\n')}`;
  const response=await fetch(`${ollamaHost}/api/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,prompt,stream:false,format:'json',options:{temperature:0.2}})});
  if(!response.ok)throw new Error(`discovery model HTTP ${response.status}`);
  const body=await response.json();
  const proposal=cleanProposal(body.response);
  proposal.discoverySource='evidence-based-product-discovery';
  proposal.generatedAt=new Date().toISOString();
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,`${JSON.stringify(proposal,null,2)}\n`);
  console.log(JSON.stringify({ok:true,status:'proposal-created',path:'builder/working/autobot-discovered-objective.json',title:proposal.title,priority:proposal.priority,files:proposal.files}));
}
main().catch(error=>{console.error(`[discovery] ${error.message}`);process.exit(1);});
