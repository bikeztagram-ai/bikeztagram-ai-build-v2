#!/usr/bin/env node
/** Stage a deterministic review package; never merge or deploy. */
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const run = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const checkpoint = JSON.parse(await fs.readFile('builder/working/deterministic-autobot.json', 'utf8'));
const evidence = JSON.parse(await fs.readFile('builder/working/deterministic-autobot-evidence.json', 'utf8'));
if (checkpoint.status !== 'objective-complete') throw new Error(`Cannot stage incomplete objective: ${checkpoint.status}`);
const diff = run(['diff', '--stat', 'main...HEAD']);
const files = run(['diff', '--name-status', 'main...HEAD']);
const dir = `builder/reviews/${checkpoint.objectiveId}`;
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(`${dir}/review-package.json`, JSON.stringify({
  version: 1,
  status: 'awaiting-review',
  objectiveId: checkpoint.objectiveId,
  completed: checkpoint.completed,
  evidenceUnits: evidence.units || [],
  diffStat: diff,
  changedFiles: files.split('\n').filter(Boolean),
  automaticMerge: false,
  automaticDeployment: false,
  generatedAt: new Date().toISOString()
}, null, 2) + '\n');
console.log(`[autobot] Review package staged for ${checkpoint.objectiveId}`);
