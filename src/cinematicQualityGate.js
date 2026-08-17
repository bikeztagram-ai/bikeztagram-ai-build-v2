/* BIKEZTAGRAM AI — local cinematic quality gate. £0-only. */
export function evaluateCinematicResult({ session, output } = {}) {
  const errors = [];
  if (!session?.shots?.length) errors.push('No shots generated.');
  if (session?.shots?.some((shot) => shot.status !== 'complete')) errors.push('Not all planned shots completed.');
  if (!(output?.blob instanceof Blob) || output.blob.size === 0) errors.push('Trailer output is empty.');
  return { passed: errors.length === 0, errors, shotCount: session?.shots?.length || 0, bytes: output?.blob?.size || 0 };
}
