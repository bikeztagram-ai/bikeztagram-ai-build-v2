const ACTION_WORDS = ['ride', 'riding', 'corner', 'acceleration', 'wheelie', 'flyby', 'chase', 'race', 'speed', 'overtake', 'drift', 'jump', 'motion', 'action'];
const HERO_WORDS = ['hero', 'blue', 'stormcloud', 'ninja', 'kawasaki', 'bikeztagram', 'portrait', 'detail', 'closeup', 'close-up', 'reveal', 'final'];
const SCENIC_WORDS = ['wide', 'landscape', 'sunset', 'sunrise', 'road', 'city', 'mountain', 'coast', 'forest', 'establishing'];
const LOW_VALUE_WORDS = ['blur', 'blurry', 'duplicate', 'test', 'bad', 'dark-frame', 'black'];

function clamp(n, min, max) { return Math.max(min, Math.min(n, max)); }
function safeText(value) { return String(value || '').toLowerCase(); }

export function scoreMedia(m) {
  const name = safeText(m?.name);
  let score = 50;
  if (safeText(m?.type).startsWith('video')) score += 15;
  if (safeText(m?.type).startsWith('image')) score += 5;

  const duration = Number(m?.duration);
  if (Number.isFinite(duration) && duration > 0) {
    score += clamp(Math.min(duration, 15) * 1.5, 0, 18);
    if (duration < .8) score -= 8;
  }

  ACTION_WORDS.forEach((word) => { if (name.includes(word)) score += 5; });
  HERO_WORDS.forEach((word) => { if (name.includes(word)) score += 4; });
  SCENIC_WORDS.forEach((word) => { if (name.includes(word)) score += 3; });
  LOW_VALUE_WORDS.forEach((word) => { if (name.includes(word)) score -= 10; });

  const width = Number(m?.width), height = Number(m?.height);
  if (width > 0 && height > 0) {
    const ratio = width / height;
    if (ratio > 0.55 && ratio < 2.2) score += 5;
    if (ratio > 0.9 && ratio < 1.9) score += 5;
    if (ratio >= 2.2 || ratio <= .45) score -= 3;
  }

  const observed = Number(m?.analysisScore ?? m?.score ?? m?.qualityScore);
  if (Number.isFinite(observed)) score = score * .35 + clamp(observed, 0, 100) * .65;
  return clamp(Math.round(score), 0, 100);
}

export function rankMedia(items = []) {
  return items.map((item, index) => ({ item, index, score: scoreMedia(item) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({ ...entry.item, _directorScore: entry.score, _directorIndex: entry.index }));
}
