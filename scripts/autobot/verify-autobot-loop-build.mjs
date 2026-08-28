import { execFileSync } from 'node:child_process';
execFileSync(process.execPath,['scripts/autobot/verify-autobot-loop-entrypoint.mjs'],{stdio:'inherit'});
console.log('PASS AutoBot V3 build verification');
