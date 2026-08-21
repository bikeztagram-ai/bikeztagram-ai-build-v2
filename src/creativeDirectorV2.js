/* Bikeztagram AI — unified Creative Director contract.
 * Turns one natural-language brief plus uploaded assets into coordinated
 * story, music, real-media, generated-scene and revision instructions.
 */

const text = (value) => String(value ?? '').trim();

export function createCreativeProductionBrief({
  prompt = '', duration = 15, aspectRatio = '9:16', assets = [],
  music = {}, generation = {}, audience = 'social',
} = {}) {
  return {
    version: 'creative-production-brief-v2',
    prompt: text(prompt),
    duration: Math.max(5, Math.min(120, Number(duration) || 15)),
    aspectRatio: ['9:16', '1:1', '16:9'].includes(aspectRatio) ? aspectRatio : '9:16',
    audience: text(audience) || 'social',
    assets: (Array.isArray(assets) ? assets : []).map((asset, index) => ({
      id: asset?.id || `asset-${index + 1}`,
      type: asset?.type || 'unknown',
      source: asset?.source || 'user',
      role: asset?.role || 'candidate',
    })),
    music: {
      required: music.required !== false,
      prompt: text(music.prompt),
      generateOriginal: music.generateOriginal !== false,
    },
    generation: {
      allowGeneratedScenes: generation.allowGeneratedScenes !== false,
      allowImageToVideo: generation.allowImageToVideo !== false,
      allowTextToVideo: generation.allowTextToVideo !== false,
      preserveSubjects: generation.preserveSubjects !== false,
    },
  };
}

export function buildCreativeTimelineDirective({ story = [], musicEvents = [], generatedScenes = [] } = {}) {
  const events = Array.isArray(musicEvents) ? musicEvents : [];
  const scenes = Array.isArray(generatedScenes) ? generatedScenes : [];
  return {
    version: 'creative-timeline-directive-v2',
    story: Array.isArray(story) ? story : [],
    musicEvents: events.map(event => ({
      time: Number(event?.time) || 0,
      kind: event?.kind || event?.type || 'beat',
      strength: Number(event?.strength) || 1,
    })),
    generatedScenes: scenes.map(scene => ({
      id: scene?.id || null,
      purpose: scene?.purpose || 'generated-insert',
      preferredAt: Number(scene?.preferredAt) || 0,
      duration: Number(scene?.duration) || 3,
      continuityKey: scene?.continuityKey || null,
    })),
    rule: 'Prefer real user media when it tells the story well; generate, transform or bridge scenes when the creative brief benefits from material not present in the source library.',
  };
}
