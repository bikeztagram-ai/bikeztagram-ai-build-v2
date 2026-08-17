/* BIKEZTAGRAM AI — render acceptance gate.
 * A deployment is not a success unless the produced media proves it is usable.
 */

export function assessRenderOutput({
  playable = false,
  durationSeconds = 0,
  expectedMinSeconds = 2,
  hasVideoTrack = false,
  hasBlackTail = false,
  fatalError = null,
} = {}) {
  const duration = Number(durationSeconds) || 0;
  const durationOk = duration >= Number(expectedMinSeconds || 0);
  const passed = !fatalError && playable && hasVideoTrack && durationOk && !hasBlackTail;

  return {
    passed,
    playable: Boolean(playable),
    hasVideoTrack: Boolean(hasVideoTrack),
    durationSeconds: duration,
    expectedMinSeconds: Number(expectedMinSeconds || 0),
    hasBlackTail: Boolean(hasBlackTail),
    fatalError: fatalError || null,
    verdict: passed ? 'ACCEPT' : 'REJECT',
    reasons: [
      !playable && 'output is not playable',
      !hasVideoTrack && 'missing video track',
      !durationOk && 'output is shorter than expected',
      hasBlackTail && 'output contains an unexpected black tail',
      fatalError && `fatal render error: ${fatalError}`,
    ].filter(Boolean),
  };
}
