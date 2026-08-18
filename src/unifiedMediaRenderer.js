/* BIKEZTAGRAM AI — unified media frame renderer.
   Draws a prepared image or video frame through the common cinematic adapter.
   It does not own recording, uploads, Blob, Gemini, or timeline decisions. */

import { drawResolvedFrame } from './renderFrameAdapter.js';

export function drawUnifiedMediaFrame(ctx, canvas, preparedSource, treatment = {}, progress = 0) {
  if (!preparedSource?.ready) {
    throw new Error(preparedSource?.reason || 'Prepared render source is not ready.');
  }

  const kind = preparedSource.kind;
  if (kind !== 'image' && kind !== 'video') {
    throw new Error(`Unsupported unified render kind: ${kind}.`);
  }

  const element = preparedSource.element || preparedSource.image || preparedSource.video;
  if (!element) {
    throw new Error(`Unified ${kind} source has no loaded drawable element.`);
  }

  return drawResolvedFrame(
    ctx,
    canvas,
    { type: kind, element },
    treatment,
    progress,
  );
}

export function unifiedMediaKind(preparedSource) {
  return preparedSource?.ready ? preparedSource.kind : null;
}
