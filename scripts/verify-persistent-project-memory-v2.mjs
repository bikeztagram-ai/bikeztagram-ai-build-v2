import fs from 'node:fs';
const runner=fs.readFileSync('builder/runner/task-driven.mjs','utf8');
const memory=fs.readFileSync('builder/quality/project-memory.md','utf8');
const contract=fs.readFileSync('builder/quality/memory-loading.md','utf8');
for (const [name,ok] of [['memory',memory.includes('Persistent Project Memory')],['contract',contract.includes('Required first reads')],['runner-loads-memory',runner.includes('read builder/quality/project-memory.md')],['runner-loads-lessons',runner.includes('read builder/quality/lessons.md')],['runner-loads-queue',runner.includes('config/autonomous-builder-queue.json')],['objective-authoritative',runner.includes('current objective and acceptance criteria remain authoritative')]]) if(!ok){console.error(`FAIL: ${name}`);process.exit(1)}
console.log('Persistent project memory integration checks passed.');
