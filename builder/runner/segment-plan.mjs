#!/usr/bin/env node
/** Calculate resumable execution segments from the single requested duration source. */
const raw = process.env.REQUESTED_DURATION || process.argv[2] || '1h';
const match = /^(15m|30m|1h|2h|3h|4h|5h|6h|7h|8h|9h|10h|11h|12h)$/.exec(raw);
if (!match) throw new Error(`Unsupported AutoBot duration: ${raw}`);

const requested = raw.endsWith('m') ? Number(raw.slice(0, -1)) : Number(raw.slice(0, -1)) * 60;
const maxSegment = 360;
const segments = Math.ceil(requested / maxSegment);
const currentSegment = Number(process.env.BUILDER_SEGMENT || '1');
if (currentSegment < 1 || currentSegment > segments) throw new Error(`Invalid segment ${currentSegment}/${segments}`);

const plan = Array.from({ length: segments }, (_, i) => ({
  segment: i + 1,
  budgetMinutes: Math.min(maxSegment, requested - i * maxSegment),
  resumesFromCheckpoint: i > 0,
  finalSegment: i === segments - 1
}));
console.log(JSON.stringify({ requestedDuration: raw, requestedMinutes: requested, currentSegment, segments, plan }, null, 2));
