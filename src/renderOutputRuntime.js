/* BIKEZTAGRAM AI — output-aware render contract. */
import {resolveOutputPreset} from './outputPresets.js';

export function resolveRenderOutput(plan={}){
  const preset=resolveOutputPreset(plan.outputPreset,plan.creativePrompt||plan.prompt||'');
  return {preset,width:preset.width,height:preset.height,fps:preset.fps};
}

export function describeRenderOutput(plan={}){
  const {preset,width,height,fps}=resolveRenderOutput(plan);
  return `${preset.label} ${width}×${height} @ ${fps}fps`;
}
