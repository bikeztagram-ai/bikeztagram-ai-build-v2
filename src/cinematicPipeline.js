/* Batch 92 — single orchestration contract joining soundtrack, editorial, mix and QA. */
import { buildCinematicSoundtrack } from './cinematicSoundtrackEngine.js';
import { buildContinuousTimeline } from './cinematicTimeline.js';
import { directCinematicEdits } from './cinematicEditDirector.js';
import { buildCinematicAudioMix } from './cinematicAudioMix.js';
import { inspectCinematicResult, repairCinematicPlan } from './cinematicQualityEngine.js';

export function buildCinematicProduction({cuts=[],duration=15,bpm=112,energy=.72,mood='cinematic',hasSourceAudio=true,prompt=''}={}){
  const soundtrack=buildCinematicSoundtrack({duration,bpm,energy,mood,prompt});
  const directed=directCinematicEdits(cuts,soundtrack);
  const timeline=buildContinuousTimeline(directed,duration);
  const mix=buildCinematicAudioMix({energy,hasSourceAudio});
  let plan={duration:timeline.duration,cuts:timeline.cuts,music:{...soundtrack,mix},soundtrack, timeline, audioMix:mix};
  let qa=inspectCinematicResult({timeline,soundtrack});
  if(!qa.pass){plan=repairCinematicPlan(plan);plan.timeline=buildContinuousTimeline(plan.cuts,duration);qa=inspectCinematicResult({timeline:plan.timeline,soundtrack});}
  plan.qa=qa;plan.production={version:'cinematic-production-v1',continuous:true,beatAware:true,originalSoundtrack:true,autoRepairAttempted:true};
  return plan;
}
