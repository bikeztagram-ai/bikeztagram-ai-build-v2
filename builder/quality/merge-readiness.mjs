#!/usr/bin/env node
/**
 * Fail-closed merge-readiness gate. It checks evidence and repository state;
 * it never merges or deploys anything.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const checkpointPath = path.join(root, 'builder', 'working', 'deterministic-autobot.json');
const evidencePath = path.join(root, 'builder', 'working', 'deterministic-autobot-evidence.json');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const checkpoint = read(checkpointPath);
const evidence = read(evidencePath);
const failures = [];

if (!['objective-complete'].includes(checkpoint.status)) failures.push(`builder status is ${checkpoint.status}, not objective-complete`);
if (!checkpoint.objectiveId) failures.push('no objective recorded');
if (!evidence.units?.length) failures.push('no verified unit evidence recorded');
if (evidence.units?.some(u => !u.completedAt || (u.verification || []).some(v => v.status !== 'passed'))) failures.push('one or more units lack complete verification evidence');

const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
const protectedPrefixes = ['.github/workflows/', 'builder/runner/', 'builder/quality/', 'builder/monitor/', 'builder/review/', 'config/autonomous-builder-queue.json', 'scripts/prepare-autonomous-batch.mjs'];
for (const line of status.split('\n').filter(Boolean)) {
  const file = line.slice(3).trim();
  if (protectedPrefixes.some(p => file.startsWith(p))) failures.push(`protected infrastructure changed: ${file}`);
}

const report = { status: failures.length ? 'not-ready' : 'ready-for-review', objectiveId: checkpoint.objectiveId, generatedAt: new Date().toISOString(), failures };
fs.mkdirSync(path.join(root, 'builder', 'reviews'), { recursive: true });
fs.writeFileSync(path.join(root, 'builder', 'reviews', 'merge-readiness.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(2);
