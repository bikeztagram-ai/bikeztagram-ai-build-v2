#!/usr/bin/env node
import fs from 'node:fs';
const brain=fs.readFileSync('builder/runner/aider-feature-brain.mjs','utf8');
if(!brain.includes("`--edit-format=${specialist?'udiff':'whole'}`")) throw new Error('specialist Aider must use unified diff edit format');
if(!brain.includes('output ONLY a valid unified diff')) throw new Error('specialist unified-diff instruction missing');
if(!brain.includes("'--no-auto-commits'")||!brain.includes("'--no-dirty-commits'")) throw new Error('Aider safety flags missing');
if(!brain.includes('preservedSpecialistChanges')) throw new Error('candidate preservation missing');
if(!brain.includes('Aider completed without materializing a scoped product change')) throw new Error('no-change guard missing');
console.log('PASS: specialist Aider unified-diff contract');
