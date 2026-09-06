#!/usr/bin/env node
/** Formatting-tolerant AutoBot safety contract for the repository-aware feature brain. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const failures=[];
const feature=read('builder/runner/feature-brain.mjs');
const required=[[/format\s*:\s*editSchema/,'feature engineer must use structured model output'],[/structured-line-edits-v1/,'legacy safety protocol marker missing'],[/maxAttemptsPerFeature/,'bounded feature attempts missing'],[/resetFailedEdits/,'failed-edit recovery missing'],[/out-of-scope file/,'edit scope guard missing'],[/overlapping edits|multiple edits in one file/,'edit overlap guard missing'],[/function\s+choose\s*\(/,'deterministic objective selection missing'],[/objectives\.filter\(/,'objective eligibility filtering missing'],[/dependenciesMet\(obj\)/,'objective dependency enforcement missing'],[/state\.failed/,'durable failure state missing'],[/structured-search-replace-v[23]/,'current structured edit protocol missing']];
for(const [pattern,message] of required)if(!pattern.test(feature))failures.push(message);
if(!fs.existsSync(path.join(root,'scripts/autobot/repository-intelligence.mjs')))failures.push('repository intelligence builder missing');
if(failures.length){console.error(failures.map(f=>`FAIL: ${f}`).join('\n'));process.exit(1)}
console.log('AutoBot safety contract v3 PASS: formatting-tolerant structured editing, bounded recovery, dependency-aware selection, repository intelligence, protected edit scope, and current protocol present.');
