#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const policy=JSON.parse(fs.readFileSync(path.join(root,'builder/brain/product-priority-policy.json'),'utf8'));
const roadmapPath=path.join(root,'builder/working/roadmap.json');
const evidencePath=path.join(root,'builder/reports/self-improvement.json');
const roadmap=fs.existsSync(roadmapPath)?JSON.parse(fs.readFileSync(roadmapPath,'utf8')):{objectives:[]};
const evidence=fs.existsSync(evidencePath)?JSON.parse(fs.readFileSync(evidencePath,'utf8')):{};
const weights=policy.categoryWeights;
const patterns={render_quality:/render|export|transition|motion|zoom|pan|ffmpeg|video/i,director_intelligence:/director|select|shot|brief|creative|intent|treatment|decision/i,storytelling:/story|narrative|hook|reveal|action|hero|pacing|continuity/i,audio:/audio|music|beat|sound|rhythm/i,mobile_ux:/mobile|android|pwa|touch|responsive|ux|ui/i,reliability:/error|failure|retry|timeout|validation|qa|test|regression/i,tooling:/workflow|autobot|telemetry|logging|observability/i,housekeeping:/docs|cleanup|refactor|chore/i};
const category=text=>Object.entries(patterns).find(([,rx])=>rx.test(text))?.[0]||'housekeeping';
const score=o=>{const text=`${o.id||''} ${o.title||''} ${o.description||''}`;const cat=category(text);let s=weights[cat]||0;if(/no.?op|duplicate|placeholder|cosmetic/i.test(text))s-=80;if(o.verified===true)s-=100;if(o.blocked===true)s-=50;if(evidence.lowProductionYield||evidence.highNoOpRate)s+=cat==='tooling'?5:15;return {...o,category:cat,priorityScore:s};};
const candidates=(roadmap.objectives||[]).filter(o=>o.status==='queued'||o.status==='ready').map(score).sort((a,b)=>b.priorityScore-a.priorityScore||String(a.id).localeCompare(String(b.id)));
process.stdout.write(JSON.stringify({generatedAt:new Date().toISOString(),provider:'deterministic-local',policyVersion:policy.version,selected:candidates[0]||null,candidates:candidates.slice(0,10)},null,2)+'\n');
