import {routeCreativeBrief} from './creativeBriefRouterV1.js';
import {buildCreativeGenerationPipeline} from './creativeGenerationPipelineV1.js';
import {buildRevisionRequest} from './revisionDirectorV1.js';
import {assertRealWorkerResult} from './generationWorkerBoundaryV1.js';

export function runIntegrationHarness({brief='',references=[],mustPreserve=[],workerResult=null,scores={}}={}){const routed=routeCreativeBrief({brief});const kind=routed.kind==='music'?'music':'video';const pipeline=buildCreativeGenerationPipeline({brief,kind,references,mustPreserve});const revision=buildRevisionRequest({brief,decision:'revise',scores});let worker={verified:false};if(workerResult)worker=assertRealWorkerResult(workerResult);return {version:'creative-integration-harness-v1',routed,pipeline,worker,revision,ready:Boolean(worker.verified),sideEffects:false};}
