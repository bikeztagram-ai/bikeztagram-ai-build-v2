/* Registry entries are intentionally factual metadata only; runtime availability is resolved separately. */
export const MODEL_REGISTRY=[
 {id:'stable-audio-open-small',kind:'music',capabilities:['text-to-music','audio-effects'],local:true,status:'candidate',evidenceRequired:['version','weights','licence','hardware']},
 {id:'stable-audio-3',kind:'music',capabilities:['text-to-music','music-generation'],local:true,status:'candidate',evidenceRequired:['version','weights','licence','hardware']},
 {id:'wan-video',kind:'video',capabilities:['text-to-video','image-to-video','multi-image-to-video'],local:true,status:'candidate',evidenceRequired:['version','weights','licence','hardware']},
 {id:'hunyuan-video',kind:'video',capabilities:['text-to-video'],local:true,status:'candidate',evidenceRequired:['version','weights','licence','hardware']}
];
export function getCandidateModels({kind,capability}={}){return MODEL_REGISTRY.filter(m=>(!kind||m.kind===kind)&&(!capability||m.capabilities.includes(capability)));}
export function promoteModel(id,evidence){const model=MODEL_REGISTRY.find(m=>m.id===id);if(!model)throw new Error('Unknown model');const complete=model.evidenceRequired.every(k=>evidence?.[k]);return {...model,status:complete?'benchmarked-candidate':'unverified',evidence:complete?evidence:null};}
