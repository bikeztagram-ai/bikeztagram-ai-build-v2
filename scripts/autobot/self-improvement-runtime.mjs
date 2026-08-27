#!/usr/bin/env node
/** Record deterministic quality signals so future AutoBot runs can learn from verified work. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const learningPath = path.join(root, 'builder', 'brain', 'autobot-learning.json');
const reportPath = path.join(root, 'builder', 'working', 'autobot-self-improvement-report.json');
const [objectiveId = 'unknown-objective', taskId = 'unknown-task', outcome = 'unknown', verificationCountRaw = '0'] = process.argv.slice(2);
const verificationCount = Number.parseInt(verificationCountRaw, 10) || 0;

function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }

const learning = readJson(learningPath, { schemaVersion: 1, tasks: {}, objectives: {}, totals: { verified: 0, unchanged: 0, failed: 0 }, updatedAt: null });
learning.schemaVersion = 1;
learning.tasks ||= {};
learning.objectives ||= {};
learning.totals ||= { verified: 0, unchanged: 0, failed: 0 };
const task = learning.tasks[taskId] ||= { objectiveId, verified: 0, unchanged: 0, failures: 0, verificationChecks: 0, qualityDebt: 0, observations: [] };
task.objectiveId = objectiveId;
task.verified += 1;
task.verificationChecks += verificationCount;
if (outcome === 'unchanged') { task.unchanged += 1; task.qualityDebt = Math.min(10, task.qualityDebt + 1); learning.totals.unchanged += 1; task.observations.push('Verified without a working-tree change; inspect production integration before treating future variants as substantive.'); }
else { learning.totals.verified += 1; }
const objective = learning.objectives[objectiveId] ||= { verified: 0, unchanged: 0, failures: 0, qualityDebt: 0, observations: [] };
objective.verified += 1;
objective.qualityDebt = Math.min(20, objective.qualityDebt + (outcome === 'unchanged' ? 1 : 0));
if (outcome === 'unchanged') objective.unchanged += 1;
const observation = outcome === 'unchanged' ? 'Substantive-integration review recommended.' : 'Verified production change recorded.';
if (!objective.observations.includes(observation)) objective.observations.push(observation);
learning.updatedAt = new Date().toISOString();
writeJson(learningPath, learning);
const report = { schemaVersion: 1, objectiveId, taskId, outcome, verificationCount, observation, learningUpdatedAt: learning.updatedAt, nextRunBehaviour: 'Use accumulated qualityDebt as a bounded signal when choosing future objectives; never bypass verification or protected-path rules.' };
writeJson(reportPath, report);
console.log(`[autobot] self-improvement: recorded ${objectiveId}/${taskId} outcome=${outcome}, checks=${verificationCount}, qualityDebt=${objective.qualityDebt}.`);
