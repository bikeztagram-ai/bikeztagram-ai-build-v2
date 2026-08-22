import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';
import { readPrivateBlob } from './private-blob-read.js';

const text = (value) => String(value ?? '').trim();
const num = (value, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };

function promptForImage(userPrompt, filename) {
  return `You are Stage 1 of a GENERAL-PURPOSE AI FILMMAKER.

Analyse the ACTUAL uploaded image. Do not assume the subject from the filename. It may be a motorcycle, car, puppy, animal, person, travel scene, landscape, product, event, architecture, food, object or anything else.

Identify only what is visibly supported by the image. Preserve uncertainty rather than inventing details.

Return ONLY valid JSON:
{
  "filename":"${filename}",
  "durationSeconds":0,
  "mediaType":"image",
  "subjects":[{"label":"","category":"","description":"","identity":"","attributes":[],"confidence":0,"importance":"primary"}],
  "subject":{"primarySubject":"","category":"","description":"","identity":"","attributes":[],"confidence":0},
  "scene":{"environment":"","locationType":"","timeOfDay":"","lighting":"","continuityAnchors":[]},
  "shots":[{"start":0,"end":0,"type":"still-image","cameraMovement":"none","cameraAngle":"","screenDirection":"","stability":"stable","composition":"","subjectVisibility":""}],
  "verifiedEvents":[],
  "action":"",
  "narrative":{"tone":"","emotion":"","storyPotential":""},
  "visualQuality":{"composition":"","lighting":"","colour":"","sharpness":"","subjectVisibility":"","cinematicPotential":""},
  "cinematicScore":0,
  "bestMoments":[{"start":0,"end":2,"description":"","reason":"","editorialRole":"","subject":"","shotType":"still-image","score":0}],
  "editingRecommendation":{"role":"","suggestedDuration":2,"speed":1,"slowMotion":false,"reason":"Still image; use camera motion only as an editorial treatment."},
  "textRecommendation":{"useText":false,"text":"","reason":""},
  "transitionRecommendation":"",
  "motionRecommendation":"",
  "continuityNotes":"",
  "avoid":"",
  "editorialNotes":""
}

USER CREATIVE REQUEST:
${text(userPrompt) || 'Create a cinematic social-media edit from this image.'}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success:false, error:'GEMINI_API_KEY is missing.' });
    const { imageUrl='', blobUrl='', pathname='', filename='image.jpg', mimeType='image/jpeg', prompt='' } = req.body || {};
    const actualImageUrl = imageUrl || blobUrl;
    if (!actualImageUrl && !pathname) return res.status(400).json({ success:false, error:'No private Blob image source was supplied.' });
    if (!String(mimeType).startsWith('image/')) return res.status(400).json({ success:false, error:'analyse-image requires an image MIME type.' });

    const source = await readPrivateBlob({url:actualImageUrl,pathname,label:'uploaded Blob image'});
    const contentType = source.contentType || mimeType;
    if (!contentType.startsWith('image/')) throw new Error(`Blob returned unsupported content type: ${contentType}`);
    const bytes = source.bytes;

    const ai = new GoogleGenAI({ apiKey });
    const imageFile = await ai.files.upload({ file:new Blob([bytes], { type:contentType }), config:{ mimeType:contentType, displayName:filename } });
    if (!imageFile?.name || !imageFile?.uri) throw new Error('Gemini did not return a valid uploaded image file.');

    const response = await ai.models.generateContent({
      model:'gemini-3.6-flash',
      contents:createUserContent([createPartFromUri(imageFile.uri, imageFile.mimeType || contentType), promptForImage(prompt, filename)]),
      config:{ responseMimeType:'application/json' }
    });
    const modelText = text(response?.text).replace(/```json/gi,'').replace(/```/g,'').trim();
    if (!modelText) throw new Error('Gemini returned no image analysis.');
    let analysis;
    try { analysis = JSON.parse(modelText); } catch { throw new Error('Gemini returned invalid image analysis JSON.'); }

    analysis.filename = filename;
    analysis.mediaType = 'image';
    analysis.durationSeconds = 0;
    analysis.source = { type:'uploaded-image', pathname:source.pathname, mimeType:contentType };
    analysis.directorPipeline = {
      stages:['actual-media-analysis','verified-edit-direction'],
      stage1:'gemini-3.6-flash-image-analysis',
      sourceOfTruth:'uploaded-media',
      architecture:'universal-ai-filmmaker'
    };
    return res.status(200).json({ success:true, analysis });
  } catch (error) {
    console.error('[ANALYSE-IMAGE]', error?.message || error);
    return res.status(500).json({ success:false, error:error?.message || 'Unknown image analysis error.' });
  }
}
