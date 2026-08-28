import { execFileSync } from 'node:child_process';
execFileSync(process.execPath,['scripts/autobot/verify-autobot-loop-manifest-check.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/autobot/verify-autobot-loop-final.mjs'],{stdio:'inherit'});
