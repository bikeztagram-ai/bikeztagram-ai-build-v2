import assert from 'node:assert/strict';
import {evaluateCreativeOutput,buildEvidenceRecord} from '../src/creativeOutputEvaluatorV1.js';
const e=evaluateCreativeOutput({observations:{identity:90,prompt:80},expected:{identity:100,prompt:100}});assert.equal(e.overall,85);const r=buildEvidenceRecord({testId:'v1',modelId:'candidate',output:{url:'x'},evaluation:e});assert.equal(r.version,'creative-evidence-v1');assert.equal(r.modelId,'candidate');console.log('Creative output evaluator V1 verification passed');
