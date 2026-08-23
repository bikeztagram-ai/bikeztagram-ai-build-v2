/* Renderer contract V2: the renderer receives one continuous timeline and synchronized audio metadata. */
import {normalizeContinuousTimeline,validateNoBlackGaps} from './cinematicTimelineV2.js';
export function buildRendererContract({cuts=[],duration=15,music={}}={}){
 const timeline=normalizeContinuousTimeline(cuts,duration),gaps=validateNoBlackGaps(timeline);
 return {version:'render-contract-v2',duration:timeline.duration,cuts:timeline.cuts,timeline,qa:{noBlackGaps:gaps.pass},audio:{duration:Number(music.duration)||timeline.duration,beatMap:Array.isArray(music.beatGrid?.beats)?music.beatGrid.beats:[],sections:Array.isArray(music.sections)?music.sections:[]},continuous:gaps.pass,requiresAudioMux:true};
}
