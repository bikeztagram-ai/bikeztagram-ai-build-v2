import assert from 'node:assert/strict';
import assert from 'node:assert/strict';
import {createProductionPlan,markPhase,nextPhase} from '../src/creativeProductionPlanV2.js';
let p=createProductionPlan({brief:'Create an original cinematic sci-fi advert',assets:[{id:'product'}],duration:15});assert.equal(p.phases.length,9);assert.equal(nextPhase(p),'understand');p=markPhase(p,'understand');p=markPhase(p,'story');assert.equal(nextPhase(p),'music');assert.equal(p.generation.music.required,true);console.log('Creative production plan V2 verification passed');
