/* Bikeztagram AI Music Generation Engine.
   The product owns this contract; actual model/runtime adapters can be local/open or remote.
   The existing procedural soundtrack remains the guaranteed fallback. */

import { buildSoundtrackBrief, buildBeatGrid } from './musicDirector.js';

const text = (value) => String(value ?? '').trim();

export function createMusicGenerationRequest({ prompt = '', duration = 15, bpm, genre, mood, energy, vocals = false } = {}) {
  const brief = buildSoundtrackBrief({ prompt, duration, bpm, genre, mood, energy });
  return {
    version: 'music-generation-request-v1',
    prompt: text(prompt) || brief.creativeRequest,
    duration: brief.duration,
    genre: brief.genre,
    bpm: brief.bpm,
    mood: brief.mood,
    energy: brief.energy,
    vocals: Boolean(vocals),
    sections: brief.sections,
    beatGrid: brief.beatGrid,
    drops: brief.sections.filter(section => ['main', 'finale'].includes(section.id)).map(section => ({ time: section.start, kind: 'section-drop' })),
    originalOnly: true,
    status: 'queued'
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
    }
  };
}

export function analyseGeneratedMusic({ duration = 15, bpm = 120, drops = [] } = {}) {
  const beatGrid = buildBeatGrid({ duration, bpm });
  const validDrops = (Array.isArray(drops) ? drops : [])
    .map(drop => ({ ...drop, time: Number(drop.time) }))
    .filter(drop => Number.isFinite(drop.time) && drop.time >= 0 && drop.time <= duration)
    .sort((a, b) => a.time - b.time);
  return {
    version: 'generated-music-analysis-v1',
    duration,
    bpm,
    beatGrid,
    drops: validDrops,
    energyEvents: validDrops.map(drop => ({ time: drop.time, type: 'drop', strength: 1 })),
    analysis: 'planned-beat-grid'
  };
}
