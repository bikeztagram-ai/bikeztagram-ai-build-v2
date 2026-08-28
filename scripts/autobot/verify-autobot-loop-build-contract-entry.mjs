import { execFileSync } from 'node:child_process';
execFileSync(process.execPath,['scripts/autobot/verify-autobot-loop-build-contract-run.mjs'],{stdio:'inherit'});
