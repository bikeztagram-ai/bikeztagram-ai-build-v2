import assert from 'node:assert/strict';
import { buildStoryArc } from '../src/storyArcEngine.js';
const arc=buildStoryArc([{mediaIndex:0,directorSelectionScore:90},{mediaIndex:1,directorSelectionScore:80},{mediaIndex:2,directorSelectionScore:70}], 'cinematic reveal');
assert.equal(arc.length,5); assert.deepEqual(arc.map(x=>x.role),['mystery','anticipation','reveal','escalation','hero']);
console.log('Story arc engine: PASS');
