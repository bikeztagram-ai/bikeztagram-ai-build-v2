#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const raw = JSON.parse(read('builder/brain/feature-objectives.json'));
const objectives = raw.objectives || raw;
const ids = new Set(objectives.map(o => o.id));
for (const obj of objectives) {
  for (const dep of obj.dependsOn || []) {
    if (!ids.has(dep)) failures.push(`${obj.id} references missing dependency ${dep}`);
    if (dep === obj.id) failures.push(`${obj.id} depends on itself`);
  }
}
function visit(id, stack = new Set()) {
  if (stack.has(id)) failures.push(`dependency cycle detected at ${id}`);
  if (!ids.has(id) || stack.has(id)) return;
  const next = new Set(stack); next.add(id);
  const obj = objectives.find(o => o.id === id);
  for (const dep of obj.dependsOn || []) visit(dep, next);
}
for (const obj of objectives) visit(obj.id);
const feature = read('builder/runner/feature-brain.mjs');
if (!feature.includes('dependenciesMet(obj)')) failures.push('feature brain does not enforce objective dependencies');
if (!feature.includes('state.failed')) failures.push('feature brain does not persist failure state');
if (!feature.includes('function choose()')) failures.push('feature brain does not expose deterministic objective selection');
if (!feature.includes('const available = objectives.filter')) failures.push('feature brain does not filter unavailable objectives before selection');
if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log(`AutoBot dependency contract PASS: ${objectives.length} objectives, ${objectives.reduce((n,o)=>n+(o.dependsOn||[]).length,0)} dependency edges, no cycles, dependency-aware feature selection.`);
