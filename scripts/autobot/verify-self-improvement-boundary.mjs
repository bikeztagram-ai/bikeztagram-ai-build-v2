#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const engine = read('builder/runner/aider-feature-brain.mjs');
const objectives = JSON.parse(read('builder/brain/feature-objectives.json'));

assert.match(engine, /allowNewFiles/, 'Aider engine must support explicit new-file allowances');
assert.match(engine, /protectedPaths/, 'Aider engine must define hard protected paths');
assert.match(engine, /assertScope/, 'Aider engine must enforce scope after editing');
assert.match(engine, /--no-auto-commits/, 'Aider must remain non-committing');
assert.match(engine, /--no-dirty-commits/, 'Aider must not commit dirty working trees');
assert.match(engine, /--subtree-only/, 'Aider must retain subtree isolation');
assert.match(engine, /verifyDiff/, 'Aider must run diff verification');
assert.match(engine, /verifyBuild/, 'Aider must run production build verification');
assert.match(engine, /self-improvement/, 'Aider must understand self-improvement objectives explicitly');
assert.match(engine, /protected feature-objectives\.json/, 'Protected objective recovery must remain intact');

const selfObjective = objectives.objectives.find(objective => objective?.kind === 'self-improvement');
assert.ok(selfObjective, 'A self-improvement objective must exist');
assert.ok(Array.isArray(selfObjective.files) && selfObjective.files.includes('builder/runner/aider-feature-brain.mjs'), 'Self-improvement must target the Aider engine explicitly');
assert.ok(Array.isArray(selfObjective.allowNewFiles) && selfObjective.allowNewFiles.length > 0, 'Self-improvement must explicitly allow only named new files');
assert.ok(Array.isArray(selfObjective.protectedPaths) && selfObjective.protectedPaths.length > 0, 'Self-improvement objective must declare protected paths');

console.log('PASS: controlled self-improvement boundary is present and protected.');
