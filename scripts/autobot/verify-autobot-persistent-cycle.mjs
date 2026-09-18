#!/usr/bin/env node
/**
 * Static contract audit for the persistent AutoBot cycle engine.
 * This intentionally checks the complete chain before a live run is allowed.
 */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const workflow=read('.github/workflows/autobot-parallel-specialists.yml');
const engine=read('builder/runner/autobot-persistent-cycle-engine.mjs');
const specialist=read('builder/runner/autobot-specialist-builder.mjs');
const recovery=read('builder/runner/autobot-specialist-recovery.mjs');
const candidate=read('builder/runner/autobot-endurance-candidate-check.mjs');
const planner=read('builder/runner/autobot-parallel-planner.mjs');
const handoff=read('builder/runner/autobot-specialist-handoff.mjs');
const registry=JSON.parse(read('builder/brain/autobot-fleet.json'));
const checks=[
 [workflow.includes('workflow_dispatch:'),'persistent workflow must be manually dispatchable'],
 [!workflow.includes('repository_dispatch:'),'persistent workflow must not restart itself through repository_dispatch'],
 [workflow.includes('autobot-persistent-cycle-engine.mjs'),'workflow must run the persistent cycle engine'],
 [workflow.includes('python -m pip install'),'Aider must be installed once at workflow level'],
 [workflow.includes('install-local-brain.sh'),'Ollama/model setup must happen once at workflow level'],
 [workflow.includes('OLLAMA_KEEP_ALIVE: 30m'),'model keep-alive must be configured'],
 [workflow.includes('timeout-minutes: 345'),'final job ceiling must remain below GitHub six-hour cutoff'],
 [workflow.includes("'5h30'"),'final 5h30 option must exist'],
 [engine.includes('autobot-parallel-planner.mjs'),'every internal cycle must re-plan'],
 [engine.includes('autobot-specialist-builder.mjs'),'every internal cycle must build product work'],
 [engine.includes('autobot-specialist-recovery.mjs'),'Repair Bot must remain in the chain'],
 [engine.includes('autobot-endurance-candidate-check.mjs'),'every candidate must receive independent QA/Reviewer verification'],
 [engine.includes('autobot/persistent/cycle-'),'verified state must be carried forward by a new branch'],
 [engine.includes("git push --set-upstream origin,branch") || engine.includes("git',['push','--set-upstream','origin',branch"),'carry-forward must be persisted remotely'],
 [engine.includes('while(true)'),'cycles must continue inside the same workflow job'],
 [engine.includes('finishGraceMinutes'),'finish grace must be enforced by the engine'],
 [specialist.includes('AUTOBOT_SPECIALIST_HANDOFF_PATH'),'parallel specialists must have isolated handoff outputs'],
 [specialist.includes('AUTOBOT_SKIP_NPM_INSTALL'),'persistent specialists must be able to reuse root node_modules'],
 [recovery.includes('AUTOBOT_SKIP_NPM_INSTALL'),'Repair Bot must be able to reuse root node_modules'],
 [candidate.includes('AUTOBOT_CANDIDATE_REVIEW_OUTPUT'),'candidate reviewers must have isolated outputs'],
 [candidate.includes('AUTOBOT_SKIP_NPM_INSTALL'),'candidate QA must be able to reuse root node_modules'],
 [planner.includes('completedSpecialistTitles'),'Planner must avoid repeating completed specialist objectives'],
 [handoff.includes('validateSpecialistHandoff'),'handoff schema validation must remain active'],
 [registry.enabled===true&&registry.coordination?.mode==='active','fleet activation gate must remain active'],
 [Number(registry.coordination?.maxConcurrentWorkers||0)>=2,'two specialist lanes must remain authorized']
];
for(const [ok,msg] of checks)assert(ok,msg);
console.log(JSON.stringify({ok:true,checks:checks.length,chain:['Planner','Director + Timeline Specialists (parallel)','Repair','independent QA + Reviewer','Carry-forward','repeat in same runner'],restartPerCycle:false,githubJobCeilingMinutes:345},null,2));
