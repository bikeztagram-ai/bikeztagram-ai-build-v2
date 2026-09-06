import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const roots=['src','api','builder','config'];
const forbidden=[/@google\/genai/i,/GEMINI_API_KEY/i,/gemini[-_ ]/i,/generativelanguage\.googleapis\.com/i,/google-genai/i,/gemini-cli/i];
const allowedFiles=new Set(['src/noGeminiRuntimePolicy.js']);
const failures=[];
function walk(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory()){if(!['node_modules','dist','.git'].includes(entry.name))walk(full);continue;}if(!/\.(js|mjs|cjs|ts|tsx|json|yml|yaml|sh|md)$/.test(entry.name))continue;const rel=path.relative(root,full).replaceAll(path.sep,'/');if(allowedFiles.has(rel))continue;const text=fs.readFileSync(full,'utf8');for(const pattern of forbidden){if(pattern.test(text)){failures.push(`${rel}: ${pattern}`);break;}}}}
for(const dir of roots)walk(path.join(root,dir));
if(failures.length){console.error('Active-project Gemini-free guard: FAIL');for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log('Active-project Gemini-free guard: PASS');
