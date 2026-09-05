/* Production render acceptance policy. A Blob existing is not sufficient to call a film finished. */
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;

export function evaluateRenderAcceptance({qa=null,audioExpected=false,audioAttached=false,beatSyncScore=null}={}){
  const failures=[];
  if(!qa?.passed) failures.push(qa?.verdict||'qa-failed');
  if(audioExpected&&!audioAttached) failures.push('required-audio-not-attached');
  if(beatSyncScore!==null&&beatSyncScore<.35) failures.push('weak-music-edit-sync');
  const durationDiff=Math.abs(n(qa?.durationDifferenceSeconds,0));
  if(durationDiff>2) failures.push('duration-out-of-tolerance');
  return {accepted:failures.length===0,failures,score:Math.max(0,Math.round(100-failures.length*25-(durationDiff>1?10:0))),requiresRevision:failures.length>0};
}

export function chooseRevisionActions(policy){
  const actions=[];
  for(const failure of policy?.failures||[]){
    if(failure==='weak-music-edit-sync') actions.push('retime-cuts-to-musical-phrases');
    if(failure==='required-audio-not-attached') actions.push('retry-audio-mux');
    if(failure==='duration-out-of-tolerance') actions.push('rebalance-cut-durations');
    if(failure==='qa-failed'||String(failure).startsWith('FAIL_')) actions.push('repair-render-output');
  }
  return [...new Set(actions)];
}
