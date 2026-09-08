#!/usr/bin/env node
/** Dependency contract for the active structured-Qwen feature selector. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const raw = JSON.parse(read('builder/brain/feature-objectives.json'));
const objectives = raw.objectives || raw;
const ids = new Set(objectives.map((o) => o.id));
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
  const obj = objectives.find((o) => o.id === id);
  for (const dep of obj.dependsOn || []) visit(dep, next);
}
for (const obj of objectives) visit(obj.id);

const fastBrain = read('builder/runner/repository-aware-fast-brain.mjs');
if (!fastBrain.includes('function dependenciesMet')) failures.push('fast brain does not enforce objective dependencies');
if (!fastBrain.includes('function chooseObjective')) failures.push('fast brain does not expose deterministic objective selection');
if (!/objectives\.filter\(\s*\(?o\)?\s*=>\s*dependenciesMet\(o\)/.test(fastBrain)) failures.push('fast brain does not filter unavailable objectives before selection');
if (!fastBrain.includes('state.failed')) failures.push('fast brain does not persist failure state');
if (!fastBrain.includes('state.progress')) failures.push('fast brain does not persist objective progress');

if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log(`AutoBot dependency contract PASS: ${objectives.length} objectives, ${objectives.reduce((n, o) => n + (o.dependsOn || []).length, 0)} dependency edges, no cycles, dependency-aware structured-Qwen selection.`);
