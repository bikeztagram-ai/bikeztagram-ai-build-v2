#!/usr/bin/env node
/** Verify specialist Builder isolation, registry scope and discoverability contracts. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const runnerPath='builder/runner/autobot-specialist-builder.mjs';
const registryPath='builder/brain/autobot-fleet.json';
const suitePath='scripts/verify-main-suite.mjs';
const packagePath='package.json';
const runner=fs.readFileSync(path.join(root,runnerPath),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,registryPath),'utf8'));
const suite=fs.readFileSync(path.join(root,suitePath),'utf8');
const packageJson=JSON.parse(fs.readFileSync(path.join(root,packagePath),'utf8'));
function assert(condition,message){if(!condition)throw new Error(message);}
assert(runner.includes("AUTOBOT_SPECIALIST_BOT_ID"),'Specialist Builder must discover its registry bot through AUTOBOT_SPECIALIST_BOT_ID.');
assert(runner.includes("AUTOBOT_SPECIALIST_OBJECTIVE"),'Specialist Builder must receive an explicit objective through AUTOBOT_SPECIALIST_OBJECTIVE.');
assert(runner.includes("AUTOBOT_SPECIALIST_BUILDER_ENABLED"),'Specialist Builder must have an explicit activation gate.');
assert(runner.includes("registry.enabled!==true || registry.coordination?.mode!=='active'"),'Specialist Builder must refuse execution while the fleet is disabled or plan-only.');
assert(runner.includes('bot.specialistBuilder'),'Specialist Builder must require registry specialistBuilder=true.');
assert(runner.includes("bot.entrypoint!=='builder/runner/autobot-specialist-builder.mjs'"),'Specialist Builder must verify its exact registered entrypoint.');
assert(runner.includes('ownsFiles'),'Specialist Builder must use an exact registry-declared ownsFiles scope.');
assert(runner.includes('out-of-scope files'),'Specialist Builder must reject out-of-scope modifications.');
assert(runner.includes("git',['worktree','add','-b',branch,worktree,base]"),'Specialist Builder must work in a disposable isolated worktree.');
assert(runner.includes("git',['worktree','remove','--force',worktree]"),'Specialist Builder must remove its disposable worktree.');
assert(runner.includes("git(['diff','HEAD','--check'],worktree)"),'Specialist Builder must run diff validation before handoff.');
assert(runner.includes("'install','--no-audit','--no-fund','--no-package-lock'"),'Specialist Builder must install dependencies inside its isolated worktree.');
assert(runner.includes("AUTOBOT_SPECIALIST_PRODUCT_QUALITY_CHECK||'npm run verify:autobot-product-change-quality'"),'Specialist Builder must expose the exact product-quality verification command contract.');
assert(runner.includes("run('sh',['-lc',productQuality],worktree)"),'Specialist Builder must execute its declared product-quality verification command.');
assert(runner.includes("'--no-auto-commits'"),'Aider must not auto-commit inside the specialist worker.');
assert(runner.includes("'--no-dirty-commits'"),'Aider must not create dirty commits inside the specialist worker.');
assert(runner.includes('Do not merge or push'),'Specialist Builder must never merge or push.');
assert(runner.includes('candidateCommit'),'Specialist Builder must expose an explicit candidate commit for downstream review.');
const specialists=registry.bots.filter(bot=>bot.specialistBuilder===true); assert(specialists.length>=2,'Fleet must define at least two specialist Builder roles before activation.');
const expectedScopes={'director-builder':['src/director.js','src/aiEditPlanner.js'],'timeline-builder':['src/executableTimeline.js','src/editorialRhythm.js','src/renderer.js']};
for(const bot of specialists){assert(bot.entrypoint===runnerPath,`Specialist Builder ${bot.id} must use the exact shared runner path.`);assert(bot.status==='verified',`Specialist Builder ${bot.id} must be registry-marked verified.`);assert(bot.protected===false,`Specialist Builder ${bot.id} must remain unprotected.`);assert(JSON.stringify(bot.ownsFiles)===JSON.stringify(expectedScopes[bot.id]),`Specialist Builder ${bot.id} ownsFiles scope changed without updating its contract.`);for(const file of bot.ownsFiles)assert(fs.existsSync(path.join(root,file)),`Specialist Builder ${bot.id} owns missing product file: ${file}`);}
assert(suite.includes("'verify:autobot-specialist-builder'"),'Main verification suite must discover verify:autobot-specialist-builder.'); assert(packageJson.scripts?.['verify:autobot-specialist-builder']==='node scripts/autobot/verify-autobot-specialist-builder.mjs','package.json must expose the exact specialist Builder verifier command.');
console.log(JSON.stringify({ok:true,runner:runnerPath,specialistBuilders:specialists.map(bot=>({id:bot.id,role:bot.role,ownsFiles:bot.ownsFiles})),activationBlocked:registry.enabled!==true||registry.coordination?.mode!=='active'}));
