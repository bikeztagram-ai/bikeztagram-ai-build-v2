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
const objectives=JSON.parse(read('builder/brain/feature-objectives.json'));
const handoff=read('builder/runner/autobot-specialist-handoff.mjs');
const structured=read('builder/runner/autobot-specialist-structured-fallback.mjs');
const deterministic=read('builder/runner/autobot-specialist-deterministic-fallback.mjs');
const registry=JSON.parse(read('builder/brain/autobot-fleet.json'));
const checks=[
 [workflow.includes('ref: ${{ github.sha }}'),'persistent workflow must execute the exact dispatched workflow revision'],
 [specialist.includes('Math.floor(controllerMinutes / 20)')&&specialist.includes('AUTOBOT_MAX_FEATURE_CYCLES: String(maxFeatureCycles)'),'specialist Builder must inherit repeated audited feature cycles from the proven controller'],
 [engine.includes("import {appendAudit, verifyAuditLog} from '../quality/audit-log.mjs'")&&engine.includes("audit('iteration-started'")&&engine.includes("audit('planner-finished'")&&engine.includes("audit('verification-finished'")&&engine.includes("audit('iteration-finished'"),'persistent fleet must carry the proven audit/integrity trail across specialist stages'],
 [engine.includes('maxNoProgressCycles')&&engine.includes('consecutiveNoProgressCycles')&&engine.includes('CYCLE ${cycleNumber} failed; preserving base'),'specialist cycles must survive a recoverable failed cycle and re-plan from the last verified base'],
 [engine.includes("status:'recovering'")&&engine.includes('auditTrail'),'failed specialist cycles must persist resumable runtime evidence before retrying'],
 [workflow.includes('workflow_dispatch:'),'persistent workflow must be manually dispatchable'],
 [workflow.indexOf('Anchor cumulative deadline')<workflow.indexOf('Run persistent AutoBot engine'),'endurance clock must be anchored immediately before the persistent engine'],
 [workflow.indexOf('Anchor cumulative deadline')>workflow.indexOf('Verify planner model once'),'endurance clock must not consume dependency/model setup time'],
 [!workflow.includes('repository_dispatch:'),'persistent workflow must not restart itself through repository_dispatch'],
 [workflow.includes('autobot-persistent-cycle-engine.mjs'),'workflow must run the persistent cycle engine'],
 [workflow.includes('python -m pip install'),'Aider must be installed once at workflow level'],
 [workflow.includes('install-local-brain.sh'),'Ollama/model setup must happen once at workflow level'],
 [workflow.includes('OLLAMA_KEEP_ALIVE: 6h'),'endurance model keep-alive must not expire at the 30-minute cycle boundary'],
 [engine.includes("const totalMinutes=parseDuration(process.env.AUTOBOT_TOTAL_DURATION||'30m')")&&engine.includes('const normalDeadlineMs=startMs+totalMinutes*60_000'),'requested total duration must drive the cumulative deadline, not the per-cycle specialist budget'],
 [engine.includes('BUILDER_MAX_MINUTES:String(configuredCycleMinutes)')&&engine.includes('AUTOBOT_TOTAL_DURATION'),'specialist budget must remain a per-cycle limit and must not replace the total-run duration'],
 [workflow.includes('timeout-minutes: 345'),'5h30 plus 15-minute finish grace must fit exactly within the 345-minute job ceiling'],
 [workflow.includes('timeout-minutes: 345'),'final job ceiling must remain below GitHub six-hour cutoff'],
 [workflow.includes("'5h'"),'final 5h option must exist'],
 [workflow.includes("'5h30'") && registry.activationGate?.allowedTestDurations?.includes('5h30'),'5h30 workflow option must be explicitly authorised by the fleet activation gate'],
 [engine.includes("const hm=value.match(/^(\\d+)h(\\d{1,2})m?$/)")&&engine.includes('Number(hm[1])*60+minutes'),'engine must parse compact hour-minute durations such as 5h30'],
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
  [engine.includes('autobot-final-handoff.json')&&engine.includes('automaticMerge:false')&&engine.includes('requiresAssistantReview:true'),'persistent engine must emit a review-only final handoff manifest'],
 [workflow.includes('builder/working/autobot-final-handoff.json'),'persistent workflow must upload the final handoff manifest'],
 [engine.includes('Preserve builder/working evidence')&&!engine.includes("  ensureClean();\n  checkoutBase(baseRef);\n  writeJson(path.join(root,'builder','working','persistent-runtime-state.json'),{schemaVersion:1,status:'finished'"),'final handoff must preserve per-cycle evidence instead of deleting builder/working'],
 [engine.includes('`cycle-${cycleNumber}`') && engine.includes("path.join(root,'builder','working','persistent'") ,'cycle cleanup must be scoped to the current cycle so prior verified evidence survives for the final handoff'],
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
 [specialist.includes("runStructuredFallback(worktree, assignmentPath, model, base)")&&specialist.includes("git', ['reset', '--hard', base]"),'specialist fallback must reset failed Aider edits before retry'],
 [deterministic.includes("specialist==='director-builder'")&&deterministic.includes("generic director hook/payoff evidence")&&deterministic.includes("specialist==='timeline-builder'")&&deterministic.includes("generic timeline role-aware motion"),'deterministic fallback must have generic safe product paths for both specialist lanes'],
 [planner.includes("preferredFiles=bot.id==='timeline-builder'")&&planner.includes("src/executableTimeline.js")&&planner.includes("if(!targetFile)continue"),'deterministic planner decomposition must avoid unsupported Timeline files such as thin renderer re-exports'],
 [structured.includes("AUTOBOT_SPECIALIST_BASE_COMMIT")&&structured.includes("git',['reset','--hard',baseCommit]"),'deterministic fallback must restore the exact specialist base before retry'],
 [specialist.includes("AUTOBOT_SPECIALIST_BASE_COMMIT: base"),'specialist Builder must propagate the exact specialist base to fallback recovery'],
 [deterministic.includes("const declaredFiles=new Set")&&deterministic.includes("unsupported-objective-file")&&deterministic.includes("declaredFiles.has('src/executableTimeline.js')"),'deterministic Timeline fallback must never edit outside the assigned objective scope'],
 [deterministic.includes("cut.motionStyle=motionFor(cut,role);const roleMotion=role==='action'?1.15"),'timeline deterministic fallback must anchor to the current executableTimeline runtime'],
 [deterministic.includes("const roleMotion=role==='action'?1.2:role==='reveal'?1.08:role==='hero-ending'?.9:1;cut.motionStyle=motionFor(cut,role);"),'semantic timeline fallback must anchor to the current executableTimeline runtime'],
 [candidate.includes('AUTOBOT_CANDIDATE_REVIEW_OUTPUT'),'candidate reviewers must have isolated outputs'],
 [candidate.includes('AUTOBOT_SKIP_NPM_INSTALL'),'candidate QA must be able to reuse root node_modules'],
 [planner.includes('completedSpecialistTitles'),'Planner must avoid repeating completed specialist objectives'],
 [planner.includes('implementationSignals')&&planner.includes('staleAcceptanceTitles')&&planner.includes('already satisfied by the current product runtime'),'Planner must reject acceptance slices already satisfied by the current runtime'],
 [planner.includes('verify|test|exercise|perform an adversarial|npm run build')&&planner.includes('!clause||'),'Planner must not turn validation-only acceptance clauses into product objectives'],
 [objectives.objectives?.some?.(o=>o.id==='timeline-nle'&&o.implementationSignals?.['timeline preserves source identity and editorial roles']?.source==='function sourceId(cut)'),'Timeline objective must declare a freshness signal for source identity/editorial-role work'],
 [planner.includes('deterministically decompose')&&planner.includes('objective.acceptance'),'Planner must have a product-library fallback when AI discovery is unavailable'],
 [planner.includes('completed.has(title)'),'Planner fallback must reject already-completed generated objectives'],
 [planner.includes("source='deterministic-product-gap-fallback'"),'Planner must record fallback provenance when AI discovery fails'],
 [handoff.includes('validateSpecialistHandoff'),'handoff schema validation must remain active'],
 [registry.enabled===true&&registry.coordination?.mode==='active','fleet activation gate must remain active'],
 [Number(registry.coordination?.maxConcurrentWorkers||0)>=2,'two specialist lanes must remain authorized']
];
for(const [ok,msg] of checks)assert(ok,msg);
console.log(JSON.stringify({ok:true,checks:checks.length,chain:['Planner','Director + Timeline Specialists (parallel)','Repair','independent QA + Reviewer','Carry-forward','repeat in same runner'],restartPerCycle:false,githubJobCeilingMinutes:345},null,2));
