#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fleet=JSON.parse(read('builder/brain/autobot-fleet.json'));
const specialists=JSON.parse(read('builder/brain/autobot-specialists.json'));
const orch=read('builder/runner/autobot-orchestrator.mjs');
const specialist=read('builder/runner/autobot-specialist-builder.mjs');
const recovery=read('.github/workflows/autobot-fleet-recovery.yml');
const errors=[];const req=(ok,msg)=>{if(!ok)errors.push(msg);};
req(fleet.activationGate?.protectedIntegration===false,'fleet protected integration must remain disabled');
req(fleet.coordination?.requireVerificationBeforeHandoff===true,'verification-before-handoff must remain required');
req(fleet.coordination?.requireHumanReviewBeforeProtectedIntegration===true,'human review boundary missing');
req(orch.includes('lastAssignment')&&orch.includes('assignments'),'controller does not persist assignment state');
req(orch.includes('no trusted registered specialist'),'controller lacks trusted-specialist failure path');
req(specialist.includes('AUTOBOT_SPECIALIST_BUILDER_ENABLED'),'specialist builder lacks explicit enable gate');
req(specialist.includes('status!==\'verified\''),'specialist builder does not enforce verified status');
req(specialist.includes('no product change'),'specialist builder can silently pass a no-op');
req(recovery.includes('Repair')&&recovery.includes('QA')&&recovery.includes('Reviewer'),'recovery chain is not connected');
req(recovery.includes('verified-candidate'),'recovery does not require verified-candidate state');
const ids=new Set();for(const bot of specialists.specialists||[]){req(!ids.has(bot.id),`duplicate specialist id ${bot.id}`);ids.add(bot.id);req(bot.entrypoint&&Array.isArray(bot.scope),`incomplete specialist ${bot.id}`);}
if(errors.length){console.error(errors.map(e=>`FAIL: ${e}`).join('\n'));process.exit(1);}
console.log(`PASS: AutoBot orchestrator contract (${ids.size} specialists, recovery chain intact)`);
