/* BIKEZTAGRAM AI — deterministic trailer diagnostics. £0-only. */
export function diagnoseTrailerSession(session) {
  const shots = session?.shots || [];
  const counts = shots.reduce((acc, shot) => { acc[shot.status || 'unknown'] = (acc[shot.status || 'unknown'] || 0) + 1; return acc; }, {});
  const failed = shots.filter((shot) => shot.status === 'failed').map((shot) => ({ id: shot.id, error: shot.error || 'Unknown failure', attempts: shot.attempts || 0 }));
  const resumable = shots.some((shot) => shot.status !== 'complete');
  return { sessionId: session?.id || null, status: session?.status || 'unknown', shotCount: shots.length, counts, failed, resumable, outputReady: Boolean(session?.output) };
}

export function formatTrailerDiagnostic(diagnostic) {
  if (!diagnostic) return 'No trailer diagnostic available.';
  const failed = diagnostic.failed.length ? ` Failed shots: ${diagnostic.failed.map((x) => `${x.id} (${x.error})`).join('; ')}` : '';
  return `Trailer ${diagnostic.sessionId || 'unknown'}: ${diagnostic.status}; ${diagnostic.shotCount} shots.${failed}`;
}
