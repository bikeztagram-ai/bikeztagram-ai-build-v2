export function assessRenderDuration(actualDuration, expectedDuration, tolerance = null) {
  const actual = Number(actualDuration);
  const expected = Number(expectedDuration);
  if (!Number.isFinite(actual) || actual <= 0) {
    return { valid: false, reason: 'invalid-output-duration', actualDuration: 0, expectedDuration: Number.isFinite(expected) ? expected : 0, shortfallSeconds: 0, toleranceSeconds: 0 };
  }
  const target = Number.isFinite(expected) && expected > 0 ? expected : actual;
  const allowed = Number.isFinite(tolerance) && tolerance >= 0
    ? tolerance
    : Math.min(1.5, Math.max(0.75, target * 0.10));
  const shortfall = Math.max(0, target - actual);
  return {
    valid: shortfall <= allowed,
    reason: shortfall <= allowed ? 'within-duration-tolerance' : 'materially-short',
    actualDuration: Number(actual.toFixed(2)),
    expectedDuration: Number(target.toFixed(2)),
    shortfallSeconds: Number(shortfall.toFixed(2)),
    toleranceSeconds: Number(allowed.toFixed(2)),
  };
}
