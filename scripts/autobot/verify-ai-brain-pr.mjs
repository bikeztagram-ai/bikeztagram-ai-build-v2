#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const brain = fs.readFileSync(path.join(root, 'scripts/autobot/ai-engineering-brain.mjs'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/autonomous-builder-v2.yml'), 'utf8');
const assert = (x, m) => { if (!x) throw new Error(m); };
assert(brain.includes('gemini-3.7-flash'), 'missing Gemini 3.7 default');
assert(brain.includes('deterministicFallback'), 'missing fallback');
assert(brain.includes('response_mime_type'), 'missing structured output request');
assert(workflow.includes('Run AI engineering brain'), 'workflow not integrated');
assert(workflow.includes('GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}'), 'secret wiring missing');
assert(workflow.includes('verify-ai-engineering-brain.mjs'), 'contract verification missing');
console.log('[autobot] AI brain PR verification passed.');
