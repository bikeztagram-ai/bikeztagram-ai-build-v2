import { GoogleGenAI } from '@google/genai';
import Busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false
  }
};

function readMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers
    });

    let videoBuffer = null;
    let filename = 'video.mp4';
    let mimeType = 'video/mp4';
    let prompt = '';

    busboy.on(
      'file',
      (fieldname, file, info) => {
        const chunks = [];

        filename =
          info.filename ||
          'video.mp4';

        mimeType =
          info.mimeType ||
          'video/mp4';

        file.on('data', (chunk) => {
          chunks.push(chunk);
        });

        file.on('end', () => {
          videoBuffer = Buffer.concat(
            chunks
          );
        });

        file.on('error', reject);
      }
    );

    busboy.on(
      'field',
      (fieldname, value) => {
        if (fieldname === 'prompt') {
          prompt = value;
        }

        if (fieldname === 'filename') {
          filename = value;
        }

        if (fieldname === 'mimeType') {
          mimeType = value;
        }
      }
    );

    busboy.on(
      'finish',
      () => {
        resolve({
          videoBuffer,
          filename,
          mimeType,
          prompt
        });
      }
    );

    busboy.on(
      'error',
      reject
    );

    req.pipe(busboy);
  });
}

export default async function handler(
  req,
  res
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          'GEMINI_API_KEY is missing in Vercel settings.'
      });
    }

    console.log(
      'Starting multipart video analysis...'
    );

    const {
      videoBuffer,
      filename,
      mimeType,
      prompt
    } = await readMultipart(req);

    if (
      !videoBuffer ||
      videoBuffer.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          'No video was received.'
      });
    }

    console.log(
      'Video received:',
      filename,
      'bytes:',
      videoBuffer.length,
      'mime:',
      mimeType
    );

    const ai = new GoogleGenAI({
      apiKey
    });

    /*
     * Upload the actual video to Gemini.
     */

    let videoFile;

    try {
      videoFile =
        await ai.files.upload({
          file: new Blob(
            [videoBuffer],
            {
              type: mimeType
            }
          ),
          config: {
            mimeType,
            displayName: filename
          }
        });
    } catch (error) {
      console.error(
        'Gemini upload error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          `Gemini video upload failed: ${
            error?.message ||
            'Unknown upload error'
          }`
      });
    }

    console.log(
      'Gemini file uploaded:',
      videoFile?.name,
      videoFile?.uri,
      videoFile?.state
    );

    if (!videoFile?.name) {
      return res.status(500).json({
        success: false,
        error:
          'Gemini did not return a valid uploaded file.'
      });
    }

    /*
     * Wait for Gemini to finish processing
     * the video.
     */

    let currentFile =
      videoFile;

    for (
      let attempt = 0;
      attempt < 30;
      attempt++
    ) {
      const state =
        String(
          currentFile?.state ||
            ''
        ).toUpperCase();

      console.log(
        'Gemini processing state:',
        state || 'UNKNOWN',
        'attempt:',
        attempt + 1
      );

      if (
        state === 'ACTIVE'
      ) {
        break;
      }

      if (
        state === 'FAILED'
      ) {
        return res.status(500).json({
          success: false,
          error:
            'Gemini failed while processing the video.'
        });
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            2000
          )
      );

      currentFile =
        await ai.files.get({
          name:
            videoFile.name
        });
    }

    const finalState =
      String(
        currentFile?.state ||
          ''
      ).toUpperCase();

    if (
      finalState !==
      'ACTIVE'
    ) {
      return res.status(500).json({
        success: false,
        error:
          'Gemini video processing timed out.'
      });
    }

    if (!currentFile?.uri) {
      return res.status(500).json({
        success: false,
        error:
          'Gemini processed the video but returned no file URI.'
      });
    }

    console.log(
      'Gemini video is ready:',
      currentFile.uri
    );

    const analysisPrompt = `
You are the AI Director for BIKEZTAGRAM AI.

You are an elite professional motorcycle film editor,
cinematographer and social-media trailer director.

You have been given the ACTUAL VIDEO FILE.

WATCH AND ANALYSE THE VIDEO ITSELF.

Do NOT rely on the filename.

Do NOT invent anything that is not visible or audible.

Your job is to determine exactly how useful this footage
would be inside a professional cinematic motorcycle reel.

Analyse:

1. SUBJECT

Identify:

- motorcycle visibility
- motorcycle model if recognisable
- rider visibility
- scenery
- other important subjects
- whether the motorcycle is the clear focus

2. SHOT TYPE

Identify:

- wide
- medium
- close-up
- detail
- riding
- tracking
- follow shot
- stationary
- reveal
- action
- scenery
- other

3. CAMERA

Analyse:

- camera movement
- camera direction
- camera angle
- stability
- whether the camera follows the motorcycle
- whether the shot is handheld, mounted or stationary
- whether there is natural camera movement worth preserving

4. ACTION

Describe what actually happens.

Pay particular attention to:

- acceleration
- cornering
- passing
- approaching
- riding away
- riding towards camera
- motorcycle reveal
- close detail
- rider movement
- interesting background movement

5. VISUAL QUALITY

Assess:

- composition
- lighting
- exposure
- sharpness
- subject visibility
- visual interest
- cinematic potential

6. CINEMATIC SCORE

Give the footage a score from 1 to 10.

10 means exceptional footage.

1 means footage that should probably be avoided.

7. BEST MOMENTS

Identify up to THREE strongest moments.

Give approximate timestamps.

For each moment provide:

start
end
what happens
why it is useful

8. EDITING RECOMMENDATION

Recommend:

- best role in a trailer
- suggested duration
- suggested speed
- whether slow motion would help
- whether normal speed is better
- whether faster speed would help
- whether it should be an opening shot
- whether it should be a reveal
- whether it should be an action shot
- whether it should be a hero ending

9. TEXT

Determine whether text should appear over this shot.

Normally avoid text unless it genuinely improves the edit.

10. TRANSITION

Recommend one:

hard-cut
fade-in
fade-out
dip-black
crossfade
flash-cut
whip-left
whip-right

11. CAMERA MOTION

Recommend one:

static
slow-push
slow-pull
pan-left
pan-right
tilt-up
tilt-down

Only recommend movement if it genuinely improves the footage.

IMPORTANT:

You are analysing the actual video.

Do not pretend to see something that isn't there.

If the footage contains text on screen, identify it.

If the same visual event happens repeatedly, identify that.

If there is a stronger moment later in the clip,
identify its timestamp.

The goal is to give our editing engine enough information
to make intelligent editorial decisions.

Return ONLY valid JSON.

Use exactly this structure:

{
  "filename": "",
  "durationSeconds": 0,

  "subject": {
    "motorcycleVisible": false,
    "riderVisible": false,
    "motorcycleModel": "",
    "description": ""
  },

  "shot": {
    "type": "",
    "cameraMovement": "",
    "cameraAngle": "",
    "stability": ""
  },

  "action": "",

  "visualQuality": {
    "composition": "",
    "lighting": "",
    "sharpness": "",
    "subjectVisibility": "",
    "cinematicPotential": ""
  },

  "cinematicScore": 0,

  "bestMoments": [
    {
      "start": 0,
      "end": 0,
      "description": "",
      "reason": ""
    }
  ],

  "editingRecommendation": {
    "role": "",
    "suggestedDuration": 0,
    "speed": 1,
    "slowMotion": false,
    "reason": ""
  },

  "textRecommendation": {
    "useText": false,
    "text": "",
    "reason": ""
  },

  "transitionRecommendation": "",
  "motionRecommendation": "",
  "editorialNotes": ""
}

Additional user direction:

${prompt || 'Create the best cinematic motorcycle social-media edit from this footage.'}
`;

    /*
     * Send the uploaded Gemini video to
     * the Gemini model for analysis.
     */

    const response =
      await ai.models.generateContent({
        model:
          'gemini-2.5-flash',
        contents: [
          {
            fileData: {
              fileUri:
                currentFile.uri,
              mimeType:
                currentFile.mimeType ||
                mimeType
            }
          },
          {
            text:
              analysisPrompt
          }
        ]
      });

    const modelText =
      String(
        response?.text ||
          ''
      )
        .replace(
          /```json/gi,
          ''
        )
        .replace(
          /```/g,
          ''
        )
        .trim();

    if (!modelText) {
      return res.status(500).json({
        success: false,
        error:
          'Gemini returned no video analysis.'
      });
    }

    console.log(
      'Gemini analysis received.'
    );

    let analysis;

    try {
      analysis =
        JSON.parse(
          modelText
        );
    } catch (error) {
      console.error(
        'Gemini JSON error:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'Gemini returned invalid analysis JSON.',
        raw:
          modelText.slice(
            0,
            1000
          )
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
