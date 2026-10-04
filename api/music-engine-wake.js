/* Bikeztagram Music Engine wake controller.
 * Provider-neutral: the deployment platform supplies MUSIC_ENGINE_WAKE_URL.
 * The endpoint is deliberately server-side so provider credentials never reach the browser.
 */
export const maxDuration = 30;

const env = name => String(process.env[name] || '').trim();
const json = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(payload));
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });

  const wakeUrl = env('MUSIC_ENGINE_WAKE_URL');
  if (!wakeUrl) {
    return json(res, 503, {
      error: 'Music Engine wake controller is not configured.',
      details: 'Set MUSIC_ENGINE_WAKE_URL on the server. No GPU provider is contacted until this is configured.'
    });
  }

  const token = env('MUSIC_ENGINE_WAKE_TOKEN');
  try {
    const response = await fetch(wakeUrl, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'bikeztagram-music-generation' })
    });
    const text = await response.text();
    if (!response.ok) {
      return json(res, 502, {
        error: 'The GPU provider refused the Music Engine wake request.',
        providerStatus: response.status,
        details: text.slice(0, 1200)
      });
    }
    return json(res, 200, { ok: true, providerStatus: response.status });
  } catch (error) {
    return json(res, 502, {
      error: 'The Music Engine could not be started.',
      details: error?.message || String(error)
    });
  }
}
