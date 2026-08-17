/* BIKEZTAGRAM AI — Visual Look Engine foundation. £0-first. */

export const VISUAL_LOOKS = Object.freeze([
  { id: 'cinematic-natural', name: 'Cinematic Natural', tags: ['cinematic', 'natural', 'film'], grade: { contrast: 1.06, saturation: 0.98, exposure: 0, temperature: 0, vignette: 0.08 } },
  { id: 'night-neon', name: 'Night Neon', tags: ['night', 'neon', 'urban', 'gta'], grade: { contrast: 1.14, saturation: 1.08, exposure: -0.08, temperature: -0.04, vignette: 0.16 } },
  { id: 'golden-hour', name: 'Golden Hour', tags: ['sunset', 'warm', 'golden'], grade: { contrast: 1.04, saturation: 1.03, exposure: 0.04, temperature: 0.08, vignette: 0.06 } },
  { id: 'gritty-action', name: 'Gritty Action', tags: ['action', 'gritty', 'bike'], grade: { contrast: 1.18, saturation: 0.94, exposure: -0.02, temperature: -0.02, vignette: 0.12 } },
  { id: 'luxury-film', name: 'Luxury Film', tags: ['premium', 'film', 'luxury'], grade: { contrast: 1.08, saturation: 0.92, exposure: 0.02, temperature: 0.03, vignette: 0.1 } },
]);

export function findVisualLooks(query = '') {
  const q = String(query).trim().toLowerCase();
  if (!q) return [...VISUAL_LOOKS];
  return VISUAL_LOOKS.filter((look) => [look.name, ...look.tags].join(' ').toLowerCase().includes(q));
}

export function getVisualLook(id) {
  return VISUAL_LOOKS.find((look) => look.id === id) || null;
}

export function chooseVisualLook({ mood = '', environment = '', subject = '', preference = '' } = {}) {
  const text = `${mood} ${environment} ${subject} ${preference}`.toLowerCase();
  const scored = VISUAL_LOOKS.map((look) => ({ look, score: look.tags.reduce((score, tag) => score + (text.includes(tag) ? 2 : 0), 0) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.look || VISUAL_LOOKS[0];
}

export function normaliseLookAdjustments(adjustments = {}) {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  return {
    contrast: clamp(adjustments.contrast ?? 1, 0.7, 1.4),
    saturation: clamp(adjustments.saturation ?? 1, 0.7, 1.4),
    exposure: clamp(adjustments.exposure ?? 0, -0.5, 0.5),
    temperature: clamp(adjustments.temperature ?? 0, -0.5, 0.5),
    vignette: clamp(adjustments.vignette ?? 0, 0, 0.4),
  };
}
