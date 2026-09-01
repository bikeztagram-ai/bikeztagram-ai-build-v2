import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const productionRoots = [path.join(root, 'src'), path.join(root, 'api')];
const scan = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') return [];
  return entry.isDirectory() ? scan(full) : [full];
});
const files = productionRoots.flatMap(scan).filter((file) => /\.(js|jsx|mjs|ts|tsx)$/.test(file));
const forbidden = /@google\/genai|GoogleGenAI|GEMINI_API_KEY|gemini-[0-9]/i;
const allowPolicy = new Set([path.join(root, 'src', 'noGeminiRuntimePolicy.js')]);
const hits = files.filter((file) => !allowPolicy.has(file) && forbidden.test(fs.readFileSync(file, 'utf8')));
assert.deepEqual(hits, [], `Forbidden Gemini references remain in production runtime:\n${hits.join('\n')}`);
console.log(`no-gemini-source-tree: PASS (${files.length} production files scanned)`);
