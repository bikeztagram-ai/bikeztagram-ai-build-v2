function baseDuration(c, intentValue, i, total) {
  const quality = n(c.directorSelectionScore, c.score);
  const r = role(c, i, total);
  let d = r === 'hook' ? .9 : r === 'hero' ? 1.7 : r === 'action' ? 1.0 : r === 'reveal' ? 1.2 : r === 'emotional' ? 1.7 : 1.3;
  if (quality > 180) d += .15;
  if (intentValue.fast) d -= .15;
  if (intentValue.calm) d += .25;
  if (intentValue.trailer && (r === 'hook' || r === 'reveal')) d -= .05;
  if (intentValue.trailer && (r === 'build' || r === 'setup' || r === 'approach')) d -= .03; // Reduce duration for trailer-like shots in build/setup/approach roles
  return clamp(d, .65, 2.4);
}
