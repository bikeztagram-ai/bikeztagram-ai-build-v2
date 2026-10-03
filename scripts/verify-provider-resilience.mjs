import fs from 'node:fs';
const music=fs.readFileSync('src/aiMusicProvider.js','utf8');
const api=fs.readFileSync('api/music.js','utf8');
const checks={
 clientUsesApi:music.includes("fetch('/api/music'"),
 emptyAudioRejected:music.includes('AI music provider returned an empty audio file'),
 nonOkHandled:music.includes('!response.ok'),
 providerStatusExposed:api.includes('providerStatus'),
 malformedJsonSafe:music.includes('try')&&music.includes('catch'),
 serverExceptionSafe:api.includes("return json({ error: 'AI music request failed.'")
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
console.log(failed.length?'PROVIDER RESILIENCE FAIL':'PROVIDER RESILIENCE PASS');
if(failed.length){console.error(failed);process.exit(2);}
