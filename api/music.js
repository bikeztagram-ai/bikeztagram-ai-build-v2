/* Server-side Eleven Music v2 gateway. API keys never reach the browser. */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Method not allowed.' }));
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'AI music provider is not configured. Add ELEVENLABS_API_KEY in Vercel.' }));
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const prompt = String(body.prompt || '').trim();
    if (!prompt) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Music prompt is required.' }));
    }

    const length = Math.max(3000, Math.min(600000, Number(body.durationMs) || 30000));
    const instrumental = Boolean(body.forceInstrumental);

    // Use the current Eleven Music v2 compose endpoint directly. This avoids
    // an unnecessary plan->compose round trip and lets the provider stream/generate
    // the actual audio for the requested duration.
    const response = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
      body: JSON.stringify({
        prompt,
        music_length_ms: length,
        model_id: 'music_v2',
        force_instrumental: instrumental,
        sign_with_c2pa: false
      })
    });

    if (!response.ok) {
      const text = await response.text();
      const status = response.status >= 400 && response.status < 500 ? response.status : 502;
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        error: 'Eleven Music generation failed.',
        providerStatus: response.status,
        details: text.slice(0, 2000)
      }));
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Eleven Music returned an empty audio file.' }));
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Content-Length', String(buffer.byteLength));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Bikeztagram-Music-Provider', 'eleven-music-v2');
    res.setHeader('X-Bikeztagram-Music-Original', 'true');
    res.setHeader('X-Bikeztagram-Music-Song-Id', response.headers.get('song-id') || '');
    return res.end(buffer);
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'AI music request failed.',
      details: error?.message || String(error)
    }));
  }
}
