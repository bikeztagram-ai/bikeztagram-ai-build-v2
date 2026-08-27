#!/usr/bin/env node
/**
 * Central run-duration policy. GitHub-hosted jobs are capped at six hours,
 * so requests above six hours are represented as resumable segments.
 */

const raw = process.env.REQUESTED_DURATION || process.argv[2] || '1h';
const match = /^(15m|30m|1h|2h|3h|4h|5h|6h|7h|8h|9h|10h|11h|12h)$/.exec(raw);
if (!match) throw new Error(`Unsupported AutoBot duration: ${raw}`);

const minutes = raw.endsWith('m') ? Number(raw.slice(0, -1)) : Number(raw.slice(0, -1)) * 60;
const segmentMinutes = 360;
const segments = Math.ceil(minutes / segmentMinutes);
const segment = Number(process.env.BUILDER_SEGMENT || '1');
if (segment < 1 || segment > segments) throw new Error(`Invalid segment ${segment}/${segments}`);

const remaining = minutes - (segment - 1) * segmentMinutes;
const budget = Math.min(segmentMinutes, remaining);

console.log(JSON.stringify({ requested: raw, requestedMinutes: minutes, segments, segment, budgetMinutes: budget }, null, 2));
console.log(`AUTOBOT_REQUESTED_MINUTES=${minutes}`);
console.log(`AUTOBOT_SEGMENTS=${segments}`);
console.log(`AUTOBOT_SEGMENT=${segment}`);
console.log(`AUTOBOT_SEGMENT_MINUTES=${budget}`);
