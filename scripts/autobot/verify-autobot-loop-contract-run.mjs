import { execFileSync } from 'node:child_process';
execFileSync(process.execPath,['scripts/autobot/verify-autobot-loop-contract.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/autobot/verify-autobot-loop.mjs'],{stdio:'inherit'});
