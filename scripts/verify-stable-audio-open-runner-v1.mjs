import assert from 'node:assert/strict';
import {createStableAudioOpenRunner,normaliseAudioGeneration} from '../src/stableAudioOpenRunnerV1.js';
const r=createStableAudioOpenRunner();assert.equal((await r.generate({prompt:'cinematic electronic trailer'})).status,'runtime-required');
const live=createStableAudioOpenRunner({execute:async ({modelId})=>({status:'generated',url:'file.wav',duration:11,sampleRate:44100,channels:2,modelId})});const out=normaliseAudioGeneration(await live.generate({prompt:'dark cinematic'}));assert.equal(out.status,'generated');assert.equal(out.sampleRate,44100);assert.equal(out.modelId,'stabilityai/stable-audio-open-small');console.log('Stable Audio Open runner V1 verification passed');
