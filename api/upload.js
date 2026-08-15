import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  /*
   * =========================================================
   * BIKEZTAGRAM AI
   * Vercel Blob client-upload token route
   *
   * This version uses the OIDC-connected public Blob store.
   * The store is connected through MEDIA_STORE_ID.
   *
   * IMPORTANT:
   * We deliberately do NOT pass BLOB_READ_WRITE_TOKEN
   * directly to handleUpload().
   *
   * This allows the current Vercel OIDC-connected Blob store
   * configuration to be used.
   * =========================================================
   */

  console.log(
    '========================================'
  );

  console.log(
    'BIKEZTAGRAM /api/upload'
  );

  console.log(
    'Method:',
    req.method
  );

  console.log(
    '========================================'
  );

  /*
   * ---------------------------------------------------------
   * Only POST is valid for Blob client-token requests.
   * ---------------------------------------------------------
   */

  if (req.method !== 'POST') {
    console.log(
      'BIKEZTAGRAM: rejected non-POST request'
    );

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      method: req.method,
    });
  }

  try {
    /*
     * -------------------------------------------------------
     * STEP 1
     *
     * Use the OIDC-connected public Blob store.
     *
     * The Vercel storage connection provides MEDIA_STORE_ID.
     *
     * @vercel/blob resolves the connected store through the
     * BLOB_STORE_ID environment variable.
     *
     * We deliberately do NOT pass BLOB_READ_WRITE_TOKEN to
     * handleUpload().
     * -------------------------------------------------------
     */

    const mediaStoreId =
      process.env.MEDIA_STORE_ID;

    if (mediaStoreId) {
      process.env.BLOB_STORE_ID =
        mediaStoreId;

      console.log(
        'BIKEZTAGRAM: Using MEDIA_STORE_ID for Blob store:',
        mediaStoreId
      );
    } else {
      console.warn(
        'BIKEZTAGRAM: MEDIA_STORE_ID is missing; Blob SDK will use its default store configuration.'
      );
    }

    console.log(
      'BIKEZTAGRAM: Explicit legacy Blob token disabled for this route'
    );

    /*
     * -------------------------------------------------------
     * STEP 2
     *
     * Get the JSON request body.
     *
     * @vercel/blob/client upload() sends a JSON token-
     * generation request to this endpoint.
     * -------------------------------------------------------
     */

    let body =
      req.body;

    /*
     * Some Vercel/API configurations may provide req.body
     * as a string rather than an already parsed object.
     */

    if (
      typeof body === 'string'
    ) {
      try {
        body =
          JSON.parse(body);
      } catch (parseError) {
        console.error(
          'BIKEZTAGRAM: Could not parse request body',
          parseError
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
      'BIKEZTAGRAM: Blob request body received'
    );

    console.log(
      'BIKEZTAGRAM: Blob request type:',
      body?.type
    );

    console.log(
      'BIKEZTAGRAM: Blob pathname:',
      body?.payload?.pathname
    );

    console.log(
      'BIKEZTAGRAM: Blob multipart:',
      body?.payload?.multipart
    );

    /*
     * -------------------------------------------------------
     * STEP 3
     *
     * Ask Vercel Blob to generate the secure client token.
     *
     * IMPORTANT:
     * No explicit legacy token is supplied here.
     * -------------------------------------------------------
     */

    const jsonResponse =
      await handleUpload({
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
            multipart
          );

          console.log(
            'Client payload:',
            clientPayload
          );

          console.log(
            '========================================'
          );

          /*
           * IMPORTANT:
           *
           * Return the multipart setting supplied by the
           * browser so the generated client token matches
           * the client upload configuration.
           */

          return {
            allowedContentTypes: [
              'video/mp4',
              'video/quicktime',
              'video/webm',
            ],

            maximumSizeInBytes:
              500 *
              1024 *
              1024,

            addRandomSuffix:
              true,

            multipart:
              Boolean(
                multipart
              ),

            tokenPayload:
              JSON.stringify({
                source:
                  'bikeztagram-ai',

                pathname,

                clientPayload:
                  clientPayload ||
                  null,

                multipart:
                  Boolean(
                    multipart
                  ),
              }),
          };
        },

        /*
         * ---------------------------------------------------
         * UPLOAD COMPLETED
         * ---------------------------------------------------
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
     * STEP 4
     *
     * Confirm handleUpload produced a client token.
     * -------------------------------------------------------
     */

    console.log(
      'BIKEZTAGRAM: handleUpload completed'
    );

    console.log(
      'BIKEZTAGRAM: response type:',
      jsonResponse?.type
    );

    console.log(
      'BIKEZTAGRAM: client token generated:',
      Boolean(
        jsonResponse?.clientToken
      )
    );

    if (
      !jsonResponse?.clientToken &&
      jsonResponse?.type ===
        'blob.generate-client-token'
    ) {
      console.error(
        'BIKEZTAGRAM: Blob response contained no client token'
      );

      return res.status(500).json({
        success: false,
        error:
          'Vercel Blob did not return a client token.',
      });
    }

    /*
     * -------------------------------------------------------
     * SUCCESS
     * -------------------------------------------------------
     */

    return res.status(200).json(
      jsonResponse
    );

  } catch (error) {
    /*
     * -------------------------------------------------------
     * FULL SERVER ERROR
     * -------------------------------------------------------
     */

    console.error(
      '========================================'
    );

    console.error(
      'BIKEZTAGRAM: /api/upload FAILED'
    );

    console.error(
      'Error:',
      error
    );

    console.error(
      'Message:',
      error?.message
    );

    console.error(
      'Name:',
      error?.name
    );

    console.error(
      'Stack:',
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
