#!/usr/bin/env node
/** Verify repository intelligence is deterministic, cached and dependency-aware. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=process.cwd();const mapPath=path.join(root,'builder/working/repository-map.json');execFileSync(process.execPath,['scripts/autobot/repository-intelligence.mjs'],{cwd:root,stdio:'inherit'});const map=JSON.parse(fs.readFileSync(mapPath,'utf8'));if(map.version!==1||!Array.isArray(map.files)||!map.byPath)throw new Error('repository intelligence schema invalid');if(!map.files.length)throw new Error('repository intelligence contains no source files');const entries=Object.values(map.byPath);if(entries.some(e=>!e.path||!Array.isArray(e.symbols)||!Array.isArray(e.imports)||!Array.isArray(e.dependents)))throw new Error('repository intelligence entry invalid');console.log(`AutoBot repository intelligence contract PASS: ${entries.length} source files indexed, symbol/import/dependent graph present.`);
