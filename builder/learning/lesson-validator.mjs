#!/usr/bin/env node
/** Validate candidate lessons are evidence-backed and bounded. */
import fs from 'node:fs/promises';

const file = process.env.LESSON_FILE || 'builder/learning/improvement-proposals.json';
const data = JSON.parse(await fs.readFile(file, 'utf8'));
const proposals = Array.isArray(data.proposals) ? data.proposals : [];
const invalid = proposals.filter(p => !p.id || !p.trigger || p.status !== 'proposed-review-required' || !p.nextAction?.includes('regression'));
const result = { status: invalid.length ? 'invalid-lessons' : 'lessons-valid-for-review', count: proposals.length, invalidIds: invalid.map(p => p.id), generatedAt: new Date().toISOString() };
await fs.writeFile('builder/learning/lesson-validation.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (invalid.length) process.exit(2);
