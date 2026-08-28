#!/usr/bin/env node
import fs from 'node:fs';
const evidenceFile='builder/working/deterministic-autobot-evidence.json';
let evidence={units:[]};try{evidence=JSON.parse(fs.readFileSync(evidenceFile,'utf8'));}catch{}
const units=evidence.units||[];
const newWork=units.filter(u=>!u.error&&!u.unchangedButVerified);
const failures=units.filter(u=>u.error);
const gate={schemaVersion:1,generatedAt:new Date().toISOString(),deterministic:true,ready:failures.length===0&&newWork.length>0,newProductionUnits:newWork.length,failedUnits:failures.length,reason:failures.length?'verification-failure':newWork.length?'production-work-present':'no-production-work'};
fs.mkdirSync('builder/working',{recursive:true});fs.writeFileSync('builder/working/pr-quality-gate.json',JSON.stringify(gate,null,2)+'\n');
if(!gate.ready)throw new Error(`[autobot] PR quality gate rejected: ${gate.reason}`);
console.log('PASS pre-PR quality gate');
