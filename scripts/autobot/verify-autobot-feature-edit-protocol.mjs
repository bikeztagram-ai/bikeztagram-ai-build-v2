#!/usr/bin/env node
/** Contract test for the local feature brain's repository-agent protocol. */
import fs from 'node:fs';

const root = process.cwd();
const read = (p) => fs.readFileSync(`${root}/${p}`, 'utf8');
const source = read('builder/runner/feature-brain.mjs');
const failures = [];

const required = [
  ['tool definitions', /tools\s*=\s*\[/],
  ['non-streaming tool response', /stream\s*:\s*false/],
  ['bounded edit count', /maxEdits/],
  ['allowed-file validation', /out-of-scope file/],
  ['search-replace uniqueness validation', /must match exactly once/i],
  ['overlap protection', /multiple edits in one file/i],
  ['scoped rollback snapshot', /snapshotFiles\(/],
  ['scoped rollback restore', /restoreAttemptFiles\(/],
  ['diff verification', /git.*diff.*--check/],
  ['build verification', /npm.*run.*build/],
  ['tool-loop audit', /agentic|multi-turn|agent loop/i],
  ['edit tool', /name:\s*'edit_file'/],
  ['verification tool', /name:\s*'run_check'/],
];
for (const [label, pattern] of required) {
  if (!pattern.test(source)) failures.push(`missing ${label}`);
}

if (/git.*reset.*--hard|git.*clean.*-f/.test(source)) failures.push('unsafe wholesale rollback still active');
if (/Return ONLY a valid unified git diff/.test(source)) failures.push('fragile unified-diff generation still active');
if (/startLine\s*:\s*endLine|invalid line range/.test(source)) failures.push('legacy line-range edit protocol still active');

if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}

console.log('AutoBot feature-edit protocol PASS: agent tools, scoped atomic edits, bounded turns, syntax/diff/build verification, and per-attempt rollback.');
