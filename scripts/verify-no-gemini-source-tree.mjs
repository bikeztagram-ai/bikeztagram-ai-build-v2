import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const scan = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') return [];
  return entry.isDirectory() ? scan(full) : [full];
});
const files = scan(root).filter((file) => /\.(js|jsx|mjs|ts|tsx|json)$/.test(file));
const forbidden = files.filter((file) => {
  const text = fs.readFileSync(file, 'utf8');
  return /@google\/genai|GoogleGenAI|GEMINI_API_KEY|gemini-[0-9]/i.test(text);
});
const allowed = new Set([
  path.join(root, 'src', 'noGeminiRuntimePolicy.js'),
  path.join(root, 'scripts', 'verify-no-gemini-runtime.mjs'),
  path.join(root, 'scripts', 'verify-gemini-free-runtime.mjs'),
  path.join(root, 'scripts', 'verify-no-gemini-source-tree.mjs'),
]);
const unexpected = forbidden.filter((file) => !allowed.has(file));
assert.deepEqual(unexpected, [], `Forbidden Gemini references remain in runtime/source files:\n${unexpected.join('\n')}`);
console.log(`no-gemini-source-tree: PASS (${files.length} source files scanned)`);
