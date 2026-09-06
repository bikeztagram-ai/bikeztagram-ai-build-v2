#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const raw=read('builder/brain/feature-objectives.json');
const objectives=JSON.parse(raw).objectives || JSON.parse(raw);
const ids=new Set(objectives.map(o=>o.id));
const failures=[];
for(const o of objectives){
  if(!o.id) failures.push('objective missing id');
  if(!Array.isArray(o.acceptance)||!o.acceptance.length) failures.push(`${o.id||'unknown'} missing acceptance criteria`);
  if(!Array.isArray(o.files)||!o.files.length) failures.push(`${o.id||'unknown'} missing scoped files`);
  for(const dep of o.dependsOn||[]) if(!ids.has(dep)) failures.push(`${o.id} depends on unknown objective ${dep}`);
}
function visit(id,stack=[],seen=new Set()){
  if(stack.includes(id)) return [...stack.slice(stack.indexOf(id)),id];
  if(seen.has(id)) return null;
  seen.add(id);
  const o=objectives.find(x=>x.id===id);
  for(const dep of o?.dependsOn||[]){ const cycle=visit(dep,[...stack,id],seen); if(cycle) return cycle; }
  return null;
}
for(const o of objectives){const cycle=visit(o.id);if(cycle){failures.push(`dependency cycle: ${cycle.join(' -> ')}`);break;}}
if(failures.length){console.error(failures.map(f=>`FAIL: ${f}`).join('\n'));process.exit(1)}
console.log(`Feature objective dependency contract PASS: ${objectives.length} objectives, all dependencies resolvable, no cycles.`);
