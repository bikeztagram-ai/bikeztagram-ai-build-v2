#!/usr/bin/env node
/** Produce durable, comparable metrics for autonomous builder runs. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'builder', 'working');
const out = path.join(root, 'builder', 'reviews', 'builder-metrics.json');
fs.mkdirSync(path.dirname(out), { recursive: true });

const records = [];
for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
  if (!name.endsWith('.json')) continue;
  try { records.push(JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))); } catch {}
}
const text = records.map(JSON.stringify).join('\n').toLowerCase();
const count = (needle) => (text.match(new RegExp(needle, 'g')) || []).length;
const verified = count('verified');
const failures = count('failed|failure|blocked|rejected');
const repairs = count('repair');
const metrics = {
  version: 1,
  generatedAt: new Date().toISOString(),
  evidenceRecords: records.length,
  proxy: { verifiedMentions: verified, failureMentions: failures, repairMentions: repairs },
  principle: 'Use these as trend signals only; objective-level evidence remains the source of truth.',
  nextAction: failures > verified && failures > 0 ? 'Investigate recurring failures before increasing autonomy.' : 'Continue feature work and collect stronger objective-level evidence.'
};
fs.writeFileSync(out, JSON.stringify(metrics, null, 2) + '\n');
console.log(`[autobot] Builder metrics: evidence=${metrics.evidenceRecords}, verified=${verified}, failures=${failures}, repairs=${repairs}.`);
