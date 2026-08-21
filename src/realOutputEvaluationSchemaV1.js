export function createRealOutputEvaluation({kind,outputId,modelId,metrics={},notes='',passed=false}={}){return {version:'real-output-evaluation-v1',kind,outputId,modelId,metrics,notes,passed:Boolean(passed),reviewedAt:new Date().toISOString()};}
export function evaluationReady(e){return Boolean(e?.kind&&e?.outputId&&e?.modelId&&e?.metrics&&Object.keys(e.metrics).length);}
