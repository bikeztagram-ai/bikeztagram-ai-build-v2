#!/usr/bin/env node
/**
 * Turns repeated recorded failures into reviewable improvement signals.
 * It deliberately proposes; it never mutates builder policy automatically.
 */
import fs from 'node:fs/promises';

const dir = 'builder/learning/outcomes';
let files = [];
try { files = (await fs.readdir(dir)).filter(f => f.endsWith('.json')); } catch { files = []; }
const counts = new Map();
for (const file of files) {
  try {
    const row = JSON.parse(await fs.readFile(`${dir}/${file}`, 'utf8'));
    if (!row.failureCategory) continue;
    counts.set(row.failureCategory, (counts.get(row.failureCategory) || 0) + 1);
  } catch { /* ignore malformed historical records */ }
}
const recurring = [...counts.entries()]
  .filter(([, count]) => count >= 2)
  .map(([category, count]) => ({ category, count, action: 'create-reviewable-improvement-proposal' }));
const result = { status: 'analysis-complete', outcomes: files.length, recurringSignals: recurring, generatedAt: new Date().toISOString() };
await fs.mkdir('builder/learning', { recursive: true });
await fs.writeFile('builder/learning/pattern-report.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
