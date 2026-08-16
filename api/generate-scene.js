import { GoogleGenAI } from '@google/genai';

function cleanBase64(value) {
  const text = String(value || '');
  const comma = text.indexOf(',');
  return comma >= 0 ? text.slice(comma + 1) : text;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is missing.' });

    const { prompt = '', imageData = '', imageMimeType = 'image/jpeg', aspectRatio = '9:16' } = req.body || {};
    if (!prompt.trim()) return res.status(400).json({ success: false, error: 'A generation prompt is required.' });
    if (!imageData) return res.status(400).json({ success: false, error: 'A reference image is required for this first scene-generation test.' });

    const imageBytes = cleanBase64(imageData);
    if (!imageBytes) return res.status(400).json({ success: false, error: 'Reference image data is empty.' });

    const ai = new GoogleGenAI({ apiKey });
    console.log('[GENERATE-SCENE] Starting Veo 3.1 Lite image-to-video generation.');

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt: prompt.trim(),
      image: { imageBytes, mimeType: imageMimeType || 'image/jpeg' },
      config: { aspectRatio, durationSeconds: '8', resolution: '720p', numberOfVideos: 1 }
    });

    for (let attempt = 0; attempt < 60 && !operation.done; attempt++) {
      console.log('[GENERATE-SCENE] Poll', attempt + 1, 'done:', operation.done);
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    if (!operation.done) throw new Error('Veo video generation timed out.');

    const generatedVideo = operation?.response?.generatedVideos?.[0]?.video;
    const videoUri = generatedVideo?.uri;
    if (!videoUri) throw new Error('Veo completed but returned no generated video URI.');

    console.log('[GENERATE-SCENE] Veo generation completed. Downloading generated video.');
    const videoResponse = await fetch(videoUri, { headers: { 'x-goog-api-key': apiKey } });
    if (!videoResponse.ok) throw new Error(`Could not download generated Veo video. HTTP ${videoResponse.status}`);

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    if (!videoBuffer.length) throw new Error('Generated Veo video was empty.');

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', String(videoBuffer.length));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(videoBuffer);
  } catch (error) {
    console.error('[GENERATE-SCENE] ERROR', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to generate AI scene.' });
  }
}
