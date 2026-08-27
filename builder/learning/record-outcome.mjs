#!/usr/bin/env node
/** Persist a durable outcome record without changing builder policy. */
import fs from 'node:fs/promises';

const dir = 'builder/learning/outcomes';
await fs.mkdir(dir, { recursive: true });
const outcome = {
  batchId: process.env.BUILDER_BATCH_ID || null,
  objectiveId: process.env.BUILDER_OBJECTIVE || null,
  runId: process.env.GITHUB_RUN_ID || null,
  segment: Number(process.env.BUILDER_SEGMENT || 1),
  status: process.env.BUILDER_OUTCOME_STATUS || 'unknown',
  failureCategory: process.env.BUILDER_FAILURE_CATEGORY || null,
  currentTask: process.env.BUILDER_CURRENT_TASK || null,
  generatedAt: new Date().toISOString()
};
const safe = String(outcome.batchId || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
await fs.writeFile(`${dir}/${safe}-${outcome.runId || Date.now()}.json`, JSON.stringify(outcome, null, 2) + '\n');
console.log(JSON.stringify(outcome, null, 2));
