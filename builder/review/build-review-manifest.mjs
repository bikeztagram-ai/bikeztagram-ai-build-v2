#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const reviewDir = path.join(root, 'builder', 'review', process.env.BUILDER_RUN_ID || process.env.GITHUB_RUN_ID || 'local');
fs.mkdirSync(reviewDir, { recursive: true });

function git(args) {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }
  catch { return ''; }
}

const changed = git(['status', '--porcelain']).split('\n').filter(Boolean).map(line => ({
  status: line.slice(0, 2).trim(),
  path: line.slice(3).trim()
}));

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  runId: process.env.BUILDER_RUN_ID || process.env.GITHUB_RUN_ID || 'local',
  objectiveId: process.env.BUILDER_OBJECTIVE_ID || null,
  status: process.env.BUILDER_REVIEW_STATUS || 'AWAITING_REVIEW',
  changedFiles: changed,
  commit: git(['rev-parse', 'HEAD']),
  diffStat: git(['diff', '--stat']),
  note: 'This manifest is evidence for review. It is not an approval or deployment instruction.'
};

fs.writeFileSync(path.join(reviewDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(reviewDir, 'diff.patch'), git(['diff']) + '\n');
console.log(JSON.stringify(manifest, null, 2));
