/* BIKEZTAGRAM AI — AI Director production blueprint.
   Product layer only. Blob/Gemini upload + analysis configuration remain untouched.
   Stage 1: Gemini analyses the actual uploaded video.
   Stage 2: Gemini acts as the creative director using that analysis + the user's one prompt.
   Local deterministic planning remains as a fallback if Stage 2 is unavailable.
*/

import { GoogleGenAI } from '@google/genai';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function text(value) {
  return String(value || '').trim();
}

function firstBestMoment(analysis) {
  const best = Array.isArray(analysis?.bestMoments) ? analysis.bestMoments : [];
  return best.find((m) => m && m.start != null && m.end != null) || null;
}

function allBestMoments(analysis) {
  return (Array.isArray(analysis?.bestMoments) ? analysis.bestMoments : [])
    .filter((m) => m && m.start != null && m.end != null)
    .map((m) => ({
      start: Number(m.start),
      end: Number(m.end),
      description: text(m.description),
      score: Number(m.score || 0)
    }))
    .filter((m) => Number.isFinite(m.start) && Number.isFinite(m.end) && m.end > m.start)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

function detectWorld(prompt) {
  const p = text(prompt).toLowerCase();
  if (/mars|red planet|martian|alien planet/.test(p)) return 'mars';
  if (/gta|grand theft|open world|crime|street race|neon city|night city/.test(p)) return 'neon-city';
  if (/drone|drones|pursuit|military/.test(p)) return 'drone-chase';
  if (/desert|dust|sand/.test(p)) return 'desert';
  if (/future|futuristic|sci-fi|cyber/.test(p)) return 'future';
  return 'cinematic-world';
}

function detectStyle(prompt) {
  const p = text(prompt).toLowerCase();
  return {
    action: /action|race|chase|pursuit|fast|speed|aggressive/.test(p),
    trailer: /trailer|blockbuster|movie|cinematic|epic/.test(p),
    dark: /dark|moody|night|dramatic/.test(p),
    sparks: /spark|sparks|fire|explosion/.test(p),
    dust: /dust|sand|desert|mars/.test(p),
    neon: /neon|cyber|future|futuristic|city/.test(p),
    drones: /drone|drones|pursuit/.test(p)
  };
}

function subjectContinuity(analysis) {
  const subject = text(analysis?.subject?.description) || text(analysis?.subject?.motorcycleModel) || 'the uploaded motorcycle';
  return {
    primarySubject: subject,
    motorcycleModel: text(analysis?.subject?.motorcycleModel),
    motorcycleVisible: analysis?.subject?.motorcycleVisible !== false,
    riderVisible: analysis?.subject?.riderVisible === true,
    sourceOfTruth: 'The supplied media is authoritative for motorcycle identity, colour, geometry, proportions and real motion.',
    preservationRules: [
      'Keep the motorcycle recognisable and visually consistent across every shot.',
      'Do not replace the real motorcycle with a generic generated motorcycle.',
      'Match generated lighting, perspective, scale and atmosphere to the supplied footage.',
      'Use generated material to extend or surround the real footage rather than silently discarding the source subject.'
    ]
  };
}

function generatedPrompt({ creativeRequest, subject, world, style, purpose }) {
  const effects = [
    style.dust ? 'physically convincing dust and airborne particles' : '',
    style.sparks ? 'controlled sparks and tiny embers' : '',
    style.neon ? 'cinematic neon reflections and atmospheric haze' : '',
    style.drones ? 'original autonomous pursuit drones' : '',
    style.action ? 'dynamic motion, speed and camera energy' : '',
    style.trailer ? 'premium blockbuster trailer cinematography' : 'cinematic social-video cinematography'
  ].filter(Boolean).join(', ');

  return [
    `Create an ORIGINAL ${world} environment for ${subject}.`,
    `Purpose: ${purpose}.`,
    `User creative request: ${creativeRequest}.`,
    `Visual direction: ${effects || 'cinematic atmosphere and realistic environmental detail'}.`,
    'Preserve the motorcycle as the primary subject and maintain continuity with the supplied media.',
    'Match perspective, camera direction, scale, contact with the ground, lighting direction and motion blur to the source.',
    'Generate original visual material only; do not reproduce copyrighted characters, logos, vehicles, scenes, dialogue or soundtrack from a named franchise.'
  ].join(' ');
}

function uploadedScene(id, purpose, start, end, description, transitionIn, transitionOut, priority = 'required') {
  const duration = Math.max(0.5, end - start);
  return {
    id,
    sourceType: 'uploaded',
    purpose,
    duration: Number(duration.toFixed(2)),
    startTime: Number(start.toFixed(2)),
    endTime: Number(end.toFixed(2)),
    generationPrompt: '',
    continuityNotes: description || 'Use the real supplied footage.',
    transitionIn,
    transitionOut,
    priority
  };
}

function generatedScene(id, purpose, duration, prompt, transitionIn, transitionOut, priority = 'required') {
  return {
    id,
    sourceType: 'generated',
    purpose,
    duration: Number(duration.toFixed(2)),
    startTime: null,
    endTime: null,
    generationPrompt: prompt,
    continuityNotes: 'Generated locally by Bikeztagram compositor; preserve the supplied motorcycle as the visual identity anchor whenever compositing is possible.',
    transitionIn,
    transitionOut,
    priority
  };
}

function buildScenes(analysis, creativeRequest, targetDuration) {
  const sourceDuration = clamp(Number(analysis?.durationInSeconds) || 11, 3, 60);
  const target = clamp(Number(targetDuration) || 15, 5, 60);
  const moments = allBestMoments(analysis);
  const best = moments[0] || firstBestMoment(analysis);
  const subject = text(analysis?.subject?.description) || text(analysis?.subject?.motorcycleModel) || 'the uploaded motorcycle';
  const world = detectWorld(creativeRequest);
  const style = detectStyle(creativeRequest);
  const scenes = [];

  const opening = Math.min(2.2, sourceDuration);
  scenes.push(uploadedScene('scene-01', 'real-opening', 0, opening, 'Establish the real motorcycle and its authentic camera movement.', 'fade-in', 'cinematic-blend'));

  scenes.push(generatedScene(
    'scene-02',
    'generated-world-establishing',
    Math.min(2.2, Math.max(1.5, target * 0.14)),
    generatedPrompt({ creativeRequest, subject, world, style, purpose: 'Introduce the requested world and establish scale, atmosphere and direction of travel before the main action.' }),
    'cinematic-blend',
    'match-cut'
  ));

  if (best) {
    const start = clamp(best.start, 0, Math.max(0, sourceDuration - 0.5));
    const end = clamp(best.end, start + 0.5, sourceDuration);
    scenes.push(uploadedScene('scene-03', 'real-hero-moment', start, end, best.description || 'Use the strongest moment identified by Gemini.', 'match-cut', 'action-blend'));
  }

  const generatedActionDuration = Math.min(3.2, Math.max(1.8, target * (style.action ? 0.22 : 0.16)));
  scenes.push(generatedScene(
    'scene-04',
    style.action ? 'generated-action-fill' : 'generated-environment-fill',
    generatedActionDuration,
    generatedPrompt({ creativeRequest, subject, world, style, purpose: style.action ? 'Fill the requested action beat with an original cinematic continuation that can bridge real motorcycle shots.' : 'Extend the requested environment around the real footage with an original cinematic transition.' }),
    'action-blend',
    'impact-cut'
  ));

  const second = moments.find((m) => !best || Math.abs(m.start - best.start) > 1.0);
  if (second) {
    const start = clamp(second.start, 0, Math.max(0, sourceDuration - 0.5));
    const end = clamp(second.end, start + 0.5, sourceDuration);
    scenes.push(uploadedScene('scene-05', 'real-secondary-moment', start, end, second.description || 'Use a second distinct analysed moment for visual variety.', 'impact-cut', 'hero-rise', 'recommended'));
  }

  scenes.push(generatedScene(
    'scene-06',
    'generated-hero-ending',
    Math.min(2.4, Math.max(1.5, target * 0.14)),
    generatedPrompt({ creativeRequest, subject, world, style, purpose: 'Finish with a memorable original hero reveal, keeping the motorcycle as the identity anchor and leaving clean space for an optional title.' }),
    'hero-rise',
    'fade-out'
  ));

  let total = scenes.reduce((sum, s) => sum + s.duration, 0);
  if (total > target) {
    for (let i = scenes.length - 1; i >= 0 && total > target; i--) {
      const scene = scenes[i];
      const minimum = scene.priority === 'required' ? 0.8 : 0.6;
      const reducible = Math.max(0, scene.duration - minimum);
      const reduction = Math.min(reducible, total - target);
      scene.duration = Number((scene.duration - reduction).toFixed(2));
      total -= reduction;
    }
  }

  return { scenes, totalDuration: Number(total.toFixed(2)), world, style };
}

function parseModelJson(raw) {
  const cleaned = String(raw || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  if (!cleaned) throw new Error('Gemini creative director returned no plan.');
  return JSON.parse(cleaned);
}

function normaliseDirectorPlan(plan, analysis, creativeRequest, targetDuration) {
  if (!plan || !Array.isArray(plan.scenes) || !plan.scenes.length) throw new Error('Gemini creative director returned no scenes.');

  const sourceDuration = clamp(Number(analysis?.durationInSeconds) || 11, 3, 60);
  const target = clamp(Number(targetDuration) || 15, 5, 60);
  const allowedTransitions = new Set(['fade-in', 'fade-out', 'crossfade', 'match-cut', 'action-blend', 'impact-cut', 'hero-rise', 'cinematic-blend', 'whip-left', 'whip-right', 'zoom-punch', 'dip-black', 'flash-cut']);

  const scenes = plan.scenes.slice(0, 10).map((scene, index) => {
    const sourceType = scene.sourceType === 'generated' ? 'generated' : 'uploaded';
    let startTime = null;
    let endTime = null;
    let duration = clamp(Number(scene.duration) || 1.5, 0.5, Math.max(0.5, target));

    if (sourceType === 'uploaded') {
      startTime = clamp(Number(scene.startTime) || 0, 0, Math.max(0, sourceDuration - 0.5));
      endTime = clamp(Number(scene.endTime), startTime + 0.5, sourceDuration);
      if (!Number.isFinite(endTime) || endTime <= startTime) endTime = Math.min(sourceDuration, startTime + duration);
      duration = clamp(endTime - startTime, 0.5, target);
    }

    return {
      id: text(scene.id) || `scene-${String(index + 1).padStart(2, '0')}`,
      sourceType,
      purpose: text(scene.purpose) || (sourceType === 'uploaded' ? 'real-footage' : 'generated-cinematic-fill'),
      duration: Number(duration.toFixed(2)),
      startTime,
      endTime,
      generationPrompt: sourceType === 'generated' ? text(scene.generationPrompt) : '',
      continuityNotes: text(scene.continuityNotes) || 'Preserve the supplied motorcycle as the identity anchor.',
      transitionIn: allowedTransitions.has(text(scene.transitionIn)) ? text(scene.transitionIn) : (index === 0 ? 'fade-in' : 'crossfade'),
      transitionOut: allowedTransitions.has(text(scene.transitionOut)) ? text(scene.transitionOut) : 'crossfade',
      priority: text(scene.priority) || 'required'
    };
  });

  if (!scenes.some((scene) => scene.sourceType === 'uploaded')) {
    scenes.unshift(uploadedScene('scene-01', 'real-opening', 0, Math.min(1.5, sourceDuration), 'Always establish the real supplied motorcycle first.', 'fade-in', 'cinematic-blend'));
  }

  let total = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  if (total > target) {
    for (let i = scenes.length - 1; i >= 0 && total > target; i--) {
      const minimum = scenes[i].priority === 'required' ? 0.7 : 0.5;
      const reducible = Math.max(0, scenes[i].duration - minimum);
      const reduction = Math.min(reducible, total - target);
      scenes[i].duration = Number((scenes[i].duration - reduction).toFixed(2));
      if (scenes[i].sourceType === 'uploaded' && scenes[i].startTime != null) {
        scenes[i].endTime = Number((scenes[i].startTime + scenes[i].duration).toFixed(2));
      }
      total -= reduction;
    }
  }

  return {
    version: '8.0-gemini-director',
    title: text(plan.title) || 'AI Director — Gemini Creative Plan',
    creativeRequest,
    creativeDirection: text(plan.creativeDirection) || 'Gemini analysed the supplied media first, then designed this edit from the analysis and the user's creative request.',
    worldMode: text(plan.worldMode) || detectWorld(creativeRequest),
    style: plan.style && typeof plan.style === 'object' ? plan.style : detectStyle(creativeRequest),
    targetDuration: target,
    plannedDuration: Number(total.toFixed(2)),
    subjectContinuity: subjectContinuity(analysis),
    sourceAnalysis: {
      filename: text(analysis?.filename),
      durationSeconds: Number(analysis?.durationInSeconds || 0),
      strongestMoments: allBestMoments(analysis).slice(0, 5)
    },
    scenes,
    directorNotes: Array.isArray(plan.directorNotes) ? plan.directorNotes.map(text).filter(Boolean).slice(0, 12) : [],
    generationPolicy: {
      engine: 'bikeztagram-local-browser-compositor',
      paidVideoGeneration: false,
      externalVideoGenerator: false,
      useGeneratedFill: true,
      rule: 'Generated scenes are original procedural/composited material. Never imitate a named franchise, copyrighted character or soundtrack; translate the requested mood and cinematic traits into an original world.'
    },
    assemblyNotes: [
      'Use real uploaded footage as the identity anchor.',
      'Use the Gemini analysis as the factual source of truth for real timestamps.',
      'Use generated scenes only where they serve the requested creative story.',
      'Match generated scene direction to the camera motion and subject position found in the real footage.',
      'Use cinematic transitions and motion continuity rather than simply placing unrelated clips back-to-back.',
      'Keep the generation path local/browser-side so no paid video-generation API is required.'
    ]
  };
}

async function buildGeminiDirectorPlan(analysis, creativeRequest, targetDuration) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing.');

  const ai = new GoogleGenAI({ apiKey });
  const directorPrompt = `
You are the second-stage Creative Director for BIKEZTAGRAM AI.

The video has ALREADY been analysed by another Gemini stage. Do not pretend to watch the original video again. Use the supplied analysis as the factual source of truth for real footage timestamps.

USER CREATIVE REQUEST:
${creativeRequest}

TARGET DURATION:
${targetDuration} seconds

VIDEO ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Design the actual edit, not another analysis.

Rules:
- Use the strongest real moments identified in the analysis.
- Do not invent real footage timestamps.
- Do not simply use upload order.
- Prefer a clear story: hook → build → escalation/action → hero ending.
- Use varied real shots when the analysis provides them.
- Decide when a real shot should be shortened, sped up or slowed down.
- Decide transitions and motion treatment for every scene.
- Generated scenes are optional and should only fill a creative gap that the supplied footage cannot provide.
- If a generated scene is requested, it must be an original procedural/composited concept, not a copy of a named game, film, TV show, character, logo or soundtrack.
- Keep the supplied motorcycle as the identity anchor.
- The final plan must be executable by a browser compositor.
- Keep the total planned duration close to the target.

Return ONLY valid JSON with this exact top-level structure:
{
  "title": "",
  "creativeDirection": "",
  "worldMode": "",
  "style": { "action": false, "trailer": true, "dark": true, "energy": 0.8 },
  "directorNotes": [],
  "scenes": [
    {
      "id": "scene-01",
      "sourceType": "uploaded",
      "purpose": "hook",
      "startTime": 0,
      "endTime": 1.5,
      "duration": 1.5,
      "transitionIn": "fade-in",
      "transitionOut": "crossfade",
      "priority": "required",
      "generationPrompt": "",
      "continuityNotes": ""
    }
  ]
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: directorPrompt
  });

  return parseModelJson(response?.text || '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { prompt = '', analysis = {}, targetDuration = 15 } = req.body || {};
    if (!analysis || typeof analysis !== 'object') {
      return res.status(400).json({ success: false, error: 'Video analysis is required.' });
    }

    const creativeRequest = text(prompt) || 'Create a cinematic social-media motorcycle video.';
    const requestedDuration = clamp(Number(targetDuration) || 15, 5, 60);
    const subject = text(analysis?.subject?.description) || text(analysis?.subject?.motorcycleModel) || 'the uploaded motorcycle';

    let productionPlan;
    let directorSource = 'gemini-stage-2';

    try {
      const directorPlan = await buildGeminiDirectorPlan(analysis, creativeRequest, requestedDuration);
      productionPlan = normaliseDirectorPlan(directorPlan, analysis, creativeRequest, requestedDuration);
    } catch (directorError) {
      console.warn('[PRODUCTION-PLAN] Gemini creative-director stage unavailable; using deterministic fallback.', directorError?.message || directorError);
      const built = buildScenes(analysis, creativeRequest, requestedDuration);
      const continuity = subjectContinuity(analysis);
      productionPlan = {
        version: '7.0-local-fallback',
        title: 'AI Director — Real Footage + Original Generative Fill',
        creativeRequest,
        creativeDirection: `Fallback local plan for the supplied ${subject} media.`,
        worldMode: built.world,
        style: built.style,
        targetDuration: requestedDuration,
        plannedDuration: built.totalDuration,
        subjectContinuity: continuity,
        sourceAnalysis: {
          filename: text(analysis?.filename),
          durationSeconds: Number(analysis?.durationInSeconds || 0),
          strongestMoments: allBestMoments(analysis).slice(0, 5)
        },
        scenes: built.scenes,
        generationPolicy: {
          engine: 'bikeztagram-local-browser-compositor',
          paidVideoGeneration: false,
          externalVideoGenerator: false,
          useGeneratedFill: true,
          rule: 'Generated scenes are original procedural/composited material. Never imitate a named franchise, copyrighted character or soundtrack.'
        },
        assemblyNotes: [
          'Use real uploaded footage as the identity anchor.',
          'Use generated scenes to fill narrative gaps the supplied footage cannot cover.',
          'Use cinematic transitions and motion continuity rather than simply placing unrelated clips back-to-back.'
        ]
      };
      directorSource = 'local-fallback';
    }

    productionPlan.directorSource = directorSource;
    return res.status(200).json({ success: true, productionPlan });
  } catch (error) {
    console.error('[PRODUCTION-PLAN] ERROR', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to build production blueprint.' });
  }
}
