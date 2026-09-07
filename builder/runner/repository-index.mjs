#!/usr/bin/env node
/**
 * Deterministic repository knowledge index for the autonomous coding brain.
 * No model is involved: Git is the source of truth and the generated index is
 * disposable runtime knowledge, not product state.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const output = path.join(root, 'builder/working/repository-map.json');
const ignored = /^(?:node_modules|dist|\.git|coverage|\.next|\.vercel|builder\/working)(?:\/|$)/;
const sensitive = /(?:^|\/)(?:\.env(?:\..*)?|.*secret.*|.*credential.*|.*token.*|.*key.*)$/i;

const tracked = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
  .filter((file) => !ignored.test(file) && !sensitive.test(file));

const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.css', '.json', '.md', '.yml', '.yaml']);
const files = [];
const directories = new Set();
const imports = [];
const exports = [];

function readText(file) {
  try { return fs.readFileSync(path.join(root, file), 'utf8'); } catch { return ''; }
}
function lineCount(text) { return text ? text.split(/\r?\n/).length : 0; }
function purpose(file, text) {
  const first = text.split(/\r?\n/).slice(0, 8).join(' ').replace(/\s+/g, ' ').trim();
  if (file.startsWith('src/')) return `product source; ${first.slice(0, 180)}`;
  if (file.startsWith('api/')) return `server endpoint; ${first.slice(0, 180)}`;
  if (file.startsWith('builder/')) return `autonomous engineering infrastructure; ${first.slice(0, 180)}`;
  if (file.startsWith('scripts/')) return `verification/tooling; ${first.slice(0, 180)}`;
  if (file.startsWith('.github/')) return `GitHub workflow; ${first.slice(0, 180)}`;
  return first.slice(0, 220) || 'repository file';
}
for (const file of tracked) {
  const parts = file.split('/');
  for (let i = 1; i < parts.length; i += 1) directories.add(parts.slice(0, i).join('/'));
  const ext = path.extname(file).toLowerCase();
  const text = sourceExtensions.has(ext) ? readText(file) : '';
  const record = { path: file, extension: ext || null, bytes: Buffer.byteLength(text || readText(file)), lines: lineCount(text), purpose: purpose(file, text) };
  if (/\.(?:js|jsx|mjs|cjs|ts|tsx)$/.test(file)) {
    record.imports = [...text.matchAll(/(?:from\s*['\"]|import\s*\(\s*['\"]|require\(\s*['\"])([^'\"]+)/g)].slice(0, 30).map((m) => m[1]);
    record.exports = [...text.matchAll(/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)].slice(0, 30).map((m) => m[1]);
    for (const value of record.imports) imports.push({ from: file, value });
    for (const value of record.exports) exports.push({ from: file, value });
  }
  files.push(record);
}
const topLevel = [...new Set(files.map((f) => f.path.split('/')[0]))].sort();
const map = {
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceOfTruth: 'git ls-files; runtime index is disposable',
  summary: { fileCount: files.length, directories: directories.size, topLevel },
  files,
  dependencyEdges: imports,
  exports,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(map, null, 2) + '\n');
console.log(`[autobot] repository knowledge index: ${files.length} files, ${directories.size} directories`);
console.log(`[autobot] repository map: ${output}`);
