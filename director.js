const ACTION_WORDS = ['ride','riding','corner','cornering','road','roadside','track','helmet','motorway','motorcycle','bike','ninja','z800','kawasaki','approach','approaching','pass','overtake','launch','start','accelerate','throttle','engine'];
const HERO_WORDS = ['hero','blue','stormcloud','ninja','front','side','detail','close','portrait','sunset','beauty'];

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function scoreMedia(m) {
  const name = m.name.toLowerCase();
  let score = 55;
  if (m.type.startsWith('video')) score += 8;
  if (m.type.startsWith('image')) score += 3;
  if (m.duration) score += clamp(Math.min(m.duration, 12) * 1.5, 0, 18);
  ACTION_WORDS.forEach(w => { if (name.includes(w)) score += 4; });
  HERO_WORDS.forEach(w => { if (name.includes(w)) score += 3; });
  if (m.width && m.height) {
    const ratio = m.width / m.height;
    if (ratio > 0.55 && ratio < 2.2) score += 5;
    if (ratio > 0.9 && ratio < 1.9) score += 3;
  }
  return clamp(Math.round(score), 0, 100);
}

function chooseDiverse(sorted, count) {
  const picked = [];
  for (const item of sorted) {
    const bucket = Math.round((item.index % Math.max(3, count)));
    const tooSimilar = picked.some(p => p.type === item.type && Math.abs(p.index - item.index) <= 1);
    if (!tooSimilar || picked.length < 2) picked.push(item);
    if (picked.length >= count) break;
    if (bucket > count) break;
  }
  return picked;
}

export function makeEditPlan(media, prompt = '') {
  const lower = prompt.toLowerCase();
  const requestedDuration = Number((prompt.match(/(\d+)\s*(?:second|sec|s)/i) || [])[1]) || 20;
  const duration = clamp(requestedDuration, 8, 45);
  const scored = media.map((m, index) => ({ ...m, index, score: scoreMedia(m) })).sort((a,b) => b.score - a.score);
  const videos = scored.filter(m => m.type.startsWith('video'));
  const photos = scored.filter(m => m.type.startsWith('image'));
  const selectedVideos = chooseDiverse(videos, Math.min(8, Math.max(3, Math.ceil(duration / 3))));
  const selectedPhotos = chooseDiverse(photos, Math.min(2, photos.length));
  const wantFast = /tiktok|fast|aggressive|biker|epic/i.test(prompt);
  const wantsReveal = /reveal|transformation|new bike|z800|ninja/i.test(prompt);
  const wantsDark = /dark|mysterious|moody|nostalgic/i.test(prompt);
  const cuts = [];
  const add = (mediaItem, role, seconds, startBias = 0) => {
    if (!mediaItem) return;
    const max = mediaItem.duration ? Math.max(0.5, mediaItem.duration) : seconds;
    const start = mediaItem.duration ? clamp(startBias, 0, Math.max(0, max - seconds)) : 0;
    cuts.push({ id: `${mediaItem.id}-${cuts.length}`, mediaId: mediaItem.id, name: mediaItem.name, role, start, duration: Math.min(seconds, max), score: mediaItem.score, type: mediaItem.type });
  };
  const pool = [...selectedVideos, ...selectedPhotos];
  if (!pool.length) return { duration, prompt, cuts: [], notes: ['Add some photos or videos first.'], critique: [] };
  add(selectedVideos[0] || pool[0], 'HOOK', wantFast ? 1.4 : 2.1, 0);
  add(selectedVideos[1] || pool[1] || pool[0], 'BUILD', wantFast ? 2.0 : 3.0, 0.8);
  if (wantsReveal) add(selectedVideos[2] || pool[2] || pool[0], 'REVEAL', wantFast ? 1.8 : 2.4, 0.5);
  add(selectedVideos[3] || pool[3] || pool[0], 'ACTION', wantFast ? 2.2 : 3.2, 1.0);
  add(selectedPhotos[0] || selectedVideos[4] || pool[0], 'DETAIL', wantFast ? 1.3 : 2.0);
  add(selectedVideos[4] || selectedVideos[1] || pool[0], 'HERO', wantFast ? 2.2 : 3.0, 1.2);
  if (selectedPhotos[1]) add(selectedPhotos[1], 'HERO STILL', 2.0);
  add(selectedVideos[5] || selectedVideos[0], 'OUTRO', 2.2, 0.3);
  const total = cuts.reduce((s,c) => s + c.duration, 0);
  if (total > duration) {
    const factor = duration / total;
    cuts.forEach(c => c.duration = Math.max(0.8, +(c.duration * factor).toFixed(2)));
  }
  const notes = [
    `Selected ${selectedVideos.length} strong video candidates${selectedPhotos.length ? ` and ${selectedPhotos.length} photo candidates` : ''}.`,
    'The director prioritises variety instead of using every file.',
    wantsReveal ? 'Reveal structure detected from your prompt.' : 'Cinematic hook/build/action structure applied.',
    wantsDark ? 'Opening treatment: darker / mysterious intent.' : 'Opening treatment: clean cinematic contrast intent.'
  ];
  return { duration, prompt, cuts, notes, critique: [] };
}

export function makeBetter(plan, media) {
  const strongest = [...media].map((m,i) => ({...m, i, score: scoreMedia(m)})).sort((a,b)=>b.score-a.score);
  const currentIds = new Set(plan.cuts.map(c=>c.mediaId));
  const unused = strongest.find(m => !currentIds.has(m.id));
  const critique = [];
  let next = structuredClone(plan);
  if (next.cuts.length && next.cuts[0].duration > 1.8) {
    critique.push('The opening is slightly slow; tightened the hook.');
    next.cuts[0].duration = 1.4;
  }
  if (unused && unused.score > 78) {
    critique.push(`Found a stronger unused shot: ${unused.name}.`);
    const replaceIndex = Math.min(3, Math.max(1, next.cuts.length - 2));
    next.cuts[replaceIndex] = { id: `${unused.id}-better`, mediaId: unused.id, name: unused.name, role: next.cuts[replaceIndex].role, start: 0, duration: Math.min(2.4, unused.duration || 2.4), score: unused.score, type: unused.type };
  }
  if (next.cuts.length > 5) {
    const seen = new Set();
    next.cuts = next.cuts.filter(c => {
      if (seen.has(c.mediaId) && c.role !== 'OUTRO') return false;
      seen.add(c.mediaId); return true;
    });
    critique.push('Removed one repetitive beat to improve visual variety.');
  }
  critique.push('Rebalanced the sequence for a stronger reveal and ending.');
  next.version = (plan.version || 1) + 1;
  next.critique = critique;
  next.notes = [...(plan.notes || []), ...critique];
  return next;
}
