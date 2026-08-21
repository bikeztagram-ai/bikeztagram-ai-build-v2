import {routeCreativeBrief} from './creativeBriefRouterV1.js';
import {buildCreativeGenerationPipeline} from './creativeGenerationPipelineV1.js';
import {buildRevisionRequest} from './revisionDirectorV1.js';

export function runCreativePipelineDryRun({brief='',references=[],mustPreserve=[],scores={}}={}){const routed=routeCreativeBrief({brief});const kind=routed.kind==='audiovisual'?'video':routed.kind==='music'?'music':'video';const pipeline=buildCreativeGenerationPipeline({brief,kind,references,mustPreserve});const revision=buildRevisionRequest({brief,decision:'revise',scores,attempt:0});return {version:'creative-pipeline-dry-run-v1',routed,pipeline,revision,sideEffects:false};}
