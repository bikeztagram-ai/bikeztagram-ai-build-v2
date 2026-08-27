#!/usr/bin/env node
/** Produce a stable manifest describing a resumable autonomous run. */
import fs from 'node:fs/promises';

const manifest = {
  version: 1,
  runId: process.env.GITHUB_RUN_ID || null,
  batchId: process.env.BUILDER_BATCH_ID || null,
  objectiveId: process.env.BUILDER_OBJECTIVE || null,
  requestedDuration: process.env.REQUESTED_DURATION || null,
  segment: Number(process.env.BUILDER_SEGMENT || 1),
  segments: Number(process.env.BUILDER_SEGMENTS || 1),
  checkpoint: 'builder/working/deterministic-autobot.json',
  evidence: 'builder/working/deterministic-autobot-evidence.json',
  liveState: 'builder/monitor/live-state.json',
  reviewManifest: 'builder/reviews/review-manifest.json',
  createdAt: new Date().toISOString()
};
await fs.mkdir('builder/working', { recursive: true });
await fs.writeFile('builder/working/run-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
