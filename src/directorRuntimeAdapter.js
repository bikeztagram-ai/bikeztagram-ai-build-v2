import { buildCoveragePlan } from './director.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

function momentsFromAnalysis(analysis){
  if(Array.isArray(analysis?.bestMoments))return analysis.bestMoments;
  if(Array.isArray(analysis?.cuts))return analysis.cuts;
  return [];
}

function sourceItems(analysis){
  if(Array.isArray(analysis?.sources)&&analysis.sources.length)return analysis.sources;
  const moments=momentsFromAnalysis(analysis);
  const bySource=new Map();
  moments.forEach(moment=>{
    const index=finite(moment?.mediaIndex,finite(moment?.sourceIndex,0));
    if(!bySource.has(index))bySource.set(index,{index,mediaIndex:index,type:moment?.type||moment?.mediaType||'video',name:moment?.filename||moment?.name||`source-${index}`,duration:finite(moment?.durationInSeconds,finite(moment?.duration,1)),score:finite(moment?.score,50),cinematicScore:finite(moment?.cinematicScore,finite(moment?.score,50)),subject:moment?.subject});
  });
  return [...bySource.values()];
}

function bestMomentForSource(moments,sourceIndex){
  const candidates=moments.map((moment,index)=>({moment,index})).filter(item=>finite(item.moment?.mediaIndex,finite(item.moment?.sourceIndex,0))===sourceIndex);
  return candidates.sort((a,b)=>finite(b.moment?.score,0)-finite(a.moment?.score,0)||a.index-b.index)[0]||null;
}

export function buildDirectorRuntimeSelection(analysis={},options={}){
  const moments=momentsFromAnalysis(analysis);
  const sources=sourceItems(analysis);
  if(!sources.length||!moments.length)return{analysis,coverage:[],selectedMoments:[],source:'director-v3-runtime'};
  const maxCuts=clamp(Math.floor(finite(options.maxCuts,8)),1,30);
  const coverage=buildCoveragePlan(sources,{creativePrompt:options.creativePrompt||analysis?.prompt||'',maxShots:Math.min(maxCuts,sources.length)});
  const selected=[];
  const usedMomentIndices=new Set();
  for(const item of coverage){
    const source=sources[item.mediaIndex];
    const sourceIndex=finite(source?.mediaIndex,item.mediaIndex);
    const candidate=bestMomentForSource(moments,sourceIndex);
    if(!candidate||usedMomentIndices.has(candidate.index))continue;
    usedMomentIndices.add(candidate.index);
    selected.push({...candidate.moment,__momentIndex:candidate.index,sourceIndex,mediaIndex:sourceIndex,editorialRole:item.role,directorSelectionScore:item.selectionScore,directorFamily:item.family,directorSelectionReason:item.selectionReason});
  }
  if(selected.length<maxCuts){
    moments.map((moment,index)=>({moment,index})).sort((a,b)=>finite(b.moment?.score,0)-finite(a.moment?.score,0)||a.index-b.index).forEach(({moment,index})=>{
      if(selected.length>=maxCuts||usedMomentIndices.has(index))return;
      usedMomentIndices.add(index);
      selected.push({...moment,__momentIndex:index,directorSelectionScore:finite(moment?.score,50),directorSelectionReason:'Director V3 fallback: strongest remaining evidence'});
    });
  }
  const cuts=selected.map(moment=>({momentIndex:moment.__momentIndex,mediaIndex:finite(moment?.mediaIndex,0),sourceIndex:finite(moment?.sourceIndex,finite(moment?.mediaIndex,0)),editorialRole:moment?.editorialRole||'cinematic-build',directorSelectionScore:finite(moment?.directorSelectionScore,0),directorFamily:moment?.directorFamily,reason:moment?.directorSelectionReason}));
  return{
    analysis:{...analysis,aiEditPlan:{cuts},directorDecision:{version:'universal-director-runtime-v1',coverage,selectedMedia:selected.map(moment=>({mediaIndex:finite(moment?.mediaIndex,0),editorialRole:moment?.editorialRole,score:finite(moment?.directorSelectionScore,0)}))}},
    coverage,
    selectedMoments:selected.map(({__momentIndex,...moment})=>moment),
    source:'director-v3-runtime'
  };
}
