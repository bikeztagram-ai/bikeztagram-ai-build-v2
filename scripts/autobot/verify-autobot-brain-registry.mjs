#!/usr/bin/env node
/** Verify that AutoBot's roadmap, feature objective registry, task library and active queue agree. */
import fs from 'node:fs';

const root=process.cwd();
const readJson=p=>JSON.parse(fs.readFileSync(`${root}/${p}`,'utf8'));
const roadmap=readJson('builder/brain/roadmap.json');
const objectives=readJson('builder/brain/feature-objectives.json');
const tasks=readJson('builder/brain/task-library.json');
const queue=readJson('config/autonomous-builder-queue.json');
const failures=[];
const featureObjectiveIds=new Set((objectives.objectives||[]).map(item=>item.id));
const roadmapIds=new Set((roadmap.objectives||[]).map(item=>item.id));
const knownObjectiveIds=new Set([...featureObjectiveIds,...roadmapIds]);
for(const task of tasks.tasks||[])if(task.objectiveId&&!knownObjectiveIds.has(task.objectiveId))failures.push(`task ${task.id} references unknown objective ${task.objectiveId}`);
const director=objectives.objectives?.find(item=>item.id==='director-intelligence');
if(!director)failures.push('director-intelligence is not registered in feature-objectives.json even though its Aider task chain requires feature-engine scheduling');
if(director&&!director.files.includes('src/director.js'))failures.push('director-intelligence scope is missing src/director.js');
if(director&&!director.files.includes('src/aiEditPlanner.js'))failures.push('director-intelligence scope is missing src/aiEditPlanner.js');
const roadmapDirector=roadmap.objectives?.find(item=>item.id==='director-intelligence');
if(!roadmapDirector)failures.push('roadmap is missing director-intelligence');
const batch103=queue.batches?.find(item=>item.id==='batch-103');
if(!batch103)failures.push('active queue is missing batch-103 director story intelligence');
if(batch103&&/Gemini|Google generative/i.test(JSON.stringify(batch103)))failures.push('active batch-103 contains removed provider wording');
for(const batch of queue.batches||[])if(batch.status!=='rejected'&&/Gemini|Google generative/i.test(JSON.stringify(batch)))failures.push(`active queue batch ${batch.id} contains removed provider wording`);
if(failures.length){console.error(failures.map(f=>`FAIL: ${f}`).join('\n'));process.exit(1);}
console.log(`AutoBot brain registry PASS: roadmap=${roadmapIds.size} featureObjectives=${featureObjectiveIds.size} tasks=${(tasks.tasks||[]).length} knownObjectives=${knownObjectiveIds.size} director=${Boolean(director)} batch103=${Boolean(batch103)}`);
