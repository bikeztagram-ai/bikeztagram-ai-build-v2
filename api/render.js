export default async function handler(req, res) {
  // Ensure CORS and method check
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { prompt, mediaFilesCount } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'GEMINI_API_KEY is missing in Vercel settings.' });
    }

    const totalClips = mediaFilesCount || 4;

    const systemPrompt = `You are a video editor. Generate an edit plan JSON for ${totalClips} items.
Return ONLY valid JSON with this exact layout:
{
  "cuts": [
    {
      "mediaIndex": 0,
      "duration": 2.5,
      "transition": "whip-left",
      "motionStyle": "zoom-in"
    }
  ],
  "colorGrade": "moody-blue",
  "textOverlay": "DARK BLUE NINJA"
}

Rules:
- Exactly ${totalClips} items in "cuts".
- "mediaIndex" from 0 to ${totalClips - 1}.
- "transition": "crossfade", "whip-left", "flash-cut", or "zoom-in".
- "motionStyle": "zoom-in", "zoom-out", "pan-right", or "static".
- "colorGrade": "dark-cinematic", "moody-blue", or "vibrant-pop".`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\nUser request: "${prompt}"` }] }]
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(500).json({ success: false, error: `Gemini Error: ${geminiRes.status}` });
    }

    const geminiData = await geminiRes.json();
    let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Strip markdown tags if present
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const editPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return res.status(200).json({ success: true, plan: editPlan });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
