#!/usr/bin/env node
import fs from 'node:fs';
const brain=fs.readFileSync('builder/runner/aider-feature-brain.mjs','utf8');
if(!brain.includes("`--edit-format=${specialist?'diff':'whole'}`")) throw new Error('specialist Aider must use compact diff edit format');
if(!brain.includes("'--no-auto-commits'")||!brain.includes("'--no-dirty-commits'")) throw new Error('Aider safety flags missing');
if(!brain.includes('preservedSpecialistChanges')) throw new Error('candidate preservation missing');
console.log('PASS: specialist Aider diff-mode contract');
