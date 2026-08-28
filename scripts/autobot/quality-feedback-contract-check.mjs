import fs from 'node:fs';
const report=JSON.parse(fs.readFileSync('builder/working/quality-feedback.json','utf8'));
if(report.schemaVersion!==1||!report.deterministic)throw new Error('Quality feedback contract invalid');
if(!report.summary||typeof report.summary.failed!=='number'||typeof report.summary.noOp!=='number')throw new Error('Quality summary missing');
for(const item of report.priorities){if(typeof item.weight!=='number'||item.weight<0||item.weight>100)throw new Error('Priority weight out of bounds');}
console.log('PASS quality feedback contract');
