#!/usr/bin/env node
/** Contract for the exact live telemetry path used by sustained AutoBot runs. */
import fs from 'node:fs';

const root=process.cwd();
const read=p=>fs.readFileSync(`${root}/${p}`,'utf8');
const workflow=read('.github/workflows/autonomous-builder-v2.yml');
const wrapper=read('builder/runner/run-with-live-telemetry.mjs');
const telemetry=read('builder/runner/autobot-telemetry.mjs');
const failures=[];
for(const [label,text,markers] of [
  ['primary workflow',workflow,['run-with-live-telemetry.mjs','autobot-live-telemetry.mjs','actions/upload-artifact@v4','if: always()']],
  ['live wrapper',wrapper,['long-run-executor.mjs','heartbeat(','run-wrapper-started','run-wrapper-finished']],
  ['telemetry module',telemetry,['autobot-live-telemetry-v1','AUTOBOT_EVENT','autobot-live-telemetry.log']]
]) for(const marker of markers)if(!text.includes(marker))failures.push(`${label} missing ${marker}`);
if(!workflow.includes('node scripts/autobot/verify-autobot-live-telemetry.mjs'))failures.push('primary workflow does not validate the telemetry contract');
if(!workflow.includes('builder/working/autobot-live-telemetry.log'))failures.push('primary workflow does not persist the live telemetry log');
if(!workflow.includes('builder/working/long-run-state.json'))failures.push('primary workflow does not persist authoritative runtime state');
if(!workflow.includes('builder/working/deterministic-autobot.json'))failures.push('primary workflow does not persist deterministic checkpoint evidence');
if(failures.length){console.error(failures.map(f=>`FAIL: ${f}`).join('\n'));process.exit(1);}
console.log('AutoBot live telemetry contract PASS: exact wrapper, event schema, heartbeat path, validation wiring, live log and durable run evidence are connected.');
