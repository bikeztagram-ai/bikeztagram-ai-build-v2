#!/usr/bin/env node
/** Contract test for the active one-request structured-Qwen feature brain. */
import fs from 'node:fs';

const source = fs.readFileSync('builder/runner/repository-aware-fast-brain.mjs', 'utf8');
const failures = [];
const required = [
  ['Ollama chat request', /\/api\/chat/],
  ['non-streaming response', /stream:\s*false/],
  ['thinking disabled', /think:\s*false/],
  ['deterministic temperature', /temperature:\s*0/],
  ['bounded output', /num_predict:\s*420/],
  ['bounded edit count', /maxEdits/],
  ['structured JSON patch', /"edits"/],
  ['exact search replacement', /search.*exact existing text/],
  ['allowed-file validation', /allowed\.has\(file\)/],
  ['safe path validation', /safe\(file\)/],
  ['unique search validation', /must match exactly once/],
  ['syntax verification', /syntax\(file\)/],
  ['product-source diff verification', /\['diff', '--', 'src', 'public'\]/],
  ['build verification', /run\('npm', \['run', 'build'\]\)/],
  ['rollback', /restore\(snapshots\)/],
  ['objective selection', /chooseObjective/],
  ['failure persistence', /state\.failed/],
];
for (const [label, pattern] of required) if (!pattern.test(source)) failures.push(`missing ${label}`);
if (/git\s+reset\s+--hard|git\s+clean\s+-f/.test(source)) failures.push('unsafe wholesale rollback still active');
if (/search_repo|list_files|repository_map/.test(source)) failures.push('repository-discovery tools must not be exposed to the fast brain');
if (!/maxAttempts/.test(source)) failures.push('bounded model-attempt ceiling missing');
if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log('AutoBot feature-edit protocol PASS: one-request structured patching, scoped exact-match edits, bounded attempts, syntax/diff/build verification, and rollback.');
