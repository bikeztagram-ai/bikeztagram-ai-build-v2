#!/usr/bin/env node
import fs from 'node:fs';
const brain=fs.readFileSync('builder/runner/aider-feature-brain.mjs','utf8');
if(!brain.includes("const specialistEditFormat=String(process.env.AUTOBOT_SPECIALIST_AIDER_EDIT_FORMAT||'diff')")) throw new Error('specialist Aider edit format must default to diff and remain explicitly configurable');
if(!brain.includes("['diff','udiff','whole']")) throw new Error('specialist Aider edit-format validation missing');
if(!brain.includes('`--edit-format=${specialistEditFormat}`')) throw new Error('specialist Aider must pass the configured edit format');
if(!brain.includes('Return the edit through Aider')) throw new Error('specialist Aider editing instruction missing');
if(!brain.includes("'--no-auto-commits'")||!brain.includes("'--no-dirty-commits'")) throw new Error('Aider safety flags missing');
if(!brain.includes('preservedSpecialistChanges')) throw new Error('candidate preservation missing');
if(!brain.includes('Aider completed without materializing a scoped product change')) throw new Error('no-change guard missing');
console.log('PASS: specialist Aider diff edit contract');
