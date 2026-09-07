#!/usr/bin/env node
import fs from 'node:fs';

const feature = fs.readFileSync('builder/runner/feature-brain.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/autonomous-builder-v2-fast.yml', 'utf8');
const failures = [];

const required = [
  [/structured-search-replace-v4/, 'current feature protocol marker missing'],
  [/snapshotFiles\(/, 'per-attempt snapshots missing'],
  [/restoreAttemptFiles\(/, 'per-attempt rollback missing'],
  [/Existing working-tree changes/i, 'working-tree preservation instruction missing'],
  [/previous verified increments/i, 'progress context missing'],
  [/progress\[obj\.id\]/, 'incremental objective progress missing'],
  [/format: editSchema/, 'Ollama structured schema output missing'],
  [/temperature:\s*0/, 'deterministic model temperature missing'],
  [/npm.*run.*build/, 'build verification missing'],
  [/git.*diff.*--check/, 'diff verification missing'],
];
for (const [pattern, message] of required) if (!pattern.test(feature)) failures.push(message);

if (/git\s*\[?['\"]reset|git.*reset.*--hard/.test(feature)) failures.push('feature brain must never wholesale-reset the working tree');
if (/git.*clean.*-f/.test(feature)) failures.push('feature brain must never clean unrelated working-tree files');
if (/completed\.add\(obj\.id\)/.test(feature)) failures.push('one successful increment must not permanently complete an objective');
if (!/AUTOBOT_FEATURE_MAX_EDITS:\s*2/.test(workflow)) failures.push('fast workflow is still limited to one edit per feature');
if (!/LOCAL_AI_FEATURE_TIMEOUT_SECONDS:\s*120/.test(workflow)) failures.push('fast workflow timeout is still too aggressive');

if (failures.length) {
  console.error('[autobot] feature brain resilience FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[autobot] feature brain resilience PASS');
