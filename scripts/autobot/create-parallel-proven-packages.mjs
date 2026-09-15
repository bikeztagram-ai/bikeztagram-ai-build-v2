#!/usr/bin/env node
/** Create two explicit, non-overlapping product work packages for the proven Builder. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const data=JSON.parse(fs.readFileSync(path.join(root,'builder','brain','task-library.json'),'utf8'));
const tasks=data.tasks||[];
const a=tasks.find(t=>t.id==='cinematic-shot-motion-contract'&&t.status==='ready');
const b=tasks.find(t=>t.id==='provider-failure-classification'&&t.status==='ready');
if(!a||!b) throw new Error('Required proven-fleet shakedown tasks are missing.');
if((a.dependsOn||[]).length||(b.dependsOn||[]).length) throw new Error('Shakedown tasks must have no task-level dependencies.');
const aFiles=new Set(a.files||[]);
const overlap=(b.files||[]).filter(file=>aFiles.has(file));
if(overlap.length) throw new Error(`Parallel package overlap: ${overlap.join(', ')}`);
const packages=[
  {schemaVersion:1,workerId:'proven-a',objectiveId:a.objectiveId,taskIds:[a.id],tasks:[a],source:'autobot-fleet-package-planner',independent:true},
  {schemaVersion:1,workerId:'proven-b',objectiveId:b.objectiveId,taskIds:[b.id],tasks:[b],source:'autobot-fleet-package-planner',independent:true}
];
for(const p of packages){
  const suffix=p.workerId==='proven-a'?'a':'b';
  const file=path.join(root,'builder','working',`autobot-proven-package-${suffix}.json`);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(p,null,2)+'\n');
}
console.log(JSON.stringify({status:'ready',packages:packages.map(p=>({workerId:p.workerId,taskIds:p.taskIds,files:p.tasks.flatMap(t=>t.files||[])}))},null,2));
