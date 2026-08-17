import { normalizeGenerationRequest } from '../src/videoGenerationProvider.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  const workerUrl = String(process.env.FREE_VIDEO_WORKER_URL || '').replace(/\/$/, '');
  const workerToken = process.env.FREE_VIDEO_WORKER_TOKEN || '';
  if (!workerUrl || !workerToken) {
    return res.status(503).json({
      error: 'No free GPU worker is connected yet. The interface is ready; connect an approved free worker to start generation.',
      zeroCostOnly: true,
    });
  }

  try {
    const request = normalizeGenerationRequest(req.body || {});
    const response = await fetch(`${workerUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bikeztagram-Token': workerToken,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        seconds: Math.min(5, Math.max(1, Math.round(request.durationSeconds))),
        width: request.aspectRatio === '16:9' ? 832 : 480,
        height: request.aspectRatio === '16:9' ? 480 : 832,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: `Free GPU worker returned HTTP ${response.status}: ${text.slice(0, 500)}` });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    res.setHeader('Content-Disposition', 'inline; filename="bikeztagram-generated.mp4"');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('free-video-generation-error', error?.message || error);
    return res.status(502).json({ error: 'Free GPU generation request failed', detail: error?.message || String(error) });
  }
}
