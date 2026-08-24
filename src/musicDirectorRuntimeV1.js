/* Runtime adapter for Music Director V1. Keeps synthesis in-house while preserving the richer blueprint. */
import {createOriginalCinematicWav} from './musicProviderV2.js';
import {directMusic} from './musicDirectorV1.js';
export function generateDirectorMusic({prompt='',duration=15,energy=.78,style='cinematic',shotPlan=[]}={}){
 const blueprint=directMusic({prompt,duration,energy,style,shotPlan});
 const audioBlob=createOriginalCinematicWav({seconds:blueprint.seconds,bpm:blueprint.bpm,energy:blueprint.energy});
 return {audioBlob,blueprint,metadata:{original:true,provider:'in-house-music-director-v1',generator:'procedural-cinematic-v2',bpm:blueprint.bpm,duration:blueprint.seconds,genre:blueprint.genre,motif:blueprint.motif,sections:blueprint.sections.length,beats:blueprint.beats.length}};
}
