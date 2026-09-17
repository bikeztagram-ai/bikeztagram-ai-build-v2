#!/usr/bin/env node
/** Verify Builder failure -> Repair -> QA -> Reviewer -> verified-candidate recovery contracts. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
const root=process.cwd();
const runnerPath='builder/runner/autobot-fleet-recovery.mjs';
const handoffPath='builder/runner/autobot-verified-candidate-handoff.mjs';
const workflowPath='.github/workflows/autobot-fleet-recovery.yml';
const runner=fs.readFileSync(path.join(root,runnerPath),'utf8');
const handoff=fs.readFileSync(path.join(root,handoffPath),'utf8');
const workflow=fs.readFileSync(path.join(root,workflowPath),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,'builder/brain/autobot-fleet.json'),'utf8'));
const repair=fs.readFileSync(path.join(root,'builder/runner/autobot-repair.mjs'),'utf8');
const qa=fs.readFileSync(path.join(root,'builder/runner/autobot-qa.mjs'),'utf8');
const reviewer=fs.readFileSync(path.join(root,'builder/runner/autobot-reviewer.mjs'),'utf8');
const production=fs.readFileSync(path.join(root,'.github/workflows/autonomous-builder-v2-fast.yml'),'utf8');
function assert(ok,message){if(!ok)throw new Error(message);}
function has(text,pattern,message){assert(pattern.test(text),message);}
function registered(id,entry){const bot=registry.bots.find(b=>b.id===id);assert(bot?.status==='verified'&&bot.protected!==true&&bot.entrypoint===entry,`registry contract invalid for ${id}`);assert(fs.existsSync(path.join(root,entry)),`missing ${id} entrypoint`);}
registered('repair','builder/runner/autobot-repair.mjs');
registered('qa','builder/runner/autobot-qa.mjs');
registered('reviewer','builder/runner/autobot-reviewer.mjs');
assert(registry.coordination?.recoveryRunner===runnerPath,'registry recovery runner mismatch');
assert(registry.coordination?.recoveryWorkflow===workflowPath,'registry recovery workflow mismatch');
has(runner,/function registeredWorker\(registry,id\)/,'recovery must resolve workers through the registry');
has(runner,/loadWorker\(registry,'repair'\)/,'recovery must load registered Repair Bot');
has(runner,/loadWorker\(registry,'qa'\)/,'recovery must load registered QA Bot');
has(runner,/loadWorker\(registry,'reviewer'\)/,'recovery must load registered Reviewer Bot');
has(runner,/await import\(pathToFileURL/,'recovery must lazy-load registered worker modules');
has(runner,/AUTOBOT_REVIEW_BASE_COMMIT.*AUTOBOT_REVIEW_COMMIT/,'recovery must preserve explicit Reviewer commit contract');
has(runner,/registry\.enabled\s*!==\s*true\s*\|\|\s*registry\.coordination\?\.mode\s*!==\s*['"]active['"]/,'recovery must remain behind the activation gate');
has(runner,/export function captureBuilderFailure/,'failure capture must remain separately discoverable');
has(runner,/task\?\.files/,'failure capture must derive scope from the failing task');
has(runner,/checkpoint\?\.error/,'failure capture must require durable Builder error evidence');
for(const text of [repair,qa,reviewer])has(text,/no-audit.*no-fund.*no-package-lock/,'recovery worker must install dependencies in isolation');
has(handoff,/state\.status\s*!==\s*['"]verified-candidate['"]/,'verified handoff must require verified-candidate state');
has(handoff,/state\.review\?\.status\s*!==\s*['"]pass['"]/,'verified handoff must require Reviewer pass');
has(handoff,/state\.qa\?\.ok\s*!==\s*true/,'verified handoff must require QA success');
has(handoff,/automaticMerge\s*:\s*false/,'verified handoff must prohibit automatic merge');
has(handoff,/automaticPush\s*:\s*false/,'verified handoff must prohibit automatic push');
has(workflow,/workflow_run:/,'recovery workflow must receive failed Builder runs');
has(workflow,/workflow_dispatch:/,'recovery workflow must support operator-triggered recovery');
has(workflow,/actions\/download-artifact@v5/,'recovery workflow must consume Builder artifacts');
has(workflow,/autobot-builder-candidate\.patch/,'recovery workflow must restore the actual candidate patch');
has(workflow,/registry\.enabled===true\s*&&\s*registry\.coordination\?\.mode==='active'/,'recovery workflow must enforce the activation gate');
has(workflow,/steps\.gate\.outputs\.active == ['"]true['"]/,'recovery execution must be conditional on the gate');
has(workflow,/node builder\/runner\/autobot-fleet-recovery\.mjs recover/,'recovery workflow must invoke the registered recovery runner');
has(workflow,/autobot-verified-candidate-handoff\.mjs/,'recovery workflow must emit the verified-candidate handoff');
assert(!production.includes(`${runnerPath} recover`),'production Builder workflow must not activate fleet recovery');
const smoke=spawnSync(process.execPath,['scripts/autobot/test-autobot-failure-capture.mjs'],{cwd:root,encoding:'utf8'});
assert(smoke.status===0,`failure capture smoke test failed: ${smoke.stderr||smoke.stdout||'unknown error'}`);
for(const file of [runnerPath,handoffPath,'builder/runner/autobot-repair.mjs','builder/runner/autobot-qa.mjs','builder/runner/autobot-reviewer.mjs'])execFileSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,state:registry.enabled?'active-live-test':'disabled-plan-only',flow:['Builder failure evidence','Failure Queue','Repair Bot','QA Bot','Reviewer Bot','verified-candidate handoff'],registryDrivenDiscovery:true,captureSmokeTest:true,protectedIntegrationBlocked:true}));
