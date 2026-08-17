import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' });
  const name = String(req.query?.name || '');
  if (!name) return res.status(400).json({ error: 'operation name is required' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'Video generation is not configured' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const operation = await ai.operations.get({ name });
    const response = { id: operation?.name || name, status: operation?.done ? 'complete' : 'processing' };

    if (operation?.error) response.error = 'Video generation failed';
    if (operation?.response) {
      response.video = operation.response.generatedVideos?.[0]?.video || null;
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error('video-generation-status-error', error?.message || error);
    return res.status(502).json({ error: 'Unable to check video generation status' });
  }
}
