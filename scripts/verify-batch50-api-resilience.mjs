import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const api=read('src/apiRequest.js'); const media=read('src/mediaAnalysisClient.js'); const stage2=read('src/twoStageDirector.js'); const universal=read('src/universalMediaClient.js');
assert.match(api,/408, 425, 429, 500, 502, 503, 504/); assert.match(api,/exponential|2 \*\* \(attempt - 1\)/); assert.match(api,/TypeError/); assert.match(api,/AbortController/); assert.match(api,/response\.ok/); assert.match(api,/responseData/);
assert.match(media,/requestJson/); assert.match(media,/analyse-media/); assert.match(stage2,/requestJson/); assert.match(stage2,/edit-plan/); assert.match(universal,/handleUploadUrl:\s*'\/api\/upload'/); assert.match(universal,/multipart:\s*false/); assert.match(universal,/requestJson/);
console.log('batch50-api-resilience: PASS');
