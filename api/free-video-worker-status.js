export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' });

  const workerUrl = String(process.env.FREE_VIDEO_WORKER_URL || '').replace(/\/$/, '');
  const tokenConfigured = Boolean(process.env.FREE_VIDEO_WORKER_TOKEN);
  const base = { configured: Boolean(workerUrl && tokenConfigured), ready: false, zeroCostOnly: true };

  if (!workerUrl || !tokenConfigured) {
    return res.status(200).json({ ...base, message: 'Free GPU worker is not configured yet.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${workerUrl}/health`, {
      method: 'GET',
      headers: { 'X-Bikeztagram-Token': process.env.FREE_VIDEO_WORKER_TOKEN },
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    let worker = null;
    if (contentType.includes('application/json')) {
      try { worker = await response.json(); } catch {}
    }
    return res.status(200).json({
      ...base,
      ready: response.ok,
      workerStatus: response.status,
      worker,
      message: response.ok ? 'Free GPU worker is reachable.' : `Free GPU worker health check returned HTTP ${response.status}.`,
    });
  } catch (error) {
    return res.status(200).json({
      ...base,
      ready: false,
      message: error?.name === 'AbortError' ? 'Free GPU worker health check timed out.' : 'Free GPU worker is unreachable.',
    });
  } finally {
    clearTimeout(timeout);
  }
}
