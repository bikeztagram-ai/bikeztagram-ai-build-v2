/* Renderer adapter V2: normalises orchestration output into a gap-free, audio-aware render contract. */
import {buildRendererContract} from './renderContractV2.js';
export function adaptCinematicPlanForRenderer(plan={}){
 const cuts=Array.isArray(plan.cuts)?plan.cuts:[];
 const prepared=cuts.map((cut,i)=>({...cut,startTime:Number(cut.startTime)||0,duration:Math.max(.35,Number(cut.duration)||2),transition:i===0?(cut.transition||'fade-in'):(cut.transition||'hard-cut'),motionStyle:cut.motionStyle||'slow-push',motionIntensity:Number(cut.motionIntensity)||.8,colorGrade:cut.colorGrade||'moody cinematic',stabilization:cut.stabilization!==false}));
 const contract=buildRendererContract({cuts:prepared,duration:Number(plan.duration)||15,music:plan.soundtrack||plan.music||{}});
 return {...plan,cuts:contract.cuts,timeline:contract.timeline,renderContract:contract};
}
