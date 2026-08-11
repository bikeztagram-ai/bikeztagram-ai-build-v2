export async function POST(req) {
  try {
    const { prompt, mediaFilesCount } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'GEMINI_API_KEY is missing in Vercel settings.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const totalClips = mediaFilesCount || 4;

    const systemPrompt = `You are a professional motorcycle video editor. 
    Create a dynamic Edit Decision List for ${totalClips} clips/images for a 15-second Instagram reel.
    
    Return ONLY a valid JSON object matching this exact structure (no markdown tags, no backticks, no extra text):
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

    Requirements for cuts array:
    - Include exactly ${totalClips} cut objects.
    - "mediaIndex" should cycle from 0 to ${totalClips - 1}.
    - "duration" values should total roughly 15 seconds.
    - "transition" choices: "crossfade", "whip-left", "flash-cut", "zoom-in".
    - "motionStyle" choices: "zoom-in", "zoom-out", "pan-right", "static".
    - "colorGrade" choices: "dark-cinematic", "moody-blue", "vibrant-pop".`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\nUser style prompt: "${prompt}"` }] }]
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API Error: ${geminiRes.status} - ${errText}`);
    }

    const geminiData = await geminiRes.json();
    let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Clean potential markdown quotes from raw model text
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const editPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return new Response(
      JSON.stringify({ success: true, plan: editPlan }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
