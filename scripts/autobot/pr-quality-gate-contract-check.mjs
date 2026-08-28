import fs from 'node:fs';
const gate=JSON.parse(fs.readFileSync('builder/working/pr-quality-gate.json','utf8'));
if(gate.schemaVersion!==1||!gate.deterministic)throw new Error('PR gate contract invalid');
if(typeof gate.ready!=='boolean')throw new Error('PR gate readiness missing');
if(gate.newProductionUnits<0||gate.failedUnits<0)throw new Error('PR gate counts invalid');
console.log('PASS pre-PR quality gate contract');
