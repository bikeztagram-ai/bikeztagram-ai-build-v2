const TOKEN_GROUPS = {
  hook: ['hook', 'opening', 'intro', 'tease', 'mystery', 'attention'],
  reveal: ['reveal', 'unveil', 'showcase', 'hero', 'payoff'],
  action: ['action', 'fast', 'speed', 'riding', 'ride', 'driving', 'chase', 'cornering', 'movement', 'dynamic'],
  emotional: ['emotional', 'emotion', 'warm', 'joy', 'happy', 'calm', 'peaceful', 'dramatic', 'epic'],
  cinematic: ['cinematic', 'film', 'trailer', 'moody', 'dramatic', 'premium', 'luxury'],
  social: ['reel', 'reels', 'tiktok', 'instagram', 'social', 'shorts'],
  portrait: ['portrait', 'vertical', '9:16', 'phone', 'mobile'],
  square: ['square', '1:1'],
  landscape: ['landscape', 'horizontal', '16:9', 'youtube'],
  slow: ['slow', 'slow-motion', 'slow motion', 'lingering', 'dreamy'],
  rapid: ['rapid', 'quick', 'quick cuts', 'punchy', 'high energy', 'high-energy', 'fast cuts'],
  text: ['text', 'title', 'titles', 'caption', 'captions'],
};

const PHASES = [
  { id: 'hook', keywords: TOKEN_GROUPS.hook, purpose: 'Hook the viewer immediately.' },
  { id: 'build', keywords: ['build', 'anticipation', 'tension', 'approach', 'tease'], purpose: 'Build anticipation and visual context.' },
  { id: 'reveal', keywords: TOKEN_GROUPS.reveal, purpose: 'Deliver the main visual reveal or payoff.' },
  { id: 'action', keywords: TOKEN_GROUPS.action, purpose: 'Escalate movement, energy and rhythm.' },
  { id: 'hero', keywords: ['hero', 'final', 'ending', 'end', 'finish', 'payoff'], purpose: 'Finish on the strongest hero image or moment.' },
];

const ASPECTS = {
  portrait: { id: 'portrait', width: 1080, height: 1920, label: '9:16 vertical' },
  square: { id: 'square', width: 1080, height: 1080, label: '1:1 square' },
  landscape: { id: 'landscape', width: 1920, height: 1080, label: '16:9 landscape' },
};

function normalise(value) {
  return String(value ?? '').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function countMatches(text, words) {
  return words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
}

function detectDuration(text, fallback = 15) {
  const match = text.match(/(?:about|around|under|up to|for)?\s*(\d+(?:\.\d+)?)\s*(?:sec|secs|second|seconds|s)\b/);
  if (!match) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.max(3, Math.min(60, value)) : fallback;
}

function detectAspect(text) {
  if (hasAny(text, TOKEN_GROUPS.square)) return ASPECTS.square;
  if (hasAny(text, TOKEN_GROUPS.landscape)) return ASPECTS.landscape;
  return ASPECTS.portrait;
}

function detectPacing(text) {
  if (hasAny(text, TOKEN_GROUPS.rapid)) return 'rapid';
  if (hasAny(text, TOKEN_GROUPS.slow)) return 'slow';
  if (hasAny(text, TOKEN_GROUPS.action)) return 'dynamic';
  return 'cinematic';
}

function detectTone(text) {
  const scores = {
    cinematic: countMatches(text, TOKEN_GROUPS.cinematic),
    energetic: countMatches(text, ['fast', 'speed', 'action', 'high energy', 'punchy', 'aggressive']),
    emotional: countMatches(text, TOKEN_GROUPS.emotional),
    minimal: countMatches(text, ['minimal', 'clean', 'simple', 'subtle']),
  };
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'cinematic';
}

function detectPriorities(text) {
  const priorities = [];
  if (hasAny(text, TOKEN_GROUPS.hook)) priorities.push('strong-opening-hook');
  if (hasAny(text, TOKEN_GROUPS.reveal)) priorities.push('clear-reveal-payoff');
  if (hasAny(text, TOKEN_GROUPS.action)) priorities.push('movement-and-energy');
  if (hasAny(text, TOKEN_GROUPS.emotional)) priorities.push('emotional-connection');
  if (hasAny(text, TOKEN_GROUPS.text)) priorities.push('restrained-text-overlays');
  priorities.push('shot-variety', 'strong-final-frame');
  return [...new Set(priorities)];
}

function detectArc(text) {
  const requested = PHASES.filter((phase) => hasAny(text, phase.keywords)).map((phase) => phase.id);
  const base = ['hook', 'build', 'reveal', 'action', 'hero'];
  if (!requested.length) return base;
  return base.filter((id) => requested.includes(id) || ['build', 'action'].includes(id));
}

function deriveBeatProfile(pacing, duration) {
  const beats = pacing === 'rapid' ? 2.2 : pacing === 'slow' ? 0.8 : pacing === 'dynamic' ? 1.4 : 1.0;
  const averageShotSeconds = Math.max(0.65, Math.min(3.5, 1.5 / beats));
  return {
    pacing,
    targetCuts: Math.max(3, Math.min(12, Math.round(duration / averageShotSeconds))),
    averageShotSeconds: Number(averageShotSeconds.toFixed(2)),
  };
}

export function parseCreativeBrief(brief = '', options = {}) {
  const text = normalise(brief);
  const duration = detectDuration(text, Number(options.targetDuration) || 15);
  const aspect = options.aspect || detectAspect(text);
  const pacing = detectPacing(text);
  const tone = detectTone(text);
  const socialFirst = hasAny(text, TOKEN_GROUPS.social) || aspect.id === 'portrait';
  const phases = detectArc(text);
  const beatProfile = deriveBeatProfile(pacing, duration);

  return {
    version: 'creative-brief-v1',
    brief: String(brief || '').trim(),
    targetDuration: duration,
    aspectRatio: aspect.id,
    frame: { width: aspect.width, height: aspect.height, label: aspect.label },
    socialFirst,
    pacing,
    tone,
    storyArc: phases,
    priorities: detectPriorities(text),
    beatProfile,
    direction: {
      preserveAuthenticFootage: true,
      preferSubjectContinuity: true,
      avoidRepetitiveShots: true,
      finishStrong: true,
    },
  };
}

export function describeCreativeBrief(profile) {
  if (!profile || typeof profile !== 'object') return 'No creative brief parsed.';
  const arc = Array.isArray(profile.storyArc) ? profile.storyArc.join(' → ') : 'hook → build → reveal → action → hero';
  return `${profile.targetDuration}s ${profile.frame?.label || profile.aspectRatio} • ${profile.tone} • ${profile.pacing} pacing • ${arc}`;
}
