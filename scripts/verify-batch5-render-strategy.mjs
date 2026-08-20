import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSafeRenderPlan } from '../src/renderStrategy.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const aiPlan={creativePrompt:'cinematic motorcycle edit',cuts:[
 {mediaIndex:0,mediaId:'video-0',startTime:1,duration:2,purpose:'hook',motionStyle:'slow-push',motionIntensity:.4,transition:'fade-in'},
 {mediaIndex:0,mediaId:'video-0',startTime:5,duration:2,purpose:'action',motionStyle:'pan-right',motionIntensity:.4,transition:'hard-cut'},
 {mediaIndex:0,mediaId:'video-0',startTime:9,duration:2,purpose:'hero-ending',motionStyle:'slow-push',motionIntensity:.4,transition:'fade-out'}
]};
const productionPlan={title:'Test production',targetDuration:15,creativeRequest:'cinematic motorcycle edit',scenes:[
 {sourceType:'uploaded',startTime:1,duration:2,purpose:'hook',transitionIn:'fade-in'},
 {sourceType:'generated',duration:3,purpose:'generated cinematic world',transitionIn:'crossfade'},
 {sourceType:'uploaded',startTime:9,duration:2,purpose:'hero',transitionIn:'fade-out'}
]};
const result=buildSafeRenderPlan({productionPlan,aiPlan,sourceDuration:12,creativePrompt:'cinematic'});
assert.equal(result.source,'bikeztagram-safe-production-bridge');
assert.equal(result.cuts.length,3);
assert.equal(result.generatedSceneFallbacks,1);
assert.ok(result.cuts.every(c=>c.sourceType==='uploaded'),'unsafe generated scenes must not reach the current compositor');
assert.ok(result.cuts.every(c=>c.generated===false),'generated flags must be cleared when safely mapped to real footage');
assert.ok(result.cuts.some(c=>c.coverage?.generatedSceneFallback===true),'fallback mapping must be traceable');
assert.ok(result.cuts.every(c=>c.motionIntensity<=.6),'fallback motion must remain restrained');
const noProduction=buildSafeRenderPlan({productionPlan:null,aiPlan});
assert.equal(noProduction,aiPlan);
const emptyProduction=buildSafeRenderPlan({productionPlan:{scenes:[]},aiPlan});
assert.equal(emptyProduction,aiPlan);
console.log('batch5-render-strategy-verification: PASS');
