import assert from 'node:assert/strict';
import {mapMusicToVisuals,buildCoDirectedTimeline} from '../src/musicVideoCoDirectorV2.js';
const d=mapMusicToVisuals([{time:2,type:'build',strength:.6},{time:5,type:'drop',strength:1},{time:9,type:'finale',strength:1}]);assert.equal(d[1].visualDirective,'impact-or-reveal');assert.equal(d[2].visualDirective,'hero-payoff');assert.equal(buildCoDirectedTimeline({musicEvents:d}).version,'music-video-co-director-v2');
console.log('Music video co-director V2 verification passed');
