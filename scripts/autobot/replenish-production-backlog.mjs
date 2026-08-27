#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const brain=path.join(root,'builder','brain');
const roadmapPath=path.join(brain,'roadmap.json');
const libraryPath=path.join(brain,'task-library.json');
const reportPath=path.join(brain,'self-improvement-report.json');
const ledgerPath=path.join(brain,'self-improvement-ledger.json');
const roadmap=JSON.parse(fs.readFileSync(roadmapPath,'utf8'));
const library=JSON.parse(fs.readFileSync(libraryPath,'utf8'));
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
const ledger=fs.existsSync(ledgerPath)?JSON.parse(fs.readFileSync(ledgerPath,'utf8')):{waves:[]};
const wave=(ledger.waves?.length||0)+1;
const id=`quality-wave-${String(wave).padStart(3,'0')}`;
if(roadmap.objectives.some(o=>o.id===id)){console.log(`[autobot] ${id} already exists`);process.exit(0);}
const catalog=[
{id:'quality-wave-motion-contract',kind:'production-enhancement',files:['src/director.js'],goal:'Expand deterministic shot-motion intent with explicit subject-aware and role-aware motion metadata while preserving existing motion contracts.',implementation:['node scripts/autobot/quality-wave-motion-runtime.mjs'],verify:['npm run build']},
{id:'quality-wave-transition-contract',kind:'production-enhancement',files:['src/timelineDirector.js'],goal:'Strengthen transition sequencing so consecutive shots avoid repetitive transitions while respecting creative mode and existing explicit direction.',implementation:['node scripts/autobot/quality-wave-transition-runtime.mjs'],verify:['npm run build']},
{id:'quality-wave-plan-evidence',kind:'production-hardening',files:['src/aiEditPlanner.js','src/editQuality.js'],goal:'Expose deterministic edit-quality evidence covering duration, source diversity, motion variety and transition variety without changing successful rendering.',implementation:['node scripts/autobot/quality-wave-evidence-runtime.mjs'],verify:['npm run build']}
];
const priority=8+wave;
roadmap.objectives.push({id,priority,status:'queued',title:`Autonomous production quality wave ${wave}`,queueBatch:null,generated:true,dependsOn:[],acceptance:['substantive production behaviour','build passes','existing rendering path preserved']});
for(const t of catalog) library.tasks.push({...t,id:`${id}:${t.id}`,objectiveId:id,status:'ready'});
ledger.waves=[...(ledger.waves||[]),{id,generatedAt:new Date().toISOString(),sourceRunId:process.env.GITHUB_RUN_ID||'local',reason:report.failureSignatures?.includes('backlog-exhaustion')?'backlog-exhaustion':'scheduled-quality-replenishment',taskIds:catalog.map(t=>`${id}:${t.id}`)}];
fs.writeFileSync(roadmapPath,JSON.stringify(roadmap,null,2)+'\n');
fs.writeFileSync(libraryPath,JSON.stringify(library,null,2)+'\n');
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');
console.log(`[autobot] generated ${id} with ${catalog.length} substantive production tasks.`);
