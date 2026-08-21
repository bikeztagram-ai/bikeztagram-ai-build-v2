import assert from 'node:assert/strict';
import {runInternalCreativeJob} from '../src/internalCreativeOrchestratorV1.js';
const r=await runInternalCreativeJob({brief:{prompt:'make anything'},musicEngine:async b=>({type:'music',b}),videoEngine:async b=>({type:'video',b}),qa:async()=>({score:90})});assert.equal(r.status,'complete');assert.equal(r.music.type,'music');assert.equal(r.visuals.type,'video');assert.equal(r.qa.score,90);console.log('Internal creative orchestrator V1 verification passed');
