import { createGenerationResourcePolicy } from '../src/generationResourcePolicyV1.js';
export function buildPreflightReport({runtime,hardware={},policy=createGenerationResourcePolicy()}={}){return {version:'runtime-preflight-v1',runtime:{id:runtime?.id||null,version:runtime?.version||null,available:Boolean(runtime?.available),capabilities:runtime?.capabilities||[]},hardware,policy,ready:Boolean(runtime?.available&&runtime?.id&&runtime?.version)};}
console.log('Runtime preflight module ready');
