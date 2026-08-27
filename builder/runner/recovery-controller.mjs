#!/usr/bin/env node
/** Decide how a resumable run should continue after interruption. */
import fs from 'node:fs';

const checkpointPath = 'builder/working/deterministic-autobot.json';
const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
const status = checkpoint.status || 'unknown';
const action = status === 'checkpointed' ? 'resume-from-checkpoint'
  : status === 'blocked' ? 'repair-required'
  : status === 'objective-complete' ? 'review'
  : status === 'idle' ? 'select-next-objective'
  : 'inspect-before-resume';
const result = {
  version: 1,
  action,
  objectiveId: checkpoint.objectiveId || null,
  currentTask: checkpoint.currentTask || checkpoint.blockedTask || null,
  completed: checkpoint.completed || [],
  safeToResume: action === 'resume-from-checkpoint' || action === 'select-next-objective',
  generatedAt: new Date().toISOString()
};
console.log(JSON.stringify(result, null, 2));
if (action === 'repair-required' || action === 'inspect-before-resume') process.exit(2);
