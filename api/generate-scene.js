/* BIKEZTAGRAM AI — optional real AI scene generation.
   IMPORTANT: this endpoint uses the existing GEMINI_API_KEY server-side.
   It does not change the working Blob upload or Gemini analysis pipeline.
*/
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

function send(res, status, payload) {
  return res.status(status).json(payload);
}

function getAi() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured on the server.');
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function cleanPrompt(prompt = '') {
  const base = String(prompt).trim().slice(0, 4000);
  return `${base}\n\nCreate an original cinematic scene. Preserve the supplied motorcycle as the main subject and keep its recognisable shape, colour and proportions. Do not copy copyrighted characters, logos, game assets or a specific film franchise. Use only broad cinematic conventions. Vertical social-video composition, physically believable motion, dramatic lighting, realistic camera movement, detailed environment, strong depth and atmospheric effects.`;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { imageBytes, mimeType = 'image/jpeg', prompt = '', durationSeconds = '6' } = req.body || {};
      if (!imageBytes) return send(res, 400, { error: 'No reference image was supplied.' });
      if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)) return send(res, 400, { error: `Unsupported reference image type: ${mimeType}` });
      if (String(imageBytes).length > 6_000_000) return send(res, 413, { error: 'Reference image is too large. Send a compressed JPEG.' });

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

      if (!operation?.name) return send(res, 502, { error: 'Veo did not return a generation operation.' });
      return send(res, 200, { operation: operation.name, status: operation.done ? 'completed' : 'generating', model: 'veo-3.1-generate-preview' });
    }

    if (req.method === 'GET') {
      const operationName = String(req.query?.operation || '').trim();
      if (!operationName) return send(res, 400, { error: 'Missing operation query parameter.' });
      const ai = getAi();
      const operation = await ai.operations.getVideosOperation({ operation: { name: operationName } });
      if (!operation?.done) return send(res, 200, { status: 'generating' });
      if (operation.error) return send(res, 502, { status: 'failed', error: operation.error.message || 'Veo generation failed.' });
      const video = operation.response?.generatedVideos?.[0]?.video;
      if (!video?.uri) return send(res, 502, { status: 'failed', error: 'Veo completed without a video URI.' });
      return send(res, 200, { status: 'completed', videoUrl: `/api/generate-scene?operation=${encodeURIComponent(operationName)}&download=1` });
    }

    if (req.method === 'DELETE') return send(res, 405, { error: 'Delete is not supported.' });

    return send(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error('[Bikeztagram] Veo scene generation error', error);
    return send(res, 500, { error: error?.message || String(error), name: error?.name || 'Error' });
  }
}

// Vercel invokes this handler for GET as well, but the download response needs
// to proxy the Google-hosted video while keeping the API key server-side.
export async function proxyGeneratedVideo(req, res) {
  const operationName = String(req.query?.operation || '').trim();
  if (!operationName) return send(res, 400, { error: 'Missing operation query parameter.' });
  const ai = getAi();
  const operation = await ai.operations.getVideosOperation({ operation: { name: operationName } });
  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!operation.done || !video?.uri) return send(res, 409, { error: 'Generated video is not ready yet.' });
  const upstream = await fetch(`${video.uri}${video.uri.includes('?') ? '&' : '?'}key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`);
  if (!upstream.ok || !upstream.body) return send(res, 502, { error: `Could not download generated video (HTTP ${upstream.status}).` });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  if (upstream.headers.get('content-length')) res.setHeader('Content-Length', upstream.headers.get('content-length'));
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
