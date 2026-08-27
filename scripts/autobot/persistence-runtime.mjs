#!/usr/bin/env node
/** Integrate durable project persistence into the real App lifecycle. */
import fs from 'node:fs';

const file = 'src/App.jsx';
let app = fs.readFileSync(file, 'utf8');
const importLine = "import {createProjectSnapshot,loadProject,restoreSources,saveProject} from './projectPersistence.js';";
if (!app.includes(importLine)) {
  const reactImport = /import React,\{useState\} from 'react';/;
  if (!reactImport.test(app)) throw new Error('Current React import contract not found; refusing blind edit.');
  app = app.replace(reactImport, "import React,{useEffect,useState} from 'react';\n" + importLine);
}
if (!app.includes('BIKEZTAGRAM_PERSISTENCE_LIFECYCLE')) {
  const anchor = 'function App(){';
  const at = app.indexOf(anchor);
  if (at < 0) throw new Error('App component anchor not found; refusing blind edit.');
  const insertAt = at + anchor.length;
  const lifecycle = `\n /* BIKEZTAGRAM_PERSISTENCE_LIFECYCLE */\n useEffect(()=>{const restored=loadProject();if(restored.ok&&restored.snapshot){setPrompt(restored.snapshot.creativeBrief||DEFAULT_PROMPT);setAnalysis(restored.snapshot.analysis||null);setPlan(restored.snapshot.plan||null);setProductionPlan(restored.snapshot.productionPlan||null);setSoundtrack(restored.snapshot.soundtrack||null);setExportInfo(restored.snapshot.exportInfo||null);setSources(restoreSources(restored.snapshot.sources||[]));setStatus(restored.recovered?'♻️ Recovered the last valid project snapshot.':'✅ Project restored. Re-select missing local media before rendering.');}},[]);\n useEffect(()=>{if(!prompt&&!analysis&&!plan&&!productionPlan&&!sources.length)return;saveProject(createProjectSnapshot({prompt,sources,analysis,plan,productionPlan,soundtrack,exportInfo,editorState:{status,stage,autoCaptions}}));},[prompt,sources,analysis,plan,productionPlan,soundtrack,exportInfo,status,stage,autoCaptions]);\n`;
  app = app.slice(0, insertAt) + lifecycle + app.slice(insertAt);
}
fs.writeFileSync(file, app);
console.log('[autobot] Project persistence lifecycle integrated into App.jsx.');
