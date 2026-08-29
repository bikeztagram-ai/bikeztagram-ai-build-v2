import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const forbidden = [
  /@google\/genai/i,
  /GEMINI_API_KEY/i,
  /gemini[-_ ]/i,
  /generativelanguage\.googleapis\.com/i
];
const skip = new Set(['node_modules', '.git', 'dist', '.vercel']);
const roots = ['src', 'api', 'builder', 'scripts', 'package.json', 'vercel.json'];
const files = [];
function walk(target) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) return;
  if (fs.statSync(absolute).isFile()) { files.push(absolute); return; }
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    walk(path.join(target, entry.name));
  }
}
for (const target of roots) walk(target);
const hits = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (forbidden.some(rx => rx.test(text))) hits.push(path.relative(root, file));
}
if (hits.length) {
  console.error(`Gemini references found in: ${hits.join(', ')}`);
  process.exit(1);
}
console.log(`Gemini-free verification passed across ${files.length} project files.`);
