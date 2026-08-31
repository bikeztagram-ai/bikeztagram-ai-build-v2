import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const banned=['@google/genai','GoogleGenAI','gemini-','/api/analyse-library','/api/analyse-image','/api/analyse','/api/captions'];
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','dist'].includes(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(/\.(js|jsx|mjs|json)$/.test(entry.name))files.push(full);}}
walk(root);
const hits=[];
for(const file of files){const text=fs.readFileSync(file,'utf8');for(const token of banned){if(text.includes(token))hits.push(`${path.relative(root,file)} contains retired runtime token: ${token}`);}}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));if(pkg.dependencies?.['@google/genai']||pkg.devDependencies?.['@google/genai'])hits.push('package.json still declares @google/genai');
if(hits.length){console.error(hits.join('\n'));process.exit(1);}console.log(`Gemini-free runtime guard: PASS (${files.length} source/config files scanned)`);
