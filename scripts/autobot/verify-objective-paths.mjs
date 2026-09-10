#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const data=JSON.parse(fs.readFileSync(path.join(root,'builder','brain','feature-objectives.json'),'utf8'));
const objectives=Array.isArray(data?.objectives)?data.objectives:[];
assert.ok(objectives.length>0,'objective list must not be empty');
const ids=new Set(objectives.map(o=>o?.id).filter(Boolean));
const hardProtected=['builder/brain/feature-objectives.json','builder/quality/','.github/workflows/','scripts/autobot/verify-','scripts/autobot/run-production-gate.mjs','package.json'];
const safe=file=>typeof file==='string'&&file.length>0&&!path.isAbsolute(file)&&!file.split('/').includes('..');
const failures=[];
for(const objective of objectives){
  if(!objective?.id)failures.push('objective missing id');
  const files=Array.isArray(objective?.files)?objective.files:[];
  if(objective?.kind!=='self-improvement'&&!files.length)failures.push(`${objective?.id||'unknown'} has no files`);
  for(const file of files){
    if(!safe(file))failures.push(`${objective.id} unsafe file ${file}`);
    else if(!fs.existsSync(path.join(root,file)))failures.push(`${objective.id} missing file ${file}`);
  }
  for(const file of Array.isArray(objective?.allowNewFiles)?objective.allowNewFiles:[]){
    if(!safe(file))failures.push(`${objective.id} unsafe allowNewFile ${file}`);
  }
  for(const dependency of Array.isArray(objective?.dependsOn)?objective.dependsOn:[]){
    if(!ids.has(dependency))failures.push(`${objective.id} references missing dependency ${dependency}`);
  }
  if(objective?.kind==='self-improvement'){
    for(const file of [...files,...(Array.isArray(objective?.allowNewFiles)?objective.allowNewFiles:[])]){
      if(hardProtected.some(prefix=>file===prefix||file.startsWith(prefix)))failures.push(`${objective.id} targets hard-protected path ${file}`);
    }
    const protectedPaths=Array.isArray(objective?.protectedPaths)?objective.protectedPaths:[];
    for(const required of hardProtected)if(!protectedPaths.includes(required))failures.push(`${objective.id} does not explicitly protect ${required}`);
  }
}
if(failures.length){console.error(failures.map(x=>`FAIL: ${x}`).join('\n'));process.exit(1);}
console.log(`Objective path/dependency contract PASS: ${objectives.length} objectives checked; all existing file scopes resolve and all dependencies point to known objectives.`);
