function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function text(value) {
  return String(value || '').trim();
}

function pickBestMoment(analysis) {
  const best = Array.isArray(analysis?.bestMoments) ? analysis.bestMoments : [];
  if (best.length) return best[0];
  return null;
}

function buildScenes(analysis, targetDuration) {
  const duration = clamp(Number(analysis?.durationInSeconds) || 11, 3, 60);
  const best = pickBestMoment(analysis);
  const subject = text(analysis?.subject?.description) || text(analysis?.subject?.motorcycleModel) || 'the uploaded motorcycle';
  const scenes = [];

  const openingEnd = Math.min(2.5, duration);
  scenes.push({
    id: 'scene-1',
    sourceType: 'uploaded',
    purpose: 'opening',
    duration: Number(openingEnd.toFixed(2)),
    startTime: 0,
    endTime: Number(openingEnd.toFixed(2)),
    generationPrompt: '',
    continuityNotes: `Use the supplied footage of ${subject}.`,
    transitionIn: 'fade-in',
    transitionOut: 'hard-cut',
    priority: 'required'
  });

  if (best?.start != null && best?.end != null) {
    const start = clamp(Number(best.start), 0, Math.max(0, duration - 0.5));
    const end = clamp(Number(best.end), start + 0.5, duration);
    scenes.push({
      id: 'scene-2',
      sourceType: 'uploaded',
      purpose: 'hero-moment',
      duration: Number(Math.min(4, end - start).toFixed(2)),
      startTime: Number(start.toFixed(2)),
      endTime: Number(end.toFixed(2)),
      generationPrompt: '',
      continuityNotes: text(best.description) || 'Use the strongest analysed moment.',
      transitionIn: 'hard-cut',
      transitionOut: 'fade-out',
      priority: 'required'
    });
  }

  return scenes;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { prompt = '', analysis = {}, targetDuration = 15 } = req.body || {};
    if (!analysis || typeof analysis !== 'object') {
      return res.status(400).json({ success: false, error: 'Video analysis is required.' });
    }

    const requestedDuration = clamp(Number(targetDuration) || 15, 5, 60);
    const subject = text(analysis?.subject?.description) || text(analysis?.subject?.motorcycleModel) || 'the uploaded motorcycle';
    const creativeRequest = text(prompt) || 'Create a cinematic social-media motorcycle video.';
    const scenes = buildScenes(analysis, requestedDuration);

    const productionPlan = {
      title: 'AI Director — Local Production Blueprint',
      creativeDirection: `Build an original cinematic video around ${subject}. Creative request: ${creativeRequest}`,
      subjectContinuity: {
        primarySubject: subject,
        visibleAttributes: [
          text(analysis?.subject?.motorcycleModel),
          text(analysis?.subject?.description)
        ].filter(Boolean),
        referenceStrategy: 'Use the supplied uploaded media as the source of truth for the subject and visual continuity.'
      },
      scenes,
      missingShots: [
        {
          purpose: 'optional-establishing-fill',
          reason: 'A future zero-cost browser generator can create an original motion treatment from supplied frames when the real footage does not cover a requested beat.',
          generationPrompt: `Create an original cinematic establishing treatment around ${subject}. Do not reproduce a copyrighted scene, character, franchise or soundtrack. Creative direction: ${creativeRequest}`,
          priority: 'optional'
        }
      ],
      assemblyNotes: 'This blueprint is generated locally from the verified Gemini analysis. It makes no additional AI API request and therefore adds no API cost.'
    };

    return res.status(200).json({ success: true, productionPlan });
  } catch (error) {
    console.error('[PRODUCTION-PLAN] ERROR', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to build production blueprint.' });
  }
}
