import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    console.log(
      'Analyse API key detected:',
      Boolean(apiKey),
      'length:',
      apiKey ? apiKey.length : 0
    );

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY is missing in Vercel settings.'
      });
    }

    const {
      videoBase64 = '',
      mimeType = 'video/mp4',
      filename = 'video.mp4'
    } = req.body || {};

    if (!videoBase64) {
      return res.status(400).json({
        success: false,
        error: 'No video was supplied.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey
    });

    /*
     * Convert the incoming base64 video into a temporary
     * Gemini file using the current Google GenAI SDK.
     */

    const videoBuffer = Buffer.from(
      videoBase64,
      'base64'
    );

    console.log(
      'Video received:',
      filename,
      'bytes:',
      videoBuffer.length
    );

    /*
     * Upload the actual video to Gemini.
     */

    const uploadedFile = await ai.files.upload({
      file: new Blob(
        [videoBuffer],
        { type: mimeType }
      ),
      config: {
        mimeType,
        displayName: filename
      }
    });

    console.log(
      'Gemini file uploaded:',
      uploadedFile?.name || 'unknown'
    );

    /*
     * Gemini may need a short amount of time to process
     * the uploaded video before it can be analysed.
     */

    let file = uploadedFile;

    for (let attempt = 0; attempt < 20; attempt++) {
      if (
        file?.state === 'ACTIVE' ||
        file?.state === 'active'
      ) {
        break;
      }

      if (
        file?.state === 'FAILED' ||
        file?.state === 'failed'
      ) {
        return res.status(500).json({
          success: false,
          error: 'Gemini failed to process the uploaded video.'
        });
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );

      if (uploadedFile?.name) {
        file = await ai.files.get({
          name: uploadedFile.name
        });
      }
    }

    if (
      !file ||
      !file.uri ||
      !file.mimeType
    ) {
      return res.status(500).json({
        success: false,
        error: 'Gemini video file was not ready for analysis.'
      });
    }

    /*
     * Ask Gemini to actually inspect the footage.
     */

    const analysisPrompt = `
You are an expert professional motorcycle film editor,
cinematographer and AI video director.

Analyse the ACTUAL VIDEO supplied to you.

Do not analyse the filename alone.

Watch the footage and identify what is genuinely visible.

We are developing BIKEZTAGRAM AI, an intelligent motorcycle
video editor.

Analyse the footage for:

1. SUBJECT
- motorcycle visibility
- motorcycle model if recognisable
- rider visibility
- scenery
- other important subjects

2. SHOT TYPE
Identify whether the shot is:
- wide
- medium
- close-up
- detail
- tracking
- riding
- stationary
- reveal
- action
- scenery
- other

3. CAMERA
Describe:
- camera movement
- direction of movement
- stability
- approximate camera angle
- whether the camera follows the motorcycle

4. ACTION
Identify genuine movement or events.

5. CINEMATIC VALUE
Give the shot a score from 1 to 10.

Consider:
- composition
- subject visibility
- movement
- visual interest
- motorcycle appeal
- usefulness in a cinematic motorcycle trailer

6. BEST MOMENTS

Identify up to three particularly useful moments.

Give approximate timestamps in seconds.

7. EDITING RECOMMENDATION

Suggest:
- where this shot could appear in a trailer
- approximate useful duration
- whether it should be slow motion
- whether it should be fast
- whether it should be a hero shot
- whether it should be an action shot

IMPORTANT:

Only report things you can actually see in the video.

Do not invent motorcycle movements,
camera movements, scenery or events.

Return ONLY valid JSON.

Use exactly this structure:

{
  "filename": "${filename}",
  "durationSeconds": 0,
  "subject": {
    "motorcycleVisible": false,
    "riderVisible": false,
    "description": ""
  },
  "shot": {
    "type": "",
    "cameraMovement": "",
    "cameraAngle": "",
    "stability": ""
  },
  "action": "",
  "cinematicScore": 0,
  "bestMoments": [
    {
      "start": 0,
      "end": 0,
      "description": ""
    }
  ],
  "editingRecommendation": {
    "role": "",
    "suggestedDuration": 0,
    "speed": 1,
    "reason": ""
  }
}
`;

    const response = await ai.interactions.create({
      model: 'gemini-3.5-flash',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: analysisPrompt
            },
            {
              type: 'file',
              fileId: file.name
            }
          ]
        }
      ]
    });

    console.log(
      'Gemini analysis completed.'
    );

    let text = '';

    if (typeof response?.output_text === 'string') {
      text = response.output_text;
    }

    if (!text && Array.isArray(response?.outputs)) {
      for (const output of response.outputs) {
        if (
          Array.isArray(output?.content)
        ) {
          for (const part of output.content) {
            if (
              typeof part?.text === 'string'
            ) {
              text += part.text;
            }
          }
        }
      }
    }

    text = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    if (!text) {
      return res.status(500).json({
        success: false,
        error: 'Gemini returned no analysis.'
      });
    }

    let analysis;

    try {
      analysis = JSON.parse(text);
    } catch (error) {
      console.error(
        'Invalid Gemini analysis:',
        text.slice(0, 3000)
      );

      return res.status(500).json({
        success: false,
        error: 'Gemini returned invalid analysis JSON.'
      });
    }

    return res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error(
      'Video analysis error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        'Unknown video analysis error.'
    });
  }
              }
