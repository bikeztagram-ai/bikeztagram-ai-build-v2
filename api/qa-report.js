/* BIKEZTAGRAM AI — automatic browser QA telemetry.
   Receives only small diagnostic metadata from the browser. No video bytes are accepted or stored here.
*/

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const report = req.body || {};
    const safe = {
      generatedAt: report.generatedAt || new Date().toISOString(),
      kind: report.kind || 'unknown',
      verdict: report.verdict || 'unknown',
      durationSeconds: Number(report.durationSeconds || 0),
      width: Number(report.width || 0),
      height: Number(report.height || 0),
      playbackAdvanced: Boolean(report.playbackAdvanced),
      playbackProbeMs: Number(report.playbackProbeMs || 0),
      frameQA: report.frameQA || null,
      sourceUrlType: report.sourceUrlType || 'unknown',
      blobLikeOutput: Boolean(report.blobLikeOutput),
      error: report.error ? String(report.error).slice(0, 500) : null
    };
    console.log('[AUTO-QA] Browser render test:', safe);
    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error('[AUTO-QA] Telemetry error:', error?.message || error);
    return res.status(400).json({ success: false, error: 'Invalid QA report.' });
  }
}
