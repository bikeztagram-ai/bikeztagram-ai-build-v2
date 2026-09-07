#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root=process.cwd(),out=path.join(root,'builder/working/repository-map.json');
const ignored=/^(?:node_modules|dist|\.git|coverage|\.next|\.vercel|builder\/working)(?:\/|$)/,sensitive=/(^|\/)(\.env(?:\..*)?|.*(?:secret|credential|token|private).*|.*\.pem)$/i;
const run=(a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}),files=run(['ls-files','-co','--exclude-standard']).split(/\r?\n/).filter(Boolean).filter(f=>!ignored.test(f)&&!sensitive.test(f));
const sourceExt=/\.(?:js|jsx|mjs|cjs|ts|tsx|css|json|md|yml|yaml)$/i,src=files.filter(f=>sourceExt.test(f)),byPath={};
const dirs=new Set(),edges=[],exports=[];
function text(f){try{return fs.readFileSync(path.join(root,f),'utf8')}catch{return''}}
function purpose(f,t){const first=t.split(/\r?\n/).slice(0,6).join(' ').replace(/\s+/g,' ').trim();if(f.startsWith('src/'))return`product source; ${first.slice(0,180)}`;if(f.startsWith('api/'))return`server endpoint; ${first.slice(0,180)}`;if(f.startsWith('builder/'))return`builder infrastructure; ${first.slice(0,180)}`;if(f.startsWith('scripts/'))return`verification/tooling; ${first.slice(0,180)}`;if(f.startsWith('.github/'))return`GitHub workflow; ${first.slice(0,180)}`;return first.slice(0,220)||'repository file'}
function symbols(t){const a=[];for(const r of [/(?:export\s+)?(?:async\s+)?function\s+([\w$]+)/g,/(?:export\s+)?class\s+([\w$]+)/g,/(?:export\s+)?(?:const|let)\s+([\w$]+)\s*=/g]){let m;while((m=r.exec(t))&&a.length<100)a.push(m[1])}return[...new Set(a)]}
function imports(t){const a=[];const r=/(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;let m;while((m=r.exec(t)))if(m[1].startsWith('.'))a.push(m[1]);return[...new Set(a)]}
function resolve(f,s){const b=path.normalize(path.join(path.dirname(f),s));return[b,`${b}.js`,`${b}.mjs`,`${b}.jsx`,`${b}.ts`,`${b}.tsx`,path.join(b,'index.js')].find(p=>fs.existsSync(path.join(root,p)))||null}
for(const f of files){const p=f.split('/');for(let i=1;i<p.length;i++)dirs.add(p.slice(0,i).join('/'));const t=sourceExt.test(f)?text(f):'';const sy=sourceExt.test(f)&&/\.(js|jsx|mjs|cjs|ts|tsx)$/i.test(f)?symbols(t):[],im=sourceExt.test(f)&&/\.(js|jsx|mjs|cjs|ts|tsx)$/i.test(f)?imports(t):[];byPath[f]={path:f,bytes:Buffer.byteLength(t||text(f)),lines:t?t.split(/\r?\n/).length:0,purpose:purpose(f,t),symbols:sy,imports:im.map(x=>({spec:x,resolved:resolve(f,x)})),dependents:[]};for(const x of sy)exports.push({from:f,value:x})}
for(const e of Object.values(byPath))for(const i of e.imports)if(i.resolved&&byPath[i.resolved]){byPath[i.resolved].dependents.push(e.path);edges.push({from:e.path,to:i.resolved,spec:i.spec})}
const fingerprint=crypto.createHash('sha256').update(run(['rev-parse','HEAD']).trim()).update(files.join('\n')).digest('hex');
const map={version:1,generatedAt:new Date().toISOString(),fingerprint,sourceOfTruth:'git tracked repository files; runtime index is disposable',summary:{fileCount:files.length,sourceFileCount:src.length,directories:dirs.size,topLevel:[...new Set(files.map(f=>f.split('/')[0]))].sort()},files:Object.values(byPath),byPath,dependencyEdges:edges,exports};fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(map,null,2)+'\n');console.log(`[autobot] repository knowledge index: ${files.length} files, ${src.length} source files, ${edges.length} dependency edges`);
