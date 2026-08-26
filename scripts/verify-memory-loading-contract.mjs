import fs from 'node:fs';
const runner=fs.readFileSync('builder/runner/task-driven.mjs','utf8');
const memory=fs.readFileSync('builder/quality/project-memory.md','utf8');
const lessons=fs.readFileSync('builder/quality/lessons.md','utf8');
const contract=fs.readFileSync('builder/quality/memory-loading.md','utf8');
const checks=[memory.includes('Persistent Project Memory'),contract.includes('Required first reads'),runner.includes('read builder/quality/project-memory.md'),runner.includes('read builder/quality/lessons.md'),runner.includes('config/autonomous-builder-queue.json'),runner.includes('current objective and acceptance criteria remain authoritative'),runner.includes('record it in the durable quality memory'),lessons.includes('green workflow is not proof that the product change is good')];
if(checks.some(x=>!x))process.exit(1);console.log(`Memory loading contract passed: ${checks.length}/${checks.length}`);
