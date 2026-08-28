import { execFileSync } from 'node:child_process';
execFileSync(process.execPath,['scripts/autobot/verify-autobot-loop-status-check.mjs'],{stdio:'inherit'});
