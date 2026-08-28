import fs from 'node:fs';
const report=JSON.parse(fs.readFileSync('builder/working/repository-intelligence.json','utf8'));
if(report.schemaVersion!==1||!report.deterministic)throw new Error('Repository intelligence contract invalid');
for(const required of ['src/App.jsx','src/main.jsx'])if(!report.entryPoints.includes(required))throw new Error(`Missing entry point: ${required}`);
for(const boundary of report.protectedBoundaries)if(!boundary)throw new Error('Protected boundary missing');
console.log('PASS strategic repository intelligence contract');
