#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const file=p=>path.join(root,p);
const registry=JSON.parse(fs.readFileSync(file('builder/brain/autobot-specialists.json'),'utf8'));
const directive=fs.readFileSync(file('builder/brain/autobot-product-directive.md'),'utf8');
const discovery=fs.readFileSync(file('builder/runner/autobot-product-discovery.mjs'),'utf8');
const orchestrator=fs.readFileSync(file('builder/runner/autobot-orchestrator.mjs'),'utf8');
const errors=[];
const req=(ok,msg)=>{if(!ok)errors.push(msg);};
req(registry.policy?.unknownBots==='blocked','unknown bots are not blocked');
req(registry.policy?.protectedIntegration===false,'protected integration is not disabled');
req(directive.includes('Improve real user-visible editing quality'),'discovery lacks product-quality directive linkage');
req(discovery.includes('sourceInventory')&&discovery.includes('PRODUCT DIRECTIVE'),'discovery does not inspect real product context');
req(discovery.includes('EXISTING OBJECTIVES')&&discovery.includes('SOURCE INVENTORY'),'discovery is not backlog-plus-source aware');
req(discovery.includes('discovery-source')||discovery.includes('evidence-based-product-discovery'),'discovery source marker missing');
req(discovery.includes("!file.startsWith('src/')")&&discovery.includes('..'),'discovery does not constrain product scope safely');
req(discovery.includes('duplicate')&&discovery.includes('existing objective'),'discovery lacks duplicate objective protection');
req(discovery.includes('infrastructure/orchestration'),'discovery does not reject infrastructure work');
req(discovery.includes('/api/generate'),'discovery is not connected to local model execution');
req(orchestrator.includes('autobot-specialists.json'),'orchestrator is not registry-backed');
req(orchestrator.includes('eligibleObjective')&&orchestrator.includes('invokeDiscovery'),'orchestrator lacks backlog-then-discovery flow');
req(orchestrator.includes("['proven','verified']"),'orchestrator does not require trusted specialist status');
req(orchestrator.includes("unknownBots!=='blocked'"),'orchestrator does not enforce registry safety');
req(orchestrator.includes('autobot-orchestrator-assignment.json'),'orchestrator does not persist assignment evidence');
req(fs.readFileSync(file('builder/runner/aider-feature-brain.mjs'),'utf8').includes('AUTOBOT_ORCHESTRATOR_ENABLED'),'execution worker cannot consume explicit controller assignment');
if(errors.length){console.error(errors.map(e=>`FAIL: ${e}`).join('\n'));process.exit(1);}
console.log(`PASS: AutoBot product discovery/orchestration contract (${(registry.specialists||[]).length} registered specialists)`);
