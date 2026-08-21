export function createBenchmarkReport({modelId,type,hardware,licence,result,notes=[]}={}){return {version:'model-benchmark-report-v1',modelId:modelId||'unknown',type:type||'unknown',hardware:hardware||{},licence:licence||{status:'unverified'},result:result||{},notes};}
export function isCommerciallyEligible(report){const s=String(report?.licence?.status||'unverified').toLowerCase();return s==='verified-commercial'||s==='community-commercial';}
export function isBenchmarkComplete(report){return Boolean(report?.modelId&&report?.type&&report?.hardware&&report?.licence&&report?.result);}
