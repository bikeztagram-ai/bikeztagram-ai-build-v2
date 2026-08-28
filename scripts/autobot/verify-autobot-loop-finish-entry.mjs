import { execFileSync } from 'node:child_process';
execFileSync(process.execPath,['scripts/autobot/verify-autobot-loop-finish-summary-check.mjs'],{stdio:'inherit'});
