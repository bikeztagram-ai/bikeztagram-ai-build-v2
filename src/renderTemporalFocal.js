/* BIKEZTAGRAM AI — renderer adapter for temporal focal motion. */
import { mergeFocalMotion } from './temporalFocalInterpolator.js';

export function resolveRenderMotion(cut, baseMotion, progress) {
  const trajectory = cut?.temporalFocal;
  if (!trajectory) return baseMotion;
  return mergeFocalMotion(baseMotion, trajectory, progress, .65);
}

export function resolveRenderFocal(cut, motion) {
  const base = cut?.focalFraming || {};
  return {
    ...base,
    x: Number.isFinite(Number(motion?.focalX)) ? motion.focalX : Number(base.x) || .5,
    y: Number.isFinite(Number(motion?.focalY)) ? motion.focalY : Number(base.y) || .5,
  };
}
