import { execFileSync } from 'node:child_process';
execFileSync(process.execPath,['scripts/autobot/verify-autobot-loop-package.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/autobot/verify-autobot-loop-static.mjs'],{stdio:'inherit'});
console.log('PASS final AutoBot V3 verification');
