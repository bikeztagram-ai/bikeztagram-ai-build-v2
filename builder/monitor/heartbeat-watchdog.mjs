#!/usr/bin/env node
/** Fail when live state is stale beyond the configured heartbeat window. */
import fs from 'node:fs';

const file = process.env.BUILDER_LIVE_STATE || 'builder/monitor/live-state.json';
const maxAge = Number(process.env.BUILDER_HEARTBEAT_MAX_AGE_MS || 300000);
if (!fs.existsSync(file)) throw new Error('Live state is missing');
const state = JSON.parse(fs.readFileSync(file, 'utf8'));
const timestamp = Date.parse(state.updatedAt || state.timestamp || '');
if (!Number.isFinite(timestamp)) throw new Error('Live state has no valid timestamp');
const age = Date.now() - timestamp;
const result = { status: age <= maxAge ? 'healthy' : 'stale', ageMs: age, maxAgeMs: maxAge, runId: state.runId || null, currentTask: state.currentTask || null, updatedAt: state.updatedAt || state.timestamp };
console.log(JSON.stringify(result, null, 2));
if (age > maxAge) process.exit(2);
