#!/usr/bin/env node
/** Dependency and progress contract for the canonical repository-aware feature brain. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const raw = JSON.parse(read('builder/brain/feature-objectives.json'));
const objectives = raw.objectives || raw;
const ids = new Set(objectives.map((o) => o.id));
const brain = read('builder/runner/repository-aware-feature-brain.mjs');
const map = JSON.parse(read('builder/working/repository-map.json'));
const known = new Set((map.files || []).map((f) => f.path));

for (const obj of objectives) {
  if (!obj.id || !Array.isArray(obj.files) || !obj.files.length) failures.push(`${obj.id || 'unknown'} has invalid objective scope`);
  for (const file of obj.files || []) if (!known.has(file)) failures.push(`${obj.id} references missing repository file ${file}`);
  for (const dep of obj.dependsOn || []) {
    if (!ids.has(dep)) failures.push(`${obj.id} references missing dependency ${dep}`);
    if (dep === obj.id) failures.push(`${obj.id} depends on itself`);
  }
}
function visit(id, stack = new Set()) {
  if (stack.has(id)) { failures.push(`dependency cycle detected at ${id}`); return; }
  const next = new Set(stack); next.add(id);
  const obj = objectives.find((o) => o.id === id);
  for (const dep of obj?.dependsOn || []) visit(dep, next);
}
for (const obj of objectives) visit(obj.id);

for (const [label, pattern] of [
  ['dependency gate', /function\s+deps\s*\(/],
  ['deterministic objective selection', /function\s+choose\s*\(/],
  ['incremental progress', /progress\[o\.id\]/],
  ['persistent failure state', /state\.failed/],
  ['real-file objective filtering', /objectiveFiles\(o\)/],
  ['objective context', /objectiveContext\(o\)/],
]) if (!pattern.test(brain)) failures.push(`feature brain missing ${label}`);

if (failures.length) { console.error(failures.map((f) => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log(`AutoBot dependency contract PASS: ${objectives.length} objectives, ${objectives.reduce((n, o) => n + (o.dependsOn || []).length, 0)} dependency edges, no cycles, existing scoped files, dependency-aware progress.`);
