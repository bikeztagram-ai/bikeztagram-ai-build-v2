import { get } from '@vercel/blob';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    /*
     * =====================================================
     * STEP 0 — CHECK ENVIRONMENT
     * =====================================================
     */

    const apiKey =
      process.env.GEMINI_API_KEY;

    const blobToken =
      process.env.BLOB_READ_WRITE_TOKEN;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          'GEMINI_API_KEY is missing.'
      });
    }

    if (!blobToken) {
      return res.status(500).json({
        success: false,
        error:
          'BLOB_READ_WRITE_TOKEN is missing.'
      });
    }

    /*
     * =====================================================
     * STEP 1 — READ REQUEST
     * =====================================================
     */

    const {
      pathname = '',
      blobUrl = '',
      filename = 'video.mp4',
      mimeType = 'video/mp4',
      prompt = ''
    } = req.body || {};

    if (!pathname && !blobUrl) {
      return res.status(400).json({
        success: false,
        error:
          'No Blob pathname or Blob URL was supplied.'
      });
    }

    console.log(
      '[ANALYSE] Blob store configured.'
    );

    console.log(
      '[ANALYSE] Requested pathname:',
      pathname
    );

    console.log(
      '[ANALYSE] Blob URL supplied:',
      blobUrl
        ? 'YES'
        : 'NO'
    );

    console.log(
      '[ANALYSE] Blob token present:',
      Boolean(blobToken)
    );

    /*
     * =====================================================
     * STEP 2 — RETRIEVE THE ACTUAL VIDEO
     * =====================================================
     *
     * IMPORTANT:
     *
     * We explicitly provide BLOB_READ_WRITE_TOKEN.
     *
     * This prevents the function from accidentally
     * relying on a different/default Blob configuration.
     *
     * The new Blob store is public, so we first try
     * PUBLIC access.
     *
     * If the upload is private, we then try PRIVATE.
     * =====================================================
     */

    let blobResult = null;

    let blobAccess =
      'public';

    const blobIdentifier =
      blobUrl ||
      pathname;

    console.log(
      '[ANALYSE] Attempting Blob retrieval:',
      blobIdentifier
    );

    /*
     * First attempt: PUBLIC
     */

    try {
      console.log(
        '[ANALYSE] Trying Blob access: public'
      );

      blobResult =
        await get(
          blobIdentifier,
          {
            access: 'public',
            token: blobToken
          }
        );

      if (
        blobResult?.statusCode ===
        200
      ) {
        blobAccess =
          'public';

        console.log(
          '[ANALYSE] Public Blob retrieved successfully.'
        );
      }
    } catch (publicError) {
      console.warn(
        '[ANALYSE] Public Blob retrieval failed:',
        publicError?.message ||
          publicError
      );
    }

    /*
     * Second attempt: PRIVATE
     */

    if (
      !blobResult ||
      blobResult.statusCode !==
        200
    ) {
      try {
        console.log(
          '[ANALYSE] Trying Blob access: private'
        );

        blobResult =
          await get(
            blobIdentifier,
            {
              access: 'private',
              token: blobToken
            }
          );

        if (
          blobResult?.statusCode ===
          200
        ) {
          blobAccess =
            'private';

          console.log(
            '[ANALYSE] Private Blob retrieved successfully.'
          );
        }
      } catch (privateError) {
        console.warn(
          '[ANALYSE] Private Blob retrieval failed:',
          privateError?.message ||
            privateError
        );
      }
    }

    /*
     * Make sure the Blob actually exists.
     */

    if (
      !blobResult ||
      blobResult.statusCode !==
        200
    ) {
      throw new Error(
        `The requested video was not found in the new Blob store. Checked public and private access. Identifier: ${blobIdentifier}`
      );
    }

    if (!blobResult.stream) {
      throw new Error(
        'Blob was found but returned no video stream.'
      );
    }

    console.log(
      '[ANALYSE] Blob access mode:',
      blobAccess
    );

    console.log(
      '[ANALYSE] Blob retrieved successfully.'
    );

    /*
     * =====================================================
     * STEP 3 — DOWNLOAD BLOB INTO MEMORY
     * =====================================================
     */

    const chunks = [];

    for await (
      const chunk of
      blobResult.stream
    ) {
      chunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk)
      );
    }

    const videoBuffer =
      Buffer.concat(chunks);

    if (
      !videoBuffer.length
    ) {
      throw new Error(
        'Downloaded video was empty.'
      );
    }

    console.log(
      '[ANALYSE] Video downloaded successfully:',
      videoBuffer.length,
      'bytes'
    );

    /*
     * =====================================================
     * STEP 4 — INITIALISE GEMINI
     * =====================================================
     */

    const ai =
      new GoogleGenAI({
        apiKey
      });

    /*
     * =====================================================
     * STEP 5 — UPLOAD VIDEO TO GEMINI
     * =====================================================
     */

    console.log(
      '[ANALYSE] Uploading video to Gemini...'
    );

    const videoFile =
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

    if (
      !videoFile?.name
    ) {
      throw new Error(
        'Gemini did not return a valid uploaded file.'
      );
    }

    console.log(
      '[ANALYSE] Gemini file uploaded:',
      videoFile.name
    );

    /*
     * =====================================================
     * STEP 6 — WAIT FOR GEMINI VIDEO PROCESSING
     * =====================================================
     */

    let currentFile =
      videoFile;

    let videoReady =
      false;

    for (
      let attempt = 0;
      attempt < 60;
      attempt++
    ) {
      const state =
        String(
          currentFile?.state ||
            ''
        ).toUpperCase();

      console.log(
        '[ANALYSE] Gemini processing state:',
        state,
        'attempt:',
        attempt + 1
      );

      if (
        state ===
        'ACTIVE'
      ) {
        videoReady =
          true;

        break;
      }

      if (
        state ===
        'FAILED'
      ) {
        throw new Error(
          'Gemini failed while processing the video.'
        );
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

    if (!videoReady) {
      throw new Error(
        'Gemini video processing timed out.'
      );
    }

    if (
      !currentFile?.uri
    ) {
      throw new Error(
        'Gemini returned no video URI.'
      );
    }

    console.log(
      '[ANALYSE] Video is ready for Gemini analysis.'
    );

    /*
     * =====================================================
     * STEP 7 — BUILD AI ANALYSIS PROMPT
     * =====================================================
     */

    const analysisPrompt = `
You are the AI Director for BIKEZTAGRAM AI.

Analyse the ACTUAL motorcycle video supplied to you.

IMPORTANT RULES:

- Analyse the actual video.
- Do not rely on the filename.
- Do not invent anything that is not visible.
- Do not assume the motorcycle model unless it is actually recognisable.
- Use the actual footage to determine the best moments.
- Give timestamps based on the actual video.

Analyse:

1. Motorcycle and rider visibility
2. Motorcycle model if recognisable
3. Shot type
4. Camera movement
5. Camera angle
6. Stability
7. What actually happens in the footage
8. Acceleration
9. Cornering
10. Passing
11. Riding action
12. Composition
13. Lighting
14. Sharpness
15. Subject visibility
16. Cinematic potential
17. Best moments and timestamps
18. Best editing role
19. Suggested duration
20. Suggested playback speed
21. Whether slow motion would help
22. Text recommendation
23. Transition recommendation
24. Camera-motion recommendation

USER REQUEST:

${prompt}

Return ONLY valid JSON.

Use exactly this structure:

{
  "filename": "${filename}",
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
`;

    /*
     * =====================================================
     * STEP 8 — SEND ACTUAL VIDEO TO GEMINI
     * =====================================================
     */

    console.log(
      '[ANALYSE] Sending actual video to Gemini...'
    );

    const interaction =
      await ai.interactions.create({
        model:
          'gemini-3.6-flash',

        input: [
          {
            type: 'video',
            uri:
              currentFile.uri,
            mime_type:
              currentFile.mimeType ||
              mimeType
          },
          {
            type: 'text',
            text:
              analysisPrompt
          }
        ]
      });

    /*
     * =====================================================
     * STEP 9 — EXTRACT GEMINI RESPONSE
     * =====================================================
     */

    let modelText =
      interaction?.output_text ||
      '';

    if (
      !modelText &&
      Array.isArray(
        interaction?.outputs
      )
    ) {
      for (
        const output of
        interaction.outputs
      ) {
        if (
          Array.isArray(
            output?.content
          )
        ) {
          for (
            const part of
            output.content
          ) {
            if (
              typeof part?.text ===
              'string'
            ) {
              modelText +=
                part.text;
            }
          }
        }
      }
    }

    modelText =
      String(modelText)
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
      throw new Error(
        'Gemini returned no analysis.'
      );
    }

    /*
     * =====================================================
     * STEP 10 — PARSE JSON
     * =====================================================
     */

    let analysis;

    try {
      analysis =
        JSON.parse(
          modelText
        );
    } catch {
      console.error(
        '[ANALYSE] Gemini raw response:',
        modelText
      );

      throw new Error(
        'Gemini returned invalid analysis JSON.'
      );
    }

    /*
     * =====================================================
     * SUCCESS
     * =====================================================
     */

    console.log(
      '[ANALYSE] Gemini analysis completed successfully.'
    );

    return res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    /*
     * =====================================================
     * ERROR HANDLING
     * =====================================================
     */

    console.error(
      '========================================'
    );

    console.error(
      '[ANALYSE] BIKEZTAGRAM VIDEO ANALYSIS ERROR'
    );

    console.error(
      'Message:',
      error?.message ||
        error
    );

    console.error(
      'Stack:',
      error?.stack ||
        'No stack trace'
    );

    console.error(
      '========================================'
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        'Unknown video analysis error.'
    });
  }
    }
