import { GoogleGenAI } from '@google/genai';
import { normalizeGenerationRequest } from '../src/videoGenerationProvider.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST required' });
    return;
  }

  try {
    const request = normalizeGenerationRequest(req.body || {});
    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({ error: 'Video generation is not configured on this deployment' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const operation = await ai.models.generateVideos({
      model: request.model,
      prompt: request.prompt,
      config: {
        numberOfVideos: 1,
        resolution: request.resolution,
        aspectRatio: request.aspectRatio,
        generateAudio: request.generateAudio,
      },
    });

    res.status(202).json({
      id: operation?.name || null,
      status: operation?.done ? 'complete' : 'processing',
      provider: 'gemini-video',
      model: request.model,
      operation,
    });
  } catch (error) {
    console.error('video-generation-error', error?.message || error);
    res.status(500).json({ error: 'Video generation failed' });
  }
}
