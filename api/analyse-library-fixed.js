import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';

const text = (v) => String(v ?? '').trim();
const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v) || min));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];

function retryable(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return /404|429|500|502|503|504|unavailable|overloaded|resource_exhausted|rate limit/.test(message);
}

async function readSignedSource(item) {
  const url = text(item?.url || item?.sourceUrl);
  if (!url) throw new Error('Source has no signed Blob read URL.');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download source media. HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('Vercel Blob returned an empty source media.');
  return { bytes, contentType: response.headers.get('content-type') || text(item?.mimeType) || 'application/octet-stream' };
}

async function geminiFailover(ai, request) {
  const failures = [];
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return { response: await ai.models.generateContent({ ...request, model }), model };
      } catch (error) {
        failures.push(`${model}#${attempt}: ${error?.message || error}`);
        if (!retryable(error)) throw error;
        if (attempt < 2) await sleep(1200 * attempt);
      }
    }
  }
  throw new Error(`Gemini mixed-media analysis failed after model failover. ${failures.join(' | ')}`);
}

function promptFor(prompt, sources, duration) {
  return `You are the Creative Director for BIKEZTAGRAM AI, a general-purpose AI filmmaker. Analyse ONLY the actual supplied media and direct one coherent social-media film.

USER REQUEST: ${text(prompt) || 'Create the strongest cinematic social-media film from this source library.'}
TARGET DURATION: ${clamp(duration, 5, 60)} seconds

SOURCE LIBRARY:
${sources.map((s) => `${s.sourceIndex}: ${s.filename} (${s.mediaType})`).join('\n')}

Rules: never invent footage, actions, objects, locations or identities; prefer hook -> build -> reveal/action/emotion -> hero; use varied verified moments; no duplicate moments; video cuts use exact timestamps; images use 0/0; cuts are 0.5-4 seconds; preserve identity and continuity; return empty speechCues when speech is not reliable.

Return ONLY JSON:
{"title":"","style":"cinematic","colorGrade":"dark-cinematic","editorialStructure":["hook","build","reveal","action","hero"],"subject":{"primarySubject":"","category":"","identity":"","confidence":0},"librarySummary":"","sourceLibrary":[{"sourceIndex":0,"filename":"","mediaType":"","role":"","cinematicScore":0,"verifiedMoments":[{"startTime":0,"endTime":0,"description":"","editorialRole":"","score":0}],"speechCues":[]}],"cuts":[{"sourceIndex":0,"startTime":0,"endTime":2,"duration":2,"purpose":"hook","transition":"fade-in","motionStyle":"static","speed":1,"text":""}],"continuityNotes":"","avoid":""}`;
}

function normalise(parsed, count, duration) {
  if (!parsed || !Array.isArray(parsed.cuts)) return null;
  const transitions = new Set(['hard-cut', 'fade-in', 'fade-out', 'dip-black', 'crossfade']);
  const motions = new Set(['static', 'slow-push', 'slow-pull', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down']);
  const seen = new Set();
  const cuts = parsed.cuts.map((cut) => {
    const sourceIndex = Number(cut?.sourceIndex);
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= count) return null;
    const start = Math.max(0, Number(cut?.startTime) || 0);
    const end = Math.max(start + 0.1, Number(cut?.endTime) || start + 0.1);
    const key = `${sourceIndex}:${Math.round(start * 10)}:${Math.round(end * 10)}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return { sourceIndex, startTime: Number(start.toFixed(2)), endTime: Number(end.toFixed(2)), duration: Number(clamp(cut?.duration || end - start, 0.5, 4).toFixed(2)), purpose: text(cut?.purpose) || 'cinematic', transition: transitions.has(text(cut?.transition)) ? text(cut.transition) : 'hard-cut', motionStyle: motions.has(text(cut?.motionStyle)) ? text(cut.motionStyle) : 'static', speed: Math.max(0.5, Math.min(1.5, Number(cut?.speed) || 1)), text: text(cut?.text) };
  }).filter(Boolean).slice(0, 8);
  if (!cuts.length) return null;
  const sourceLibrary = Array.isArray(parsed.sourceLibrary) ? parsed.sourceLibrary : [];
  return { title: text(parsed.title) || 'Universal AI Film', style: text(parsed.style) || 'cinematic', colorGrade: text(parsed.colorGrade) || 'dark-cinematic', editorialStructure: Array.isArray(parsed.editorialStructure) ? parsed.editorialStructure.map(text).filter(Boolean) : [], subject: parsed.subject || {}, librarySummary: text(parsed.librarySummary), sourceLibrary, cuts, speechCaptions: sourceLibrary.flatMap((s) => Array.isArray(s?.speechCues) ? s.speechCues.map((c) => ({ ...c, sourceIndex: Number(s.sourceIndex) })) : []), captioning: { enabled: sourceLibrary.some((s) => Array.isArray(s?.speechCues) && s.speechCues.length > 0) }, continuityNotes: text(parsed.continuityNotes), avoid: text(parsed.avoid), targetDuration: clamp(duration, 5, 60), stage: 'multi-media-gemini-director' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is missing.' });
    const { items = [], prompt = '', targetDuration = 15 } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ success: false, error: 'No media library items were supplied.' });
    if (items.length > 12) return res.status(400).json({ success: false, error: 'Maximum source-library size is 12 media files per analysis.' });
    const ai = new GoogleGenAI({ apiKey });
    const parts = [];
    const sources = [];
    for (let index = 0; index < items.length; index++) {
      const item = items[index] || {};
      const mimeType = text(item.mimeType) || 'application/octet-stream';
      if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) throw new Error(`Source ${index + 1} has unsupported MIME type: ${mimeType}`);
      const source = await readSignedSource(item);
      const file = await ai.files.upload({ file: new Blob([source.bytes], { type: source.contentType }), config: { mimeType: source.contentType, displayName: text(item.filename) || `source-${index}` } });
      if (!file?.uri || !file?.name) throw new Error(`Gemini did not return a valid file for source ${index + 1}.`);
      let active = file;
      if (mimeType.startsWith('video/')) {
        for (let attempt = 0; attempt < 60; attempt++) {
          const state = String(active?.state || '').toUpperCase();
          if (state === 'ACTIVE') break;
          if (state === 'FAILED') throw new Error(`Gemini failed while processing source ${index + 1}.`);
          await sleep(1500);
          active = await ai.files.get({ name: active.name });
        }
        if (String(active?.state || '').toUpperCase() !== 'ACTIVE') throw new Error(`Gemini timed out processing source ${index + 1}.`);
      }
      parts.push(createPartFromUri(active.uri, active.mimeType || source.contentType));
      sources.push({ sourceIndex: index, filename: text(item.filename) || `source-${index}`, mediaType: mimeType.startsWith('image/') ? 'image' : 'video', mimeType });
    }
    const { response, model } = await geminiFailover(ai, { contents: createUserContent([...parts, promptFor(prompt, sources, targetDuration)]), config: { responseMimeType: 'application/json' } });
    const raw = text(response?.text).replace(/```json/gi, '').replace(/```/g, '').trim();
    if (!raw) throw new Error('Gemini returned no mixed-media analysis.');
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error('Gemini returned invalid mixed-media JSON.'); }
    const plan = normalise(parsed, sources.length, targetDuration);
    if (!plan) throw new Error('Gemini returned no valid mixed-media edit plan.');
    const analysis = { mediaType: 'mixed-media-library', sourceCount: sources.length, sources, subject: plan.subject, librarySummary: plan.librarySummary, sourceLibrary: plan.sourceLibrary, continuityNotes: plan.continuityNotes, avoid: plan.avoid, cinematicScore: Math.round(plan.sourceLibrary.reduce((sum, s) => sum + (Number(s.cinematicScore) || 0), 0) / Math.max(1, plan.sourceLibrary.length)), directorPipeline: { stages: ['actual-multi-media-analysis', 'verified-multi-source-edit-direction'], model, sourceOfTruth: 'uploaded-media', architecture: 'universal-ai-filmmaker' } };
    return res.status(200).json({ success: true, analysis, aiEditPlan: plan });
  } catch (error) {
    console.error('[ANALYSE-LIBRARY-FIXED]', error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || 'Unknown mixed-media analysis error' });
  }
}
