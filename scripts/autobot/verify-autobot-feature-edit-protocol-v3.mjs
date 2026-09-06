#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const feature = read('builder/runner/feature-brain.mjs');

const required = [
  ['structured Ollama format', /format\s*:\s*editSchema/],
  ['non-streaming model response', /stream\s*:\s*false/],
  ['bounded edit schema', /maxItems\s*:\s*maxEdits/],
  ['overlap protection', /overlapping edits|multiple edits in one file/i],
  ['diff verification', /git.*diff.*--check/i],
  ['build verification', /npm.*run.*build/],
  ['reset after failure', /git.*reset.*--hard|resetFailedEdits/],
  ['protocol audit', /structured-(?:line-edits|search-replace)/],
];
for (const [label, pattern] of required) {
  if (!pattern.test(feature)) failures.push(`missing ${label}`);
}
if (failures.length) { console.error(failures.map((f) => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log('AutoBot feature-edit protocol contract PASS: structured output, bounded edits, overlap protection, verification, rollback and audit evidence.');
