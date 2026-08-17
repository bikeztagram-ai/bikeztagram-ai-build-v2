/* BIKEZTAGRAM AI — in-app Director core.
 * Product AI: turns a user's creative brief into a structured, testable edit intent.
 * Model/provider calls can be attached at the adapter boundary; the core remains deterministic.
 */

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, Number(v) || 0));
const text = (v) => String(v || '').trim();

const MODES = {
  cinematic: /cinematic|film|movie|trailer|commercial|advert/i,
  action: /action|chase|race|speed|pursuit|aggressive|energetic/i,
  reveal: /reveal|launch|showcase|unveil|introduction/i,
  emotional: /emotional|romantic|beautiful|nostalgic|heartfelt/i,
  dark: /dark|moody|night|noir|mysterious|horror/i,
  social: /tiktok|reel|shorts|viral|social/i,
  funny: /funny|comedy|comic|meme/i,
};

function detectModes(brief) {
  return Object.fromEntries(Object.entries(MODES).map(([name, pattern]) => [name, pattern.test(brief)]));
}

export function createDirectorIntent({ prompt = '', duration = 15, aspectRatio = '9:16', profile = {}, analysis = {} } = {}) {
  const brief = text(prompt);
  const modes = detectModes(brief);
  const subject = text(analysis.subject?.description || analysis.subjectDescription || 'the uploaded subject');
  const targetDuration = Math.max(5, Math.min(60, Number(duration) || 15));

  const pacing = modes.action || modes.social ? .82 : modes.emotional ? .42 : .62;
  const cameraMotion = modes.action ? .58 : modes.emotional ? .25 : .4;
  const transitionEnergy = modes.action || modes.social ? .8 : modes.dark ? .45 : .58;

  return {
    version: 'director-intent-v1',
    brief,
    subject,
    targetDuration,
    aspectRatio,
    modes,
    priorities: {
      subjectFocus: clamp(profile.subjectFocus ?? .85),
      pacing: clamp(profile.pacing ?? pacing),
      cameraMotion: clamp(profile.cameraMotion ?? cameraMotion),
      transitionEnergy: clamp(profile.transitionEnergy ?? transitionEnergy),
      cinematicGrade: clamp(profile.cinematicGrade ?? .75),
    },
    story: {
      opening: 'immediate-interest',
      middle: modes.action ? 'escalation' : modes.reveal ? 'reveal-and-detail' : 'cinematic-build',
      ending: modes.funny ? 'payoff' : 'hero-resolution',
    },
    constraints: [
      'preserve real subject identity',
      'avoid artificial handheld shake on uploaded footage',
      'maintain continuous playable output',
      'prefer deliberate camera movement over random motion',
      'never sacrifice render integrity for style',
    ],
  };
}

export function applyDirectorIntentToPlan(plan, intent) {
  if (!plan || !intent) return plan;
  const cuts = Array.isArray(plan.cuts) ? plan.cuts : [];
  const motionScale = .65 + intent.priorities.cameraMotion * .7;
  const transitionScale = .7 + intent.priorities.transitionEnergy * .6;
  return {
    ...plan,
    directorIntent: intent,
    cuts: cuts.map((cut, index) => ({
      ...cut,
      motionIntensity: Number(clamp((Number(cut.motionIntensity) || .9) * motionScale, .35, 1.35).toFixed(2)),
      transitionEnergy: Number(transitionScale.toFixed(2)),
      role: index === 0 ? 'hook' : index === cuts.length - 1 ? intent.story.ending : cut.role || 'story-beat',
    })),
  };
}

export function createDirectorPromptContext(intent) {
  if (!intent) return '';
  return [
    `Subject: ${intent.subject}`,
    `Creative brief: ${intent.brief || 'cinematic edit'}`,
    `Duration: ${intent.targetDuration}s`,
    `Modes: ${Object.entries(intent.modes).filter(([, enabled]) => enabled).map(([name]) => name).join(', ') || 'cinematic'}`,
    `Story: ${intent.story.opening} → ${intent.story.middle} → ${intent.story.ending}`,
    `Hard constraints: ${intent.constraints.join('; ')}`,
  ].join('\n');
}
