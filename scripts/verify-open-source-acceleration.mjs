import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry = fs.readFileSync(new URL('../docs/open-source-acceleration.md', import.meta.url), 'utf8');
for (const name of ['rendiv', 'webmotion', 'openreel-video-editor', 'localcut', 'dvir-drori/daw', 'ai-music/webdaw']) assert.match(registry, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(registry, /license/i);
assert.match(registry, /Gemini-free/i);
console.log('open-source-acceleration: PASS');
