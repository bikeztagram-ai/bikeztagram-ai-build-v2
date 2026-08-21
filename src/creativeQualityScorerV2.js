/* Bikeztagram AI — creative quality scorer v2.
 * Scores the film as a piece of creative work, not merely as a valid MP4.
 */

const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value) => Math.max(0, Math.min(100, n(value)));

export function scoreCreativeFilm({
  pacing = 0, beatUtilisation = 0, musicImpact = 0, shotVariety = 0,
  storyCoherence = 0, continuity = 0, generatedSceneFit = 0,
  captionQuality = 0, technicalQuality = 100,
} = {}) {
  const weights = {
    pacing: .14, beatUtilisation: .14, musicImpact: .14, shotVariety: .10,
    storyCoherence: .16, continuity: .10, generatedSceneFit: .08,
    captionQuality: .06, technicalQuality: .08,
  };
  const values = { pacing, beatUtilisation, musicImpact, shotVariety, storyCoherence, continuity, generatedSceneFit, captionQuality, technicalQuality };
  const total = Object.entries(weights).reduce((sum, [key, weight]) => sum + clamp(values[key]) * weight, 0);
  const weak = Object.entries(values)
    .map(([key, value]) => [key, clamp(value)])
    .filter(([, value]) => value < 55)
    .sort((a, b) => a[1] - b[1])
    .map(([key]) => key);
  return {
    version: 'creative-quality-score-v2',
    score: Number(total.toFixed(1)),
    pass: total >= 72 && weak.length <= 2,
    weakAreas: weak,
    weights,
  };
}

export function buildRevisionRequest(score, { preserve = [] } = {}) {
  return {
    version: 'creative-revision-request-v1',
    score,
    preserve: Array.isArray(preserve) ? preserve : [],
    priorities: Array.isArray(score?.weakAreas) ? score.weakAreas.slice(0, 4) : [],
    action: 'revise-and-rerender',
  };
}
