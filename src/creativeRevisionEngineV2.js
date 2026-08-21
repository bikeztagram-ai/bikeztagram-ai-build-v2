/* Turns Creative QA weaknesses into targeted, bounded revision operations. */

const ACTIONS={
  story:{operation:'rewrite-story',target:'story'},
  pacing:{operation:'retime-cuts',target:'timeline'},
  musicImpact:{operation:'regenerate-music',target:'music'},
  beatUtilisation:{operation:'align-key-cuts',target:'timeline'},
  shotVariety:{operation:'replace-repetitive-shots',target:'media'},
  continuity:{operation:'regenerate-bridge',target:'generated-scenes'},
  captionQuality:{operation:'rewrite-captions',target:'captions'},
  technical:{operation:'rerender',target:'render'}
};

export function buildRevisionActions(quality,{maxActions=3}={}){
  const dimensions=quality?.dimensions||{};
  return Object.entries(dimensions).filter(([,score])=>Number(score)<72).sort((a,b)=>a[1]-b[1]).slice(0,maxActions).map(([dimension,score])=>({...ACTIONS[dimension],dimension,score:Math.round(Number(score)||0)}));
}

export function buildRevisionJob({quality,currentPlan,attempt=0,maxAttempts=3}={}){
  const actions=buildRevisionActions(quality);
  const shouldRevise=Number(quality?.score||0)<80&&attempt<maxAttempts&&actions.length>0;
  return {version:'creative-revision-job-v2',attempt,maxAttempts,shouldRevise,actions,currentPlan:currentPlan||null,policy:{preserveUserAssets:true,originalGenerationOnly:true,neverInfiniteLoop:true}};
}

export function applyRevisionPlan(plan,{quality}={}){
  const revision=buildRevisionJob({quality,currentPlan:plan,attempt:Number(plan?.revision?.attempts||0)});
  return {...plan,revision:{...(plan.revision||{}),requested:revision.shouldRevise,reasons:revision.actions.map(a=>a.dimension),attempts:revision.attempt},revisionJob:revision};
}
