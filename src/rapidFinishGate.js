/* Rapid Finish Gate: prevents the UI from claiming an end-to-end film is ready until core contracts are satisfied. */
export function evaluateRapidFinishGate({plan=null,sources=[],renderPlan=null}={}){
 const real=Array.isArray(sources)&&sources.some(s=>s?.type==='video'||String(s?.mimeType||'').startsWith('video/')||s?.sourceUrl);
 const cuts=Array.isArray(renderPlan?.cuts)&&renderPlan.cuts.length>0;
 const continuous=renderPlan?.renderContract?.continuous??renderPlan?.timeline?.continuous??true;
 const generated=(renderPlan?.cuts||[]).filter(c=>c?.sourceType==='generated'||c?.generated);
 return {pass:Boolean(plan?.cuts?.length&&real&&cuts&&continuous),realFootage:real,hasCuts:cuts,continuous:Boolean(continuous),generatedInsertCount:generated.length,generatedExplicit:generated.length===0||renderPlan?.allowGeneratedInserts===true,blockers:[...(real?[]:['No uploaded video source']),...(cuts?[]:['No render cuts']),...(continuous?[]:['Timeline has gaps'])]};
}
