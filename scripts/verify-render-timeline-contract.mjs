const source=`${await (await fetch(new URL('../src/renderer.js',import.meta.url))).text()}`;
for(const token of ['plan?.cuts','cut.duration','onProgress','captureStream','MediaRecorder'])if(!source.includes(token))throw new Error(`Renderer contract missing ${token}.`);
if(!source.includes('attachPlanAudioToRenderStream'))throw new Error('Renderer audio bridge missing.');
console.log('PASS: renderer contract exposes cuts, duration/progress, capture stream, MediaRecorder and plan audio bridge.');
