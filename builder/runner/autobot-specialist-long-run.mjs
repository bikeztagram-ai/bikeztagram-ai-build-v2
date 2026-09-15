#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
const requestedMinutes=Math.max(1,Number.parseInt(process.env.BUILDER_MAX_MINUTES||'15',10));
const env={...process.env,AUTOBOT_SPECIALIST_MODE:'true',AUTOBOT_SPECIALIST_TIME_BUDGET_MINUTES:String(requestedMinutes),AUTOBOT_FEATURE_ENGINE:'aider',AUTOBOT_FEATURE_PASSES:process.env.AUTOBOT_FEATURE_PASSES||'2',AUTOBOT_FEATURE_PROTOCOL:process.env.AUTOBOT_FEATURE_PROTOCOL||'aider-repo-map-v4'};
const result=spawnSync(process.execPath,['builder/runner/long-run-executor.mjs'],{cwd:process.cwd(),stdio:'inherit',env,timeout:requestedMinutes*60_000+90_000});
if(result.error||result.status!==0)process.exit(result.status??1);
