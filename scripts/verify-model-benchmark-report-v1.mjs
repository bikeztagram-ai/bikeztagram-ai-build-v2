import assert from 'node:assert/strict';
import {createBenchmarkReport,isCommerciallyEligible,isBenchmarkComplete} from '../src/modelBenchmarkReportV1.js';
const r=createBenchmarkReport({modelId:'stable-audio-3-small',type:'music',hardware:{gpu:'test'},licence:{status:'community-commercial'},result:{overall:84}});
assert.equal(isBenchmarkComplete(r),true);assert.equal(isCommerciallyEligible(r),true);assert.equal(isCommerciallyEligible(createBenchmarkReport({licence:{status:'unverified'}})),false);
console.log('Model benchmark report V1 verification passed');
