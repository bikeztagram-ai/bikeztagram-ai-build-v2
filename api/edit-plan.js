export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is missing in Vercel settings.' });
    const { prompt = '', analysis = null, targetDuration = 15 } = req.body || {};
    if (!analysis || typeof analysis !== 'object') return res.status(400).json({ success: false, error: 'No Gemini video analysis was supplied.' });
    const availableMoments = Array.isArray(analysis.bestMoments) ? analysis.bestMoments : [];
    const subject = analysis?.subject?.description || analysis?.subject?.primarySubject || analysis?.primarySubject || analysis?.contentType || 'the uploaded subject';
    const directorPrompt = `
You are the final AI edit director for BIKEZTAGRAM AI, a GENERAL-PURPOSE AI FILMMAKER.

A separate Gemini stage has already watched the ACTUAL uploaded media and produced the verified analysis below. Do NOT analyse the media again. Turn only that verified evidence into a strong cinematic social-media edit plan.

The uploaded subject may be ANYTHING: a motorcycle, car, puppy, animal, person, travel scene, landscape, product, event, photo/video sequence, or mixed media. Never assume a motorcycle unless the verified analysis says so.

SUBJECT:
${subject}

USER CREATIVE REQUEST:
${prompt || 'Create a cinematic social-media video from the supplied media.'}

TARGET DURATION:
${Math.max(5, Math.min(60, Number(targetDuration) || 15))} seconds

VERIFIED MEDIA ANALYSIS:
${JSON.stringify(analysis, null, 2)}

DIRECTOR RULES:
- Use ONLY moments and facts supported by the supplied analysis.
- Never invent source footage, actions, camera angles or events.
- Prefer the strongest verified moments and avoid repetitive shots.
- Build a visual story appropriate to the subject and request: hook, establish, build, reveal, action/emotion and hero ending as evidence allows.
- Choose story roles based on the actual content. A puppy may need playful/emotional beats; travel may need establishing/discovery; a product may need detail/reveal; action footage may need escalation. Do not force a motorcycle-style structure onto unrelated content.
- Use exact start/end timestamps from bestMoments when available.
- Each cut must reference a verified bestMoments index.
- If there are not enough verified moments, use fewer cuts rather than inventing shots.
- Preserve subject identity and continuity.
- Use camera motion, speed and transitions deliberately and only where they suit the subject and verified motion.
- Keep text minimal unless requested or clearly supported.

Return ONLY valid JSON using exactly this structure:
{
  "title": "string",
  "style": "string",
  "colorGrade": "string",
  "textOverlay": "",
  "editorialStructure": ["hook","establish","build","reveal","hero"],
  "cuts": [
    {
      "momentIndex": 0,
      "startTime": 0,
      "endTime": 0,
      "duration": 2,
      "purpose": "hook",
      "transition": "hard-cut",
      "motionStyle": "static",
      "speed": 1,
      "text": ""
    }
  ]
}

Validation rules:
- momentIndex must refer to an item in bestMoments.
- startTime/endTime must remain inside that verified moment.
- duration 0.5–4 seconds.
- speed 0.5–1.5.
- Allowed transitions: hard-cut, fade-in, fade-out, dip-black, crossfade, flash-cut, whip-left, whip-right.
- Allowed motion styles: static, slow-push, slow-pull, pan-left, pan-right, tilt-up, tilt-down.
- Maximum 8 cuts; prefer 3–6 where enough evidence exists.
- Do not duplicate a moment unless editorially justified.
- Never insert named copyrighted characters, scenes, logos or soundtracks into the edit plan.
`;
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: directorPrompt }] }], generationConfig: { responseMimeType: 'application/json' } })
    });
    const responseText = await geminiResponse.text();
    if (!geminiResponse.ok) return res.status(500).json({ success: false, error: `Gemini error ${geminiResponse.status}: ${responseText.slice(0, 500)}` });
    let geminiData; try { geminiData = JSON.parse(responseText); } catch { return res.status(500).json({ success: false, error: 'Gemini returned invalid response JSON.' }); }
    let modelText = geminiData?.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text || '';
    modelText = String(modelText).replace(/```json/gi, '').replace(/```/g, '').trim();
    let plan; try { plan = JSON.parse(modelText); } catch { return res.status(500).json({ success: false, error: 'Gemini created an invalid edit plan.' }); }
    if (!plan || !Array.isArray(plan.cuts) || !plan.cuts.length) return res.status(500).json({ success: false, error: 'Gemini did not create any usable cuts.' });
    const validTransitions = new Set(['hard-cut','fade-in','fade-out','dip-black','crossfade','flash-cut','whip-left','whip-right']);
    const validMotionStyles = new Set(['static','slow-push','slow-pull','pan-left','pan-right','tilt-up','tilt-down']);
    plan.cuts = plan.cuts.map((cut) => {
      const momentIndex = Number(cut.momentIndex);
      if (!Number.isInteger(momentIndex) || momentIndex < 0 || momentIndex >= availableMoments.length) return null;
      const moment = availableMoments[momentIndex];
      const momentStart = Number(moment?.start), momentEnd = Number(moment?.end);
      if (!Number.isFinite(momentStart) || !Number.isFinite(momentEnd) || momentEnd <= momentStart) return null;
      const requestedStart = Number(cut.startTime), requestedEnd = Number(cut.endTime);
      const startTime = Number.isFinite(requestedStart) ? Math.max(momentStart, Math.min(requestedStart, momentEnd)) : momentStart;
      const endTime = Number.isFinite(requestedEnd) ? Math.max(startTime + 0.1, Math.min(requestedEnd, momentEnd)) : momentEnd;
      return { momentIndex, startTime, endTime, duration: Math.max(0.5, Math.min(4, Number(cut.duration) || Math.min(2, endTime - startTime))), purpose: String(cut.purpose || 'cinematic'), transition: validTransitions.has(String(cut.transition)) ? String(cut.transition) : 'hard-cut', motionStyle: validMotionStyles.has(String(cut.motionStyle)) ? String(cut.motionStyle) : 'static', speed: Math.max(0.5, Math.min(1.5, Number(cut.speed) || 1)), text: String(cut.text || '') };
    }).filter(Boolean).slice(0, 8);
    if (!plan.cuts.length) return res.status(500).json({ success: false, error: 'Gemini returned no cuts linked to verified media moments.' });
    return res.status(200).json({ success: true, plan });
  } catch (error) {
    console.error('[EDIT PLAN] Error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Unknown edit-plan error.' });
  }
}
