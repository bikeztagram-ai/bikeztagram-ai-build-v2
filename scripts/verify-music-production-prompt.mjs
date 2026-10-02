import assert from 'node:assert/strict';
import { buildMusicProductionPrompt } from '../api/music.js';

const instrumental = buildMusicProductionPrompt('dark cinematic motorcycle trailer', { instrumental: true });
assert.match(instrumental, /commercially polished/i);
assert.match(instrumental, /full-song arrangement/i);
assert.match(instrumental, /human-feeling timing and dynamics/i);
assert.match(instrumental, /controlled stereo width/i);
assert.match(instrumental, /Keep the track instrumental/i);
assert.match(instrumental, /original material only/i);
assert.doesNotMatch(instrumental, /imitate any named artist/i);

const vocal = buildMusicProductionPrompt('uplifting vocal trance anthem', { instrumental: false });
assert.match(vocal, /original lyrics/i);
assert.match(vocal, /do not imitate any named artist/i);
assert.doesNotMatch(vocal, /Keep the track instrumental/i);

console.log('Music production prompt verification PASS — commercial-polish direction, arrangement, mix, dynamics and original-only guardrails.');
