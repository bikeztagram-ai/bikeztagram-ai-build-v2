/* BIKEZTAGRAM AI — resumable cinematic session controller. £0-only. */

import { createTrailerSession, markShotStarted, markShotCompleted, markShotFailed, getNextPendingShot, isTrailerComplete, saveTrailerSession } from './cinematicTrailerSession.js';
import { generateCinematicShot } from './cinematicGenerationClient.js';

export function createCinematicSessionController(plan, options = {}) {
  let session = options.session || createTrailerSession(plan);
  const listeners = new Set();

  const emit = () => listeners.forEach((listener) => listener(session));

  return {
    getSession: () => session,
    subscribe(listener) { listeners.add(listener); listener(session); return () => listeners.delete(listener); },
    async run({ signal } = {}) {
      while (!isTrailerComplete(session)) {
        if (signal?.aborted) throw new DOMException('Generation cancelled.', 'AbortError');
        const shot = getNextPendingShot(session);
        if (!shot) break;
        session = markShotStarted(session, shot.id); saveTrailerSession(session); emit();
        try {
          const blob = await generateCinematicShot({ ...shot, shotId: shot.id, signal, onProgress: (event) => options.onProgress?.(event, session) });
          session = markShotCompleted(session, shot.id, { sizeBytes: blob.size, mimeType: blob.type });
          session.results = [...(session.results || []), { shotId: shot.id, blob }];
          saveTrailerSession(session); emit();
        } catch (error) {
          session = markShotFailed(session, shot.id, error);
          saveTrailerSession(session); emit();
          throw error;
        }
      }
      return session;
    },
    reset() { session = createTrailerSession(plan); saveTrailerSession(session); emit(); return session; },
  };
}
