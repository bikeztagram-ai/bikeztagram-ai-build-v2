/* BIKEZTAGRAM AI — serializable trailer manifest. £0-only. */
export function serializeTrailerManifest(session) {
  if (!session?.id) throw new Error('Trailer session requires an id.');
  return JSON.stringify({ version: 1, id: session.id, status: session.status, createdAt: session.createdAt, updatedAt: session.updatedAt, plan: session.plan, shots: session.shots, output: session.output ? { mimeType: session.output.mimeType, sizeBytes: session.output.sizeBytes, createdAt: session.output.createdAt } : null });
}

export function parseTrailerManifest(serialized) {
  if (!serialized) return null;
  const parsed = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
  if (!parsed?.id || !Array.isArray(parsed.shots)) throw new Error('Invalid trailer manifest.');
  return parsed;
}
