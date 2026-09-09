#!/usr/bin/env node
/**
 * Runtime performance hardening for the experimental Devstral feature brain.
 * Gives the larger coding model enough inference time while retaining the
 * existing 4096/900 generation contract and all edit/rollback safeguards.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.env.AUTOBOT_HARDENING_ROOT || process.cwd();
const brainPath = path.join(root, 'builder/runner/repository-aware-feature-brain.mjs');
const originalBrain = fs.readFileSync(brainPath, 'utf8');
let brain = originalBrain;

const timeoutOld = "const seconds = Math.min(180, Math.max(45, Math.floor(left() * 60)));";
const timeoutNew = "const seconds = Math.min(300, Math.max(60, Math.floor(left() * 60)));";
if (brain.includes(timeoutOld)) brain = brain.replace(timeoutOld, timeoutNew);
else if (!brain.includes(timeoutNew)) throw new Error('model timeout contract not found; refusing Devstral performance migration');

const optionsOld = "options: { temperature: 0, num_ctx: 4096, num_predict: 900 }";
const optionsApproved = "options: { temperature: 0, num_ctx: 4096, num_predict: 900 }";
if (!brain.includes(optionsOld) && !brain.includes(optionsApproved)) throw new Error('approved model generation options not found; refusing Devstral performance migration');

const turnOld = "const maxTurns = Math.min(10, Math.max(4, Number(process.env.AUTOBOT_AGENT_TURNS || 8)));";
const turnNew = "const maxTurns = Math.min(10, Math.max(4, Number(process.env.AUTOBOT_AGENT_TURNS || 10)));";
if (brain.includes(turnOld)) brain = brain.replace(turnOld, turnNew);
else if (!brain.includes(turnNew)) throw new Error('agent turn contract not found; refusing performance migration');

const modeRequiredOld = "required: ['file', 'search', 'replace'], properties: { file: { type: 'string' }, mode:";
const modeRequiredNew = "required: ['file', 'mode', 'search', 'replace'], properties: { file: { type: 'string' }, mode:";
if (brain.includes(modeRequiredOld)) brain = brain.replace(modeRequiredOld, modeRequiredNew);
else if (!brain.includes(modeRequiredNew)) throw new Error('edit mode contract not found; refusing explicit-mode migration');

const promptOld = 'First inspect one supplied file with read_file. Then STOP INSPECTING and call edit_file with one precise, meaningful improvement.';
const promptNew = 'First inspect one supplied file with read_file. Then STOP INSPECTING and immediately call edit_file with one precise, meaningful improvement. Keep the edit small so the tool call is fast.';
if (brain.includes(promptOld)) brain = brain.replace(promptOld, promptNew);
else if (!brain.includes(promptNew)) throw new Error('execution prompt not found; refusing performance migration');

for (const marker of [
  "const seconds = Math.min(300, Math.max(60, Math.floor(left() * 60)));",
  "options: { temperature: 0, num_ctx: 4096, num_predict: 900 }",
  "const maxTurns = Math.min(10, Math.max(4, Number(process.env.AUTOBOT_AGENT_TURNS || 10)));",
  "required: ['file', 'mode', 'search', 'replace']",
  'Keep the edit small so the tool call is fast.'
]) if (!brain.includes(marker)) throw new Error(`performance marker missing: ${marker}`);

fs.writeFileSync(brainPath, brain);
try {
  execFileSync(process.execPath, ['--check', brainPath], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
} catch (error) {
  fs.writeFileSync(brainPath, originalBrain);
  throw new Error(`performance hardening syntax validation failed; restored brain: ${[error.stdout, error.stderr, error.message].filter(Boolean).join('\n').slice(0, 3000)}`);
}
console.log('[autobot] Devstral performance PASS: bounded 300s model calls, approved 4096 context, 900-token generation budget, up to 10 bounded turns, explicit edit mode, fast small-edit guidance installed; runtime recovery guard remains independently responsible for approved settings.');
