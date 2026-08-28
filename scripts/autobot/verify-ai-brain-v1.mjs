#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflow = fs.readFileSync(path.join(root, '.github/workflows/autonomous-builder-v2.yml'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(workflow.includes('Run AI engineering brain'), 'workflow must run the AI brain');
assert(workflow.includes('GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}'), 'workflow must source the API key from GitHub secrets');
assert(workflow.includes('AUTOBOT_AI_MODEL: gemini-3.7-flash'), 'workflow must use the intended model');
assert(workflow.includes('verify-ai-engineering-brain.mjs'), 'workflow must verify the AI brain contract');
assert(workflow.includes('deterministic implementation and verification remain authoritative'), 'PR handoff must preserve deterministic authority');
console.log('[autobot] AI brain V1 integration contracts passed.');
