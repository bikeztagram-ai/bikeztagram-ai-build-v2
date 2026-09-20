#!/usr/bin/env node
/** Verify the analysis-only AutoBot R&D lane and Planner handoff contract. */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const rndFile='builder/runner/autobot-rnd.mjs';
const plannerFile='builder/runner/autobot-parallel-planner.mjs';
const output='builder/working/autobot-rnd-brief.json';
function assert(x,m){if(!x)throw new Error(m);}
const rnd=fs.readFileSync(path.join(root,rndFile),'utf8');
const planner=fs.readFileSync(path.join(root,plannerFile),'utf8');
assert(rnd.includes('autobot-rnd-v1'),'R&D schema must be stable');
assert(rnd.includes('requiresHumanReview:true'),'R&D must require human review for research proposals');
assert(rnd.includes('AUTOBOT_RND_OUTPUT'),'R&D output must be configurable');
assert(rnd.includes('AUTOBOT_RND_MODEL'),'R&D model must be configurable');
assert(rnd.includes('autobot-failure-queue.jsonl'),'R&D must consume durable failure evidence');
assert(rnd.includes('feature-objectives.json'),'R&D must consume the product objective library');
assert(rnd.includes('function sourceEvidence()')&&rnd.includes('excerpt:content.slice(0,3200)'),'R&D must inspect current production source evidence, not only filenames');
assert(!rnd.includes('git commit')&&!rnd.includes('git push'),'R&D must not commit or push');
assert(!rnd.includes('update_file')&&!rnd.includes('create_file'),'R&D must not contain repository write APIs');
assert(planner.includes('autobot-rnd-brief.json'),'Planner must consume the R&D brief');
assert(planner.includes('R&D research'),'Planner prompt must explicitly distinguish R&D evidence from product implementation');
assert(planner.includes('recommendations'),'Planner must consume R&D recommendations');
assert(fs.existsSync(path.join(root,rndFile)),'R&D entrypoint must exist');
execFileSync(process.execPath,['--check',rndFile],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({ok:true,schema:'autobot-rnd-v1',analysisOnly:true,entrypoint:rndFile,planner:plannerFile,output}));
