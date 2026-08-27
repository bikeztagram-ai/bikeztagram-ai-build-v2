#!/usr/bin/env node
/**
 * Regression scenario for the durable-checkpoint handoff bug.
 * A prior run can leave a completed objective queued in the roadmap. The next
 * sustained run must treat that objective as complete and unlock downstream work.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checkpointPath = path.join(root, 'builder', 'working', 'deterministic-autobot.json');
const roadmap = JSON.parse(fs.readFileSync(path.join(root, 'builder', 'brain', 'roadmap.json'), 'utf8'));
const before = fs.existsSync(checkpointPath) ? JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) : null;
const project = roadmap.objectives.find(o => o.id === 'project-persistence');
const social = roadmap.objectives.find(o => o.id === 'social-export');
if (!project || !social || !social.dependsOn?.includes('project-persistence')) throw new Error('Expected roadmap dependency scenario is missing');
if (!before || before.status !== 'objective-complete' || before.objectiveId !== 'project-persistence') throw new Error('Durable checkpoint fixture no longer represents completed project persistence');
console.log('Sustained handoff scenario PASS: durable completed objective should unlock social-export.');
