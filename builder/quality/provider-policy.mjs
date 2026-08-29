#!/usr/bin/env node
/** AutoBot must remain local-first and must never silently fall back to a paid AI API. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const protectedBuilderRoots = ['builder/runner', 'builder/brain', 'builder/quality', 'scripts'];
const forbiddenRuntimePatterns = [
  /OpenAI Codex/i,
  /gpt-5\.6-terra/i,
  /Gemini CLI builder/i,
  /GEMINI_API_KEY.*fetch/i
];
const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(mjs|js|sh|yml|yaml|json)$/.test(entry.name)) files.push(full);
  }
}
for (const rootDir of protectedBuilderRoots) walk(path.join(root, rootDir));
const violations = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of forbiddenRuntimePatterns) if (pattern.test(text)) violations.push(`${path.relative(root,file)} matches ${pattern}`);
}
if (violations.length) {
  console.error('[autobot] PROVIDER POLICY VIOLATION');
  console.error(violations.join('\n'));
  process.exit(2);
}
console.log(`[autobot] Provider policy OK: ${files.length} builder files scanned; local AI only.`);
