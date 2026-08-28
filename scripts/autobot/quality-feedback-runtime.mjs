#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const evidencePath=path.join(root,'builder/working/deterministic-autobot-evidence.json');
let evidence={units:[]};try{evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'));}catch{}
const units=evidence.units||[];
const failed=units.filter(u=>u.error).map(u=>u.id);
const noOp=units.filter(u=>u.unchangedButVerified).map(u=>u.id);
const improvements=units.filter(u=>!u.error&&!u.unchangedButVerified).map(u=>u.id);
const priorities=[];
if(failed.length)priorities.push({kind:'failure-recovery',weight:100,units:failed});
if(noOp.length)priorities.push({kind:'production-yield',weight:90,units:noOp});
if(!improvements.length)priorities.push({kind:'new-production-work',weight:80,units:[]});
const report={schemaVersion:1,generatedAt:new Date().toISOString(),deterministic:true,priorities,summary:{failed:failed.length,noOp:noOp.length,newProduction:improvements.length}};
fs.mkdirSync(path.join(root,'builder/working'),{recursive:true});
fs.writeFileSync(path.join(root,'builder/working/quality-feedback.json'),JSON.stringify(report,null,2)+'\n');
console.log(`[autobot] quality feedback: ${priorities.length} improvement priorities generated.`);
