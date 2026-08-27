#!/usr/bin/env node
/** Persist explicit continuation metadata so long runs survive job boundaries. */
import fs from 'node:fs/promises';
const segment = Number(process.env.BUILDER_SEGMENT || 1);
const segments = Number(process.env.BUILDER_SEGMENTS || 1);
const requested = process.env.REQUESTED_DURATION || null;
const state = {
  version: 1,
  batchId: process.env.BUILDER_BATCH_ID || null,
  requestedDuration: requested,
  segment,
  segments,
  nextSegment: segment < segments ? segment + 1 : null,
  resumeRequired: segment < segments,
  checkpoint: 'builder/working/deterministic-autobot.json',
  evidence: 'builder/working/deterministic-autobot-evidence.json',
  generatedAt: new Date().toISOString()
};
await fs.mkdir('builder/working', { recursive: true });
await fs.writeFile('builder/working/segment-state.json', JSON.stringify(state, null, 2) + '\n');
console.log(JSON.stringify(state, null, 2));
