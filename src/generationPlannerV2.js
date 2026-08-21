/* Decomposes any creative idea into generation tasks. */
const TASKS=['environment','subjects','action','camera','style','audio','story','continuity'];
export function planGeneration({idea='',assets=[],subjects=[],duration=15}={}){return {version:'generation-plan-v2',idea,assets,subjects,duration,tasks:TASKS.map(type=>({type,status:'planned',required:type!=='subjects'||subjects.length>0})),segments:[{start:0,end:duration,type:'custom',prompt:idea}]};}
export function addGeneratedSegment(plan,segment){return {...plan,segments:[...(plan.segments||[]),{...segment,id:segment.id||`segment-${(plan.segments||[]).length+1}`}]};}
export function buildContinuityContract({subjects=[],world={},style={}}={}){return {version:'continuity-contract-v1',subjectIds:subjects.map(s=>s.id).filter(Boolean),world,style,preserve:['identity','appearance','scale','motion-logic','lighting-direction']};}
