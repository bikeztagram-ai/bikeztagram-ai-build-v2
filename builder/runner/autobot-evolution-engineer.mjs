#!/usr/bin/env node
/**
 * Evidence-driven AutoBot Evolution Engineer.
 *
 * Observes production runtime plus the isolated specialist fan-in ledger,
 * identifies repeated editing failures, and produces bounded specialist
 * targeting/tuning recommendations. When explicitly requested, it writes a
 * candidate learning profile; the workflow opens a human-reviewed PR rather
 * than changing product code or merging anything automatically.
 */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const evidenceRoot=process.env.AUTOBOT_EVOLUTION_EVIDENCE_DIR||path.join(root,'builder','working','evolution-evidence');
const reportPath=process.env.AUTOBOT_EVOLUTION_REPORT||path.join(root,'builder','working','autobot-evolution-report.json');
const learningPath=path.join(root,'builder','brain','autobot-specialist-learning.json');
const apply=String(process.env.AUTOBOT_EVOLUTION_APPLY||'false')==='true';
const read=p=>{try{return fs.readFileSync(p,'utf8')}catch{return ''}};
const readJson=p=>{try{return JSON.parse(read(p))}catch{return {}}};

const ev={
  state:readJson(path.join(evidenceRoot,'persistent-runtime-state.json')),
  final:readJson(path.join(evidenceRoot,'autobot-final-handoff.json')),
  handoff:readJson(path.join(evidenceRoot,'autobot-specialist-handoff.json')),
  status:read(path.join(evidenceRoot,'autobot-live-status.log')).slice(-12000),
  fanIn:readJson(path.join(evidenceRoot,'fan-in','autobot-fan-in-ledger.json'))
};
const cycles=Array.isArray(ev.state.cycles)?ev.state.cycles:[];
const durations=cycles.map(c=>Number(c.durationMs||c.elapsedMs||0)).filter(n=>n>0);
const workers=Array.isArray(ev.fanIn.workers)?ev.fanIn.workers:[];
const metrics={
  cyclesObserved:cycles.length,
  avgCycleMs:durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length):0,
  maxCycleMs:durations.length?Math.max(...durations):0,
  specialistWorkers:workers.length,
  specialistCompleted:workers.filter(w=>w.status==='completed').length,
  specialistFailed:workers.filter(w=>w.status==='failed').length,
  specialistRecovery:workers.filter(w=>w.status==='recovery').length,
  specialistReview:workers.filter(w=>w.status==='review').length
};

function classify(worker){
  const text=JSON.stringify(worker).toLowerCase();
  if(/searchreplacenoexactmatch|search block failed to exactly match|no exact match/.test(text))return 'search-replace-no-exact-match';
  if(/no product change|without materializing|did not materialize/.test(text))return 'no-product-change';
  if(/timeout|timed out|network|fetch failed|connection|503|502|504/.test(text))return 'infrastructure';
  if(worker.status==='completed')return 'success';
  return 'unknown';
}

const observations=[];
const counts={};
for(const worker of workers){
  const failureClass=classify(worker);
  counts[failureClass]=(counts[failureClass]||0)+1;
  observations.push({
    botId:worker.botId||'unknown',
    status:worker.status||'unknown',
    category:worker.category||null,
    failureClass,
    objective:worker.objective||null,
    error:worker.error||null,
    targetMap:Array.isArray(worker.targetMap)?worker.targetMap:[],
    learnedMapTokens:worker.learnedMapTokens||null,
    learnedEditFormat:worker.learnedEditFormat||null
  });
}

const current=readJson(learningPath);
const profile={
  schemaVersion:1,
  purpose:current.purpose||'Evidence-driven tuning hints for isolated specialist editing.',
  default:{...(current.default||{mapTokens:1024,editFormat:'diff',targetingMode:'symbol-first',maxTargetSymbols:6})},
  bots:{...(current.bots||{})},
  failureStrategies:{...(current.failureStrategies||{})},
  learned:{
    ...(current.learned||{}),
    runsAnalyzed:Number(current.learned?.runsAnalyzed||0)+1,
    lastUpdated:new Date().toISOString(),
    observations:[...(Array.isArray(current.learned?.observations)?current.learned.observations:[]),...observations].slice(-100)
  }
};

for(const worker of observations){
  const bot=worker.botId;
  if(!bot||bot==='unknown')continue;
  const previous=profile.bots[bot]||{};
  const next={...previous};
  if(worker.failureClass==='search-replace-no-exact-match'){
    next.targetingMode='symbol-first';
    next.mapTokens=Math.min(Number(next.mapTokens||1024),1024);
    next.editFormat='diff';
    next.promptHint='Use the target map and patch the smallest named symbol or nearby anchor. Avoid broad rewrites and do not invent a SEARCH block from memory.';
  }else if(worker.failureClass==='no-product-change'){
    next.targetingMode='acceptance-first';
    next.promptHint='Make one minimal owned-file edit that directly satisfies one acceptance criterion. Materialize the edit; do not return prose.';
  }else if(worker.failureClass==='success' && !next.promptHint){
    next.targetingMode=next.targetingMode||'symbol-first';
    next.mapTokens=next.mapTokens||1024;
    next.editFormat=next.editFormat||'diff';
  }
  profile.bots[bot]=next;
}

if(counts['search-replace-no-exact-match']){
  profile.failureStrategies['search-replace-no-exact-match']={
    ...(profile.failureStrategies['search-replace-no-exact-match']||{}),
    targetingMode:'symbol-first',
    mapTokens:1024,
    editFormat:'diff',
    promptHint:'Use the target map and patch the smallest named symbol or nearby anchor. Avoid broad rewrites.'
  };
}
if(counts['no-product-change']){
  profile.failureStrategies['no-product-change']={
    ...(profile.failureStrategies['no-product-change']||{}),
    targetingMode:'acceptance-first',
    promptHint:'Materialize one minimal owned-file change directly tied to acceptance criteria.'
  };
}

const hypotheses=[];
if(counts['search-replace-no-exact-match'])hypotheses.push({
  id:'evo-targeted-editing',
  priority:'high',
  title:'Use symbol-first targeted editing after exact-match failures',
  reason:`Observed ${counts['search-replace-no-exact-match']} specialist exact-match failure(s).`,
  measurement:'exact-match failure rate per specialist run'
});
if(counts['no-product-change'])hypotheses.push({
  id:'evo-materialization',
  priority:'high',
  title:'Strengthen acceptance-first materialization prompts',
  reason:`Observed ${counts['no-product-change']} no-product-change result(s).`,
  measurement:'no-product-change rate'
});
if(!hypotheses.length)hypotheses.push({
  id:'evo-observability',
  priority:'medium',
  title:'Continue collecting specialist outcome and targeting evidence',
  reason:'No repeated high-confidence editing failure pattern was found in the available fan-in ledger.',
  measurement:'evidence completeness and repeat-failure rate'
});

if(apply){
  fs.mkdirSync(path.dirname(learningPath),{recursive:true});
  fs.writeFileSync(learningPath,JSON.stringify(profile,null,2)+'\n');
}

const report={
  schemaVersion:'autobot-evolution-v2',
  generatedAt:new Date().toISOString(),
  mode:apply?'bounded-learning-candidate':'observe-and-propose',
  productionLane:{isolated:true,blocking:false},
  evidence:{
    metrics,
    fanInPresent:workers.length>0,
    handoff:!!ev.handoff,
    finalHandoff:!!ev.final,
    statusTail:ev.status.slice(-4000),
    failureClasses:counts
  },
  observations,
  hypotheses,
  learningProfile:profile,
  guardrails:{
    automaticMerge:false,
    productionDependency:false,
    productCodeModification:false,
    humanReviewRequired:true
  },
  experiment:{
    requested:apply,
    status:apply?'learning-profile-written-for-human-review':'disabled-by-default',
    changedFiles:apply?['builder/brain/autobot-specialist-learning.json']:[]
  }
};
fs.mkdirSync(path.dirname(reportPath),{recursive:true});
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({
  ok:true,
  mode:report.mode,
  hypotheses:hypotheses.length,
  specialistWorkers:workers.length,
  failureClasses:counts,
  learningProfileChanged:apply,
  reportPath
},null,2));
