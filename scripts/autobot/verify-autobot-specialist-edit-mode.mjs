#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const brain=fs.readFileSync('builder/runner/aider-feature-brain.mjs','utf8');
const specialistBuilder=fs.readFileSync('builder/runner/autobot-specialist-builder.mjs','utf8');
execFileSync(process.execPath,['--check','builder/runner/aider-feature-brain.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','builder/runner/autobot-specialist-builder.mjs'],{stdio:'inherit'});
if(!specialistBuilder.includes("process.env.AUTOBOT_FEATURE_PROTOCOL || 'aider-diff-v5'")) throw new Error('specialist builder must default to the live aider-diff-v5 protocol');
if(!specialistBuilder.includes("['config', 'user.name'")) throw new Error('specialist builder must configure an isolated git identity before committing');
if(!brain.includes("const specialistEditFormat=String(process.env.AUTOBOT_SPECIALIST_AIDER_EDIT_FORMAT||'diff')")) throw new Error('specialist Aider edit format must default to diff and remain explicitly configurable');
if(!brain.includes("['diff','udiff','whole']")) throw new Error('specialist Aider edit-format validation missing');
if(!brain.includes('`--edit-format=${specialistEditFormat}`')) throw new Error('specialist Aider must pass the configured edit format');
if(!brain.includes('Return the edit through Aider')) throw new Error('specialist Aider editing instruction missing');
if(!brain.includes("'--no-auto-commits'")||!brain.includes("'--no-dirty-commits'")) throw new Error('Aider safety flags missing');
if(!brain.includes('preservedSpecialistChanges')) throw new Error('candidate preservation missing');
if(!brain.includes('Aider completed without materializing a scoped product change')) throw new Error('no-change guard missing');
console.log('PASS: specialist Aider diff edit contract');
