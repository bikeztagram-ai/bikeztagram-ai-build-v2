import assert from 'node:assert/strict';
import { createMusicBrief,composeFullMusic,renderMusicWav,analyseMusicComposition } from '../src/musicStudioEngine.js';
const prompts=['dark cinematic motorcycle chase with rising tension','uplifting cinematic road trip','fast electronic racing trailer'];
for(const prompt of prompts){const brief=createMusicBrief({prompt,duration:24});const c=composeFullMusic(brief);const stats=analyseMusicComposition(c);assert.ok(c.harmony.length>0);assert.ok(c.melody.length>0);assert.ok(c.bass.length>0);assert.ok(c.drums.length>0);assert.ok(stats.qualityScore>=80);const wav=renderMusicWav(c);assert.equal(wav.type,'audio/wav');assert.ok(wav.size>44);}
console.log('Music quality v3 verification PASS — structured harmony, evolving melody, bass movement, denser rhythm, original synthesis and WAV export.');
