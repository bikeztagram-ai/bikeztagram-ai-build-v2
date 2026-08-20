/* BIKEZTAGRAM AI — licensed/trending-track replacement cue map.
   Produces timing metadata only. It never downloads, copies, or recreates a copyrighted track.
*/
const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
export function buildRhythmReplacementMap(plan,soundtrack=null){
 const cuts=Array.isArray(plan?.cuts)?plan.cuts:[];let cursor=0;
 const editCuts=cuts.map((cut,index)=>{
  const duration=Math.max(.01,num(cut?.duration,.01));
  const start=num(cut?.timelineStartTime,cursor);
  const end=Math.max(start+duration,num(cut?.timelineEndTime,start+duration));
  const row={index,start:Number(start.toFixed(3)),end:Number(end.toFixed(3)),duration:Number((end-start).toFixed(3)),role:cut?.purpose||cut?.role||'edit',sourceIndex:cut?.mediaIndex??cut?.sourceIndex??0,sourceStart:Number(num(cut?.sourceStartTime??cut?.startTime,0).toFixed(3)),speed:Number(num(cut?.speed,1).toFixed(2)),transition:cut?.transition||'hard-cut',beatAligned:Boolean(cut?.music?.beatAligned),startBeat:cut?.music?.startBeat??null,endBeat:cut?.music?.endBeat??null};
  cursor=end;
  return row;
 });
 const beatSource=soundtrack?.audioAnalysis?.beats||soundtrack?.beatGrid?.beats||[];
 const beatGrid=Array.isArray(beatSource)?beatSource.map((beat,index)=>({index:Number.isInteger(beat?.index)?beat.index:index,time:Number(num(beat?.time,beat?.start||0).toFixed(3)),type:beat?.type||'beat',strength:Number(num(beat?.strength,1).toFixed(2)),bar:beat?.bar??null,beat:beat?.beat??null,downbeat:Boolean(beat?.downbeat)})):[];
 return {format:'bikeztagram-rhythm-replacement-v1',copyrightSafe:true,instruction:'Replace only with a song you are licensed to use. Preserve the cut timing and beat emphasis; do not copy the reference track.',targetDuration:Number(cursor.toFixed(3)),bpm:soundtrack?.bpm||null,energy:soundtrack?.energy||null,sections:soundtrack?.sections||[],beatGrid,editCuts,sourceOffsetsPreserved:true,notes:['Use the same edit timing with the replacement licensed/trending song.','sourceStart is the original-media offset; start/end are the finished-edit timeline.','Re-align only if the chosen song has a different BPM or intro structure.','Never reproduce another recording, melody, lyrics or distinctive composition.']};
}
export function downloadRhythmReplacementMap(plan,soundtrack,name='bikeztagram-ai-rhythm-map'){
 const payload=buildRhythmReplacementMap(plan,soundtrack);const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${String(name||'bikeztagram-ai-rhythm-map').replace(/[^a-zA-Z0-9._-]+/g,'-')}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return payload;
}
