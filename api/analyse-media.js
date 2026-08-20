import analyseVideo from './analyse.js';
import analyseImage from './analyse-image.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
  const body = req.body || {};
  const mimeType = String(body.mimeType || '').toLowerCase();
  const looksLikeImage = mimeType.startsWith('image/') || Boolean(body.imageUrl);
  const looksLikeVideo = mimeType.startsWith('video/') || Boolean(body.videoUrl);

  if (looksLikeImage && !looksLikeVideo) return analyseImage(req, res);
  if (looksLikeVideo && !looksLikeImage) return analyseVideo(req, res);
  return res.status(400).json({ success:false, error:'Unsupported or ambiguous media type. Supply a video/* or image/* MIME type.' });
}
