import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const roots=['src','api','builder/runner','config'];
// Detect executable/provider integration, not harmless historical prose such as
// "no Gemini" in comments or capability documentation.
const forbidden=[
  /@google\/genai/i,
  /@google\/generative-ai/i,
  /GEMINI_API_KEY/i,
  /generativelanguage\.googleapis\.com/i,
  /google-genai/i,
  /gemini-cli/i,
  /@google\/gemini-cli/i,
  /GoogleGenAI/i,
  /createUserContent/i,
  /createPartFromUri/i,
  /(?:model|MODEL|provider|PROVIDER)\s*[:=]\s*['"`]gemini(?:[-_][a-z0-9.-]+)?/i
];
const allowedFiles=new Set(['src/noGeminiRuntimePolicy.js']);
const failures=[];
function stripComments(source){
  return source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1');
}
function walk(dir){
  if(!fs.existsSync(dir))return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()){
      if(!['node_modules','dist','.git'].includes(entry.name))walk(full);
      continue;
    }
    if(!/\.(js|mjs|cjs|ts|tsx|json|yml|yaml|sh)$/.test(entry.name))continue;
    const rel=path.relative(root,full).replaceAll(path.sep,'/');
    if(allowedFiles.has(rel))continue;
    const source=stripComments(fs.readFileSync(full,'utf8'));
    for(const pattern of forbidden){
      if(pattern.test(source)){failures.push(`${rel}: ${pattern}`);break;}
    }
  }
}
for(const dir of roots)walk(path.join(root,dir));
if(failures.length){
  console.error('Active-project no-Gemini integration guard: FAIL');
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Active-project no-Gemini integration guard: PASS');
