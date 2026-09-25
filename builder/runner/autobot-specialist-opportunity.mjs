#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const botId=String(process.env.AUTOBOT_SPECIALIST_BOT_ID||'').trim();
const ownedFiles=String(process.env.AUTOBOT_SPECIALIST_FILES||'').split(',').map(x=>x.trim()).filter(Boolean);
const mission=String(process.env.AUTOBOT_SPECIALIST_OBJECTIVE||'').trim();
const research=String(process.env.AUTOBOT_FORGE_RESEARCH_CONTEXT||'').trim();
const base=String(process.env.AUTOBOT_CURRENT_BASE||'').trim();
const model=process.env.AUTOBOT_DISCOVERY_MODEL||process.env.LOCAL_AI_MODEL||'qwen2.5-coder:3b';
const host=(process.env.OLLAMA_HOST||'http://127.0.0.1:11434').replace(/\/$/,'');
const timeoutMs=Math.max(20000,Number(process.env.AUTOBOT_OPPORTUNITY_TIMEOUT_MS||45000));
const statePath=path.join(root,'builder','working','specialist-opportunity-state',botId+'.json');
function json(p,f){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return f;}}
function source(){return ownedFiles.map(file=>{try{const content=fs.readFileSync(path.join(root,file),'utf8');return {file,lines:content.split(/\r?\n/).length,content:content.slice(0,18000)};}catch{return null;}}).filter(Boolean);}
function researchBrief(){try{const x=JSON.parse(research);return JSON.stringify({promising:(x.promising||[]).slice(0,8),candidateWorkerIdeas:(x.candidateWorkerIdeas||[]).slice(0,8),retestTargets:(x.retestTargets||[]).slice(0,8),topSignals:(x.topSignals||[]).slice(0,8),failureClasses:x.failureClasses||{}});}catch{return research.slice(0,12000);}}
function fallback(state){const n=(state.attempted?.length||0)+1;return {title:'New '+botId+' product capability '+n,userValue:'Add a concrete new capability that expands what Bikeztagram can do for users.',problem:'The specialist must continuously move the product forward instead of only retuning existing behaviour.',implementation:'Within '+ownedFiles.join(', ')+', add one self-contained capability that is genuinely absent and consumed by the real production path.',acceptanceCriteria:['new production-visible behaviour exists','the behaviour is actually consumed downstream','existing contracts and smaller inputs remain valid','no placeholder, metadata-only or duplicate implementation'],researchBasis:'deterministic fallback',noveltyCheck:'Do not repeat a previously attempted opportunity.'};}
async function main(){
 if(!botId||!ownedFiles.length)throw new Error('opportunity selector requires bot id and owned files');
 const state=json(statePath,{schemaVersion:1,botId,attempted:[]});
 const prompt=[
 'You are the autonomous Bikeztagram product opportunity director for one specialist domain.',
 'Your primary job is to invent genuinely NEW product capabilities that move Bikeztagram forward, not merely repair weaknesses.',
 'Think like a product designer, cinematic editor and senior engineer. Propose new editing behaviours, creative controls, intelligence, workflows, richer media handling, continuity, export improvements or automation that are genuinely absent.',
 'Maintenance is acceptable only when it unlocks a new capability. Reject formatting, refactors, duplicate guards, score-only tweaks, metadata-only work, arbitrary limits and cosmetic churn.',
 'The implementation must fit the owned file scope and be consumed by the real production path. Do not pretend unowned files can be changed.',
 'Return ONLY JSON: {"title":"","userValue":"","problem":"","implementation":"","acceptanceCriteria":["",""],"researchBasis":"","noveltyCheck":""}.',
 'Specialist: '+botId,'Domain mission: '+mission,'Owned files: '+JSON.stringify(ownedFiles),'Current base: '+base,
 'Prior research evidence: '+researchBrief(),
 'Previously attempted opportunities: '+JSON.stringify((state.attempted||[]).slice(-30).map(x=>({title:x.title,status:x.status}))),
 'Current source: '+JSON.stringify(source())
 ].join('\n');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(host+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:prompt}],stream:false,format:'json',options:{temperature:0.45,num_ctx:8192,num_predict:1000}}),signal:controller.signal});
  const text=await response.text();if(!response.ok)throw new Error('HTTP '+response.status);
  const body=JSON.parse(text);const raw=body?.message?.content??body?.response??'';const start=raw.indexOf('{'),end=raw.lastIndexOf('}');
  if(start<0||end<=start)throw new Error('opportunity model returned no JSON');
  const idea=JSON.parse(raw.slice(start,end+1));
  if(!idea.title||!idea.implementation||!Array.isArray(idea.acceptanceCriteria)||idea.acceptanceCriteria.length<2)throw new Error('opportunity schema incomplete');
  const result={schemaVersion:1,botId,title:String(idea.title),userValue:String(idea.userValue||''),problem:String(idea.problem||''),implementation:String(idea.implementation),acceptanceCriteria:idea.acceptanceCriteria.map(String).slice(0,8),researchBasis:String(idea.researchBasis||''),noveltyCheck:String(idea.noveltyCheck||''),source:'ai-opportunity-director',generatedAt:new Date().toISOString()};
  fs.mkdirSync(path.dirname(statePath),{recursive:true});state.attempted=[...(state.attempted||[]),{...result,status:'selected'}].slice(-60);fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }catch(error){
  const result=fallback(state);result.source='deterministic-fallback';result.error=String(error?.message||error);result.generatedAt=new Date().toISOString();
  fs.mkdirSync(path.dirname(statePath),{recursive:true});state.attempted=[...(state.attempted||[]),{...result,status:'fallback'}].slice(-60);fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{clearTimeout(timer);}
}
main().catch(error=>{console.error('[opportunity] '+error.message);process.exit(1);});
