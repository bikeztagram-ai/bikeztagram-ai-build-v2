import { GoogleGenAI } from '@google/genai';

function cleanJson(text) {
  return String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is missing.' });

    const { prompt = '', analysis = {}, targetDuration = 15 } = req.body || {};
    if (!analysis || typeof analysis !== 'object') {
      return res.status(400).json({ success: false, error: 'Video analysis is required.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const directorPrompt = `
You are the production director for BIKEZTAGRAM AI.

The application has already analysed the user's uploaded media. The analysis below is factual information about what the supplied media contains.

Your job is to turn the user's creative request into a production blueprint that can eventually combine REAL uploaded media with ORIGINAL AI-GENERATED fill-in scenes.

IMPORTANT:
- Treat the uploaded-media analysis as ground truth.
- Never invent that a real shot exists when the analysis does not support it.
- Prefer real uploaded footage whenever it satisfies the creative requirement.
- Identify missing visual/story beats that should eventually be generated.
- Generated scenes must preserve the identity/appearance of the user's supplied subject where the future generation provider supports reference images or videos.
- Generated scenes must be original. If the user names a copyrighted movie, game, TV show, character or franchise, translate that request into broad cinematic characteristics instead of reproducing a protected scene, character or exact style.
- The result should be usable by a future scene-generation/rendering pipeline; do not pretend generated media already exists.
- Think like a film director: story, continuity, shot variety, pacing, camera, lighting, environment and transitions.
- For a generated scene, provide a detailed generationPrompt describing the required shot.
- For a real scene, provide the best timestamp from the uploaded analysis.
- Keep the user's main subject consistent across scenes.

USER CREATIVE REQUEST:
${prompt}

TARGET DURATION:
${Number(targetDuration) || 15} seconds

UPLOADED MEDIA ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Return ONLY valid JSON using exactly this top-level structure:
{
  "title": "",
  "creativeDirection": "",
  "subjectContinuity": {
    "primarySubject": "",
    "visibleAttributes": [],
    "referenceStrategy": "Use supplied photos/video as identity references for future generated scenes."
  },
  "scenes": [
    {
      "id": "scene-1",
      "sourceType": "uploaded",
      "purpose": "opening",
      "duration": 2,
      "startTime": 0,
      "endTime": 2,
      "generationPrompt": "",
      "continuityNotes": "",
      "transitionIn": "fade-in",
      "transitionOut": "hard-cut",
      "priority": "required"
    }
  ],
  "missingShots": [
    {
      "purpose": "",
      "reason": "",
      "generationPrompt": "",
      "priority": "high"
    }
  ],
  "assemblyNotes": ""
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: directorPrompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = cleanJson(response?.text);
    if (!text) throw new Error('Gemini returned no production blueprint.');

    let productionPlan;
    try {
      productionPlan = JSON.parse(text);
    } catch {
      throw new Error('Gemini returned invalid production blueprint JSON.');
    }

    if (!Array.isArray(productionPlan.scenes)) {
      throw new Error('Production blueprint contains no scenes.');
    }

    return res.status(200).json({ success: true, productionPlan });
  } catch (error) {
    console.error('[PRODUCTION-PLAN] ERROR', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to build production blueprint.'
    });
  }
}
