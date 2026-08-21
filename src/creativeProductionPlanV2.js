/* Converts a brief into an explicit production plan while leaving model selection to runtime discovery. */
const PHASES=['understand','story','music','visuals','generation','assembly','qa','revision','export'];
export function createProductionPlan({brief,assets=[],subjects=[],duration=15,aspectRatio='9:16'}={}){return {version:'creative-production-plan-v2',brief:brief||'',assets,subjects,duration,aspectRatio,phases:PHASES.map((phase,index)=>({phase,order:index,status:'pending'})),generation:{music:{required:true},visuals:{required:true},generatedScenes:[],realMedia:assets},revision:{maxAttempts:3}};}
export function markPhase(plan,phase,status='complete',output=null){return {...plan,phases:plan.phases.map(p=>p.phase===phase?{...p,status,output}:p)};}
export function nextPhase(plan){return plan.phases.find(p=>p.status!=='complete')?.phase||'complete';}
