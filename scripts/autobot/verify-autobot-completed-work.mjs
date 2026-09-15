#!/usr/bin/env node
/** Verify the central AutoBot completed-work inbox contract. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const runner='builder/runner/autobot-completed-work.mjs';
const registryPath='builder/brain/autobot-fleet.json';
const workflowPath='.github/workflows/autobot-parallel-specialists.yml';
function assert(condition,message){if(!condition)throw new Error(message);}
const runnerText=fs.readFileSync(path.join(root,runner),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,registryPath),'utf8'));
const workflow=fs.readFileSync(path.join(root,workflowPath),'utf8');
assert(runnerText.includes("autobot-completed-work-v1"),'completed-work runner must define its stable schema');
assert(runnerText.includes("status:'ready-for-review'"),'verified candidates must enter the ready-for-review state');
assert(runnerText.includes('onlyVerifiedCandidatesEnterCandidates'),'runner must document the candidate gate');
assert(runnerText.includes('automaticMerge:false')&&runnerText.includes('automaticPush:false'),'completed-work manifest must prohibit automatic merge/push');
assert(registry.coordination?.completedWorkManifest==='builder/working/autobot-completed-work.json','registry must point to the central completed-work manifest');
assert(registry.coordination?.completedWorkRunner===runner,'registry must point to the exact completed-work runner');
assert(workflow.includes('completed-work:'),'parallel workflow must have a dedicated aggregation job');
assert(workflow.includes('autobot-completed-work-${{ github.run_id }}'),'parallel workflow must publish the central completed-work artifact');
assert(workflow.includes('autobot-specialist-outcome.json'),'specialist outcomes must be preserved even when a worker fails');
assert(workflow.includes('if: steps.execute.outcome == \'success\''),'candidate publication must not run after a failed specialist');
console.log(JSON.stringify({ok:true,centralManifest:registry.coordination.completedWorkManifest,runner,artifactPrefix:registry.coordination.completedWorkArtifactPrefix,automaticMerge:false,automaticPush:false}));
