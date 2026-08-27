#!/usr/bin/env node
/** Calculate resumable six-hour execution segments for a requested duration. */
const requested = Number(process.env.REQUESTED_MINUTES || 60);
if (!Number.isFinite(requested) || requested < 15 || requested > 720) throw new Error('Requested duration must be 15..720 minutes');
const maxSegment = 360;
const segments = Math.ceil(requested / maxSegment);
const plan = Array.from({ length: segments }, (_, i) => ({
  segment: i + 1,
  budgetMinutes: Math.min(maxSegment, requested - i * maxSegment),
  resumesFromCheckpoint: i > 0,
  finalSegment: i === segments - 1
}));
console.log(JSON.stringify({ requestedMinutes: requested, segments, plan }, null, 2));
