import { execFileSync } from 'node:child_process';
execFileSync(process.execPath,['scripts/autobot/verify-autobot-loop-entry.mjs'],{stdio:'inherit'});
console.log('PASS AutoBot V3 verification command');
