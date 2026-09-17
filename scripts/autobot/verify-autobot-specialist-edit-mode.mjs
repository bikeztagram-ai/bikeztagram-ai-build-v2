#!/usr/bin/env node
import fs from 'node:fs';
const brain=fs.readFileSync('builder/runner/aider-feature-brain.mjs','utf8');
if(!brain.includes("`--edit-format=${specialist?'diff':'whole'}`")) throw new Error('specialist Aider must use compact diff edit format');
if(!brain.includes("'--no-auto-commits'")) throw new Error('Aider auto-commit safety flag missing');
if(!brain.includes("'--no-dirty-commits'")) throw new Error('Aider dirty-commit safety flag missing');
if(!brain.includes('preservedSpecialistChanges')) throw new Error('specialist candidate preservation missing');
console.log('PASS: specialist Aider uses diff mode and preserves safety/candidate contracts');
