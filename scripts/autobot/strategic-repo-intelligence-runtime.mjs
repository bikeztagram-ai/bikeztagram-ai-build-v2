#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const dirs=['src','api','public','scripts/autobot','builder/brain'];
const files=[];
for(const dir of dirs){const full=path.join(root,dir);if(!fs.existsSync(full))continue;for(const name of fs.readdirSync(full)){if(name.startsWith('.'))continue;files.push(path.join(dir,name).replaceAll('\\','/'));}}
const productionBoundaries=['src/renderer.js','src/director.js','src/aiEditPlanner.js','api/render.js'];
const protectedBoundaries=['.github/workflows','builder/runner','builder/quality','config/autonomous-builder-queue.json'];
const report={schemaVersion:1,generatedAt:new Date().toISOString(),files:files.sort(),productionBoundaries,protectedBoundaries,entryPoints:['src/main.jsx','src/App.jsx'],deterministic:true};
fs.mkdirSync(path.join(root,'builder/working'),{recursive:true});
fs.writeFileSync(path.join(root,'builder/working/repository-intelligence.json'),JSON.stringify(report,null,2)+'\n');
console.log(`[autobot] repository intelligence: ${files.length} top-level entries inventoried.`);
