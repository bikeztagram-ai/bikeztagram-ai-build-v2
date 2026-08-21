const WEIGHTS={promptFidelity:.22,subjectConsistency:.18,motionQuality:.14,visualQuality:.14,story:.12,musicImpact:.10,continuity:.10};
export function scoreCreativeCandidate(scores={}){return Object.entries(WEIGHTS).reduce((sum,[k,w])=>sum+(Number(scores[k])||0)*w,0);}
export function rankCreativeCandidates(candidates=[]){return candidates.map(c=>({...c,creativeScore:scoreCreativeCandidate(c.scores||{})})).sort((a,b)=>b.creativeScore-a.creativeScore);}
