/* BIKEZTAGRAM AI — subject-agnostic story planning. */

const ARCHETYPES = Object.freeze({
  cinematic: ['hook','establish','build','hero','resolve'],
  social: ['hook','context','payoff','cta'],
  documentary: ['question','observe','reveal','reflection'],
  product: ['problem','detail','demonstrate','benefit','proof'],
  travel: ['arrival','discover','experience','memory'],
});

export function chooseStoryArchetype({ goal = 'engage', treatment = 'cinematic', subjectType = 'general' } = {}) {
  if (goal === 'sell' || subjectType === 'product') return 'product';
  if (goal === 'document') return 'documentary';
  if (subjectType === 'travel') return 'travel';
  if (treatment === 'social-punchy') return 'social';
  return 'cinematic';
}

export function buildCreativeStory({ goal, treatment, subjectType, duration = 30, audience = 'general' } = {}) {
  const archetype = chooseStoryArchetype({ goal, treatment, subjectType });
  const beats = ARCHETYPES[archetype] || ARCHETYPES.cinematic;
  const safeDuration = Math.max(3, Number(duration) || 30);
  const weight = 1 / beats.length;
  return { version: 1, archetype, subjectType: subjectType || 'general', audience, duration: safeDuration, beats: beats.map((purpose, index) => ({ id: `${purpose}-${index + 1}`, purpose, start: Number((index * safeDuration * weight).toFixed(2)), end: Number(((index + 1) * safeDuration * weight).toFixed(2)) })) };
}
