import assert from 'node:assert/strict';
import {createMusicBrief,composeFullMusic,renderMusicWav,analyseMusic} from '../src/musicStudioEngine.js';
const prompts=['vocal trance anthem with huge chorus','dark electronic motorcycle chase','indie rock road trip','hip hop night ride','drum and bass racing'];
const rows=[];
for(const prompt of prompts){const brief=createMusicBrief({prompt,duration:20});const c=composeFullMusic(brief);const a=analyseMusic(c);const wav=renderMusicWav(c,{sampleRate:8000});assert.ok(c.sections.length>=4);assert.ok(c.drums.length>40);assert.ok(c.bass.length>10);assert.ok(c.harmony.length>10);assert.ok(c.melody.length>8);assert.ok(a.qualityScore>=85);assert.equal(wav.type,'audio/wav');assert.ok(wav.size>44);rows.push({genre:brief.genre,bpm:brief.bpm,score:a.qualityScore,melody:c.melody.length,bass:c.bass.length,drums:c.drums.length});}
console.log(JSON.stringify({ok:true,engine:'music-studio-v4',genres:rows},null,2));
