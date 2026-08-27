#!/usr/bin/env node
/** Convert recurring learning signals into review-only proposals. */
import fs from 'node:fs/promises';

const reportPath = 'builder/learning/pattern-report.json';
let report;
try { report = JSON.parse(await fs.readFile(reportPath, 'utf8')); } catch { report = { recurringSignals: [] }; }
const proposals = (report.recurringSignals || []).map(signal => ({
  id: `improve-${String(signal.category).toLowerCase()}`,
  trigger: signal.category,
  occurrences: signal.count,
  status: 'proposed-review-required',
  rule: 'Do not weaken a quality gate. Add a regression test before activation.',
  nextAction: 'Create isolated self-improvement change and run builder regression suite.'
}));
const output = { generatedAt: new Date().toISOString(), proposals };
await fs.writeFile('builder/learning/improvement-proposals.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
