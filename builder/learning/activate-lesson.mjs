#!/usr/bin/env node
/** Promote a learning lesson only when its regression evidence is present. */
import fs from 'node:fs/promises';

const lessonPath = process.argv[2];
if (!lessonPath) throw new Error('Usage: node builder/learning/activate-lesson.mjs <lesson.json>');
const lesson = JSON.parse(await fs.readFile(lessonPath, 'utf8'));
if (!lesson.id || !lesson.category || !lesson.observation || !lesson.evidence?.length || !lesson.proposedRule) throw new Error('Invalid lesson: required evidence and rule fields are missing.');
if (!lesson.regressionTest) throw new Error('Lesson cannot activate without a regression test.');
if (lesson.status !== 'approved') throw new Error(`Lesson ${lesson.id} must be approved before activation.`);
lesson.status = 'active';
lesson.activatedAt = new Date().toISOString();
await fs.mkdir('builder/brain/lessons', { recursive: true });
await fs.writeFile(`builder/brain/lessons/${lesson.id}.json`, JSON.stringify(lesson, null, 2) + '\n');
console.log(JSON.stringify({ status: 'active', id: lesson.id }, null, 2));
