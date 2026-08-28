#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const roadmap=JSON.parse(fs.readFileSync('builder/brain/roadmap.json','utf8'));
const queued=roadmap.objectives.filter(o=>o.status==='queued');
if(queued.length){console.log(`[autobot] strategic planning gate: ${queued.length} queued objective(s); preserving existing priorities.`);process.exit(0);}
console.log('[autobot] strategic planning gate: backlog exhausted; generating next objective.');
execFileSync(process.execPath,['builder/brain/strategic-planner.mjs'],{stdio:'inherit',env:process.env});
