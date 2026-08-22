/* One-call planning facade for the Creative Engine. Generation/render adapters remain injectable. */
import { buildCreativeJob } from './creativeEngineContract.js';
import { buildCreativeCommandPlan } from './creativeDirectorV2.js';
import { createCreativeRuntime, runCreativeStage, nextCreativeStage } from './creativeOrchestratorV2.js';
import { scoreCreativeOutput, buildCreativeRevisionPlan } from './creativeQualityV2.js';

export function planCreativeFilm(input={}){const command=buildCreativeCommandPlan(input);const job=buildCreativeJob(command.plan.brief,{media:command.plan.media?.items||input.assets||[],generationRequests:command.plan.generationRequests});return{version:'creative-film-plan-v2',command,job,summary:{duration:command.plan.brief.duration,aspectRatio:command.plan.brief.aspectRatio,assets:(input.assets||[]).length,music:command.plan.music.genre,generationRequests:command.plan.generationRequests.length}};}

export function createCreativeEngineRuntime(input={},adapters={}){const plan=planCreativeFilm(input);const runtime=createCreativeRuntime({job:plan.job,adapters});return{plan,runtime};}

export async function executeAvailableStages(runtime,context={}){let state=runtime;for(let i=0;i<9;i++){const stage=nextCreativeStage(state);if(stage==='complete')break;state=await runCreativeStage(state,stage,context);if(state.stage===stage&&Number(state.attempts?.[stage]||0)>=Number(state.maxAttempts||3))break;}return state;}

export function evaluateCreativeFilm(metrics={}){const quality=scoreCreativeOutput(metrics);return{quality,revision:buildCreativeRevisionPlan(quality)};}
