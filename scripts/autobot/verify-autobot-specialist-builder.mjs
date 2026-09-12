#!/usr/bin/env node
/** Verify specialist Builder isolation, registry scope and discoverability contracts. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const runnerPath='builder/runner/autobot-specialist-builder.mjs';
const registryPath='builder/brain/autobot-fleet.json';
const suitePath='scripts/verify-main-suite.mjs';
const runner=fs.readFileSync(path.join(root,runnerPath),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,registryPath),'utf8'));
const suite=fs.readFileSync(path.join(root,suitePath),'utf8');
function assert(condition,message){if(!condition)throw new Error(message);}

assert(runner.includes("AUTOBOT_SPECIALIST_BOT_ID"),'Specialist Builder must discover its registry bot through AUTOBOT_SPECIALIST_BOT_ID.');
assert(runner.includes("AUTOBOT_SPECIALIST_OBJECTIVE"),'Specialist Builder must receive an explicit objective through AUTOBOT_SPECIALIST_OBJECTIVE.');
assert(runner.includes("AUTOBOT_SPECIALIST_BUILDER_ENABLED"),'Specialist Builder must have an explicit activation gate.');
assert(runner.includes("registry.enabled!==true || registry.coordination?.mode!=='active'"),'Specialist Builder must refuse execution while the fleet is disabled or plan-only.');
assert(runner.includes('bot.specialistBuilder'),'Specialist Builder must require registry specialistBuilder=true.');
assert(runner.includes("bot.entrypoint!=='builder/runner/autobot-specialist-builder.mjs'"),'Specialist Builder must verify its exact registered entrypoint.');
assert(runner.includes('ownsFiles'),'Specialist Builder must use an exact registry-declared ownsFiles scope.');
assert(runner.includes('out-of-scope files'),'Specialist Builder must reject out-of-scope changes.');
assert(runner.includes("git',['worktree','add','-b',branch,worktree,base]"),'Specialist Builder must work in a disposable isolated worktree.');
assert(runner.includes("git',['worktree','remove','--force',worktree]"),'Specialist Builder must remove its disposable worktree after execution.');
assert(runner.includes("git(['diff','--check'],worktree)"),'Specialist Builder must run diff validation before handoff.');
assert(runner.includes("npm',['run','build']"),'Specialist Builder must build before handoff.');
assert(runner.includes("'--no-auto-commits'"),'Aider must not auto-commit inside the specialist worker.');
assert(runner.includes("'--no-dirty-commits'"),'Aider must not create dirty commits inside the specialist worker.');
assert(runner.includes('Do not merge or push'),'Specialist Builder must never merge or push.');
assert(runner.includes('candidateCommit'),'Specialist Builder must expose an explicit candidate commit for downstream review.');
const specialists=registry.bots.filter(bot=>bot.specialistBuilder===true);
assert(specialists.length>=2,'Fleet must define at least two specialist Builder roles before activation.');
for(const bot of specialists){
  assert(bot.entrypoint===runnerPath,`Specialist Builder ${bot.id} must use the exact shared runner path.`);
  assert(bot.status==='verified',`Specialist Builder ${bot.id} must be registry-marked verified before activation.`);
  assert(bot.protected===false,`Specialist Builder ${bot.id} must remain unprotected.`);
  assert(Array.isArray(bot.ownsFiles)&&bot.ownsFiles.length>0,`Specialist Builder ${bot.id} must declare ownsFiles.`);
  assert(bot.ownsFiles.every(file=>typeof file==='string'&&!path.isAbsolute(file)&&!file.includes('..')&&!file.startsWith('.')&&!file.includes('\\')),`Specialist Builder ${bot.id} has unsafe ownsFiles.`);
}
assert(suite.includes("'verify:autobot-specialist-builder'"),'Main verification suite must discover verify:autobot-specialist-builder.');
console.log(JSON.stringify({ok:true,runner:runnerPath,specialistBuilders:specialists.map(bot=>({id:bot.id,role:bot.role,ownsFiles:bot.ownsFiles})),activationBlocked:registry.enabled!==true||registry.coordination?.mode!=='active'}));
