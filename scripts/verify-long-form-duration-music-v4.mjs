import {resolveFilmDuration,buildDurationPolicy} from '../src/filmDurationPolicyV2.js';
import {createOriginalMusicWav} from '../src/musicProviderV3.js';
const cases=[['30 sec',30],['5 minute',300],['10 minute',600],['20 minute',1200]];
for(const [prompt,expected] of cases){const got=resolveFilmDuration({prompt,mediaCount:6});if(got!==expected)throw new Error(`Duration policy failed for ${prompt}: ${got}`);}
const p=buildDurationPolicy({duration:1200});if(!p.long||!p.veryLong||!p.compositionRequired||!p.providerMayNeedExtension)throw new Error('Very-long duration policy incomplete.');
const wav=createOriginalMusicWav(15,112,{energy:.8,seed:'long-form-test'});if(!(wav instanceof Blob)||wav.size<1000)throw new Error('Local music fallback failed.');
console.log('PASS: short-to-20-minute duration policy and local music fallback verified.');
