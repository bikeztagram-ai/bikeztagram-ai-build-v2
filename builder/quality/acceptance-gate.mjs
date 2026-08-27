#!/usr/bin/env node
/** Fail closed unless every declared acceptance criterion is explicitly evidenced. */
import fs from 'node:fs';

const checkpointPath = 'builder/working/deterministic-autobot.json';
const evidencePath = 'builder/working/deterministic-autobot-evidence.json';
const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const criteria = Array.isArray(checkpoint.acceptance) ? checkpoint.acceptance : [];
const completed = new Set((evidence.acceptance || []).filter(x => x.status === 'passed').map(x => x.criterion));
const missing = criteria.filter(c => !completed.has(c));
const result = { status: missing.length ? 'acceptance-failed' : 'acceptance-passed', objectiveId: checkpoint.objectiveId, criteriaCount: criteria.length, passedCount: criteria.length - missing.length, missing, generatedAt: new Date().toISOString() };
console.log(JSON.stringify(result, null, 2));
if (missing.length) process.exit(2);
