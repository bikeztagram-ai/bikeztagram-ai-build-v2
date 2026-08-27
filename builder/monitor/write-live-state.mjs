#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'builder', 'monitor');
const statePath = path.join(dir, 'live-state.json');

export function writeLiveState(state) {
  fs.mkdirSync(dir, { recursive: true });
  const now = new Date().toISOString();
  const payload = {
    runId: state.runId || process.env.GITHUB_RUN_ID || 'local',
    status: state.status || 'running',
    objectiveId: state.objectiveId ?? null,
    currentTask: state.currentTask ?? null,
    completedUnits: Number(state.completedUnits || 0),
    totalUnits: Number(state.totalUnits || 0),
    startedAt: state.startedAt || now,
    updatedAt: now,
    heartbeatAt: now,
    message: String(state.message || ''),
    files: Array.isArray(state.files) ? state.files : [],
    verification: Array.isArray(state.verification) ? state.verification : [],
    blockedReason: state.blockedReason ?? null
  };
  fs.writeFileSync(statePath, JSON.stringify(payload, null, 2) + '\n');
  return payload;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeLiveState({
    status: process.argv[2] || 'running',
    objectiveId: process.argv[3] || null,
    currentTask: process.argv[4] || null,
    message: process.argv.slice(5).join(' ') || 'AutoBot heartbeat'
  });
}
