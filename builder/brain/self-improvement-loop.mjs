#!/usr/bin/env node
/**
 * Bounded AutoBot self-improvement planner.
 * It turns durable run evidence into reviewable proposals; it never edits
 * protected builder/security files or auto-merges its own changes.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const evidenceDir = path.join(root, 'builder', 'working');
const outputDir = path.join(root, 'builder', 'reviews');
const proposalPath = path.join(outputDir, 'self-improvement-proposal.json');
const protectedPrefixes = ['.github/workflows/', 'builder/runner/', 'builder/quality/', 'builder/monitor/', 'builder/review/'];
const minRecurrence = Math.max(2, Number.parseInt(process.env.AUTOBOT_LESSON_RECURRENCE || '2', 10));

fs.mkdirSync(outputDir, { recursive: true });
const files = fs.existsSync(evidenceDir) ? fs.readdirSync(evidenceDir).filter(f => f.endsWith('.json')) : [];
const records = [];
for (const file of files) {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(evidenceDir, file), 'utf8'));
    records.push({ file, value });
  } catch { /* ignore malformed historical evidence */ }
}

const text = records.map(r => JSON.stringify(r.value)).join('\n');
const patterns = [
  { id: 'model-timeout', terms: ['timeout', 'timed out', 'model request failed'], category: 'local-model-timeout', suggestion: 'Reduce context or task scope, improve model warm-up, and tune bounded retries without weakening verification.' },
  { id: 'weak-model-output', terms: ['weak/empty', 'empty model output', 'invalid feature patch'], category: 'weak-model-output', suggestion: 'Improve feature prompting, patch-shape validation and targeted retry strategy.' },
  { id: 'patch-apply', terms: ['git apply failed', 'patch validation failed'], category: 'patch-application', suggestion: 'Improve patch normalization and pre-application validation.' },
  { id: 'build-failure', terms: ['build failed', 'validation failed'], category: 'post-change-build-failure', suggestion: 'Improve failure classification and targeted self-repair context.' }
];
const candidates = patterns.map(p => ({ ...p, occurrences: p.terms.reduce((n, term) => n + (text.toLowerCase().split(term.toLowerCase()).length - 1), 0) })).filter(p => p.occurrences >= minRecurrence).sort((a,b) => b.occurrences-a.occurrences);

const proposal = {
  version: 1,
  generatedAt: new Date().toISOString(),
  status: candidates.length ? 'review-required' : 'no-recurrent-pattern',
  evidenceFiles: records.map(r => r.file),
  recurrenceThreshold: minRecurrence,
  candidates: candidates.slice(0, 3).map(c => ({ id: c.id, category: c.category, occurrences: c.occurrences, proposal: c.suggestion, allowedChangeAreas: ['task ordering', 'acceptance criteria', 'diagnostics', 'recovery', 'efficiency', 'durable lessons'], forbiddenChangeAreas: protectedPrefixes }))
};
fs.writeFileSync(proposalPath, JSON.stringify(proposal, null, 2) + '\n');
console.log(`[autobot] Self-improvement analysis: ${proposal.status}; ${proposal.candidates.length} recurring candidate(s).`);
console.log(`[autobot] Proposal written to ${proposalPath}. Builder/security changes remain human-review-only.`);
