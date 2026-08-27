#!/usr/bin/env node
/** Build a compact human-review manifest from durable run evidence. */
import fs from 'node:fs/promises';

const readJson = async p => { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return null; } };
const checkpoint = await readJson('builder/working/deterministic-autobot.json');
const evidence = await readJson('builder/working/deterministic-autobot-evidence.json');
const patternReport = await readJson('builder/learning/pattern-report.json');
const manifest = {
  generatedAt: new Date().toISOString(),
  status: checkpoint?.status || 'unknown',
  objectiveId: checkpoint?.objectiveId || null,
  currentTask: checkpoint?.currentTask || null,
  completedTasks: checkpoint?.completed || [],
  evidence: evidence?.units || [],
  learningSignals: patternReport?.recurringSignals || [],
  humanDecisionRequired: true,
  automaticMerge: false,
  automaticDeployment: false
};
await fs.mkdir('builder/reviews', { recursive: true });
await fs.writeFile('builder/reviews/review-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ status: 'review-manifest-ready', objectiveId: manifest.objectiveId, completed: manifest.completedTasks.length, evidenceUnits: manifest.evidence.length }, null, 2));
