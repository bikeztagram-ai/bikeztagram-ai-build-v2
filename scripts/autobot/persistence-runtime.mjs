#!/usr/bin/env node
/** Integrate the durable project snapshot/recovery layer into the real App lifecycle. */
import fs from 'node:fs';
const file = 'src/App.jsx';
let app = fs.readFileSync(file, 'utf8');
if (!app.includes("from './projectPersistence.js'")) {
  app = app.replace("import React,{useState} from 'react';", "import React,{useEffect,useState} from 'react';\nimport {createProjectSnapshot,loadProject,restoreSources,saveProject} from './projectPersistence.js';");
}
const marker = " const busy=loading||rendering;const isSingle=files.length===1;const isVideo=isSingle&&files[0]?.type?.startsWith('video/');";
if (!app.includes(marker)) throw new Error('App lifecycle marker not found; refusing blind persistence edit.');
if (!app.includes('BIKEZTAGRAM_PERSISTENCE_LIFECYCLE')) {
  const lifecycle = `\n /* BIKEZTAGRAM_PERSISTENCE_LIFECYCLE */\n useEffect(()=>{const restored=loadProject();if(restored.ok&&restored.snapshot){setPrompt(restored.snapshot.creativeBrief||DEFAULT_PROMPT);setAnalysis(restored.snapshot.analysis||null);setPlan(restored.snapshot.plan||null);setProductionPlan(restored.snapshot.productionPlan||null);setSoundtrack(restored.snapshot.soundtrack||null);setExportInfo(restored.snapshot.exportInfo||null);setSources(restoreSources(restored.snapshot.sources||[]));setStatus(restored.recovered?'♻️ Recovered the last valid project snapshot.':'✅ Project restored. Re-select missing local media before rendering.');}},[]);\n useEffect(()=>{if(!prompt&&!analysis&&!plan&&!productionPlan&&!sources.length)return;saveProject(createProjectSnapshot({prompt,sources,analysis,plan,productionPlan,soundtrack,exportInfo,editorState:{status,stage,autoCaptions}}));},[prompt,sources,analysis,plan,productionPlan,soundtrack,exportInfo,status,stage,autoCaptions]);\n`;
  app = app.replace(marker, marker + lifecycle);
}
fs.writeFileSync(file, app);
console.log('[autobot] Project persistence lifecycle integrated into App.jsx.');
