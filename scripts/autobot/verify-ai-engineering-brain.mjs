#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'scripts/autobot/ai-engineering-brain.mjs'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(source.includes('gemini-3.7-flash'), 'AI brain must use the current agentic coding model default');
assert(source.includes('generativelanguage.googleapis.com/v1beta/interactions'), 'AI brain must use the Gemini Interactions API');
assert(source.includes('deterministicFallback'), 'AI brain must have a provider-free fallback');
assert(source.includes('Do not invent files'), 'AI brain must be instructed against invented repository state');
assert(source.includes('maximum 5 priorities'), 'AI brain must bound its plan size');
assert(source.includes('never recommend deleting the working baseline'), 'AI brain must preserve the working baseline');
assert(source.includes('guardrails'), 'AI brain output must include guardrails');
console.log('[autobot] AI engineering brain contract passed.');
