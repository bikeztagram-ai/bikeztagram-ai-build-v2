export async function POST(req) {
  try {
    const { prompt, mediaFiles } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'GEMINI_API_KEY is missing in Vercel settings.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build director prompt instructing Gemini to return a structured JSON cut list
    const systemPrompt = `You are a professional social media video editor.
    Analyze the user prompt and generate an Edit Decision List for ${mediaFiles?.length || 4} clips/images targeting ~15 seconds total.
    
    Return strictly JSON with this shape:
    {
      "cuts": [
        {
          "mediaIndex": number (0 to ${ (mediaFiles?.length || 4) - 1 }),
          "duration": number (seconds),
          "transition": "crossfade" | "whip-left" | "zoom-in" | "flash-cut",
          "motionStyle": "pan-right" | "zoom-in" | "zoom-out" | "static"
        }
      ],
      "colorGrade": "dark-cinematic" | "vibrant-pop" | "moody-blue" | "raw",
      "textOverlay": string,
      "generateFillerPrompt": string or null
    }`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\nUser prompt: "${prompt}"` }] }]
        })
      }
    );

    const geminiData = await geminiRes.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const editPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return new Response(
      JSON.stringify({ success: true, plan: editPlan }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
