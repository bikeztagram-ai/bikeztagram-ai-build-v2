import {buildProviderMusicRequest,validateProviderAudio,resolveProviderMusic} from '../src/musicProviderAdapterV2.js';
const r=buildProviderMusicRequest({prompt:'original four minute cinematic song',duration:240,genre:'cinematic',mood:'dark',energy:.8,bpm:112,filmType:'song'});if(r.duration!==240||r.request.duration!==240||r.request.sections.length<6)throw new Error('Provider request does not preserve long-form arrangement.');
const good=validateProviderAudio({audioUrl:'https://example.invalid/song.wav',duration:240,provider:'test'},{expectedDuration:240});if(!good.valid)throw new Error('Valid provider audio rejected.');
const fallback=resolveProviderMusic({audioAvailable:false},{duration:30,expectedDuration:30,bpm:112,energy:.8});if(!fallback.audioAvailable||fallback.providerGrade)throw new Error('Safe local fallback contract failed.');
console.log('PASS: provider-ready long-form music request, validation and safe fallback.');
