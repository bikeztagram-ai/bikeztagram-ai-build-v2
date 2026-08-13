import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const apiKey =
      process.env.GEMINI_API_KEY;

    console.log(
      'Video analysis API key detected:',
      Boolean(apiKey)
    );

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          'GEMINI_API_KEY is missing in Vercel settings.'
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
        error:
          'No video was supplied.'
      });
    }

    console.log(
      'Analysing video:',
      filename,
      mimeType
    );

    const ai =
      new GoogleGenAI({
        apiKey
      });

    const prompt = `
You are an expert professional motorcycle
film editor and cinematographer.

Watch the supplied motorcycle video carefully.

Analyse the ACTUAL VIDEO CONTENT.

Do not guess based on the filename.

Identify:

1. What is happening in the video.
2. Whether a motorcycle is visible.
3. The motorcycle's prominence.
4. Camera movement.
5. Rider movement or riding action.
6. Scenery and environment.
7. Whether the shot is visually interesting.
8. Any text appearing on screen.
9. Any repetitive or weak sections.
10. The strongest moments of the video.

Provide useful timestamps for the strongest moments.

Return ONLY valid JSON.

Use exactly this structure:

{
  "summary": "string",
  "motorcycleVisible": true,
  "visualQuality": 1,
  "energy": 1,
  "cameraMovement": "string",
  "scene": "string",
  "onScreenText": "string",
  "strongMoments": [
    {
      "start": 0,
      "end": 2,
      "description": "string",
      "score": 1
    }
  ],
  "weakMoments": [
    {
      "start": 0,
      "end": 1,
      "reason": "string"
    }
  ]
}

Scoring:

visualQuality:
1 = poor
10 = excellent

energy:
1 = very calm
10 = extremely energetic

strongMoments score:
1 = weak
10 = exceptional

Be honest and critical.

The purpose of this analysis is to help another AI
editor decide which exact sections of the video should
be used in a finished cinematic motorcycle reel.
`;

    const response =
      await ai.models.generateContent({
        model: 'gemini-3.5-flash',

        contents: [
          {
            inlineData: {
              mimeType,
              data: videoBase64
            }
          },
          {
            text: prompt
          }
        ],

        config: {
          responseMimeType:
            'application/json'
        }
      });

    const text =
      response?.text || '';

    console.log(
      'Gemini video analysis response received.'
    );

    let analysis;

    try {
      analysis =
        JSON.parse(text);
    } catch {
      console.error(
        'Gemini returned invalid analysis JSON:',
        text.slice(0, 2000)
      );

      return res.status(500).json({
        success: false,
        error:
          'Gemini returned invalid analysis JSON.',
        raw:
          text.slice(0, 1000)
      });
    }

    return res.status(200).json({
      success: true,
      filename,
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
