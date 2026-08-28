#!/usr/bin/env node
/** Repository guard: Bikeztagram AutoBot must never depend on Gemini. */
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const scanRoots = ['builder','scripts','api','src','.github'].filter(name => fs.existsSync(path.join(root,name)));
const forbidden = [/@google\/gemini-cli/i,/GEMINI_API_KEY/i,/gemini-cli/i,/gemini-resilient/i,/gemini-2\./i];
const ignored = new Set(['node_modules','.git']);
const violations=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(ignored.has(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else{let text;try{text=fs.readFileSync(full,'utf8')}catch{continue}if(forbidden.some(rx=>rx.test(text)))violations.push(path.relative(root,full));}}}
for(const rootName of scanRoots)walk(path.join(root,rootName));
if(violations.length){console.error(`Gemini dependency detected in: ${violations.join(', ')}`);process.exit(1)}
console.log('no-gemini contract: PASS');
