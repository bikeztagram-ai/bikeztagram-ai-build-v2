/* BIKEZTAGRAM AI — unified frame adapter.
   Draws already-resolved video or image media using the existing cinematic treatment.
   No upload, generation, Blob, or Gemini behaviour is changed here. */

export function drawResolvedFrame(ctx, canvas, source, treatment = {}, progress = 0) {
  if (!ctx || !canvas || !source) throw new Error('Render frame adapter requires a canvas and source.');
  const type = String(source.type || '').toLowerCase();
  const media = source.element || source.image || source.video;
  if (!media) throw new Error('Render frame adapter received no drawable media.');

  const sw = Number(media.videoWidth || media.naturalWidth || media.width);
  const sh = Number(media.videoHeight || media.naturalHeight || media.height);
  if (!sw || !sh) throw new Error('Resolved media has no drawable dimensions.');

  const intensity = Math.max(0, Math.min(1.5, Number(treatment.motionIntensity) || 0.65));
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  const ease = p < .5 ? 4*p*p*p : 1-Math.pow(-2*p+2,3)/2;
  const style = String(treatment.motionStyle || 'static').toLowerCase();
  let scale = 1.035, x = 0, y = 0;
  if (style === 'slow-push') scale += ease*.085*intensity;
  else if (style === 'slow-pull') scale += (1-ease)*.085*intensity;
  else if (style === 'pan-left') { scale=1.08; x=(.5-ease)*canvas.width*.10*intensity; }
  else if (style === 'pan-right') { scale=1.08; x=(ease-.5)*canvas.width*.10*intensity; }
  else if (style === 'tilt-up') { scale=1.08; y=(.5-ease)*canvas.height*.07*intensity; }
  else if (style === 'tilt-down') { scale=1.08; y=(ease-.5)*canvas.height*.07*intensity; }

  const sourceRatio = sw/sh;
  const targetRatio = canvas.width/canvas.height;
  let width, height;
  if (sourceRatio > targetRatio) { height=canvas.height*scale; width=height*sourceRatio; }
  else { width=canvas.width*scale; height=width/sourceRatio; }
  const dx=(canvas.width-width)/2+x;
  const dy=(canvas.height-height)/2+y;

  ctx.save();
  ctx.filter = String(treatment.filter || 'none');
  ctx.drawImage(media, dx, dy, width, height);
  ctx.restore();
  return { type: type || 'video', width: sw, height: sh, scale, x, y };
}
