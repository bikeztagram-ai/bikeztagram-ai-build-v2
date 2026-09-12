#!/usr/bin/env node
/**
 * AutoBot Self-Improvement Bot v1.
 * Analysis only: turns durable failures, telemetry and review evidence into
 * auditable proposals. It never edits source, merges, pushes, or changes gates.
 */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const outputPath=path.resolve(root,process.env.AUTOBOT_SELF_IMPROVEMENT_OUTPUT||'builder/working/autobot-self-improvement.json');
const queuePath=path.resolve(root,process.env.AUTOBOT_FAILURE_QUEUE_PATH||'builder/working/autobot-failure-queue.jsonl');
const telemetryPath=path.resolve(root,process.env.AUTOBOT_TELEMETRY_PATH||'builder/working/autobot-live-telemetry.log');
const statePath=path.resolve(root,process.env.AUTOBOT_STATE_PATH||'builder/working/autobot-state.json');
const reviewPaths=[
  path.resolve(root,process.env.AUTOBOT_REVIEW_PATH||'builder/working/autobot-review.json'),
  path.resolve(root,process.env.AUTOBOT_REVIEW_EVIDENCE_PATH||'builder/working/autobot-review-evidence.json'),
  path.resolve(root,process.env.AUTOBOT_REVIEWER_EVIDENCE_PATH||'builder/working/autobot-reviewer.json')
];
const maxPatterns=Math.max(1,Math.min(50,Number(process.env.AUTOBOT_SELF_IMPROVEMENT_MAX_PATTERNS||10)));

function readText(file){try{return fs.readFileSync(file,'utf8')}catch{return ''}}
function parseJson(file){try{return JSON.parse(readText(file))}catch{return null}}
function parseJsonl(file){return readText(file).split(/\r?\n/).filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}})}
function normalise(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ').slice(0,240)}
function safeFiles(value){return Array.isArray(value)?value.filter(item=>typeof item==='string').slice(0,20):[]}
function classify(record){
  const text=normalise([record.stage,record.error,record.message,record.source].filter(Boolean).join(' '));
  if(/syntax|parse|unexpected token|malformed/.test(text))return 'contract';
  if(/validator|verification|quality gate|verify/.test(text))return 'verification';
  if(/timeout|timed out|no progress|deadline|stalled/.test(text))return 'runner';
  if(/prompt|objective|selection|story|caption|director|product/.test(text))return 'brain';
  return 'task';
}
function loadReviews(){
  return reviewPaths.map(parseJson).filter(Boolean).flatMap(value=>Array.isArray(value)?value:[value]);
}
function buildPatterns(records,reviews){
  const groups=new Map();
  for(const record of records){
    const key=normalise(record.error||record.message||record.stage||record.source||'unknown');
    if(!key)continue;
    const group=groups.get(key)||{signature:key,count:0,statuses:new Set(),stages:new Set(),files:new Set(),classes:new Set(),failureIds:new Set()};
    group.count++; if(record.status)group.statuses.add(record.status); if(record.stage)group.stages.add(record.stage);
    for(const file of safeFiles(record.files))group.files.add(file); group.classes.add(classify(record)); if(record.id)group.failureIds.add(record.id); groups.set(key,group);
  }
  for(const review of reviews){
    const disposition=normalise(review.disposition||review.result||review.status);
    if(!disposition)continue;
    const key=`review:${disposition}`; const group=groups.get(key)||{signature:key,count:0,statuses:new Set(),stages:new Set(),files:new Set(),classes:new Set(),failureIds:new Set()};
    group.count++; group.statuses.add(disposition); group.classes.add('review'); groups.set(key,group);
  }
  return [...groups.values()].sort((a,b)=>b.count-a.count).slice(0,maxPatterns).map((group,index)=>({
    rank:index+1,signature:group.signature,count:group.count,classes:[...group.classes],stages:[...group.stages],affectedFiles:[...group.files],failureIds:[...group.failureIds],
    recurrence:group.count>=3?'recurring':group.count===2?'repeated':'isolated',
    confidence:group.count>=3?'high':group.count===2?'medium':'low',
    proposal:group.classes.has('verification')?'Strengthen the underlying contract or evidence path; do not weaken the verifier.':group.classes.has('contract')?'Repair the exact producer/consumer contract and add a focused syntax/contract test.':group.classes.has('runner')?'Improve checkpointing, timeout recovery or progress detection around this failure signature.':group.classes.has('brain')?'Improve the decision path at the failing objective stage and prove it with a representative behavioural test.':'Add a narrow regression test and improve the failing task path without changing protected infrastructure.',
    requiresHumanReview:true
  }));
}
function telemetrySummary(){
  const events=parseJsonl(telemetryPath); const counts={}; let noProgress=0;
  for(const event of events){counts[event.event]=(counts[event.event]||0)+1;if(Number(event.noProgress||0)>0)noProgress++;}
  return {events:events.length,eventCounts:counts,noProgressHeartbeats:noProgress,lastTimestamp:events.at(-1)?.timestamp||null};
}

const failures=parseJsonl(queuePath); const latestById=new Map();
for(const record of failures)if(record.id)latestById.set(record.id,record);
const latest=[...latestById.values()];
const reviews=loadReviews();
const patterns=buildPatterns(latest,reviews);
const state=parseJson(statePath);
const result={schema:'autobot-self-improvement-v1',generatedAt:new Date().toISOString(),analysisOnly:true,appliedChanges:[],protectedPaths:['builder/runner/aider-feature-brain.mjs','.github/workflows/autonomous-builder-v2-fast.yml','builder/brain/feature-objectives.json','builder/brain/autobot-fleet.json'],inputs:{failureQueue:queuePath,telemetry:telemetryPath,builderState:statePath,reviewEvidence:reviewPaths.filter(file=>fs.existsSync(file))},summary:{failureRecords:latest.length,open:latest.filter(r=>r.status==='open').length,repaired:latest.filter(r=>r.status==='repaired').length,verified:latest.filter(r=>r.status==='verified').length,blocked:latest.filter(r=>r.status==='blocked').length,rejected:latest.filter(r=>r.status==='rejected').length,reviewEvidenceCount:reviews.length,telemetry:telemetrySummary(),resumableBuilder:Boolean(state)},patterns,proposals:patterns.map(pattern=>({rank:pattern.rank,signature:pattern.signature,category:pattern.classes[0]||'task',evidence:{occurrences:pattern.count,stages:pattern.stages,files:pattern.affectedFiles,failureIds:pattern.failureIds},confidence:pattern.confidence,expectedImpact:pattern.count>=3?'high':'medium',action:pattern.proposal,requiresHumanReview:true}))};
fs.mkdirSync(path.dirname(outputPath),{recursive:true}); fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ok:true,schema:result.schema,analysisOnly:true,output:outputPath,failures:latest.length,patterns:patterns.length,proposals:result.proposals.length}));
