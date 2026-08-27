#!/usr/bin/env node
import fs from 'node:fs';
const file='src/projectPersistence.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('export function migrateProjectSnapshot')){
 source += `\nexport function migrateProjectSnapshot(snapshot){\n if(!isObject(snapshot))return {ok:false,reason:'invalid-snapshot',snapshot:null};\n if(snapshot.schemaVersion===SCHEMA_VERSION)return {ok:true,migrated:false,snapshot};\n if(snapshot.schemaVersion===0){return {ok:true,migrated:true,snapshot:{...snapshot,schemaVersion:SCHEMA_VERSION,savedAt:snapshot.savedAt||new Date().toISOString(),sources:Array.isArray(snapshot.sources)?snapshot.sources:[]}};}\n return {ok:false,migrated:false,reason:'unsupported-schema',snapshot:null};\n}\n`;
 fs.writeFileSync(file,source);
 console.log('[autobot] Added deterministic project snapshot migration helper.');
} else console.log('[autobot] Project migration helper already present.');
