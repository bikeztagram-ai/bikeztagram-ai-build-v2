import {buildLongFormMusicComposition,buildMusicGenerationPlan} from '../src/musicCompositionV3.js';

const short=buildLongFormMusicComposition({duration:30,prompt:'dark cinematic motorcycle trailer',genre:'hybrid-rock'});
if(short.structure!=='short'||short.sections.length!==5)throw new Error('Short-form structure invalid.');

const long=buildLongFormMusicComposition({duration:300,prompt:'cinematic motorcycle film',filmType:'film',genre:'cinematic'});
if(long.duration!==300||long.structure!=='score'||long.sections.length<7)throw new Error('Long-form composition structure invalid.');
if(!long.arrangement?.mix && !long.arrangement?.master)throw new Error('Professional production blueprint incomplete.');
if(!long.theme?.development)throw new Error('Theme development contract incomplete.');
if(long.generation?.requiresProviderForProfessionalAudio!==true)throw new Error('Professional provider requirement missing.');
if(long.generation?.localFallbackAllowed!==true)throw new Error('Local fallback contract missing.');

const provider=buildMusicGenerationPlan({duration:180,prompt:'original energetic cinematic soundtrack'});
if(!provider.providerRequest?.sections?.length||provider.providerRequest.duration!==180)throw new Error('Provider generation plan incomplete.');
if(!provider.providerRequest?.arrangement?.master)throw new Error('Provider arrangement incomplete.');
if(!provider.copyright.originalOnly||!provider.copyright.noNamedSongImitation||!provider.copyright.noReproductionOfExistingMelodies)throw new Error('Originality guard missing.');

console.log('PASS: short, long-form, production arrangement, provider-neutral generation and originality contracts verified.');
