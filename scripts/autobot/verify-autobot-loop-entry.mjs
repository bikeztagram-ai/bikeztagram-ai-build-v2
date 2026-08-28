import { execFileSync } from 'node:child_process';
for(const file of ['scripts/autobot/verify-autobot-loop-static.mjs','scripts/autobot/verify-autobot-loop-contract-run.mjs'])execFileSync(process.execPath,[file],{stdio:'inherit'});
