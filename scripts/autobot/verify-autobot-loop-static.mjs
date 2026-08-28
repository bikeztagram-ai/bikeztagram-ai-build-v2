import fs from 'node:fs';
const workflow=fs.readFileSync('.github/workflows/autonomous-builder-v3-gemini-free.yml','utf8');
for(const token of ['workflow_dispatch','strategic-planning-gate.mjs','long-run-executor.mjs','quality-feedback-runtime.mjs','pr-quality-gate-runtime.mjs'])if(!workflow.includes(token))throw new Error(`Workflow missing ${token}`);
if(/GEMINI_API_KEY|AUTOBOT_AI_MODEL/i.test(workflow))throw new Error('Forbidden external AI configuration found');
console.log('PASS static AutoBot V3 workflow checks');
