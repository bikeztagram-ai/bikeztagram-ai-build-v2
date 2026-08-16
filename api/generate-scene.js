/* BIKEZTAGRAM AI — optional real AI scene generation.
   Uses the existing GEMINI_API_KEY server-side.
   Does not modify the working Blob upload or Gemini analysis pipeline.
*/
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function getAi() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured on the server.');
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function cleanPrompt(prompt = '') {
  const base = String(prompt).trim().slice(0, 4000);
  return `${base}\n\nCreate an original cinematic scene. Preserve the supplied motorcycle as the main subject and keep its recognisable shape, colour and proportions. Do not copy copyrighted characters, logos, game assets or a specific film franchise. Use broad cinematic conventions only. Vertical social-video composition, physically believable motion, dramatic lighting, realistic camera movement, detailed environment, strong depth and atmospheric effects.`;
}

async function getOperation(ai, name) {
  return ai.operations.getVideosOperation({ operation: { name } });
}

async function proxyVideo(res, operationName) {
  const ai = getAi();
  const operation = await getOperation(ai, operationName);
  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!operation.done || !video?.uri) return json(res, 409, { error: 'Generated video is not ready yet.' });
  const separator = video.uri.includes('?') ? '&' : '?';
  const upstream = await fetch(`${video.uri}${separator}key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`);
  if (!upstream.ok || !upstream.body) return json(res, 502, { error: `Could not download generated video (HTTP ${upstream.status}).` });
  res.statusCode = 200;
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  const length = upstream.headers.get('content-length');
  if (length) res.setHeader('Content-Length', length);
  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { imageBytes, mimeType = 'image/jpeg', prompt = '', durationSeconds = '6' } = req.body || {};
      if (!imageBytes) return json(res, 400, { error: 'No reference image was supplied.' });
      if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)) return json(res, 400, { error: `Unsupported reference image type: ${mimeType}` });
      if (String(imageBytes).length > 6_000_000) return json(res, 413, { error: 'Reference image is too large. Send a compressed JPEG.' });

      const ai = getAi();
      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: cleanPrompt(prompt),
        image: { imageBytes, mimeType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType },
        config: {
          aspectRatio: '9:16',
          resolution: '720p',
          durationSeconds: ['4', '6', '8'].includes(String(durationSeconds)) ? String(durationSeconds) : '6',
          personGeneration: 'allow_adult',
        },
      });
      if (!operation?.name) return json(res, 502, { error: 'Veo did not return a generation operation.' });
      return json(res, 200, { operation: operation.name, status: operation.done ? 'completed' : 'generating', model: 'veo-3.1-generate-preview' });
    }

    if (req.method === 'GET') {
      const operationName = String(req.query?.operation || '').trim();
      if (!operationName) return json(res, 400, { error: 'Missing operation query parameter.' });
      if (String(req.query?.download || '') === '1') return proxyVideo(res, operationName);
      const ai = getAi();
      const operation = await getOperation(ai, operationName);
      if (!operation?.done) return json(res, 200, { status: 'generating' });
      if (operation.error) return json(res, 502, { status: 'failed', error: operation.error.message || 'Veo generation failed.' });
      const video = operation.response?.generatedVideos?.[0]?.video;
      if (!video?.uri) return json(res, 502, { status: 'failed', error: 'Veo completed without a video URI.' });
      return json(res, 200, { status: 'completed', videoUrl: `/api/generate-scene?operation=${encodeURIComponent(operationName)}&download=1` });
    }

    return json(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error('[Bikeztagram] Veo scene generation error', error);
    return json(res, 500, { error: error?.message || String(error), name: error?.name || 'Error' });
  }
}
