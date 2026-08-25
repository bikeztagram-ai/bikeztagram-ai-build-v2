export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { prompt = '', media = [], scenePlan = null } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is missing.' });
    if (!Array.isArray(media) || media.length === 0) return res.status(400).json({ success: false, error: 'No media supplied.' });

    const mediaList = media.map((item, index) => `MEDIA ${index}: ${item.name || 'unknown'}`).join('\n');

    // Authoritative plan or fallback prompt
    const planContext = scenePlan ? `
FOLLOW THIS AUTHORITATIVE SCENE PLAN:
${JSON.stringify(scenePlan, null, 2)}
` : `
CREATE AN EPIC CINEMATIC TRAILER BASED ON:
${prompt}
`;

    const directorPrompt = `
You are an elite film editor and motorcycle commercial director.

${planContext}

UPLOADED MEDIA:

${mediaList}

Your job is to realise this plan. Do not deviate unless necessary for technical reasons.

Return ONLY valid JSON.

{
  "title": "string",
  "cuts": [
    {
      "mediaIndex": 0,
      "duration": 2,
      "purpose": "hook",
      "transition": "hard-cut",
      "motionStyle": "static",
      "speed": 1
    }
  ]
}
`;

    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: directorPrompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    const responseText = await geminiResponse.text();
    if (!geminiResponse.ok) throw new Error(`Gemini error ${geminiResponse.status}: ${responseText.slice(0, 500)}`);

    let geminiData;
    try {
      geminiData = JSON.parse(responseText);
    } catch {
      throw new Error('Gemini returned invalid JSON.');
    }

    let modelText = geminiData?.candidates?.[0]?.content?.parts?.find(part => typeof part.text === 'string')?.text || '';
    modelText = modelText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let plan;
    try {
      plan = JSON.parse(modelText);
    } catch {
      throw new Error('Gemini created an invalid edit plan.');
    }

    if (!plan || !Array.isArray(plan.cuts) || plan.cuts.length === 0) {
      throw new Error('Gemini did not create any usable cuts.');
    }

    // Validate cuts
    plan.cuts = plan.cuts
      .filter(cut => {
        const index = Number(cut.mediaIndex);
        return Number.isInteger(index) && index >= 0 && index < media.length;
      })
      .map(cut => ({
        mediaIndex: Number(cut.mediaIndex),
        duration: Math.max(0.5, Math.min(5, Number.isFinite(Number(cut.duration)) ? Number(cut.duration) : 2)),
        purpose: String(cut.purpose || 'cinematic'),
        transition: String(cut.transition || 'hard-cut'),
        motionStyle: String(cut.motionStyle || 'static'),
        speed: Math.max(0.5, Math.min(1.5, Number.isFinite(Number(cut.speed)) ? Number(cut.speed) : 1))
      }));

    if (plan.cuts.length === 0) throw new Error('Gemini returned no valid media cuts.');

    return res.status(200).json({ success: true, plan });

  } catch (error) {
    console.error('Render API error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Unknown server error.' });
  }
}
