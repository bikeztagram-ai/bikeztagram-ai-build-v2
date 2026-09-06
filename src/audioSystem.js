/* BIKEZTAGRAM AI — unified audio subsystem facade. */
import { buildAudioDirection } from './audioDirector.js';
import { buildAudioMixPlan } from './audioMixPlan.js';
import { buildAudioTimeline } from './audioTimeline.js';
export function buildCompleteAudioSystem({creativePrompt='',duration=15,cuts=[],musicEnabled=true,hasVoiceover=false,hasSfx=true}={}){const direction=buildAudioDirection({creativePrompt,duration,musicEnabled});const mix=buildAudioMixPlan({audioDirection:direction,hasVoiceover,hasSfx});const timeline=buildAudioTimeline({audioDirection:direction,cuts,mixPlan:mix});return{version:'audio-system-v1',direction,mix,timeline,policy:{originalAudioPreferred:true,userSuppliedAudioAllowed:true,knownUnlicensedMusicDisallowed:true},render:{audioDataUrl:null,requiresGeneratedOrUserAudio:true}};}
