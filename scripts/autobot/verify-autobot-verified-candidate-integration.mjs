#!/usr/bin/env node
/** Verify the operator-controlled verified-candidate -> integration-PR contract. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const workflowPath='.github/workflows/autobot-verified-candidate-integration.yml';
const recoveryPath='.github/workflows/autobot-fleet-recovery.yml';
const handoffPath='builder/runner/autobot-verified-candidate-handoff.mjs';
const registryPath='builder/brain/autobot-fleet.json';
const workflow=fs.readFileSync(path.join(root,workflowPath),'utf8');
const recovery=fs.readFileSync(path.join(root,recoveryPath),'utf8');
const handoff=fs.readFileSync(path.join(root,handoffPath),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,registryPath),'utf8'));
function assert(condition,message){if(!condition)throw new Error(message);}
assert(workflow.includes('workflow_dispatch:'),'Integration workflow must be manually dispatched.');
assert(workflow.includes("CONFIRMATION")&&workflow.includes("CREATE_PR"),'Integration workflow must require explicit CREATE_PR confirmation.');
assert(workflow.includes('contents: write')&&workflow.includes('pull-requests: write'),'Integration workflow must have only the permissions required to create an integration PR.');
assert(workflow.includes('actions: read'),'Integration workflow must read the recovery artifact.');
assert(workflow.includes('autobot-fleet-recovery-${{ env.RECOVERY_RUN_ID }}'),'Integration workflow must consume a specific controlled-recovery artifact.');
assert(workflow.includes("manifest.status!=='integration-eligible'")&&workflow.includes('manifest.eligible!==true'),'Integration workflow must reject candidates without explicit integration eligibility.');
assert(workflow.includes('manifest.automaticMerge!==false||manifest.automaticPush!==false'),'Integration workflow must enforce the no-auto-merge/no-auto-push contract from the manifest.');
assert(workflow.includes('manifest.gates.repair!==true')&&workflow.includes('manifest.gates.qa!==true')&&workflow.includes('manifest.gates.review!==true'),'Integration workflow must require the complete verification chain.');
assert(workflow.includes('merge-base')&&workflow.includes('not an ancestor of current main'),'Integration workflow must reject stale candidates whose verified base is not an ancestor of current main.');
assert(workflow.includes('autobot-builder-candidate.patch')&&workflow.includes('autobot-repair-candidate.patch'),'Integration workflow must reconstruct both the original Builder candidate and the verified Repair patch.');
assert(workflow.includes('npm run build')&&workflow.includes('npm run verify:autobot-product-change-quality'),'Integration workflow must rerun build and product-quality verification after reconstruction on current main.');
assert(workflow.includes('git push --set-upstream origin'),'Integration workflow must publish only the integration candidate branch.');
assert(workflow.includes('gh pr create')&&workflow.includes('--draft'),'Integration workflow must create a draft PR rather than merge.');
assert(workflow.includes('It does not merge the PR or enable auto-merge'),'Integration workflow must explicitly prohibit merge and auto-merge.');
assert(recovery.includes('autobot-repair-candidate.patch')&&recovery.includes('autobot-repair-base-commit.txt')&&recovery.includes('autobot-repair-commit.txt'),'Recovery must persist the exact verified Repair patch and commit pair for later integration.');
assert(handoff.includes("status:'integration-eligible'"),'Verified handoff must emit integration-eligible status.');
assert(handoff.includes('automaticMerge:false')&&handoff.includes('automaticPush:false'),'Verified handoff must prohibit automatic merge and push.');
assert(registry.enabled===false&&registry.coordination?.mode==='plan-only','Fleet must remain disabled and plan-only while the integration mechanism is being proven.');
assert(registry.activationGate?.protectedIntegration===false,'Fleet activation gate must keep protected integration disabled.');
console.log(JSON.stringify({ok:true,workflow:workflowPath,manualConfirmation:'CREATE_PR',recoveryArtifact:true,completeGateChain:true,currentMainFreshnessCheck:true,reconstructedCandidate:true,integrationBuild:true,draftPullRequest:true,automaticMerge:false,automaticPush:false,fleetStillDisabled:true}));
