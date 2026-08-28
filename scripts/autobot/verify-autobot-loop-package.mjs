import fs from 'node:fs';
const required=['builder/brain/strategic-planner.mjs','builder/brain/strategic-planning-gate.mjs','builder/brain/STRATEGIC_BRAIN_SPEC.md','.github/workflows/autonomous-builder-v3-gemini-free.yml','scripts/autobot/quality-feedback-runtime.mjs','scripts/autobot/pr-quality-gate-runtime.mjs'];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Missing required component: ${file}`);
console.log(`PASS AutoBot V3 package: ${required.length} components present`);
