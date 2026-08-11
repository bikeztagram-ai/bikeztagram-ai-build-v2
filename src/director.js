const ACTION_WORDS = ['ride', 'riding', 'corner', 'acceleration', 'wheelie', 'flyby'];
const HERO_WORDS = ['hero', 'blue', 'stormcloud', 'ninja', 'kawasaki', 'bikeztagram'];

function clamp(n, min, max) { 
  return Math.max(min, Math.min(n, max)); 
}

export function scoreMedia(m) {
  const name = m.name.toLowerCase();
  let score = 55;

  if (m.type.startsWith('video')) score += 15;
  if (m.type.startsWith('image')) score += 5;
  if (m.duration) score += clamp(Math.min(m.duration, 15) * 2, 0, 20);

  ACTION_WORDS.forEach(w => { if (name.includes(w)) score += 8; });
  HERO_WORDS.forEach(w => { if (name.includes(w)) score += 3; });

  if (m.width && m.height) {
    const ratio = m.width / m.height;
    if (ratio > 0.55 && ratio < 2.2) score += 5;
    if (ratio > 0.9 && ratio < 1.9) score += 5;
  }

  return clamp(Math.round(score), 0, 100);
}

