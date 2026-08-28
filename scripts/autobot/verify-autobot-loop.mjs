import fs from 'node:fs';
for(const file of ['builder/brain/strategic-planner.mjs','builder/brain/strategic-planning-gate.mjs','scripts/autobot/quality-feedback-runtime.mjs','scripts/autobot/pr-quality-gate-runtime.mjs','.github/workflows/autonomous-builder-v3-gemini-free.yml'])if(!fs.existsSync(file))throw new Error(`Missing AutoBot loop component: ${file}`);
const workflow=fs.readFileSync('.github/workflows/autonomous-builder-v3-gemini-free.yml','utf8');
if(/GEMINI_API_KEY|AUTOBOT_AI_MODEL/i.test(workflow))throw new Error('Gemini dependency found in V3 workflow');
if(!workflow.includes('strategic-planning-gate.mjs')||!workflow.includes('long-run-executor.mjs'))throw new Error('Strategic planning/execution loop incomplete');
console.log('PASS AutoBot loop verification');
