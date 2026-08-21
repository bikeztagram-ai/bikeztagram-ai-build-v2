import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=readFileSync(new URL('../docs/MODEL_SELECTION_MATRIX_V1.md',import.meta.url),'utf8');
for(const term of ['Stable Audio 3.0','Stable Audio Open Small','MusicGen','Wan 2.2','HunyuanVideo','Decision rule'])assert.ok(text.includes(term),`missing ${term}`);
console.log('Model selection matrix V1 verification passed');
