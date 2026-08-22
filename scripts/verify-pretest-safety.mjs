import assert from 'node:assert/strict';
import fs from 'node:fs';
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
assert.equal(pkg.private,true);
assert.ok(pkg.scripts['verify:integration']);
assert.ok(pkg.dependencies['@vercel/blob']);
assert.match(pkg.dependencies['@vercel/blob'],/^\^2\.8/);
assert.ok(!pkg.scripts['deploy']);
console.log('Pre-test safety contract: PASS');
