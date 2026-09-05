import assert from 'node:assert/strict';
import { createMusicBrief,composeFullMusic,renderMusicWav,analyseMusicComposition } from '../src/musicStudioEngine.js';
import { createSongProject,renderStemWav,exportSongProject,validateSongProject } from '../src/musicProjectRuntime.js';
const brief=createMusicBrief({prompt:'dark cinematic motorcycle chase with rising tension',duration:24});
assert.equal(brief.copyright.originalOnly,true);assert.equal(brief.copyright.noKnownSongImitation,true);assert.equal(brief.copyright.noExternalAudioSamples,true);assert.ok(brief.bpm>=55&&brief.bpm<=190);
const composition=composeFullMusic(brief);assert.ok(composition.sections.length>=4);assert.ok(composition.events.length>0);assert.ok(composition.beatGrid.length>20);assert.ok(composition.melody.length>0);assert.deepEqual(Object.keys(composition.stems),['drums','bass','harmony','melody','fx']);
const wav=renderMusicWav(composition);assert.equal(wav.type,'audio/wav');assert.ok(wav.size>44);const stats=analyseMusicComposition(composition);assert.equal(stats.duration,24);assert.equal(stats.bpm,brief.bpm);assert.ok(stats.qualityScore>=70);
const project=createSongProject({prompt:'fast energetic cinematic rock trailer',duration:12,bpm:150,key:'e',mode:'minor',seed:123});assert.equal(validateSongProject(project).ok,true);assert.equal(project.lyrics.originalOnly,true);assert.equal(project.mastering.originalOnly,true);assert.ok(renderStemWav(project,'drums').bytes>44);assert.ok(exportSongProject(project).includes('song-project-v1'));
console.log('Music Studio verification PASS — prompt-to-song, arrangement, synthesis, stems, lyrics, mastering, WAV export, beat grid and original-only policy.');
