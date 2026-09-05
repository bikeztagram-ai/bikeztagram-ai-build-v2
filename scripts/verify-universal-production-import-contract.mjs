import assert from 'node:assert/strict';
import fs from 'node:fs';

const conductor=fs.readFileSync(new URL('../src/universalProductionConductor.js',import.meta.url),'utf8');
const audio=fs.readFileSync(new URL('../src/audioDirector.js',import.meta.url),'utf8');
assert.match(audio,/export function planAudioDirector/);
assert.match(conductor,/import \{ planAudioDirector \} from ['"]\.\/audioDirector\.js['"]/);
assert.doesNotMatch(conductor,/import \{ buildAudioDirection \}/);
console.log('universal-production-import-contract: PASS');
