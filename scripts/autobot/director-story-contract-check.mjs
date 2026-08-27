#!/usr/bin/env node
import fs from 'node:fs';
const director=fs.readFileSync('src/director.js','utf8');
const planner=fs.readFileSync('src/aiEditPlanner.js','utf8');
if(!director.includes('export function buildDirectorStory'))throw new Error('Director story planner export missing.');
if(!director.includes('directorStoryRole'))throw new Error('Director story role metadata missing.');
if(!planner.includes("import { buildDirectorStory } from './director.js';"))throw new Error('Edit planner is not connected to story planner.');
if(!planner.includes('const storyBeats=buildDirectorStory'))throw new Error('Edit planner does not create story beats.');
if(!planner.includes('storyBeats:storyBeats.map'))throw new Error('Edit plan does not expose story beat evidence.');
console.log('director-story-contract: PASS');
