#!/usr/bin/env node
import fs from 'node:fs';
const file='src/director.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function rankDirectorCandidates')){
 source += `\nexport function rankDirectorCandidates(candidates=[]){\n if(!Array.isArray(candidates))return [];\n const seen=new Set();\n return [...candidates].sort((a,b)=>{\n  const as=Number(a?.score??a?.directorSelectionScore??0),bs=Number(b?.score??b?.directorSelectionScore??0);\n  const ak=String(a?.subjectRole||a?.subject||a?.mediaIndex||'');\n  const bk=String(b?.subjectRole||b?.subject||b?.mediaIndex||'');\n  const ap=seen.has(ak)?-8:0,bp=seen.has(bk)?-8:0;\n  return (bs+bp)-(as+ap);\n }).map(item=>{const key=String(item?.subjectRole||item?.subject||item?.mediaIndex||'');seen.add(key);return item;});\n}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added quality-aware director candidate ranking helper.');
} else console.log('[autobot] Director diversity helper already present.');
