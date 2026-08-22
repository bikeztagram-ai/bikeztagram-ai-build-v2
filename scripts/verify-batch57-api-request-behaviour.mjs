import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async () => {
  calls += 1;
  if (calls < 3) return new Response(JSON.stringify({error:'temporary'}), {status:503, headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({success:true}), {status:200, headers:{'content-type':'application/json'}});
};
const {requestJson} = await import('../src/apiRequest.js');
const result = await requestJson('/test',{method:'GET',timeoutMs:1000},{attempts:3,baseDelayMs:0});
assert.equal(result.data.success,true);
assert.equal(calls,3);

calls = 0;
globalThis.fetch = async () => {
  calls += 1;
  return new Response(JSON.stringify({error:'not found'}), {status:404, headers:{'content-type':'application/json'}});
};
await assert.rejects(() => requestJson('/missing',{method:'GET',timeoutMs:1000},{attempts:3,baseDelayMs:0}), /not found/);
assert.equal(calls,1);

globalThis.fetch = originalFetch;
console.log('batch57-api-request-behaviour: PASS');
