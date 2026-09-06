import assert from 'node:assert/strict';
import { composeMusicSpec } from '../src/musicComposerSpec.js';
const s=composeMusicSpec({prompt:'dark cinematic energetic trailer reveal',duration:30});assert.equal(s.copyright.originalOnly,true);assert.equal(s.copyright.noKnownSongImitation,true);assert.ok(s.bpm>=70&&s.bpm<=160);assert.ok(s.arrangement.length>=4);assert.ok(s.arrangement.some(x=>x.name==='climax'));assert.ok(s.instruments.length>=4);console.log('music-composer-spec: PASS');
