#!/usr/bin/env node
/** Create a concise, durable summary for periodic monitoring and review. */
import fs from 'node:fs/promises';

const read = async p => { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return null; } };
const checkpoint = await read('builder/working/deterministic-autobot.json');
const evidence = await read('builder/working/deterministic-autobot-evidence.json');
const live = await read('builder/monitor/live-state.json');
const summary = {
  generatedAt: new Date().toISOString(),
  status: checkpoint?.status || live?.status || 'unknown',
  objectiveId: checkpoint?.objectiveId || live?.objectiveId || null,
  currentTask: checkpoint?.currentTask || live?.currentTask || null,
  completedUnits: checkpoint?.completed?.length || 0,
  totalUnits: checkpoint?.totalUnits || 0,
  lastVerifiedTask: checkpoint?.lastVerifiedTask || null,
  blockedTask: checkpoint?.blockedTask || null,
  error: checkpoint?.error || null,
  files: live?.files || [],
  evidenceUnits: evidence?.units?.length || 0,
  heartbeatAt: live?.updatedAt || null,
  reviewRequired: true,
  autoMerge: false,
  autoDeploy: false
};
await fs.mkdir('builder/working', { recursive: true });
await fs.writeFile('builder/working/run-summary.json', JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
