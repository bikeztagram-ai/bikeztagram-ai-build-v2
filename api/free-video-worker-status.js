export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' });
  const workerUrl = String(process.env.FREE_VIDEO_WORKER_URL || '').replace(/\/$/, '');
  const tokenConfigured = Boolean(process.env.FREE_VIDEO_WORKER_TOKEN);
  if (!workerUrl || !tokenConfigured) {
    return res.status(200).json({ configured: false, ready: false, zeroCostOnly: true, message: 'Free GPU worker is not configured yet.' });
  }
  return res.status(200).json({ configured: true, ready: true, zeroCostOnly: true, message: 'Free GPU worker configuration is present.' });
}
