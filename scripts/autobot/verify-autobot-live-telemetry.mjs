#!/usr/bin/env node
/** Contract for the exact live telemetry path used by sustained AutoBot runs. */
import fs from 'node:fs';

const root=process.cwd();
const read=p=>fs.readFileSync(`${root}/${p}`,'utf8');
const workflow=read('.github/workflows/autonomous-builder-v2.yml');
const continuation=read('.github/workflows/autonomous-builder-continuation.yml');
const wrapper=read('builder/runner/run-with-live-telemetry.mjs');
const telemetry=read('builder/runner/autobot-telemetry.mjs');
const failures=[];
for(const [label,text,markers] of [
  ['primary workflow',workflow,['run-with-live-telemetry.mjs','autobot-live-telemetry.mjs','actions/upload-artifact@v4','if: always()','builder/working/*.json','builder/working/autobot-live-telemetry.log']],
  ['continuation workflow',continuation,['run-with-live-telemetry.mjs','actions/upload-artifact@v4','if: always()','builder/working/*.json','builder/working/autobot-live-telemetry.log']],
  ['live wrapper',wrapper,['long-run-executor.mjs','heartbeat(','run-wrapper-started','run-wrapper-finished']],
  ['telemetry module',telemetry,['autobot-live-telemetry-v1','AUTOBOT_EVENT','autobot-live-telemetry.log']]
]) for(const marker of markers)if(!text.includes(marker))failures.push(`${label} missing ${marker}`);
if(!workflow.includes('node scripts/autobot/verify-autobot-live-telemetry.mjs'))failures.push('primary workflow does not validate the telemetry contract');
if(!continuation.includes('node scripts/autobot/verify-autobot-live-telemetry.mjs'))failures.push('continuation workflow does not validate the telemetry contract');
if(failures.length){console.error(failures.map(f=>`FAIL: ${f}`).join('\n'));process.exit(1);}
console.log('AutoBot live telemetry contract PASS: exact wrapper, event schema, heartbeat path, validation wiring, live log and durable run evidence are connected in both workflow paths.');
