import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const productionRoots=[path.join(root,'src'),path.join(root,'api')];
const banned=['@google/genai','GoogleGenAI','gemini-','/api/analyse-library','/api/analyse-image','/api/analyse','/api/captions'];
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','dist'].includes(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(/\.(js|jsx|mjs|ts|tsx)$/.test(entry.name))files.push(full);}}
productionRoots.forEach(walk);
const hits=[];
for(const file of files){const text=fs.readFileSync(file,'utf8');for(const token of banned){if(text.includes(token))hits.push(`${path.relative(root,file)} contains retired runtime token: ${token}`);}}
const allow=path.join(root,'src','noGeminiRuntimePolicy.js');
const filtered=hits.filter((hit)=>!hit.startsWith('src/noGeminiRuntimePolicy.js'));
if(filtered.length){console.error(filtered.join('\n'));process.exit(1);}console.log(`Gemini-free production guard: PASS (${files.length} production files scanned)`);
