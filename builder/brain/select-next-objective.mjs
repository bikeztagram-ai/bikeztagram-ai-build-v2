#!/usr/bin/env node
/** Select the next product objective using durable evidence, dependencies and value.
 * This is deliberately deterministic: the local model may implement the selected
 * objective, but it does not get to rewrite the priority policy at runtime.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const queue = JSON.parse(fs.readFileSync(path.join(root, 'config', 'autonomous-builder-queue.json'), 'utf8'));
const metricsPath = path.join(root, 'builder', 'reviews', 'builder-metrics.json');
const metrics = fs.existsSync(metricsPath) ? JSON.parse(fs.readFileSync(metricsPath, 'utf8')) : {};
const completed = new Set((process.env.AUTOBOT_COMPLETED_OBJECTIVES || '').split(',').filter(Boolean));
const candidates = (queue.batches || []).filter(b => b.objective && !['merged','rejected','skipped'].includes(b.status) && !completed.has(b.id));

const score = (b) => {
  let value = 50;
  if (/cinematic|creative|director|renderer/i.test(b.title)) value += 25;
  if (/reliability|recovery|pwa|export/i.test(b.title)) value += 15;
  if (/self-improvement/i.test(b.title)) value += metrics.proxy?.failures > metrics.proxy?.verified ? 20 : 5;
  if (/batch-10[2-4]/.test(b.id)) value += 10;
  return value;
};
const ranked = candidates.map(b => ({ ...b, priorityScore: score(b) })).sort((a,b) => b.priorityScore-a.priorityScore || a.id.localeCompare(b.id));
const chosen = ranked[0];
const output = { generatedAt: new Date().toISOString(), chosen: chosen ? { id: chosen.id, title: chosen.title, priorityScore: chosen.priorityScore } : null, ranked: ranked.map(x => ({id:x.id,title:x.title,priorityScore:x.priorityScore})), rationale: 'Prioritize substantive user-facing product value, then reliability, with self-improvement elevated when failure evidence indicates it is needed.' };
const out = path.join(root, 'builder', 'reviews', 'next-objective.json');
fs.mkdirSync(path.dirname(out), {recursive:true});
fs.writeFileSync(out, JSON.stringify(output,null,2)+'\n');
console.log(chosen ? `[autobot] Next objective: ${chosen.id} (${chosen.title}) score=${chosen.priorityScore}` : '[autobot] No eligible objective.');
if (!chosen) process.exit(2);
