import assert from 'node:assert/strict';
import { compileCreativeProductionRequest, buildProductionStages, createCreativeJob, buildProviderRequirements } from '../src/creativeProductionKernel.js';
const request=compileCreativeProductionRequest({prompt:'Create a dark cinematic motorcycle film with an original driving soundtrack.',assets:[{id:'bike-1',type:'video',name:'hero.mp4'}],duration:15});
assert.equal(request.capabilities.originalMusic,true); assert.equal(request.capabilities.generatedScenes,true); assert.equal(request.policy.providerAgnostic,true); assert.equal(request.assets.length,1);
const stages=buildProductionStages(request); assert.deepEqual(stages.map(s=>s.id),['understand','analyse-media','direct','compose-music','generate-scenes','assemble','render','quality','revise','export']);
const job=createCreativeJob({prompt:request.prompt,assets:request.assets}); const providers=buildProviderRequirements(job); assert.equal(providers.fallbacks.music,'procedural-original'); assert.equal(providers.fallbacks.videoGeneration,'procedural-scene-generator');
console.log('Creative production kernel: PASS');
