#!/usr/bin/env node
/** Contract test for the local feature brain's model-to-code edit protocol. */
import fs from 'node:fs';

const root = process.cwd();
const read = (p) => fs.readFileSync(`${root}/${p}`, 'utf8');
const source = read('builder/runner/feature-brain.mjs');
const failures = [];

const required = [
  ['structured Ollama format', /format\s*:\s*editSchema/],
  ['non-streaming structured response', /stream\s*:\s*false/],
  ['bounded edit schema', /maxItems\s*:\s*maxEdits/],
  ['allowed-file validation', /out-of-scope file/],
  ['search-replace uniqueness validation', /must match exactly once/],
  ['overlap protection', /overlapping edits|multiple edits in one file/],
  ['scoped rollback snapshot', /snapshotFiles\(/],
  ['scoped rollback restore', /restoreAttemptFiles\(/],
  ['diff verification', /git.*diff.*--check/],
  ['build verification', /npm.*run.*build/],
  ['protocol audit', /structured-(?:line-edits|search-replace)/]
];

for (const [label, pattern] of required) {
  if (!pattern.test(source)) failures.push(`missing ${label}`);
}

// Failed attempts must restore only the files they touched. A wholesale git reset
// would erase valid deterministic work produced earlier in the same run.
if (/git.*reset.*--hard|git.*clean.*-f/.test(source)) failures.push('unsafe wholesale rollback still active');
if (/Return ONLY a valid unified git diff/.test(source)) failures.push('fragile unified-diff generation still active');
if (/startLine\s*:\s*endLine|invalid line range/.test(source)) failures.push('legacy line-range edit protocol still active');

if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}

console.log('AutoBot feature-edit protocol PASS: structured search/replace, bounded scope, uniqueness/overlap validation, scoped per-attempt rollback, diff check, build check, and audit telemetry.');
