#!/usr/bin/env node
/**
 * Persistent independent specialist lane.
 *
 * One GitHub job owns one specialist lane for the whole requested run. The
 * expensive runner environment (Node/Python/Aider/Ollama) is bootstrapped once
 * by the workflow; this controller repeatedly executes the proven Specialist
 * Builder -> publish -> independent QA/Reviewer chain and carries only verified
 * candidate SHAs forward.
 *
 * The lane never waits for another specialist. The central fan-in remains a
 * final evidence collector, not a production synchronization point.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

const root = process.cwd();
const botId = String(process.env.AUTOBOT_SPECIALIST_BOT_ID || '').trim();
const initialObjective = String(process.env.AUTOBOT_SPECIALIST_OBJECTIVE || '').trim();
const coordinationId = String(process.env.AUTOBOT_COORDINATION_ID || '').trim() || `lane-${process.env.GITHUB_RUN_ID || Date.now()}`;
const model = process.env.AUTOBOT_AIDER_MODEL || process.env.LOCAL_AI_MODEL || 'qwen2.5-coder:7b';
const skipNpmInstall = String(process.env.AUTOBOT_SKIP_NPM_INSTALL || '').toLowerCase() === 'true';
const cycleBudget = Math.max(8, Number.parseInt(process.env.AUTOBOT_LANE_CYCLE_MINUTES || '20', 10) || 20);
const maxFailures = Math.max(1, Number.parseInt(process.env.AUTOBOT_LANE_MAX_NO_PROGRESS_CYCLES || '2', 10) || 2);
const requestedDuration = String(process.env.AUTOBOT_TOTAL_DURATION || '5h30').trim().toLowerCase();
const configuredRunMinutes = Number.parseInt(process.env.BUILDER_MAX_MINUTES || '', 10);
const durationMinutes = Number.isFinite(configuredRunMinutes) && configuredRunMinutes > 0
  ? configuredRunMinutes
  : ({'15m':15,'30m':30,'1h':60,'4h':240,'5h':300,'5h30':330})[requestedDuration] || 330;
const finishGrace = Math.max(0, Number.parseInt(process.env.AUTOBOT_FINISH_GRACE_MINUTES || '15', 10) || 0);
const startedAt = Date.now();
const normalDeadline = startedAt + durationMinutes * 60_000;
const hardDeadline = normalDeadline + finishGrace * 60_000;

function remainingNormalMs() { return Math.max(0, normalDeadline - Date.now()); }
function remainingHardMs() { return Math.max(0, hardDeadline - Date.now()); }
function git(args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }
function runNode(script, env, timeoutMs) {
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    env: { ...process.env, ...env },
    timeout: Math.max(30_000, timeoutMs)
  });
  return result.error ? 1 : (result.status ?? 1);
}
function writeState(status, extra = {}) {
  const state = {
    schemaVersion: 1,
    status,
    botId,
    coordinationId,
    requestedDuration,
    requestedMinutes: durationMinutes,
    finishGraceMinutes: finishGrace,
    cycleBudgetMinutes: cycleBudget,
    startedAt: new Date(startedAt).toISOString(),
    normalDeadline: new Date(normalDeadline).toISOString(),
    hardDeadline: new Date(hardDeadline).toISOString(),
    updatedAt: new Date().toISOString(),
    elapsedMinutes: Number(((Date.now() - startedAt) / 60_000).toFixed(2)),
    remainingNormalMinutes: Number((remainingNormalMs() / 60_000).toFixed(2)),
    remainingHardMinutes: Number((remainingHardMs() / 60_000).toFixed(2)),
    ...extra
  };
  fs.mkdirSync(path.join(root, 'builder/working'), { recursive: true });
  fs.writeFileSync(path.join(root, 'builder/working/autobot-independent-specialist-lane.json'), JSON.stringify(state, null, 2) + '\n');
}

if (!botId) throw new Error('Persistent specialist lane requires AUTOBOT_SPECIALIST_BOT_ID.');
if (!initialObjective) throw new Error('Persistent specialist lane requires AUTOBOT_SPECIALIST_OBJECTIVE.');
if (!fs.existsSync(path.join(root, 'builder/runner/autobot-specialist-builder.mjs'))) throw new Error('Specialist Builder entrypoint is missing.');

let currentBase = git(['rev-parse', 'HEAD']);
let verifiedCandidates = [];
let publishedBranches = [];
let failures = 0;
let cycle = 0;

writeState('starting', { currentBase, verifiedCandidates, publishedBranches, failures, cycle });

while (remainingNormalMs() > 90_000 && remainingHardMs() > 120_000) {
  cycle += 1;
  const availableMinutes = Math.max(1, Math.floor(remainingNormalMs() / 60_000));
  const thisCycleMinutes = Math.min(cycleBudget, availableMinutes);
  if (thisCycleMinutes < 8) break;

  const cycleObjective = [
    initialObjective,
    '',
    `Persistent lane cycle ${cycle}: this is a NEW improvement cycle on the current verified candidate.`,
    `Previous verified candidate base: ${currentBase}`,
    'Do not repeat an already-applied change merely to create churn.',
    'Inspect the current owned implementation and find the next smallest justified production improvement that satisfies the existing acceptance criteria.',
    'If the current implementation already satisfies one aspect, improve a different justified aspect of the same specialist responsibility.',
    'Preserve all existing contracts, safeguards and successful behaviour.',
    'This cycle must leave a real owned-file candidate or report a truthful blocked/no-progress result.'
  ].join('\n');

  console.log(`[lane:${botId}] cycle ${cycle} starting from ${currentBase}; budget=${thisCycleMinutes}m; remaining=${availableMinutes}m`);
  writeState('building', { currentBase, verifiedCandidates, publishedBranches, failures, cycle, cycleObjective });

  const builderStatus = runNode('builder/runner/autobot-specialist-builder.mjs', {
    AUTOBOT_BASE_REF: currentBase,
    AUTOBOT_SPECIALIST_OBJECTIVE: cycleObjective,
    AUTOBOT_COORDINATION_ID: `${coordinationId}-cycle-${cycle}`,
    AUTOBOT_AIDER_MODEL: model,
    AUTOBOT_SKIP_NPM_INSTALL: skipNpmInstall ? 'true' : 'false',
    BUILDER_MAX_MINUTES: String(thisCycleMinutes),
    // The outer lane owns the run deadline. Do not spend a 15m fleet grace
    // reserve inside every short cycle; that would destroy the cycle budget.
    AUTOBOT_FINISH_GRACE_MINUTES: '0',
    AUTOBOT_FEATURE_DEADLINE_EPOCH_MS: String(Math.min(hardDeadline, Date.now() + thisCycleMinutes * 60_000)),
    AUTOBOT_FEATURE_NORMAL_DEADLINE_EPOCH_MS: String(Math.min(normalDeadline, Date.now() + thisCycleMinutes * 60_000))
  }, Math.min(remainingHardMs(), thisCycleMinutes * 60_000 + 90_000));

  if (builderStatus !== 0) {
    failures += 1;
    console.warn(`[lane:${botId}] cycle ${cycle} builder did not produce a verified handoff (status ${builderStatus}).`);
    writeState('builder-failure', { currentBase, verifiedCandidates, publishedBranches, failures, cycle });
    if (failures >= maxFailures) {
      console.warn(`[lane:${botId}] stopping after ${failures} consecutive blocked cycles; preserving all evidence.`);
      break;
    }
    continue;
  }

  const handoffPath = path.join(root, 'builder/working/autobot-specialist-handoff.json');
  const outcomePath = path.join(root, 'builder/working/autobot-specialist-outcome.json');
  if (!fs.existsSync(handoffPath) || !fs.existsSync(outcomePath)) {
    failures += 1;
    console.warn(`[lane:${botId}] Builder returned success but handoff/outcome evidence is missing.`);
    if (failures >= maxFailures) break;
    continue;
  }

  let handoff;
  try { handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8')); }
  catch (error) {
    failures += 1;
    console.warn(`[lane:${botId}] invalid handoff JSON: ${error.message}`);
    if (failures >= maxFailures) break;
    continue;
  }

  const candidate = String(handoff.candidateCommit || '').trim();
  const candidateBranch = String(handoff.branch || '').trim();
  if (!/^[0-9a-f]{40}$/i.test(candidate) || !candidateBranch) {
    failures += 1;
    console.warn(`[lane:${botId}] incomplete candidate handoff: candidate=${candidate} branch=${candidateBranch}`);
    if (failures >= maxFailures) break;
    continue;
  }

  try {
    execFileSync('git', ['push', '--set-upstream', 'origin', candidateBranch], { cwd: root, stdio: 'inherit' });
    publishedBranches.push(candidateBranch);
  } catch (error) {
    failures += 1;
    console.warn(`[lane:${botId}] candidate branch publish failed: ${error.message}`);
    if (failures >= maxFailures) break;
    continue;
  }

  writeState('verifying', { currentBase, candidate, candidateBranch, verifiedCandidates, publishedBranches, failures, cycle });

  const resultDir = path.join(root, 'builder/working/specialist-results', botId);
  fs.mkdirSync(resultDir, { recursive: true });
  const qaStatus = runNode('builder/runner/autobot-endurance-candidate-check.mjs', {
    AUTOBOT_EXPECTED_CYCLE_BASE_COMMIT: currentBase,
    AUTOBOT_SPECIALIST_RESULTS_ROOT: 'builder/working/specialist-results',
    AUTOBOT_CANDIDATE_CHECK_OUTPUT: path.join(resultDir, 'autobot-endurance-candidate-check.json'),
    AUTOBOT_CANDIDATE_REVIEW_OUTPUT: path.join(resultDir, `autobot-candidate-review-${botId}.json`),
    AUTOBOT_SKIP_NPM_INSTALL: skipNpmInstall ? 'true' : 'false'
  }, Math.min(remainingHardMs(), 6 * 60_000));

  if (qaStatus !== 0) {
    failures += 1;
    console.warn(`[lane:${botId}] candidate ${candidate} failed independent QA/Reviewer; retaining the previous verified base ${currentBase}.`);
    writeState('candidate-rejected', { currentBase, rejectedCandidate: candidate, candidateBranch, verifiedCandidates, publishedBranches, failures, cycle });
    if (failures >= maxFailures) {
      console.warn(`[lane:${botId}] stopping after ${failures} consecutive candidate failures.`);
      break;
    }
    continue;
  }

  failures = 0;
  currentBase = candidate;
  verifiedCandidates.push({ cycle, baseCommit: handoff.baseCommit || null, candidateCommit: candidate, branch: candidateBranch, verifiedAt: new Date().toISOString() });
  console.log(`[lane:${botId}] VERIFIED cycle ${cycle}: ${candidate}. Immediately starting next objective.`);
  writeState('verified-carry-forward', { currentBase, verifiedCandidates, publishedBranches, failures, cycle });

  // Leave the final verified handoff/outcome in builder/working for the normal
  // workflow publication/QA/evidence steps. The next cycle overwrites them.
}

const status = verifiedCandidates.length ? 'finished-with-candidates' : 'blocked-no-candidate';
writeState(status, { currentBase, verifiedCandidates, publishedBranches, failures, cycle });
console.log(JSON.stringify({
  ok: verifiedCandidates.length > 0,
  status,
  botId,
  cycles: cycle,
  verifiedCandidates: verifiedCandidates.length,
  currentBase,
  elapsedMinutes: Number(((Date.now() - startedAt) / 60_000).toFixed(2)),
  remainingNormalMinutes: Number((remainingNormalMs() / 60_000).toFixed(2)),
  remainingHardMinutes: Number((remainingHardMs() / 60_000).toFixed(2)),
  model
}, null, 2));

process.exit(verifiedCandidates.length ? 0 : 1);
