#!/usr/bin/env node
/** Verify Builder failure -> Repair -> QA -> Reviewer orchestration contracts. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const runnerPath='builder/runner/autobot-fleet-recovery.mjs';
const runner=fs.readFileSync(path.join(root,runnerPath),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,'builder','brain','autobot-fleet.json'),'utf8'));
const repair=fs.readFileSync(path.join(root,'builder','runner','autobot-repair.mjs'),'utf8');
const qa=fs.readFileSync(path.join(root,'builder','runner','autobot-qa.mjs'),'utf8');
const reviewer=fs.readFileSync(path.join(root,'builder','runner','autobot-reviewer.mjs'),'utf8');
const production=fs.readFileSync(path.join(root,'.github/workflows/autonomous-builder-v2-fast.yml'),'utf8');
function assert(condition,message){if(!condition)throw new Error(message);}
assert(registry.coordination?.recoveryRunner===runnerPath,'Fleet registry must expose the exact recovery runner path.');
assert(fs.existsSync(path.join(root,runnerPath)),'Fleet recovery runner must exist at the registered path.');
assert(runner.includes("./autobot-failure-queue.mjs"),'Fleet recovery must use the authoritative failure queue module.');
assert(runner.includes("./autobot-repair.mjs"),'Fleet recovery must call the registered Repair Bot.');
assert(runner.includes("./autobot-qa.mjs"),'Fleet recovery must call the registered QA Bot.');
assert(runner.includes('builder/runner/autobot-reviewer.mjs'),'Fleet recovery must hand repaired candidates to the registered Reviewer.');
assert(runner.includes('AUTOBOT_REVIEW_BASE_COMMIT')&&runner.includes('AUTOBOT_REVIEW_COMMIT'),'Reviewer handoff must use the explicit commit contract.');
assert(runner.includes('repairOne')&&runner.includes('qaOne'),'Fleet recovery must invoke Repair and QA through their exported worker contracts.');
assert(runner.includes('protectedIntegration:false'),'Recovery must stop before protected integration.');
assert(runner.includes("registry.enabled!==true||registry.coordination?.mode!=='active'"),'Recovery execution must remain behind the explicit fleet activation gate.');
assert(runner.includes('export function captureBuilderFailure'),'Failure capture must be a separately discoverable operation.');
assert(runner.includes("if(command==='capture')console.log(JSON.stringify(captureBuilderFailure(),null,2));"),'CLI capture must invoke the capture-only operation without entering fleet recovery.');
assert(runner.includes('task?.files'),'Builder failure capture must derive repair scope from the failing task, not invent a file scope.');
assert(runner.includes('checkpoint?.error'),'Builder failure capture must require durable Builder error evidence.');
assert(repair.includes('repairBaseCommit')&&repair.includes('repairCommit'),'Repair Bot must produce durable repair commit evidence.');
assert(qa.includes("transitionFailure(record.id,'verified'"),'QA Bot must own the repaired-to-verified transition.');
assert(reviewer.includes('AUTOBOT_REVIEW_BASE_COMMIT')&&reviewer.includes('AUTOBOT_REVIEW_COMMIT'),'Reviewer must consume the explicit candidate handoff.');
assert(production.includes('autobot-fleet-recovery.mjs capture'),'Proven Builder workflow must capture durable failure evidence through the registered recovery runner.');
assert(!production.includes('autobot-fleet-recovery.mjs recover'),'Proven Builder workflow must not activate fleet recovery orchestration.');
assert(production.includes('actions/upload-artifact@v4'),'Builder failure evidence must be persisted as a workflow artifact for a future recovery handoff.');
assert(registry.enabled===false&&registry.coordination?.mode==='plan-only','Fleet recovery foundation must remain disabled and plan-only until separately activated.');
console.log(JSON.stringify({ok:true,runner:runnerPath,flow:['Builder failure evidence','Failure Queue','Repair Bot','QA Bot','Reviewer Bot'],captureConnected:true,recoveryActivationBlocked:true}));
