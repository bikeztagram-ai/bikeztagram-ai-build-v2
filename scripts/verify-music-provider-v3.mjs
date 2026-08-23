import {buildProviderMusicRequest,validateProviderMusicResponse} from '../src/musicProviderContractV3.js';
const r=buildProviderMusicRequest({duration:240,prompt:'original cinematic song with evolving chorus',genre:'cinematic pop',mood:'dark',energy:.8,bpm:112,filmType:'song'});
if(r.request.duration!==240||r.request.sections.length<7)throw new Error('Provider request lost long-form song structure.');
if(!r.quality.arrangement||!r.quality.motifDevelopment||!r.quality.sectionVariation||!r.quality.mix||!r.quality.master)throw new Error('Professional quality contract incomplete.');
if(!r.copyright.originalOnly||r.copyright.noNamedSongImitation!==true)throw new Error('Originality guard missing.');
const fallback=validateProviderMusicResponse({audioAvailable:false,soundtrack:{duration:240}},{duration:240});if(fallback.valid||!fallback.requiresFallback)throw new Error('Provider fallback validation failed.');
const audio=validateProviderMusicResponse({audioAvailable:true,soundtrack:{duration:240}},{duration:240});if(!audio.valid||!audio.audioAvailable)throw new Error('Provider audio response validation failed.');
console.log('PASS: provider-grade long-form music request, quality and fallback contracts verified.');
