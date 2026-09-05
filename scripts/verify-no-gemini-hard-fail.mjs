import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../src/', import.meta.url);
const files = fs.readdirSync(root).filter((name) => /\.(js|jsx|ts|tsx)$/.test(name));
const forbidden = /gemini|@google\/genai/i;
const hits = [];
for (const name of files) {
  const source = fs.readFileSync(new URL(name, root), 'utf8');
  if (forbidden.test(source)) hits.push(name);
}
assert.deepEqual(hits, [], `Gemini references remain in src: ${hits.join(', ')}`);
console.log(`no-gemini-hard-fail: PASS (${files.length} source files checked)`);
