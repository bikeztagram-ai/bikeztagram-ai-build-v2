import assert from 'node:assert/strict';
import fs from 'node:fs';
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const required=['verify:integration','verify:pro-song'];
for(const name of required) assert.equal(typeof pkg.scripts[name],'string',`Missing ${name}`);
assert.ok(pkg.dependencies['@vercel/blob']);
console.log('Test readiness gate: PASS');
