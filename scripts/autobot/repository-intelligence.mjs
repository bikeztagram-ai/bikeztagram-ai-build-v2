#!/usr/bin/env node
/** Build a lightweight cached repository intelligence map for the local coding agent. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const outFile = path.join(root, 'builder/working/repository-map.json');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8' });
const sourceExt = /\.(?:js|mjs|cjs|jsx|ts|tsx)$/;
const ignored = /^(?:node_modules|dist|\.git|builder\/working)(?:\/|$)/;

function trackedFiles() {
  return run('git', ['ls-files', '-z']).split('\0').filter(Boolean)
    .filter(p => sourceExt.test(p) && !ignored.test(p));
}

function fingerprint() {
  const h = crypto.createHash('sha256');
  h.update(run('git', ['rev-parse', 'HEAD']).trim());
  for (const p of run('git', ['diff', '--name-only', '--diff-filter=ACM']).split(/\r?\n/).filter(Boolean).sort()) {
    if (fs.existsSync(path.join(root, p))) h.update(p).update(fs.readFileSync(path.join(root, p)));
  }
  return h.digest('hex');
}

function symbols(source) {
  const out = [];
  const patterns = [
    /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g,
    /(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/g
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(source)) && out.length < 80) out.push(m[1]);
  }
  return [...new Set(out)];
}

function imports(source) {
  const out = [];
  const re = /(?:import\s+(?:[\s\S]*?\s+from\s+)?|export\s+(?:[\s\S]*?\s+from\s+)?|import\s*\()\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source))) if (m[1].startsWith('.')) out.push(m[1]);
  return [...new Set(out)];
}

function resolveImport(from, spec) {
  const base = path.normalize(path.join(path.dirname(from), spec));
  const candidates = [base, `${base}.js`, `${base}.mjs`, `${base}.jsx`, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.js')];
  return candidates.find(p => fs.existsSync(path.join(root, p))) || null;
}

const files = trackedFiles();
const fp = fingerprint();
try {
  const previous = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  if (previous.fingerprint === fp) {
    console.log(`[autobot] repository intelligence cache hit: ${files.length} source files`);
    process.exit(0);
  }
} catch {}

const byPath = {};
for (const p of files) {
  const source = fs.readFileSync(path.join(root, p), 'utf8');
  byPath[p] = { path: p, bytes: Buffer.byteLength(source), symbols: symbols(source), imports: imports(source), dependents: [] };
}
for (const entry of Object.values(byPath)) {
  entry.imports = entry.imports.map(spec => ({ spec, resolved: resolveImport(entry.path, spec) }));
}
for (const entry of Object.values(byPath)) {
  for (const dep of entry.imports.map(x => x.resolved).filter(Boolean)) {
    if (byPath[dep] && !byPath[dep].dependents.includes(entry.path)) byPath[dep].dependents.push(entry.path);
  }
}
const map = { version: 1, generatedAt: new Date().toISOString(), fingerprint: fp, files, byPath };
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(map, null, 2) + '\n');
console.log(`[autobot] repository intelligence refreshed: ${files.length} source files, ${Object.values(byPath).reduce((n, x) => n + x.symbols.length, 0)} symbols`);
