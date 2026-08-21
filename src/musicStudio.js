/*
 * Bikeztagram AI — music studio control layer.
 *
 * Inspired by the strongest product patterns observed in Suno, Udio,
 * Donna, Soniva, Mureka and MusicGPT: generation is only the first step.
 * The product also needs section-level replace, extend, remix/style,
 * stem-aware editing and reusable creative personas.
 *
 * This module is provider/model agnostic. It describes the operation and
 * leaves actual audio generation to the music-generation adapter.
 */

const text = (value) => String(value ?? '').trim();
const number = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function createMusicEditRequest({
  operation = 'replace-section',
  trackId = '',
  start = 0,
  end = 0,
  prompt = '',
  lyrics = '',
  style = '',
  vocals = null,
  duration,
  referenceAudio = null,
  referenceImage = null,
  referenceVideo = null,
} = {}) {
  const allowed = new Set(['replace-section', 'extend', 'remix', 'style-transfer', 'instrumental', 'vocal-change', 'stem-edit']);
  const safeOperation = allowed.has(operation) ? operation : 'replace-section';
  return {
    version: 'music-edit-request-v1',
    operation: safeOperation,
    trackId: text(trackId),
    range: { start: Math.max(0, number(start)), end: Math.max(0, number(end)) },
    prompt: text(prompt),
    lyrics: text(lyrics),
    style: text(style),
    vocals: vocals === null ? null : Boolean(vocals),
    duration: duration == null ? null : Math.max(1, number(duration)),
    references: {
      audio: referenceAudio || null,
      image: referenceImage || null,
      video: referenceVideo || null,
    },
    preserve: {
      identity: true,
      editorialTiming: true,
      copyrightSafety: true,
    },
  };
}

export function createMusicPersona({ name = '', genre = '', mood = '', vocalCharacter = '', instrumentation = [], notes = '' } = {}) {
  return {
    version: 'music-persona-v1',
    name: text(name) || 'Bikeztagram Original',
    genre: text(genre),
    mood: text(mood),
    vocalCharacter: text(vocalCharacter),
    instrumentation: Array.isArray(instrumentation) ? instrumentation.map(text).filter(Boolean) : [],
    notes: text(notes),
    originalOnly: true,
  };
}

export function createStemPlan({ stems = [], requestedEdits = [] } = {}) {
  const allowed = new Set(['vocals', 'drums', 'bass', 'guitar', 'keys', 'strings', 'sfx', 'instrumental', 'other']);
  return {
    version: 'music-stem-plan-v1',
    stems: (Array.isArray(stems) ? stems : []).filter(stem => allowed.has(stem)),
    requestedEdits: Array.isArray(requestedEdits) ? requestedEdits : [],
  };
}

export function createMusicGenerationCandidates({ count = 2, strategy = 'prompt-variation' } = {}) {
  const safeCount = Math.max(1, Math.min(6, Math.round(number(count, 2))));
  return {
    version: 'music-candidate-plan-v1',
    count: safeCount,
    strategy: text(strategy) || 'prompt-variation',
    rankBy: ['creative-fit', 'audio-quality', 'structure', 'beat-clarity', 'editorial-utility'],
  };
}
