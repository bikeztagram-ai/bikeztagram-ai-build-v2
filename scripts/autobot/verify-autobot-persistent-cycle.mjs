#!/usr/bin/env node
/**
 * Static contract audit for the persistent AutoBot cycle engine.
 * This intentionally checks the complete chain before a live run is allowed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const auditFailures=[];const assert=(ok,msg)=>{if(!ok)auditFailures.push(msg)};
const workflow=read('.github/workflows/autobot-parallel-specialists.yml');
const engine=read('builder/runner/autobot-persistent-cycle-engine.mjs');
const specialist=read('builder/runner/autobot-specialist-builder.mjs');
const recovery=read('builder/runner/autobot-specialist-recovery.mjs');
const candidate=read('builder/runner/autobot-endurance-candidate-check.mjs');
const planner=read('builder/runner/autobot-parallel-planner.mjs');

const criticalEngineHelpers=['parseDuration','fail','git','run','spawnLogged','readJson','writeJson','remainingMs','remainingNormalMs','status','log','audit','assertAudit','ensureClean','checkoutBase','objectiveFor','resultDir','setCycleEnv','assertScope','copyIfExists'];
for(const helper of criticalEngineHelpers){
  assert(new RegExp(`(?:function|async function)\\s+${helper}\\s*\\(`).test(engine),`persistent engine helper missing: ${helper}`);
}
assert(engine.indexOf('function parseDuration')<engine.indexOf('const totalMinutes'),'duration parser must be defined before total duration is evaluated');
for(const file of ['builder/runner/autobot-persistent-cycle-engine.mjs','builder/runner/autobot-specialist-builder.mjs','builder/runner/autobot-specialist-recovery.mjs','builder/runner/autobot-endurance-candidate-check.mjs','builder/runner/autobot-parallel-planner.mjs','builder/runner/autobot-live-dashboard.mjs']) execFileSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});
const objectives=JSON.parse(read('builder/brain/feature-objectives.json'));
const handoff=read('builder/runner/autobot-specialist-handoff.mjs');
const structured=read('builder/runner/autobot-specialist-structured-fallback.mjs');
const quality=read('scripts/autobot/verify-autobot-product-change-quality.mjs');
const rnd=read('builder/runner/autobot-rnd.mjs');
const deterministic=read('builder/runner/autobot-specialist-deterministic-fallback.mjs');
const registry=JSON.parse(read('builder/brain/autobot-fleet.json'));
const checks=[
 [workflow.includes('ref: ${{ github.sha }}'),'persistent workflow must execute the exact dispatched workflow revision'],
 [workflow.includes('AUTOBOT_BASE_REF: ${{ github.sha }}')&&engine.includes('if(/^[0-9a-f]{40}$/i.test(String(ref)))'),'persistent fleet must carry the exact dispatched commit into cycle 1 instead of refetching a moving main branch'],
 [specialist.includes('Math.floor(controllerMinutes / 20)')&&specialist.includes('AUTOBOT_MAX_FEATURE_CYCLES: String(maxFeatureCycles)'),'specialist Builder must inherit repeated audited feature cycles from the proven controller'],
 [engine.includes("import {appendAudit, verifyAuditLog} from '../quality/audit-log.mjs'")&&engine.includes("audit('iteration-started'")&&engine.includes("audit('planner-finished'")&&engine.includes("audit('verification-finished'")&&engine.includes("audit('iteration-finished'"),'persistent fleet must carry the proven audit/integrity trail across specialist stages'],
 [engine.includes('maxNoProgressCycles')&&engine.includes('consecutiveNoProgressCycles')&&engine.includes('CYCLE ${cycleNumber} failed; preserving base'),'specialist cycles must survive a recoverable failed cycle and re-plan from the last verified base'],
 [engine.includes('const cycleStartedMs=Date.now();\n    try{')&&engine.includes('Date.now()-cycleStartedMs')&&!engine.includes('const started=Date.now()'),'cycle recovery timer must remain in scope for both success and catch paths'],
 [ /const cycleDurationsMs=\[\];/.test(engine)&&/const observedCycleMs=cycleDurationsMs\.length\?/.test(engine)&&/const estimatedCycleMs=observedCycleMs\?/.test(engine)&&/const minimumRetryMs=5\*60_000\+safetyMinutes\*60_000;/.test(engine)&&/if\(remainingNormalMs\(\)<minimumRetryMs\)/.test(engine)&&/const adaptiveCycleMs=/.test(engine)&&/launch budget/.test(engine),'cycle launch gate must adapt to observed runtime while permitting a bounded retry from the remaining cumulative budget'],
 [engine.includes('async function runSpecialists(cycle,plan,cycleBudgetMs)')&&engine.includes('const specialistBudgetMinutes=')&&engine.includes('AUTOBOT_ADAPTIVE_CYCLE_BUDGET_MS'), 'adaptive cycle budget must propagate into the actual Specialist Builder launch budget'],
 
 
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
 [engine.includes('async function runSpecialists(cycle,plan,cycleBudgetMs)')&&engine.includes('const specialistBudgetMinutes=Math.max(1,Math.min(configuredCycleMinutes')&&engine.includes('cycleBudgetMs')&&engine.includes('remainingNormalMs()')&&engine.includes('AUTOBOT_TOTAL_DURATION'),'specialist budget must remain bounded by the configured cycle limit while shrinking to the remaining cumulative budget'],
 [workflow.includes('timeout-minutes: 360'),'5h30 plus 15-minute finish grace must leave setup headroom inside the 360-minute GitHub job ceiling'],
 [workflow.includes('timeout-minutes: 360'),'final job ceiling must remain at or below GitHub six-hour cutoff'],
 [workflow.includes("'5h'"),'final 5h option must exist'],
 [workflow.includes("'5h30'") && registry.activationGate?.allowedTestDurations?.includes('5h30'),'5h30 workflow option must be explicitly authorised by the fleet activation gate'],
 [engine.includes("const hm=text.match(/^(\\d+)h(\\d{1,2})m?$/)")&&engine.includes('Number(hm[1])*60+minutes')&&engine.includes("if(hm){"),'engine must parse compact hour-minute durations such as 5h30'],
 [registry.activationGate?.testDuration==='5h30','fleet activation testDuration must match the authorised five-and-a-half-hour endurance target'],
 [workflow.includes("inputs.duration == '15m' && '10'") ,'15m staging must reserve a bounded specialist cycle'],
 [engine.includes('autobot-parallel-planner.mjs'),'every internal cycle must re-plan'],
 [engine.includes('autobot-specialist-builder.mjs'),'every internal cycle must build product work'],
 [engine.includes("git',['push','--set-upstream','origin',handoff.branch]"),'specialist candidate branches must be published before independent verification'],
 [engine.includes('autobot-specialist-recovery.mjs'),'Repair Bot must remain in the chain'],
 [engine.includes('autobot-endurance-candidate-check.mjs'),'every candidate must receive independent QA/Reviewer verification'],
 [engine.includes('recoverCandidateFailures')&&engine.includes('recoverFleet({failureId})')&&engine.includes('RECOVERY + RECHECK complete'),'failed candidate verification must enter Repair/Recovery and be rechecked before a cycle can fail'],
 [engine.includes('RECOVERY incomplete')&&engine.includes('partially-verified-and-carried-forward')&&engine.includes('integrate(cycleNumber,baseRef,passed)'),'a recoverable specialist failure must not discard an independently verified sibling candidate; partial carry-forward must preserve progress'],
 [candidate.includes('appendFailure')&&candidate.includes('candidateFailure:true')&&candidate.includes('repairBaseCommit:candidate'),'candidate verification failures must persist exact candidate identity for Repair Bot recovery'],
 [candidate.includes('expectedCycleBaseCommit')&&candidate.includes('merge-base')&&candidate.includes('cycleBaseCommit:expectedCycleBase||base'),'candidate verification must reject candidates that do not descend from the exact cycle base and preserve that identity in the verified result'],
 [read('builder/runner/autobot-failure-queue.mjs').includes('metadata:input.metadata===undefined?null:input.metadata')&&read('builder/runner/autobot-failure-queue.mjs').includes('metadata:input.metadata===undefined?current.metadata:input.metadata'),'failure queue must preserve specialist candidate recovery metadata across append and transition records'],
 [read('builder/runner/autobot-fleet-recovery.mjs').includes('const repairModule=await repairModulePromise')&&read('builder/runner/autobot-fleet-recovery.mjs').includes('const qaModule=await qaModulePromise')&&!read('builder/runner/autobot-fleet-recovery.mjs').includes('const {module:repairModule}'),'fleet recovery must consume dynamic-import module namespaces directly'],
 [read('builder/runner/autobot-fleet-recovery.mjs').includes('open recovery failure')&&read('builder/runner/autobot-fleet-recovery.mjs').includes('openFailures'),'fleet recovery must fail clearly when a requested durable failure id is missing instead of dereferencing an undefined failure'],
  [read('builder/runner/autobot-reviewer.mjs').includes('repairBaseCommit:candidate')&&read('builder/runner/autobot-reviewer.mjs').includes('candidateCommit:candidate'),'reviewer repair failures must preserve the exact reviewed candidate as the Repair Bot base'],
  [read('builder/runner/autobot-fleet-recovery.mjs').includes('maxReviewerRecoveryDepth=2')&&read('builder/runner/autobot-fleet-recovery.mjs').includes('recoveryDepth+1'),'Reviewer-triggered recovery must be bounded and recurse through the same Repair -> QA -> Reviewer chain'],

 [candidate.includes('const allowed=new Set')&&candidate.includes('scopedFiles')&&candidate.includes('repairable:scopedFiles.length>0'),'candidate recovery must be limited to the specialist owned file scope'],
 [engine.includes('AUTOBOT_REPAIR_TIMEOUT_MS')&&/Math\.min\(\d+\*60_000/.test(engine)&&engine.includes('remainingNormalMs()'),'Repair Bot timeout must be bounded by the remaining cumulative run budget'],
 [engine.includes('recoverableCycleFailure:true')&&engine.includes("RECOVERY bounded failure")&&engine.includes('catch(error){')&&engine.includes('continue;'),'Repair/Recovery timeout or bounded failure must be recorded and returned to the outer cycle loop instead of terminating the persistent engine'],
 [quality.includes('duplicateTopLevelFunctionNames')&&quality.includes('duplicate-function-declaration')&&quality.includes('assertNoDuplicateTopLevelFunctions'),'product-quality guard must reject duplicate top-level cinematic helper declarations'],
 [read('builder/runner/aider-feature-brain.mjs').includes("const specialistEditFormat=String(process.env.AUTOBOT_SPECIALIST_AIDER_EDIT_FORMAT||'udiff').trim().toLowerCase()")&&read('builder/runner/aider-feature-brain.mjs').includes("const srcOnly=files.every(f=>f.startsWith('src/'));const cwd=srcOnly?path.join(root,'src'):root;const aiderFiles=srcOnly?files.map(f=>f.slice(4)):files;")&&read('builder/runner/aider-feature-brain.mjs').includes("const specialistMapTokens=Math.max(512,Math.min(4096,Number.parseInt(process.env.AUTOBOT_SPECIALIST_MAP_TOKENS||'768',10)||768))")&&read('builder/runner/aider-feature-brain.mjs').includes("const specialistMapArg=specialist?`--map-tokens=${specialistMapTokens}`:`--map-tokens=768`")&&read('builder/runner/aider-feature-brain.mjs').includes('--subtree-only')&&read('builder/runner/aider-feature-brain.mjs').includes('`--edit-format=${specialistEditFormat}`')&&!read('builder/runner/aider-feature-brain.mjs').includes("specialist?['--no-git'")&&!read('builder/runner/aider-feature-brain.mjs').includes('--model-settings-file'),'specialist Aider runs must use the proven src-subtree, scoped map, direct edit format and must not use Repair/architect no-git or model-settings mode'],

 [quality.includes('AUTOBOT_PRODUCT_QUALITY_BASE_COMMIT')&&quality.includes('AUTOBOT_PRODUCT_QUALITY_CANDIDATE_COMMIT'),'product-quality guard must inspect committed candidate diffs during independent QA/Reviewer instead of reporting clean committed work as not-applicable'],
 [candidate.includes('AUTOBOT_PRODUCT_QUALITY_BASE_COMMIT:base')&&candidate.includes('AUTOBOT_PRODUCT_QUALITY_CANDIDATE_COMMIT:candidate'),'candidate verification must pass the exact base/candidate pair into the product-quality guard'],
 [engine.includes('AUTOBOT_EXPECTED_CYCLE_BASE_COMMIT:process.env.AUTOBOT_CYCLE_BASE_COMMIT||\'\''),'candidate verification must receive the exact cycle base from the persistent engine'],
 [candidate.includes("git',['worktree','add','--detach',temp,candidate]")&&candidate.includes("git',['push','--set-upstream','origin',branch]")&&!candidate.includes("git',['apply','--check'")&&!candidate.includes("git',['apply','--whitespace=nowarn'"),'recovered candidates must be reconstructed from exact immutable commits, never serialized and replayed as patches'],
 [engine.includes("recoveryTransport:'exact-commit'")&&engine.includes("git',['rev-parse','--verify',candidateCommit]")&&!engine.includes("--binary"),'persistent recovery handoff must persist exact commit identity and avoid generated patch transport'],
 [engine.includes('cycleBaseCommit:process.env.AUTOBOT_CYCLE_BASE_COMMIT||baseCommit')&&candidate.includes('cycleBaseCommit:expectedCycleBase||base'),'recovery and candidate handoff evidence must preserve the original cycle base separately from the immediate repair base'],
 [read('builder/runner/autobot-qa.mjs').includes('AUTOBOT_PRODUCT_QUALITY_BASE_COMMIT:base')&&read('builder/runner/autobot-qa.mjs').includes('AUTOBOT_PRODUCT_QUALITY_CANDIDATE_COMMIT:commit'),'independent QA must pass the exact repair commit pair into the product-quality guard'],
 [read('builder/runner/autobot-reviewer.mjs').includes('AUTOBOT_PRODUCT_QUALITY_BASE_COMMIT:base')&&read('builder/runner/autobot-reviewer.mjs').includes('AUTOBOT_PRODUCT_QUALITY_CANDIDATE_COMMIT:candidate'),'adversarial Reviewer must enforce the product-quality guard against the committed candidate'],
 [read('builder/runner/autobot-repair.mjs').includes("'--no-git'")&&read('builder/runner/autobot-repair.mjs').includes("--edit-format=${editFormat}")&&!read('builder/runner/aider-feature-brain.mjs').includes("specialist?['--no-git'")&&!read('builder/runner/aider-feature-brain.mjs').includes('--model-settings-file'),'Repair Aider sessions must disable Aider git/repo scanning while specialist editing remains on its separate proven direct path'],
 [read('builder/runner/autobot-specialist-recovery.mjs').includes("execFileSync('git',['diff','--binary'"),'legacy recovery patch generation must capture raw git diff bytes without the trimming git helper'],
 [rnd.includes('autobot-rnd-v1')&&rnd.includes('autobot-failure-queue.jsonl')&&rnd.includes('feature-objectives.json')&&!rnd.includes('git push'),'R&D must be analysis-only and consume product objectives plus durable failure evidence'],
 [engine.includes("builder/runner/autobot-rnd.mjs")&&engine.includes("audit('rnd-finished'"),'each persistent specialist cycle must run R&D before planning'],
 [planner.includes('autobot-rnd-brief.json')&&planner.includes('R&D recommendations')&&planner.includes('R&D research is evidence'),'Planner must consume R&D evidence without treating it as unchecked implementation authority'],
  [planner.includes('rndRecommendations')&&planner.includes('R&D — ${title}')&&planner.includes('if(!item)item=fallback(bot,library,inv,completedTitles,seenTitles,staleAcceptance,rnd)'),'deterministic planner fallback must consume valid R&D recommendations when AI discovery is unavailable'],
 [planner.includes("AI planner returned no usable packages")&&planner.includes('hybrid-ai-deterministic')&&planner.includes('const replacement=fallback(bot,library,inv,completedTitles,seenTitles,staleAcceptance,rnd)'),'Planner must salvage usable AI packages per specialist and deterministically fill only missing or invalid lanes instead of discarding the entire AI plan'],
 [planner.includes('async function aiPlan(bots,library,inv,completedTitles,rnd)')&&planner.includes('aiPlan(bots,library,inv,completedTitles,rnd)'),'AI planner must receive the cycle R&D brief explicitly instead of referencing an out-of-scope rnd variable'],
 [planner.includes('const availableFiles=new Set(Array.isArray(inventoryFiles)?inventoryFiles:[])')&&planner.includes('const invForRnd=availableFiles;')&&planner.includes('inventoryFiles')&&!planner.includes('inv.has(f)'),'R&D fallback must use an explicitly scoped inventory set; no free or array-only inv reference is allowed'],
 [planner.includes('function completedSpecialistTitles')&&planner.includes("path.join(root,'builder','working','persistent')")&&planner.includes('autobot-specialist-handoff.json'),'Planner must consume prior specialist handoffs/history so deterministic fallback cannot repeat the same objective across persistent cycles'],
 [read('scripts/autobot/verify-autobot-rnd.mjs').includes('analysis-only')&&planner.includes('autobot-rnd-brief.json'),'R&D contract verifier must cover the R&D-to-Planner handshake'], [engine.includes('autobot/persistent/cycle-'),'verified state must be carried forward by a new branch'],
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
 [engine.includes('remainingNormalMs()')&&engine.includes('finish grace is reserved for shutdown'),'cycle launch gate must preserve finish grace for shutdown'],
 [!engine.includes(',deadlineMs,')&&!engine.includes('deadlineMs});'),'finished runtime state must not reference the removed deadlineMs variable'],
 [engine.includes('AUTOBOT_SKIP_NPM_INSTALL'),'persistent cycle must reuse the warm dependency tree'],
 [specialist.includes('AUTOBOT_SPECIALIST_HANDOFF_PATH'),'parallel specialists must have isolated handoff outputs'],
 [specialist.includes('AUTOBOT_SKIP_NPM_INSTALL'),'persistent specialists must be able to reuse root node_modules'],
 [recovery.includes('AUTOBOT_SKIP_NPM_INSTALL'),'Repair Bot must be able to reuse root node_modules'],
 [read('builder/runner/autobot-repair.mjs').includes('record.metadata?.repairBaseCommit')&&read('builder/runner/autobot-repair.mjs').includes('validCommit(requestedBase)'),'Repair Bot must repair a failed specialist candidate from its exact candidate commit'],
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
 [Number(registry.coordination?.maxConcurrentWorkers||0)>=2,'two specialist lanes must remain authorized'],
 [registry.coordination?.rndRunner==='builder/runner/autobot-rnd.mjs'&&registry.coordination?.rndOutput==='builder/working/autobot-rnd-brief.json'&&registry.bots.some(b=>b.id==='rnd'&&b.entrypoint==='builder/runner/autobot-rnd.mjs'&&b.analysisOnly===true),'dedicated R&D runner/output must be registered as analysis-only'],
];
for(const [ok,msg] of checks)assert(ok,msg);
if(auditFailures.length){console.error(JSON.stringify({ok:false,checks:checks.length,failures:auditFailures},null,2));process.exit(1);}
console.log(JSON.stringify({ok:true,checks:checks.length,chain:['Planner','Director + Timeline Specialists (parallel)','Repair','independent QA + Reviewer','Carry-forward','repeat in same runner'],restartPerCycle:false,githubJobCeilingMinutes:345},null,2));
