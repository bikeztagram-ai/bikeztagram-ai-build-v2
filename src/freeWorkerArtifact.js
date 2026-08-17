/* BIKEZTAGRAM AI — portable free-worker artifact handoff.
 * No paid storage/provider dependency. The worker returns metadata and a temporary
 * artifact reference; the server validates it before importing into the project.
 */

const MAX_BYTES = 250 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export function createWorkerArtifact({ jobId, fileName, mimeType, size, checksum, source }) {
  if (!jobId || !fileName || !source) throw new Error('Missing worker artifact identity');
  if (!ALLOWED_TYPES.has(mimeType)) throw new Error('Unsupported video artifact type');
  if (!Number.isFinite(Number(size)) || Number(size) <= 0 || Number(size) > MAX_BYTES) {
    throw new Error('Video artifact exceeds safe size limits');
  }
  return {
    version: 'worker-artifact-v1',
    jobId,
    fileName,
    mimeType,
    size: Number(size),
    checksum: checksum || null,
    source,
    createdAt: new Date().toISOString(),
    zeroCostPolicy: 'ZERO_GBP_ONLY',
  };
}

export function validateWorkerArtifact(artifact, expectedJobId) {
  if (!artifact || artifact.jobId !== expectedJobId) return { valid: false, reason: 'job mismatch' };
  if (!ALLOWED_TYPES.has(artifact.mimeType)) return { valid: false, reason: 'unsupported type' };
  if (!Number.isFinite(Number(artifact.size)) || Number(artifact.size) > MAX_BYTES) {
    return { valid: false, reason: 'unsafe size' };
  }
  return { valid: true, reason: null };
}
