#!/usr/bin/env node
import fs from 'node:fs';
const director=fs.readFileSync('src/director.js','utf8');
if(!director.includes('export function buildDirectorStory'))throw new Error('Director story planner export missing.');
if(!director.includes('directorStoryRole'))throw new Error('Director story role metadata missing.');
console.log('director-story-beats-contract: PASS');
