import { normalizeEditCut } from '../src/editPlanTiming.js';
import { shapeCinematicEditPlan } from '../src/editDirectorPolicy.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is missing in Vercel settings.' });

    const { prompt = '', analysis = null } = req.body || {};
    if (!analysis || typeof analysis !== 'object') return res.status(400).json({ success: false, error: 'No Gemini video analysis was supplied.' });

    const availableMoments = Array.isArray(analysis.bestMoments) ? analysis.bestMoments : [];
    if (!availableMoments.length) return res.status(400).json({ success: false, error: 'Gemini analysis contains no verified best moments.' });

    const directorPrompt = `
You are the final AI edit director for BIKEZTAGRAM AI.

A separate Gemini video-analysis stage has already watched the ACTUAL motorcycle footage and produced the verified analysis below. Do NOT analyse the video again. Turn only that verified evidence into a polished cinematic social-media edit plan.

USER CREATIVE REQUEST:
${prompt || 'Create an exciting cinematic motorcycle social-media edit.'}

VERIFIED VIDEO ANALYSIS:
${JSON.stringify(analysis, null, 2)}

EDITORIAL MISSION:
Create a short motorcycle trailer that feels deliberately directed, not like a sequence of uploaded clips.
Use the strongest evidence to create a progression such as:
HOOK → BUILD → REVEAL → ACTION/ESCALATION → HERO.
Use only the stages that the verified footage genuinely supports. Never invent an event just to complete the story.

SHOT SELECTION RULES:
- Select the strongest verified moments, not simply the first moments in the list.
- Prefer visual variety: different framing, movement, subject relationship or camera behaviour when the analysis supports it.
- Avoid two consecutive cuts that feel visually redundant.
- Reserve the strongest verified moment for the final hero whenever practical.
- If the footage does not support enough distinct moments, make fewer cuts.
- Do not duplicate a moment unless it is clearly justified by the creative request.
- Real footage is the source of truth. Never invent an angle, stunt, rider action, environment or camera movement.

MOTION / PACING:
- Match motion to the analysed camera behaviour.
- Use slow-push/pull for anticipation or reveal.
- Use pans/tilts only where they suit the source composition.
- Use faster pacing around genuine action or escalation.
- Do not add artificial motion just because a field exists.
- Use speed changes only where the analysis supports a change of energy.

TRANSITIONS:
- Prefer hard cuts for energetic action.
- Use crossfade for controlled cinematic continuity.
- Use whip transitions only when movement direction supports them.
- Use dip-black sparingly for a major beat or final punctuation.
- Do not make every transition different merely for variety.

TEXT:
- Text is optional and should be minimal.
- Prefer one hook or one hero title rather than text on every shot.

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
      "purpose": "hook",
      "transition": "hard-cut",
      "motionStyle": "static",
      "speed": 1,
      "text": ""
    }
  ]
}

Hard constraints:
- momentIndex MUST refer to bestMoments.
- startTime/endTime MUST remain inside that verified moment.
- duration 0.5–4 seconds.
- speed 0.5–1.5.
- Allowed transitions: hard-cut, fade-in, fade-out, dip-black, crossfade, flash-cut, whip-left, whip-right.
- Allowed motion styles: static, slow-push, slow-pull, pan-left, pan-right, tilt-up, tilt-down.
- Maximum 8 cuts.
- Prefer 3–6 cuts when enough verified moments exist.
- Fewer cuts are better than invented footage.
`;

    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: directorPrompt }] }], generationConfig: { responseMimeType: 'application/json' } })
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

    if (!plan || !Array.isArray(plan.cuts) || plan.cuts.length === 0) return res.status(500).json({ success: false, error: 'Gemini did not create any usable cuts.' });

    const validTransitions = new Set(['hard-cut','fade-in','fade-out','dip-black','crossfade','flash-cut','whip-left','whip-right']);
    const validMotionStyles = new Set(['static','slow-push','slow-pull','pan-left','pan-right','tilt-up','tilt-down']);

    plan.cuts = plan.cuts.map((cut) => {
      const normalized = normalizeEditCut(cut, availableMoments[Number(cut?.momentIndex)], availableMoments.length);
      if (!normalized) return null;
      return {
        ...normalized,
        transition: validTransitions.has(String(cut.transition)) ? String(cut.transition) : 'hard-cut',
        motionStyle: validMotionStyles.has(String(cut.motionStyle)) ? String(cut.motionStyle) : 'static',
      };
    }).filter(Boolean).slice(0, 8);

    if (!plan.cuts.length) return res.status(500).json({ success: false, error: 'Gemini returned no cuts linked to verified video moments of usable duration.' });

    plan = shapeCinematicEditPlan(plan, availableMoments);
    return res.status(200).json({ success: true, plan });
  } catch (error) {
    console.error('[EDIT PLAN] Error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Unknown edit-plan error.' });
  }
}
