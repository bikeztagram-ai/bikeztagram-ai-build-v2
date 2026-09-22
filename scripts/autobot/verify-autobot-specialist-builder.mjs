#!/usr/bin/env node
/** Verify specialist Builder isolation, registry scope and discoverability contracts. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const runnerPath='builder/runner/autobot-specialist-builder.mjs';
const registryPath='builder/brain/autobot-fleet.json';
const runner=fs.readFileSync(path.join(root,runnerPath),'utf8');
const aider=fs.readFileSync(path.join(root,'builder/runner/aider-feature-brain.mjs'),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,registryPath),'utf8'));
const suite=fs.readFileSync(path.join(root,'scripts/verify-main-suite.mjs'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
function assert(ok,message){if(!ok)throw new Error(message);}
function has(pattern,message){assert(pattern.test(runner),message);}
function hasAider(pattern,message){assert(pattern.test(aider),message);}
assert(fs.existsSync(path.join(root,runnerPath)),'Specialist Builder runner is missing.');
has(/AUTOBOT_SPECIALIST_BOT_ID/,'Specialist Builder must discover its registry bot id.');
has(/AUTOBOT_SPECIALIST_OBJECTIVE/,'Specialist Builder must receive an explicit objective.');
has(/AUTOBOT_SPECIALIST_BUILDER_ENABLED/,'Specialist Builder must have an explicit activation flag.');
has(/registry\.enabled\s*!==\s*true\s*\|\|\s*registry\.coordination\?\.mode\s*!==\s*['"]active['"]/,'Specialist Builder must refuse an inactive fleet.');
has(/bot\.specialistBuilder/,'Specialist Builder must require registry specialistBuilder=true.');
has(/ownsFiles/,'Specialist Builder must use registry-declared file scope.');
has(/worktree.*add.*branch/s,'Specialist Builder must use an isolated worktree.');
has(/worktree.*remove.*force/s,'Specialist Builder must remove its disposable worktree.');
has(/diff.*base.*--check|diff.*HEAD.*--check/,'Specialist Builder must validate the candidate diff.');
has(/no-auto-commits/,'Aider auto-commits must remain disabled.');
has(/no-dirty-commits/,'Aider dirty commits must remain disabled.');
has(/Do not merge or push/,'Specialist Builder must never merge or push.');
has(/writeSpecialistHandoff\(/,'Specialist Builder must emit the durable handoff.');
has(/status\s*:\s*['"]verified-candidate['"]/,'Specialist Builder must label verified candidates explicitly.');
has(/AUTOBOT_FEATURE_PASSES/,'Specialist Builder must pass its feature-pass budget to the shared controller.');
has(/AUTOBOT_FEATURE_DEADLINE_EPOCH_MS/,'Specialist Builder must pass its verification deadline to the shared controller.');
has(/export\\s\+|function\\s\+|class\\s\+|const\\s\+/,'Specialist Builder target-map symbol matcher must use real regex whitespace tokens.');
has(/buildTargetMap\(/,'Specialist Builder must build a scoped target map for focused editing.');
if(!aider.includes('const useSrcCwd=')) throw new Error('Specialist Aider must expose the controlled cwd strategy selector.');
assert(aider.includes('specialistStrategy'), 'Specialist Aider must expose the per-specialist editing strategy.');
hasAider(/const specialistMapArg=specialist\?`--map-tokens=2048`/,'Specialist Aider must use the proven 2048-token scoped map.');
hasAider(/--no-git/,'Specialist Aider must keep editing scoped to the supplied subtree.');
hasAider(/function chooseSpecialistEditFormat\(\)/,'Specialist Aider must adapt edit format for dense/minified source files.');
hasAider(/const effectiveEditFormat=chooseSpecialistEditFormat\(\)/,'Specialist Aider must use the adaptive specialist edit format at runtime.');
hasAider(/`--edit-format=\$\{effectiveEditFormat\}`/,'Specialist Aider must pass the effective direct edit format.');
hasAider(/specialistStrategy==='whole-root'/,'Specialist Aider must support the whole-root experiment.');
hasAider(/specialistStrategy==='udiff-nomap'/,'Specialist Aider must support the no-map experiment.');
assert(!aider.includes('--model-settings-file'),'Specialist Aider must not reintroduce generated model-settings/architect wiring into the direct path.');
assert(!aider.includes("specialist?'--map-tokens=0'"),'Specialist Aider must not disable the scoped repository map.');
assert(aider.includes('Use Aider as the editor: directly modify the supplied objective files now.'),'Specialist Aider direct-editor instruction must remain explicit.');
assert(runner.includes('const controllerMinutes = Math.max(1, requestedMinutes - verificationReserveMinutes - controllerFinishGraceMinutes);'),'Specialist Builder must give Aider the proven full controller budget.');
assert(!runner.includes('fallbackReserveMinutes'),'Specialist Builder must not shorten the Aider budget to pre-reserve fallback time.');
const specialists=registry.bots.filter(b=>b.specialistBuilder===true);
const productionSpecialists=specialists.filter(b=>b.status==='verified');
assert(productionSpecialists.length===10,'Exactly ten verified specialist Builders are authorised by the current gate.');
assert(JSON.stringify(productionSpecialists.map(b=>b.id))===JSON.stringify(['director-builder','timeline-builder','music-builder','scene-builder','rhythm-builder','render-builder','media-intelligence-builder','caption-builder','intent-builder','continuity-builder']),'Production specialist set changed.');
const scopes={
  'director-builder':['src/director.js'],
  'timeline-builder':['src/executableTimeline.js'],
  'music-builder':['src/musicDirector.js'],
  'scene-builder':['src/universalCreativeSceneEngine.js'],
  'rhythm-builder':['src/editorialRhythm.js'],
  'render-builder':['src/cinematicRendererV3.js'],
  'media-intelligence-builder':['src/aiEditPlanner.js'],
  'caption-builder':['src/captionPlanner.js'],
  'intent-builder':['src/creativeIntentCompiler.js'],
  'continuity-builder':['src/creativeContinuityEngine.js']
};
for(const bot of specialists){assert(bot.entrypoint===runnerPath&&['verified','experimental'].includes(bot.status)&&bot.protected===false,`Invalid specialist registry contract: ${bot.id}`);if(bot.status==='experimental')assert(bot.experimental===true,`Experimental specialist must declare experimental:true: ${bot.id}`);assert(JSON.stringify(bot.ownsFiles)===JSON.stringify(scopes[bot.id]),`Invalid specialist scope: ${bot.id}`);for(const file of bot.ownsFiles)assert(fs.existsSync(path.join(root,file)),`Missing specialist scope file: ${file}`);}
assert(pkg.scripts?.['verify:autobot-specialist-builder']==='node scripts/autobot/verify-autobot-specialist-builder.mjs','Package verifier contract is wrong.');
assert(suite.includes("'verify:autobot-specialist-builder'"),'Main verification suite must discover the specialist verifier.');
console.log(JSON.stringify({ok:true,specialistBuilders:specialists.map(b=>({id:b.id,ownsFiles:b.ownsFiles})),activationBlocked:registry.enabled!==true||registry.coordination?.mode!=='active',commandContractValidation:'format-safe'}));
