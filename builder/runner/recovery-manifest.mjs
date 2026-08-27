#!/usr/bin/env node
/** Persist a bounded recovery decision so resumed runs retain failure context. */
import fs from 'node:fs/promises';

const manifest = {
  version: 1,
  batchId: process.env.BUILDER_BATCH_ID || null,
  objectiveId: process.env.BUILDER_OBJECTIVE || null,
  taskId: process.env.BUILDER_CURRENT_TASK || null,
  category: process.env.BUILDER_FAILURE_CATEGORY || null,
  attempt: Number(process.env.BUILDER_REPAIR_ATTEMPT || 0),
  action: process.env.BUILDER_RECOVERY_ACTION || 'hard-stop',
  checkpoint: 'builder/working/deterministic-autobot.json',
  createdAt: new Date().toISOString()
};
await fs.mkdir('builder/working/recovery', { recursive: true });
const key = `${manifest.batchId || 'unknown'}-${Date.now()}`.replace(/[^a-zA-Z0-9._-]/g, '_');
await fs.writeFile(`builder/working/recovery/${key}.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
