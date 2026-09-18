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
 [workflow.indexOf('Anchor cumulative deadline')<workflow.indexOf('Run persistent AutoBot engine'),'endurance clock must be anchored immediately before the persistent engine'],
 [workflow.indexOf('Anchor cumulative deadline')>workflow.indexOf('Verify planner model once'),'endurance clock must not consume dependency/model setup time'],
 [!workflow.includes('repository_dispatch:'),'persistent workflow must not restart itself through repository_dispatch'],
 [workflow.includes('autobot-persistent-cycle-engine.mjs'),'workflow must run the persistent cycle engine'],
 [workflow.includes('python -m pip install'),'Aider must be installed once at workflow level'],
 [workflow.includes('install-local-brain.sh'),'Ollama/model setup must happen once at workflow level'],
 [workflow.includes('OLLAMA_KEEP_ALIVE: 30m'),'model keep-alive must be configured'],
 [workflow.includes('timeout-minutes: 345'),'final job ceiling must remain below GitHub six-hour cutoff'],
 [workflow.includes("'5h'"),'final 5h option must exist'],
 [workflow.includes("'5h30'") && registry.activationGate?.allowedTestDurations?.includes('5h30'),'5h30 workflow option must be explicitly authorised by the fleet activation gate'],
 [engine.includes('const hm=value.match(/^(\\\\d+)h(?:(\\\\d+)m)?$/)'),'engine must parse compound hour-minute durations such as 5h30'],
 [registry.activationGate?.testDuration==='5h30','fleet activation testDuration must match the authorised five-and-a-half-hour endurance target'],
 [workflow.includes("inputs.duration == '15m' && '10'") ,'15m staging must reserve a bounded specialist cycle'],
 [engine.includes('autobot-parallel-planner.mjs'),'every internal cycle must re-plan'],
 [engine.includes('autobot-specialist-builder.mjs'),'every internal cycle must build product work'],
 [engine.includes("git',['push','--set-upstream','origin',handoff.branch]"),'specialist candidate branches must be published before independent verification'],
 [engine.includes('autobot-specialist-recovery.mjs'),'Repair Bot must remain in the chain'],
 [engine.includes('autobot-endurance-candidate-check.mjs'),'every candidate must receive independent QA/Reviewer verification'],
 [engine.includes('autobot/persistent/cycle-'),'verified state must be carried forward by a new branch'],
 [engine.includes("git push --set-upstream origin,branch") || engine.includes("git',['push','--set-upstream','origin',branch"),'carry-forward must be persisted remotely'],
 [engine.includes('while(true)'),'cycles must continue inside the same workflow job'],
 [engine.includes('autobot-live-status.log'),'persistent engine must emit live cycle status'],
 [workflow.includes('Ollama live status') || workflow.includes('AutoBot live status'),'workflow must capture readable live status evidence'],
 [workflow.includes('OLLAMA_HOST=127.0.0.1:11434 ollama ps'),'Ollama diagnostics must query the real server, not the chat proxy'],
 [engine.includes('finishGraceMinutes'),'finish grace must be enforced by the engine'],
 [engine.includes('normalDeadlineMs')&&engine.includes('hardDeadlineMs'),'engine must distinguish normal work deadline from hard finish-grace deadline'],
 [engine.includes('remainingNormalMs()')&&engine.includes('finish grace is reserved for the active final cycle'),'cycle launch gate must not consume the entire finish grace as dead time'],
 [!engine.includes(',deadlineMs,')&&!engine.includes('deadlineMs});'),'finished runtime state must not reference the removed deadlineMs variable'],
 [engine.includes('AUTOBOT_SKIP_NPM_INSTALL'),'persistent cycle must reuse the warm dependency tree'],
 [specialist.includes('AUTOBOT_SPECIALIST_HANDOFF_PATH'),'parallel specialists must have isolated handoff outputs'],
 [specialist.includes('AUTOBOT_SKIP_NPM_INSTALL'),'persistent specialists must be able to reuse root node_modules'],
 [recovery.includes('AUTOBOT_SKIP_NPM_INSTALL'),'Repair Bot must be able to reuse root node_modules'],
 [candidate.includes('AUTOBOT_CANDIDATE_REVIEW_OUTPUT'),'candidate reviewers must have isolated outputs'],
 [candidate.includes('AUTOBOT_SKIP_NPM_INSTALL'),'candidate QA must be able to reuse root node_modules'],
 [planner.includes('completedSpecialistTitles'),'Planner must avoid repeating completed specialist objectives'],
 [planner.includes('deterministically decompose')&&planner.includes('objective.acceptance'),'Planner must have a product-library fallback when AI discovery is unavailable'],
 [planner.includes('completed.has(title)'),'Planner fallback must reject already-completed generated objectives'],
 [planner.includes("source='deterministic-product-gap-fallback'"),'Planner must record fallback provenance when AI discovery fails'],
 [handoff.includes('validateSpecialistHandoff'),'handoff schema validation must remain active'],
 [registry.enabled===true&&registry.coordination?.mode==='active','fleet activation gate must remain active'],
 [Number(registry.coordination?.maxConcurrentWorkers||0)>=2,'two specialist lanes must remain authorized']
];
for(const [ok,msg] of checks)assert(ok,msg);
console.log(JSON.stringify({ok:true,checks:checks.length,chain:['Planner','Director + Timeline Specialists (parallel)','Repair','independent QA + Reviewer','Carry-forward','repeat in same runner'],restartPerCycle:false,githubJobCeilingMinutes:345},null,2));
