#!/usr/bin/env node
/**
 * Execute one registry-defined specialist Builder in an isolated worktree.
 * Fleet activation remains blocked by the registry/coordinator foundation gate.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

const root=process.cwd();
const registryPath=path.join(root,'builder/brain/autobot-fleet.json');
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const botId=String(process.env.AUTOBOT_SPECIALIST_BOT_ID||'').trim();
const objective=String(process.env.AUTOBOT_SPECIALIST_OBJECTIVE||'').trim();
const enabled=String(process.env.AUTOBOT_SPECIALIST_BUILDER_ENABLED||'').trim().toLowerCase()==='true';
const bot=registry.bots.find(item=>item.id===botId);

function fail(message){throw new Error(message);}
function run(command,args,cwd){
  const result=spawnSync(command,args,{cwd,stdio:'inherit',env:process.env});
  if(result.status!==0) fail(`${command} ${args.join(' ')} failed with status ${result.status}`);
}
function git(args,cwd){return execFileSync('git',args,{cwd,encoding:'utf8'}).trim();}
function safeRelative(file){
  const value=String(file||'').trim();
  return value && !path.isAbsolute(value) && !value.includes('..') && !value.startsWith('.') && !value.includes('\\') ? value : null;
}

if(!enabled) fail('Specialist Builder execution is disabled until the fleet activation gate is explicitly enabled.');
if(registry.enabled!==true || registry.coordination?.mode!=='active') fail('AutoBot fleet activation is blocked; registry must be enabled with active coordination.');
if(!bot) fail(`Unknown specialist Builder id: ${botId}`);
if(!bot.specialistBuilder) fail(`Registry bot ${botId} is not marked specialistBuilder.`);
if(bot.protected===true) fail('Specialist Builder cannot be protected infrastructure.');
if(bot.status!=='verified') fail(`Specialist Builder ${botId} is not verified.`);
if(bot.entrypoint!=='builder/runner/autobot-specialist-builder.mjs') fail('Registry specialist Builder entrypoint does not match the executable.');
if(!objective) fail('AUTOBOT_SPECIALIST_OBJECTIVE is required.');

const files=Array.isArray(bot.ownsFiles)?bot.ownsFiles.map(safeRelative).filter(Boolean):[];
if(!files.length) fail(`Specialist Builder ${botId} has no declared ownsFiles scope.`);
const base=git(['rev-parse','HEAD'],root);
const worktree=fs.mkdtempSync(path.join(os.tmpdir(),`autobot-specialist-${botId}-`));
const branch=`autobot-specialist/${botId}-${Date.now()}`;
let keepBranch=false;
try{
  run('git',['worktree','add','-b',branch,worktree,base],root);
  const prompt=[
    `You are the ${bot.role} for Bikeztagram AI.`,
    `Specialist objective: ${objective}`,
    `You may modify ONLY these declared product files: ${files.join(', ')}`,
    'Inspect callers, contracts, tests and production wiring before editing.',
    'Do not weaken validators, safety rules, production gates, rollback, audit or protected infrastructure.',
    'Do not modify package/dependency manifests, workflows, environment files, the fleet registry, or AutoBot runners.',
    'Do not invent media, fake capabilities, Gemini dependencies, or unsupported claims.',
    'Implement the smallest complete product-quality change that genuinely serves the objective.',
    'Run targeted verification and npm run build before finishing.',
    'Do not merge or push. Leave a clean, reviewable commit-ready working tree.'
  ].join('\\n');
  const aider=String(process.env.AIDER_BIN||'aider').trim();
  run(aider,['--yes-always','--no-auto-commits','--no-dirty-commits','--no-gitignore','--map-tokens=768','--subtree-only','--message',prompt,...files],worktree);
  const all=git(['status','--porcelain'],worktree).split(/\\r?\\n/).map(line=>line.trim()).filter(Boolean).map(line=>line.slice(3));
  const changed=git(['diff','HEAD','--name-only'],worktree).split(/\\r?\\n/).map(s=>s.trim()).filter(Boolean);
  const touched=Array.from(new Set([...changed,...all]));
  if(touched.some(file=>!files.includes(file))) fail(`Specialist Builder modified out-of-scope files: ${touched.filter(file=>!files.includes(file)).join(', ')}`);
  run('git',['diff','HEAD','--check'],worktree);
  run('npm',['run','build'],worktree);
  const productQuality=String(process.env.AUTOBOT_SPECIALIST_PRODUCT_QUALITY_CHECK||'npm run verify:autobot-product-change-quality').trim();
  run('sh',['-lc',productQuality],worktree);
  git(['add','--',...files],worktree);
  const stagedDiff=git(['diff','--cached','--name-only'],worktree).split(/\\r?\\n/).map(s=>s.trim()).filter(Boolean);
  if(stagedDiff.some(file=>!files.includes(file))) fail('Staged specialist diff escaped declared scope.');
  if(!stagedDiff.length) fail('Specialist Builder produced no product change.');
  const commitMessage=`autobot(${botId}): ${objective.slice(0,72)}`;
  run('git',['commit','-m',commitMessage],worktree);
  const candidate=git(['rev-parse','HEAD'],worktree);
  keepBranch=true;
  console.log(JSON.stringify({schemaVersion:1,ok:true,botId,baseCommit:base,candidateCommit:candidate,branch,files:stagedDiff,productQualityCheck:productQuality,activationBlocked:false}));
}finally{
  try{run('git',['worktree','remove','--force',worktree],root);}catch{}
  if(!keepBranch){try{run('git',['branch','-D',branch],root);}catch{}}
}
