#!/usr/bin/env node
/** Formatting-tolerant AutoBot safety contract for the repository-aware coding agent. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const feature = read('builder/runner/feature-brain.mjs');
const required = [
  [/tools\s*=\s*\[/, 'feature engineer must expose structured agent tools'],
  [/edit_file/, 'safe product edit tool missing'],
  [/run_check/, 'verification tool missing'],
  [/maxAttemptsPerFeature/, 'bounded feature attempts missing'],
  [/snapshotFiles\(/, 'per-attempt snapshot missing'],
  [/restoreAttemptFiles\(/, 'scoped failed-edit recovery missing'],
  [/out-of-scope file/, 'edit scope guard missing'],
  [/multiple edits in one file/, 'edit overlap/bounded edit guard missing'],
  [/function\s+choose\s*\(/, 'deterministic objective selection missing'],
  [/objectives\.filter\(/, 'objective eligibility filtering missing'],
  [/dependenciesMet\(obj\)/, 'objective dependency enforcement missing'],
  [/state\.failed/, 'durable failure state missing'],
  [/structured-search-replace-v4/, 'current edit protocol marker missing'],
  [/progress\[obj\.id\]/, 'incremental objective progress missing'],
  [/temperature:\s*0/, 'deterministic model setting missing'],
  [/npm.*run.*build/, 'independent build verification missing'],
];
for (const [pattern, message] of required) if (!pattern.test(feature)) failures.push(message);
if (/git.*reset.*--hard|git.*clean.*-f/.test(feature)) failures.push('feature engineer must never wholesale-reset or clean the working tree');
if (/completed\.add\(obj\.id\)/.test(feature)) failures.push('one successful increment must not permanently complete an objective');
try {
  execFileSync(process.execPath, ['scripts/autobot/repository-intelligence.mjs'], { cwd: root, stdio: 'inherit' });
} catch {
  failures.push('repository intelligence builder failed during contract verification');
}
const mapPath = path.join(root, 'builder/working/repository-map.json');
if (!fs.existsSync(mapPath)) failures.push('repository intelligence cache missing after refresh');
if (fs.existsSync(mapPath)) {
  try {
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    if (map.version !== 1 || !Array.isArray(map.files) || !map.byPath) failures.push('repository intelligence schema invalid');
    if (!map.files.length) failures.push('repository intelligence contains no source files');
  } catch { failures.push('repository intelligence cache is invalid JSON'); }
}
if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log('AutoBot safety contract v3 PASS: scoped agent tools, bounded retries, dependency-aware selection, incremental progress, repository intelligence, and protected edit scope present.');
