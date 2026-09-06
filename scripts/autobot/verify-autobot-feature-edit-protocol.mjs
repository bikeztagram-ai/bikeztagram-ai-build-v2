#!/usr/bin/env node
/** Contract test for the local feature brain's model-to-code edit protocol. */
import fs from 'node:fs';

const root = process.cwd();
const read = p => fs.readFileSync(`${root}/${p}`, 'utf8');
const source = read('builder/runner/feature-brain.mjs');
const failures = [];
const required = [
  ['structured Ollama format', 'format: editSchema'],
  ['non-streaming structured response', 'stream: false'],
  ['bounded edit schema', 'maxItems: maxEdits'],
  ['allowed-file validation', 'out-of-scope file'],
  ['line-range validation', 'invalid line range'],
  ['overlap protection', 'overlapping edits'],
  ['diff verification', "git', ['diff', '--check']"],
  ['build verification', "npm', ['run', 'build']"],
  ['reset after failed edit', "git', ['reset', '--hard', 'HEAD']"],
  ['protocol audit', "protocol: 'structured-line-edits-v1'"]
];
for (const [label, marker] of required) if (!source.includes(marker)) failures.push(`missing ${label}: ${marker}`);
if (/diff --git/.test(source) && /Return ONLY a valid unified git diff/.test(source)) failures.push('fragile unified-diff generation still active');
if (failures.length) {
  console.error(failures.map(f => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log('AutoBot feature-edit protocol PASS: structured line edits, bounded scope, overlap/range validation, reset, diff check, build check, and audit telemetry.');
