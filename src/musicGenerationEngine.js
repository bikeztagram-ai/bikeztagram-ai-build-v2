/*
 * Bikeztagram AI — provider/model-agnostic music generation engine.
 *
 * Product patterns incorporated from the current AI-music landscape:
 * prompt generation, multiple candidates, image/audio/video references,
 * section replacement, extension, remix/style operations, reusable
 * personas, stem-aware editing and editorial beat metadata.
 *
 * The product owns this contract. Actual generation can be local/open or
 * remote, while the existing procedural soundtrack remains the guaranteed
 * fallback until a model runtime is available.
 */

import { buildSoundtrackBrief, buildBeatGrid } from './musicDirector.js';
import { createMusicEditRequest, createMusicPersona, createMusicStemPlan, createMusicGenerationCandidates } from './musicStudio.js';

const text = (value) => String(value ?? '').trim();

export function createMusicGenerationRequest({
  prompt = '', duration = 15, bpm, genre, mood, energy, vocals = false,
  candidates = 2, referenceAudio = null, referenceImage = null, referenceVideo = null,
  persona = null,
} = {}) {
  const brief = buildSoundtrackBrief({ prompt, duration, bpm, genre, mood, energy });
  return {
    version: 'music-generation-request-v2',
    prompt: text(prompt) || brief.creativeRequest,
    duration: brief.duration,
    genre: brief.genre,
    bpm: brief.bpm,
    mood: brief.mood,
    energy: brief.energy,
    vocals: Boolean(vocals),
    references: { audio: referenceAudio || null, image: referenceImage || null, video: referenceVideo || null },
    persona: persona ? createMusicPersona(persona) : null,
    sections: brief.sections,
    beatGrid: brief.beatGrid,
    drops: brief.sections
      .filter(section => ['main', 'finale'].includes(section.id))
      .map(section => ({ time: section.start, kind: 'section-drop' })),
    candidatePlan: createMusicGenerationCandidates({ count: candidates }),
    originalOnly: true,
    status: 'queued',
  };
}

export function buildMusicGenerationAdapter({ generate, fallback } = {}) {
  return {
    async generateTrack(request) {
      if (typeof generate === 'function') {
        const result = await generate(request);
        if (result?.audioUrl || result?.audioDataUrl || result?.blob) return { ...result, request, source: 'model' };
      }
      if (typeof fallback === 'function') {
        const result = await fallback(request);
        if (result) return { ...result, request, source: 'fallback' };
      }
      return { request, source: 'unavailable', audioUrl: null, audioDataUrl: null, beatGrid: buildBeatGrid(request) };
    },

    async editTrack(request) {
      if (typeof generate !== 'function') return { request, source: 'unavailable' };
      const result = await generate({ ...request, edit: createMusicEditRequest(request) });
      return result ? { ...result, request, source: 'model' } : { request, source: 'unavailable' };
    },
  };
}

export function analyseGeneratedMusic({ duration = 15, bpm = 120, drops = [], sections = [] } = {}) {
  const beatGrid = buildBeatGrid({ duration, bpm });
  const validDrops = (Array.isArray(drops) ? drops : [])
    .map(drop => ({ ...drop, time: Number(drop.time) }))
    .filter(drop => Number.isFinite(drop.time) && drop.time >= 0 && drop.time <= duration)
    .sort((a, b) => a.time - b.time);
  return {
    version: 'generated-music-analysis-v2',
    duration,
    bpm,
    beatGrid,
    drops: validDrops,
    sections: Array.isArray(sections) ? sections : [],
    energyEvents: validDrops.map(drop => ({ time: drop.time, type: 'drop', strength: 1 })),
    analysis: 'planned-beat-grid',
  };
}

export { createMusicEditRequest, createMusicPersona, createMusicStemPlan, createMusicGenerationCandidates };
