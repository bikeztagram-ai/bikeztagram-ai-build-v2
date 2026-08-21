import {buildEvaluationPolicy} from './generationEvaluationPolicyV1.js';
import {createReferenceFidelitySpec} from './referenceFidelitySpecV1.js';

export function buildCreativeGenerationPipeline({brief={},kind='video',references=[],mustPreserve=[],musicBrief=null,videoBrief=null}={}){const evaluation=buildEvaluationPolicy({kind,brief:brief.prompt||brief, mustPreserve, qualityTarget:'commercial'});const fidelity=createReferenceFidelitySpec({references,identityFields:mustPreserve,target:'strict'});return {version:'creative-generation-pipeline-v1',kind,brief,musicBrief,videoBrief,evaluation,fidelity,stages:['interpret','plan','generate','evaluate','revise-or-accept','import']};}
