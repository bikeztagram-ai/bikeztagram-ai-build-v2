#!/usr/bin/env node
/**
 * Turn a self-improvement proposal into a bounded experiment plan.
 * This planner deliberately does not mutate builder infrastructure: the
 * actual implementation remains isolated for human review.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const proposalPath = path.join(root, 'builder', 'reviews', 'self-improvement-proposal.json');
const experimentPath = path.join(root, 'builder', 'reviews', 'self-improvement-experiment.json');
const proposal = fs.existsSync(proposalPath) ? JSON.parse(fs.readFileSync(proposalPath, 'utf8')) : null;

const candidates = proposal?.candidates || [];
const experiment = {
  version: 1,
  generatedAt: new Date().toISOString(),
  status: candidates.length ? 'ready-for-isolated-experiment' : 'no-experiment',
  rule: 'A self-improvement must demonstrate independent verification and must not weaken protected gates.',
  candidates: candidates.map((candidate, index) => ({
    id: `experiment-${index + 1}-${candidate.id}`,
    source: candidate.id,
    hypothesis: candidate.proposal,
    isolation: 'Create a dedicated self-improvement branch from the current verified main baseline.',
    measure: 'Compare recurrence rate, verified-unit yield, failure recovery and elapsed time against the prior baseline.',
    minimumEvidence: ['baseline recorded', 'change isolated', 'builder verification passes', 'targeted regression passes', 'before/after metrics recorded'],
    adoption: 'Human review required; never auto-merge builder changes.'
  }))
};
fs.writeFileSync(experimentPath, JSON.stringify(experiment, null, 2) + '\n');
console.log(`[autobot] Self-improvement experiment plan: ${experiment.status}; ${experiment.candidates.length} candidate(s).`);
