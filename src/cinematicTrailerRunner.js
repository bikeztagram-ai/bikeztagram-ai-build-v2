/* BIKEZTAGRAM AI — resumable trailer runner. £0-only. */
import { generateCinematicShot } from './cinematicGenerationClient.js';
import { assembleCinematicTrailer } from './cinematicTrailerAssembler.js';
import { createTrailerOutput } from './cinematicTrailerOutput.js';
import { validateTrailerSession } from './cinematicTrailerValidation.js';
import { markShotStarted, markShotCompleted, markShotFailed, updateTrailerSession, getNextPendingShot, saveTrailerSession } from './cinematicTrailerSession.js';

function reconcilePersistedSession(session) {
  const results = Array.isArray(session?.results) ? session.results : [];
  const shots = (session?.shots || []).map((shot) => {
    const result = results.find((item) => item?.id === shot.id);
    if (shot.status === 'complete' && !(result?.blob instanceof Blob)) return { ...shot, status: 'pending', error: null };
    return shot;
  });
  const usableResults = results.filter((result) => result?.blob instanceof Blob && result.blob.size > 0);
  return updateTrailerSession({ ...session, shots, results: usableResults, output: session?.output?.blob instanceof Blob ? session.output : null }, { status: 'ready' });
}

export async function runCinematicTrailer(session, { onProgress, onSession, signal, assemble = true } = {}) {
  let current = reconcilePersistedSession(session);
  const validation = validateTrailerSession(current);
  if (!validation.valid) throw new Error(`Trailer validation failed: ${validation.errors.join(' ')}`);
  current = updateTrailerSession(current, { status: 'generating' });
  saveTrailerSession(current); onSession?.(current);

  while (true) {
    const shot = getNextPendingShot(current);
    if (!shot || shot.status === 'complete') break;
    if (signal?.aborted) throw new DOMException('Trailer generation cancelled.', 'AbortError');
    current = markShotStarted(current, shot.id); saveTrailerSession(current); onSession?.(current);
    try {
      const blob = await generateCinematicShot({ ...shot, prompt: shot.generationPrompt || shot.prompt, signal,
        onProgress: (event) => onProgress?.({ ...event, shotId: shot.id, sessionId: current.id }) });
      current = markShotCompleted(current, shot.id, { bytes: blob.size, mimeType: blob.type || 'video/webm' });
      current = updateTrailerSession(current, { results: [...(current.results || []).filter((r) => r.id !== shot.id), { id: shot.id, blob }] });
      saveTrailerSession(current); onSession?.(current);
    } catch (error) {
      current = markShotFailed(current, shot.id, error); saveTrailerSession(current); onSession?.(current); throw error;
    }
  }

  if (assemble && current.shots.every((shot) => shot.status === 'complete')) {
    const outputBlob = await assembleCinematicTrailer(current.results || [], { signal, onProgress: (percent) => onProgress?.({ stage: 'assembly', percent }) });
    const output = createTrailerOutput(outputBlob, { sessionId: current.id, shotCount: current.shots.length });
    current = updateTrailerSession(current, { status: 'complete', output });
    saveTrailerSession(current); onSession?.(current);
  }
  return current;
}
