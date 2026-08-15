export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is missing in Vercel settings.' });

    const { prompt = '', analysis = null } = req.body || {};
    if (!analysis || typeof analysis !== 'object') {
      return res.status(400).json({ success: false, error: 'No Gemini video analysis was supplied.' });
    }

    const availableMoments = Array.isArray(analysis.bestMoments) ? analysis.bestMoments : [];

    const directorPrompt = `
You are the final AI edit director for BIKEZTAGRAM AI.

A separate Gemini video-analysis stage has already watched the ACTUAL motorcycle footage and produced the verified analysis below. Do NOT analyse the video again. Turn this verified analysis into a strong cinematic social-media edit plan.

USER CREATIVE REQUEST:
${prompt || 'Create an exciting cinematic motorcycle social-media edit.'}

VERIFIED VIDEO ANALYSIS:
${JSON.stringify(analysis, null, 2)}

IMPORTANT:
- Use ONLY moments and facts supported by the supplied video analysis.
- Do NOT invent footage, actions, camera angles or events.
- Prefer the strongest verified moments and avoid repetition.
- Build a visual story when the verified moments support it: mystery, build, reveal, escalation, action, hero ending.
- Prefer the strongest verified moment as the hero ending.
- Use exact start/end timestamps from bestMoments when available.
- Each cut must reference a verified bestMoments index.
- If there are not enough verified moments, use fewer cuts rather than inventing shots.
- Keep the edit short and suitable for social media.

EDITING STYLE:
- cinematic motorcycle trailer
- dark-cinematic
- fast but controlled pacing
- purposeful transitions
- varied camera motion
- speed changes only where the analysis recommends them
- minimal text

Return ONLY valid JSON using exactly this structure:
{
  "title": "string",
  "style": "cinematic motorcycle trailer",
  "colorGrade": "dark-cinematic",
  "textOverlay": "",
  "cuts": [
    {
      "momentIndex": 0,
      "startTime": 0,
      "endTime": 0,
      "duration": 2,
      "purpose": "mystery",
      "transition": "hard-cut",
      "motionStyle": "static",
      "speed": 1,
      "text": ""
    }
  ]
}

Rules:
- momentIndex must refer to an item in bestMoments.
- startTime/endTime must be within that verified moment.
- duration 0.5–4 seconds.
- speed 0.5–1.5.
- Allowed transitions: hard-cut, fade-in, fade-out, dip-black, crossfade, flash-cut, whip-left, whip-right.
- Allowed motion styles: static, slow-push, slow-pull, pan-left, pan-right, tilt-up, tilt-down.
- Do not use text on every shot.
- Maximum 8 cuts; prefer 3–6 when enough verified moments exist.
- Do not duplicate a moment unless there is a compelling editorial reason.
`;

    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: directorPrompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    const responseText = await geminiResponse.text();
    if (!geminiResponse.ok) {
      console.error('[EDIT PLAN] Gemini API error:', responseText.slice(0, 2000));
      return res.status(500).json({ success: false, error: `Gemini error ${geminiResponse.status}: ${responseText.slice(0, 500)}` });
    }

    let geminiData;
    try { geminiData = JSON.parse(responseText); }
    catch { return res.status(500).json({ success: false, error: 'Gemini returned invalid response JSON.' }); }

    let modelText = geminiData?.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text || '';
    modelText = String(modelText).replace(/```json/gi, '').replace(/```/g, '').trim();

    let plan;
    try { plan = JSON.parse(modelText); }
    catch {
      console.error('[EDIT PLAN] Invalid plan:', modelText.slice(0, 2000));
      return res.status(500).json({ success: false, error: 'Gemini created an invalid edit plan.' });
    }

    if (!plan || !Array.isArray(plan.cuts) || plan.cuts.length === 0) {
      return res.status(500).json({ success: false, error: 'Gemini did not create any usable cuts.' });
    }

    const validTransitions = new Set(['hard-cut','fade-in','fade-out','dip-black','crossfade','flash-cut','whip-left','whip-right']);
    const validMotionStyles = new Set(['static','slow-push','slow-pull','pan-left','pan-right','tilt-up','tilt-down']);

    plan.cuts = plan.cuts.map((cut) => {
      const momentIndex = Number(cut.momentIndex);
      if (!Number.isInteger(momentIndex) || momentIndex < 0 || momentIndex >= availableMoments.length) return null;

      const moment = availableMoments[momentIndex];
      const momentStart = Number(moment?.start);
      const momentEnd = Number(moment?.end);
      if (!Number.isFinite(momentStart) || !Number.isFinite(momentEnd) || momentEnd <= momentStart) return null;

      const requestedStart = Number(cut.startTime);
      const requestedEnd = Number(cut.endTime);
      const startTime = Number.isFinite(requestedStart) ? Math.max(momentStart, Math.min(requestedStart, momentEnd)) : momentStart;
      const endTime = Number.isFinite(requestedEnd) ? Math.max(startTime + 0.1, Math.min(requestedEnd, momentEnd)) : momentEnd;
      const duration = Math.max(0.5, Math.min(4, Number(cut.duration) || Math.min(2, endTime - startTime)));
      const speed = Math.max(0.5, Math.min(1.5, Number(cut.speed) || 1));

      return {
        mediaIndex: 0,
        startTime,
        duration,
        speed,
        transition: validTransitions.has(String(cut.transition)) ? String(cut.transition) : 'hard-cut',
        motionStyle: validMotionStyles.has(String(cut.motionStyle)) ? String(cut.motionStyle) : 'static',
        text: String(cut.text || ''),
        momentIndex,
        endTime,
        purpose: String(cut.purpose || 'cinematic')
      };
    }).filter(Boolean).slice(0, 8);

    if (plan.cuts.length === 0) {
      return res.status(500).json({ success: false, error: 'Gemini returned no cuts linked to verified video moments.' });
    }

    return res.status(200).json({ success: true, plan });
  } catch (error) {
    console.error('[EDIT PLAN] Error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Unknown edit-plan error.' });
  }
}
