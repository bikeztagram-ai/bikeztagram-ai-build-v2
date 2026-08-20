/* BIKEZTAGRAM AI — speech-caption editorial bridge.
   Uses verified time-coded speech cues from media analysis and maps the strongest
   cue to each real edit shot. It never invents dialogue and never changes source media.
*/

const num=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback;};
const text=(value)=>String(value??'').trim();

function normaliseCue(cue,index){
  const start=Math.max(0,num(cue?.start));
  const end=Math.max(start+0.05,num(cue?.end,start+0.05));
  const value=text(cue?.text||cue?.caption||cue?.transcript);
  if(!value)return null;
  return {index,start,end,text:value,confidence:Math.max(0,Math.min(1,num(cue?.confidence,1)))};
}

export function normaliseSpeechCaptions(captions){
  if(!Array.isArray(captions))return [];
  return captions.map(normaliseCue).filter(Boolean).sort((a,b)=>a.start-b.start).slice(0,120);
}

function overlap(aStart,aEnd,bStart,bEnd){
  return Math.max(0,Math.min(aEnd,bEnd)-Math.max(aStart,bStart));
}

export function applySpeechCaptionsToPlan(plan,captions,options={}){
  const cues=normaliseSpeechCaptions(captions);
  if(!plan?.cuts?.length||!cues.length)return {plan,captions:cues,captionCount:0,appliedCount:0};
  const minimumConfidence=num(options.minimumConfidence,.55);
  const cuts=plan.cuts.map((cut)=>{
    const start=Math.max(0,num(cut.startTime));
    const end=start+Math.max(.05,num(cut.duration,.05));
    const candidates=cues
      .filter(cue=>cue.confidence>=minimumConfidence)
      .map(cue=>({cue,overlap:overlap(start,end,cue.start,cue.end)}))
      .filter(item=>item.overlap>0)
      .sort((a,b)=>b.overlap-a.overlap||b.cue.confidence-a.cue.confidence);
    const chosen=candidates[0]?.cue;
    if(!chosen)return cut;
    const textStart=Math.max(start,chosen.start);
    const textEnd=Math.min(end,chosen.end);
    const relativeIn=Math.max(0,Math.min(1,(textStart-start)/(end-start)));
    const relativeOut=Math.max(relativeIn+.05,Math.min(1,(textEnd-start)/(end-start)));
    return {
      ...cut,
      text:chosen.text,
      textIn:Number(Math.max(.02,relativeIn).toFixed(3)),
      textOut:Number(Math.min(.98,relativeOut).toFixed(3)),
      textStyle:'caption',
      captionCueIndex:chosen.index,
      captionConfidence:Number(chosen.confidence.toFixed(2))
    };
  });
  const appliedCount=cuts.filter(cut=>cut.captionCueIndex!=null).length;
  return {
    plan:{...plan,cuts,speechCaptions:cues,captioning:{enabled:true,mode:'verified-speech-cues',appliedShots:appliedCount,totalCues:cues.length}},
    captions:cues,
    captionCount:cues.length,
    appliedCount
  };
}

export function describeCaptionPlan(result){
  if(!result?.captionCount)return 'No verified speech captions detected.';
  return `📝 Speech captions: ${result.appliedCount}/${result.captionCount} verified cues attached to the edit.`;
}
