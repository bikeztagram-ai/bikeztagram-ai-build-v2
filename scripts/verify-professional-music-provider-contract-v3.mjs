import {buildProviderMusicRequest,resolveProfessionalMusic,assertProfessionalMaster} from '../src/musicProviderContractV3.js';
const req=buildProviderMusicRequest({duration:600,prompt:'original cinematic motorcycle song',genre:'cinematic',mood:'dark',energy:.8,bpm:112,filmType:'song'});
if(req.request.duration!==600||req.composition.sections.at(-1).end!==600)throw new Error('Professional request does not cover full duration.');
if(!req.quality.master||!req.quality.motifDevelopment||!req.quality.sectionVariation)throw new Error('Professional music quality contract incomplete.');
const provider=resolveProfessionalMusic({audio:'provider-master.wav',duration:600,provider:'test-provider',providerGrade:true},{duration:600});
assertProfessionalMaster(provider);
const fallback=resolveProfessionalMusic({audio:null,duration:600},{duration:600});
if(fallback.professionalMaster||fallback.accepted||fallback.source!=='original-local-fallback')throw new Error('Local fallback was incorrectly accepted as a final master.');
console.log('PASS: professional music requests support long-form song structure and reject local fallback as final master.');
