/* Server-side Eleven Music v2 gateway. API keys never reach the browser. */
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return json({ error: 'AI music provider is not configured. Add ELEVENLABS_API_KEY in Vercel.' }, 503);
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return json({ error: 'Music prompt is required.' }, 400);
    const length = Math.max(3000, Math.min(600000, Number(body.durationMs) || 30000));
    const instrumental = Boolean(body.forceInstrumental);
    let payload;

    if (instrumental) {
      payload = { prompt, music_length_ms: length, model_id: 'music_v2', force_instrumental: true, sign_with_c2pa: false };
    } else {
      // Music v2 composition plans give the model explicit sections, pacing, lyrics and instrumentation
      // instead of asking a single prompt to solve the whole arrangement in one pass.
      const planResponse = await fetch('https://api.elevenlabs.io/v1/music/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
        body: JSON.stringify({ prompt, music_length_ms: length, model_id: 'music_v2' })
      });
      if (!planResponse.ok) {
        const text = await planResponse.text();
        return json({ error: 'Eleven Music composition planning failed.', providerStatus: planResponse.status, details: text.slice(0, 2000) }, planResponse.status >= 400 && planResponse.status < 500 ? planResponse.status : 502);
      }
      const compositionPlan = await planResponse.json();
      payload = { composition_plan: compositionPlan, model_id: 'music_v2', sign_with_c2pa: false };
    }

    const response = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text();
      return json({ error: 'Eleven Music generation failed.', providerStatus: response.status, details: text.slice(0, 2000) }, response.status >= 400 && response.status < 500 ? response.status : 502);
    }
    const buffer = await response.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-store',
        'X-Bikeztagram-Music-Provider': 'eleven-music-v2',
        'X-Bikeztagram-Music-Original': 'true',
        'X-Bikeztagram-Music-Song-Id': response.headers.get('song-id') || ''
      }
    });
  } catch (error) {
    return json({ error: 'AI music request failed.', details: error?.message || String(error) }, 502);
  }
}
