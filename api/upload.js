import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  /*
   * =========================================================
   * BIKEZTAGRAM AI
   * Vercel Blob client-upload token route
   *
   * IMPORTANT:
   * handleUpload uses BLOB_READ_WRITE_TOKEN to determine
   * which Blob store it operates against.
   *
   * We deliberately do NOT try to select a store using
   * MEDIA_STORE_ID or BLOB_STORE_ID.
   * =========================================================
   */

  console.log('========================================');
  console.log('BIKEZTAGRAM /api/upload');
  console.log('Method:', req.method);
  console.log('========================================');

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      method: req.method,
    });
  }

  /*
   * ---------------------------------------------------------
   * VERIFY THE SERVER HAS THE BLOB TOKEN
   *
   * NEVER send this token to the browser.
   * ---------------------------------------------------------
   */

  const blobToken =
    process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    console.error(
      'BIKEZTAGRAM: BLOB_READ_WRITE_TOKEN is missing'
    );

    return res.status(500).json({
      success: false,
      error:
        'BLOB_READ_WRITE_TOKEN is missing from Vercel environment variables.',
    });
  }

  console.log(
    'BIKEZTAGRAM: BLOB_READ_WRITE_TOKEN is present'
  );

  /*
   * ---------------------------------------------------------
   * READ REQUEST BODY
   *
   * Vercel Pages API parses JSON request bodies for us.
   * The @vercel/blob/client upload() call sends a JSON
   * HandleUploadBody here.
   * ---------------------------------------------------------
   */

  let body = req.body;

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (error) {
      console.error(
        'BIKEZTAGRAM: Invalid JSON request body',
        error
      );

      return res.status(400).json({
        success: false,
        error:
          'Blob upload request body contained invalid JSON.',
      });
    }
  }

  if (!body) {
    console.error(
      'BIKEZTAGRAM: request body is missing'
    );

    return res.status(400).json({
      success: false,
      error:
        'Missing Blob upload request body.',
    });
  }

  console.log(
    'BIKEZTAGRAM: Blob request received'
  );

  console.log(
    'BIKEZTAGRAM: Request type:',
    body?.type
  );

  console.log(
    'BIKEZTAGRAM: Pathname:',
    body?.payload?.pathname
  );

  console.log(
    'BIKEZTAGRAM: Multipart:',
    body?.payload?.multipart
  );

  /*
   * ---------------------------------------------------------
   * GENERATE CLIENT TOKEN
   *
   * Explicitly pass BLOB_READ_WRITE_TOKEN.
   *
   * This removes any ambiguity about which Blob store
   * handleUpload is using.
   * ---------------------------------------------------------
   */

  try {
    const jsonResponse =
      await handleUpload({
        token:
          blobToken,

        body,

        request: req,

        onBeforeGenerateToken: async (
          pathname,
          clientPayload,
          multipart
        ) => {
          console.log(
            '========================================'
          );

          console.log(
            'BIKEZTAGRAM: onBeforeGenerateToken'
          );

          console.log(
            'Pathname:',
            pathname
          );

          console.log(
            'Multipart:',
            Boolean(multipart)
          );

          console.log(
            'Client payload:',
            clientPayload || null
          );

          console.log(
            '========================================'
          );

          /*
           * Only allow the video formats that Bikeztagram
           * currently accepts.
           */

          return {
            allowedContentTypes: [
              'video/mp4',
              'video/quicktime',
              'video/webm',
            ],

            /*
             * 500 MB maximum upload.
             */

            maximumSizeInBytes:
              500 * 1024 * 1024,

            /*
             * Let Vercel generate a unique pathname.
             */

            addRandomSuffix:
              true,

            /*
             * Match whatever upload mode the browser
             * requested.
             */

            multipart:
              Boolean(multipart),

            /*
             * Keep useful non-secret information with
             * the token.
             */

            tokenPayload:
              JSON.stringify({
                source:
                  'bikeztagram-ai',

                pathname,

                clientPayload:
                  clientPayload || null,

                multipart:
                  Boolean(multipart),
              }),
          };
        },

        /*
         * -----------------------------------------------------
         * UPLOAD COMPLETED
         * -----------------------------------------------------
         */

        onUploadCompleted: async ({
          blob,
          tokenPayload,
        }) => {
          console.log(
            '========================================'
          );

          console.log(
            'BIKEZTAGRAM: Blob upload completed'
          );

          console.log(
            'Blob URL:',
            blob?.url
          );

          console.log(
            'Blob pathname:',
            blob?.pathname
          );

          console.log(
            'Token payload:',
            tokenPayload
          );

          console.log(
            '========================================'
          );
        },
      });

    /*
     * -------------------------------------------------------
     * VERIFY RESPONSE
     * -------------------------------------------------------
     */

    console.log(
      'BIKEZTAGRAM: handleUpload completed'
    );

    console.log(
      'BIKEZTAGRAM: Response type:',
      jsonResponse?.type
    );

    console.log(
      'BIKEZTAGRAM: Client token present:',
      Boolean(
        jsonResponse?.clientToken
      )
    );

    /*
     * A normal client-token response should contain:
     *
     * {
     *   type: "blob.generate-client-token",
     *   clientToken: "..."
     * }
     */

    if (
      jsonResponse?.type ===
        'blob.generate-client-token' &&
      !jsonResponse?.clientToken
    ) {
      console.error(
        'BIKEZTAGRAM: Blob response requested a client token but no token was returned.'
      );

      return res.status(500).json({
        success: false,
        error:
          'Vercel Blob did not return a client token.',
      });
    }

    /*
     * -------------------------------------------------------
     * RETURN VERCEL'S RESPONSE TO THE BROWSER
     * -------------------------------------------------------
     */

    return res.status(200).json(
      jsonResponse
    );

  } catch (error) {
    console.error(
      '========================================'
    );

    console.error(
      'BIKEZTAGRAM: /api/upload FAILED'
    );

    console.error(
      'Error name:',
      error?.name
    );

    console.error(
      'Error message:',
      error?.message
    );

    console.error(
      'Error stack:',
      error?.stack
    );

    console.error(
      '========================================'
    );

    return res.status(500).json({
      success: false,

      error:
        error?.message ||
        String(error),

      errorName:
        error?.name ||
        'UnknownError',

      stack:
        error?.stack ||
        null,
    });
  }
}
