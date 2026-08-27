#!/usr/bin/env node
import fs from 'node:fs';
const file='src/projectPersistence.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function inspectProjectSnapshot')){
 source += `\nexport function inspectProjectSnapshot(snapshot){\n const validation=validate(snapshot);\n return {valid:validation.ok,reason:validation.ok?null:validation.reason,schemaVersion:snapshot?.schemaVersion??null,sourceCount:Array.isArray(snapshot?.sources)?snapshot.sources.length:0,savedAt:snapshot?.savedAt||null};\n}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added production persistence inspection helper.');
} else console.log('[autobot] Persistence inspection helper already present.');
