import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const files = [];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','dist'].includes(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(/\.(js|jsx|mjs|json)$/.test(entry.name))files.push(full);}}
walk(root);
const forbidden = /@google\/genai|GoogleGenAI|createUserContent|createPartFromUri/;
const runtimeFiles = files.filter(file=>!file.includes('scripts/verify-gemini-free-runtime.mjs'));
const hits=[];
for(const file of runtimeFiles){const source=fs.readFileSync(file,'utf8');if(forbidden.test(source))hits.push(path.relative(root,file));}
if(fs.existsSync(path.join(root,'api','analyse.js')))hits.push('api/analyse.js');
if(fs.existsSync(path.join(root,'api','analyse-image.js')))hits.push('api/analyse-image.js');
if(fs.existsSync(path.join(root,'api','captions.js')))hits.push('api/captions.js');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(pkg.dependencies?.['@google/genai']||pkg.devDependencies?.['@google/genai'])hits.push('package.json:@google/genai');
if(hits.length){console.error(`Gemini runtime guard failed:\n${[...new Set(hits)].join('\n')}`);process.exit(1);}
console.log('Gemini-free runtime guard: PASS');
