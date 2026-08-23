import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const main=read('src/main.jsx');
const center=read('src/creativeCommandCenter.jsx');
const css=read('src/creativeCommandCenter.css');

assert.match(main,/CreativeCommandCenter/,'main must mount the command centre');
assert.match(center,/CINEMATIC TRAILER/);
assert.match(center,/SOCIAL REEL/);
assert.match(center,/STORY FILM/);
assert.match(center,/HYBRID WORLD/);
assert.match(center,/bikeztagram:creative-command/);
assert.match(center,/textarea/,'command centre must target the existing director prompt');
assert.match(center,/analyse\|direct\|create film/i,'command centre must trigger the existing production action');
assert.match(css,/creative-command-center/);
assert.match(css,/@media/);

console.log('Batch 81 Creative Command Center contract: PASS');
