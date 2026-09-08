#!/usr/bin/env node
/** Dependency contract for the active repository-aware Qwen agent runtime. */
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

const brain = read('builder/runner/repository-aware-feature-brain.mjs');
const executor = read('builder/runner/repository-aware-fast-executor.mjs');
const index = read('builder/runner/repository-index.mjs');

if (!brain.includes('function dependenciesMet')) failures.push('Qwen agent does not enforce objective dependencies');
if (!brain.includes('function chooseObjective')) failures.push('Qwen agent does not expose deterministic objective selection');
if (!brain.includes('objectives.filter')) failures.push('Qwen agent does not filter unavailable objectives before selection');
if (!brain.includes('state.failed')) failures.push('Qwen agent does not persist failure state');
if (!brain.includes('state.progress')) failures.push('Qwen agent does not persist objective progress');
if (!executor.includes('repository-aware-feature-brain.mjs')) failures.push('sustained executor does not invoke active Qwen agent');
if (executor.includes('repository-aware-fast-brain.mjs')) failures.push('sustained executor still invokes retired structured brain');
if (!index.includes('dependencyEdges')) failures.push('repository index lacks dependency edges');

if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log(`AutoBot dependency contract PASS: ${objectives.length} objectives, ${objectives.reduce((n, o) => n + (o.dependsOn || []).length, 0)} dependency edges, no cycles, dependency-aware repository-aware Qwen selection.`);
