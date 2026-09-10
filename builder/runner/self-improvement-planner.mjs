#!/usr/bin/env node
/**
 * Deterministic self-improvement planner.
 * It converts recorded AutoBot failures/successes into bounded feedback for
 * the next self-improvement pass. It never edits repository code itself.
 */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const learningPath=path.join(root,'builder/working/aider-feature-brain-learning.json');
const readJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};

export function buildSelfImprovementBrief(learning=readJson(learningPath)){
  const data=learning&&typeof learning==='object'?learning:{};
  const failures=Array.isArray(data.failures)?data.failures.slice(-12):[];
  const successes=Array.isArray(data.successes)?data.successes.slice(-8):[];
  const recurring=new Map();
  for(const failure of failures){
    const key=String(failure.category||failure.code||'unknown');
    recurring.set(key,(recurring.get(key)||0)+1);
  }
  const recurringFailures=[...recurring.entries()].sort((a,b)=>b[1]-a[1]).map(([category,count])=>({category,count}));
  const focus=recurringFailures[0]||null;
  return {
    schemaVersion:1,
    observedFailures:failures.length,
    observedSuccesses:successes.length,
    recurringFailures,
    highestPriorityLearning:focus?`Investigate recurring ${focus.category} failures (${focus.count} observations).`:'No recurring failure pattern yet; improve observability and verification before broadening scope.',
    recentFailures:failures.map(item=>({objective:item.objective,pass:item.pass,category:item.category,message:item.message})),
    recentSuccesses:successes.map(item=>({objective:item.objective,pass:item.pass,changedPaths:item.changedPaths||[]})),
    rules:[
      'Treat repeated verification failures as evidence that the feature-engineering loop needs a guard or better feedback, not as permission to weaken verification.',
      'Prefer small deterministic control improvements over speculative rewrites.',
      'A failure lesson is only useful when it changes what the next pass is told to inspect or verify.',
      'Never relax scope, protected paths, rollback, audit, production gates, no-auto-commit behavior, or provider/Gemini constraints.'
    ]
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  console.log(JSON.stringify(buildSelfImprovementBrief(),null,2));
}
