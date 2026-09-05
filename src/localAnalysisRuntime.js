import { analyseLocalMedia } from './localMediaAnalysis.js';
import { createAIEditPlan } from './aiEditPlanner.js';

const originalFetch = window.fetch.bind(window);
let installed = false;
const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
const fileFromUrl = async (url, filename, mimeType) => {
  const response = await originalFetch(url);
  if (!response.ok) throw new Error(`Local analysis could not read source media (${response.status}).`);
  const blob = await response.blob();
  return new File([blob], filename || 'media', { type: mimeType || blob.type || 'application/octet-stream' });
};

export function installLocalAnalysisRuntime() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const path = url.split('?')[0];
    if (!['/api/analyse', '/api/analyse-image', '/api/analyse-library', '/api/analyse-media'].includes(path)) {
      if (path === '/api/captions') return jsonResponse({ success: true, hasSpeech: false, language: '', cues: [], notes: 'Local-only mode: speech analysis provider disabled.', source: 'local-only' });
      if (path === '/api/edit-plan') {
        const body = JSON.parse(init.body || '{}');
        const plan = createAIEditPlan(body.analysis || {}, { creativePrompt: body.prompt || '', targetDuration: body.targetDuration || 15, maxCuts: 8, colorGrade: 'dark-cinematic' });
        return jsonResponse({ success: true, plan, source: 'local-director' });
      }
      return originalFetch(input, init);
    }
    const body = JSON.parse(init.body || '{}');
    const items = path === '/api/analyse-library'
      ? (Array.isArray(body.items) ? body.items : [])
      : [{ url: body.videoUrl || body.imageUrl || body.mediaUrl, filename: body.filename || 'media', mimeType: body.mimeType || '' }];
    if (!items.length || items.some(item => !item.url)) return jsonResponse({ success: false, error: 'No media source supplied for local analysis.' }, 400);
    try {
      const files = [];
      for (const item of items.slice(0, 12)) files.push(await fileFromUrl(item.url, item.filename, item.mimeType));
      const analysis = await analyseLocalMedia(files, body.prompt || '');
      const plan = createAIEditPlan(analysis, { creativePrompt: body.prompt || '', targetDuration: body.targetDuration || 15, maxCuts: 8, colorGrade: 'dark-cinematic' });
      return jsonResponse({ success: true, analysis, aiEditPlan: plan, plan, source: 'local-browser-analysis' });
    } catch (error) {
      return jsonResponse({ success: false, error: error?.message || 'Local media analysis failed.' }, 500);
    }
  };
}
