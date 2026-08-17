/* BIKEZTAGRAM AI — cinematic generation orchestration layer.
 * Converts a creative brief + optional reference assets into a small, coherent
 * shot list. The renderer/provider remains swappable; this module owns story,
 * continuity and prompt consistency rather than a particular video model.
 */

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || min));

const DEFAULTS = {
  durationSeconds: 30,
  aspectRatio: '16:9',
  visualStyle: 'cinematic open-world action trailer',
  world: 'original fictional open-world city',
};

function shot(id, duration, purpose, camera, action, prompt, continuity) {
  return { id, durationSeconds: duration, purpose, camera, action, generationPrompt: prompt, continuity };
}

export function buildCinematicGenerationPlan(input = {}) {
  const brief = String(input.brief || '').trim() || 'Create a cinematic motorcycle trailer.';
  const world = String(input.world || DEFAULTS.world).trim();
  const visualStyle = String(input.visualStyle || DEFAULTS.visualStyle).trim();
  const duration = clamp(input.durationSeconds ?? DEFAULTS.durationSeconds, 12, 60);
  const subject = String(input.subject || 'the rider and their motorcycle').trim();
  const referenceNote = input.hasReferenceAssets
    ? 'Preserve the supplied rider identity, motorcycle design, proportions, colours and key identifying details across every generated shot.'
    : 'Use a consistent fictional rider and motorcycle design across every generated shot.';

  const base = `${visualStyle}. ${world}. ${referenceNote} No logos or copyrighted game assets. ${brief}`;
  const requested = Math.max(4, Math.min(8, Math.round(duration / 5)));
  const durations = [4, 5, 5, 5, 4, 4, 3, 3].slice(0, requested);
  const purposes = [
    ['establishing', 'wide aerial/low establishing shot', 'Reveal the world and establish the rider approaching.'],
    ['hero-introduction', 'low tracking three-quarter shot', 'Introduce the motorcycle as the hero subject.'],
    ['rider-reveal', 'medium tracking shot', 'Reveal the rider naturally while preserving identity.'],
    ['action', 'fast side-tracking camera', 'Build speed and kinetic energy through the environment.'],
    ['hero-detail', 'macro close-up with shallow depth of field', 'Show a striking mechanical detail, wheel, lights or controls.'],
    ['chase', 'dynamic rear pursuit camera', 'Create a short high-energy pursuit beat.'],
    ['climax', 'wide orbit-to-front hero move', 'Bring rider and motorcycle together in the strongest composition.'],
    ['end-card', 'slow push-in hero frame', 'Resolve on a clean cinematic final image suitable for a title card.'],
  ];

  const shots = purposes.slice(0, requested).map(([purpose, camera, action], index) => {
    const previous = index ? `Continue directly from shot ${index}; preserve position, heading, wardrobe and motorcycle state.` : 'Establish the canonical subject appearance for the sequence.';
    const prompt = `${base} Shot ${index + 1}: ${purpose}. Camera: ${camera}. ${action} ${previous} Cinematic lighting, physically plausible motion, detailed environment, stable anatomy and vehicle geometry, no text.`;
    return shot(`shot-${index + 1}`, durations[index], purpose, camera, action, prompt, {
      subject,
      world,
      referenceLock: true,
      previousShot: index ? `shot-${index}` : null,
    });
  });

  return {
    type: 'cinematic-generation-plan-v1',
    brief,
    subject,
    world,
    visualStyle,
    durationSeconds: shots.reduce((sum, item) => sum + item.durationSeconds, 0),
    aspectRatio: input.aspectRatio === '9:16' ? '9:16' : DEFAULTS.aspectRatio,
    referenceAssetsRequired: Boolean(input.hasReferenceAssets),
    referencePolicy: referenceNote,
    shots,
    providerPolicy: {
      preferred: input.preferredProvider || 'free-gpu',
      paidFallback: false,
      modelMustBeSwappable: true,
      requirePlayableMp4: true,
    },
  };
}

export function buildTrailerPrompt(plan) {
  if (!plan?.shots?.length) throw new Error('A cinematic generation plan with shots is required');
  return plan.shots.map((item) => `${item.id}: ${item.generationPrompt}`).join('\n\n');
}
