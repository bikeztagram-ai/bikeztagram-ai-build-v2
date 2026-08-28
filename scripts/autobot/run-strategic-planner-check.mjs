import { execFileSync } from 'node:child_process';
execFileSync(process.execPath,['scripts/autobot/verify-strategic-planner-contract.mjs'],{stdio:'inherit'});
