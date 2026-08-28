#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const schema = JSON.parse(fs.readFileSync(path.join(root, 'scripts/autobot/ai-brain-schema.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'scripts/autobot/ai-engineering-brain.mjs'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(schema.properties.priorities.maxItems === 5, 'priority plan must be bounded');
assert(schema.properties.priorities.items.properties.priority.minimum === 0, 'priority lower bound missing');
assert(schema.properties.priorities.items.properties.priority.maximum === 100, 'priority upper bound missing');
assert(source.includes('response_mime_type'), 'AI response must request structured JSON');
assert(source.includes('deterministic-fallback-after-ai-error'), 'AI failure must degrade safely');
assert(source.includes('source: \'gemini\''), 'successful AI plans must identify their source');
console.log('[autobot] AI brain schema contracts passed.');
