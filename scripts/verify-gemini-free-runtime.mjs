import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const productionRoots = ['src', 'api'];
const allowedPolicyFile = path.join(root, 'src', 'noGeminiRuntimePolicy.js');
const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|jsx|mjs|json)$/.test(entry.name)) files.push(full);
  }
}

for (const relativeRoot of productionRoots) walk(path.join(root, relativeRoot));

const forbidden = /@google\/genai|GoogleGenAI|createUserContent|createPartFromUri|GEMINI_API_KEY|gemini-[0-9]/i;
const hits = [];

for (const file of files) {
  if (file === allowedPolicyFile) continue;
  const source = fs.readFileSync(file, 'utf8');
  if (forbidden.test(source)) hits.push(path.relative(root, file));
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.dependencies?.['@google/genai'] || pkg.devDependencies?.['@google/genai']) hits.push('package.json:@google/genai');

if (hits.length) {
  console.error(`Gemini production-runtime guard failed:\n${[...new Set(hits)].join('\n')}`);
  process.exit(1);
}

console.log('Gemini-free production runtime guard: PASS');
