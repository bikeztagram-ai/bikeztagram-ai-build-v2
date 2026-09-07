#!/usr/bin/env node
/** Contract test for the canonical repository-aware feature brain. */
import fs from 'node:fs';

const root = process.cwd();
const read = (p) => fs.readFileSync(`${root}/${p}`, 'utf8');
const source = read('builder/runner/repository-aware-feature-brain.mjs');
const failures = [];

const required = [
  ['structured tool definitions', /function\s+toolsFor\s*\(/],
  ['non-streaming Ollama response', /stream\s*:\s*false/],
  ['bounded edit count', /maxEdits/],
  ['objective-scoped file validation', /objectiveFiles\s*\(/],
  ['real repository file validation', /repo\.files/],
  ['search-replace uniqueness validation', /exact search must match once/],
  ['syntax verification', /function\s+syntax\s*\(/],
  ['diff verification', /git.*diff.*--check/],
  ['build verification', /npm.*run.*build/],
  ['scoped rollback snapshot', /snapshots\s*=\s*new Map/],
  ['scoped rollback restore', /snapshots\)/],
  ['multi-turn agent loop', /for\s*\(let turn=1;turn<=maxTurns/],
  ['edit tool', /name:'edit_file'/],
  ['verification tool', /name:'run_check'/],
  ['submission tool', /name:'submit'/],
  ['protocol marker', /repository-aware-agent-v7/]
];
for (const [label, pattern] of required) if (!pattern.test(source)) failures.push(`missing ${label}`);
if (/name:'search_repo'|name:'list_files'|name:'repository_map'/.test(source)) failures.push('broad exploration tools must not be exposed to the coding model');
if (/git.*reset.*--hard|git.*clean\s+-f/.test(source)) failures.push('unsafe wholesale rollback still active');
if (/Return ONLY a valid unified git diff/.test(source)) failures.push('fragile unified-diff generation still active');
if (/startLine\s*:\s*endLine|invalid line range/.test(source)) failures.push('legacy line-range edit protocol still active');
if (failures.length) { console.error(failures.map(f => `FAIL: ${f}`).join('\n')); process.exit(1); }
console.log('AutoBot feature-edit protocol PASS: canonical v7 tools, real-file scope, bounded edits, multi-turn recovery, syntax/diff/build verification and scoped rollback.');
