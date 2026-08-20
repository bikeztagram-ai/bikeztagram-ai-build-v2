/* BIKEZTAGRAM AI — mixed-media speech-caption bridge.
   Converts verified Gemini source-library speech cues into the real edit timeline
   without altering source-video timestamps.
*/
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,n(v,min)));
export function applyMixedMediaSpeechCues(plan,sourceLibrary,minimumConfidence=.55){
  if(!plan?.cuts?.length)return {plan,cues:[],appliedCount:0};
  const cues=(Array.isArray(sourceLibrary)?sourceLibrary:[]).flatMap((source,sourceIndex)=>(Array.isArray(source?.speechCues)?source.speechCues:[]).map((cue,index)=>({sourceIndex,start:Math.max(0,n(cue?.start)),end:Math.max(Math.max(0,n(cue?.start))+.05,n(cue?.end)),text:String(cue?.text||'').trim(),confidence:clamp(cue?.confidence,0,1),index}))).filter(c=>c.text&&c.confidence>=minimumConfidence);
  const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c));
  const cuts=plan.cuts.map(cut=>{
    const sourceIndex=Math.max(0,Math.trunc(n(cut?.sourceIndex)));
    const start=Math.max(0,n(cut?.startTime)),end=start+Math.max(.05,n(cut?.duration,.05));
    const chosen=cues.filter(c=>c.sourceIndex===sourceIndex).map(c=>({c,overlap:overlap(start,end,c.start,c.end)})).filter(x=>x.overlap>0).sort((a,b)=>b.overlap-a.overlap||b.c.confidence-a.c.confidence)[0]?.c;
    if(!chosen)return cut;
    const inPoint=clamp((Math.max(start,chosen.start)-start)/(end-start),0,.9);
    const outPoint=clamp((Math.min(end,chosen.end)-start)/(end-start),inPoint+.05,1);
    return {...cut,text:chosen.text,textIn:Number(Math.max(.02,inPoint).toFixed(3)),textOut:Number(Math.min(.98,outPoint).toFixed(3)),textStyle:'caption',captionCueIndex:chosen.index,captionConfidence:Number(chosen.confidence.toFixed(2))};
  });
  return {plan:{...plan,cuts,speechCaptions:cues,captioning:{enabled:cues.length>0,mode:'verified-mixed-media-speech-cues',appliedShots:cuts.filter(c=>c.captionCueIndex!=null).length,totalCues:cues.length}},cues,appliedCount:cuts.filter(c=>c.captionCueIndex!=null).length};
}
