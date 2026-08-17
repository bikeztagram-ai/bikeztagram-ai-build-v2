import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'GET required' });
    return;
  }

  const id = String(req.query?.id || '').trim();
  if (!id) {
    res.status(400).json({ error: 'Operation id is required' });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({ error: 'Video generation is not configured on this deployment' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let operation = { name: id };
    operation = await ai.operations.getVideosOperation({ operation });

    const generated = operation?.response?.generatedVideos?.[0]?.video || null;
    const done = Boolean(operation?.done);
    const failed = Boolean(operation?.error);

    res.status(200).json({
      id,
      status: failed ? 'failed' : done ? 'complete' : 'processing',
      done,
      video: generated,
      error: operation?.error || null,
    });
  } catch (error) {
    console.error('video-generation-status-error', error?.message || error);
    res.status(500).json({ error: 'Unable to read video generation status' });
  }
}
