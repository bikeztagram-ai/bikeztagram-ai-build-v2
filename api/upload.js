import { handleUpload } from '@vercel/blob/client';

export default async function handler(request, response) {
  console.log('========================================');
  console.log('[UPLOAD DIAGNOSTIC] /api/upload START');
  console.log('========================================');

  try {
    /*
     * Check request method
     */
    console.log(
      '[UPLOAD DIAGNOSTIC] Method:',
      request.method
    );

    if (request.method !== 'POST') {
      return response.status(405).json({
        success: false,
        error: 'Method not allowed',
        diagnostic: 'The upload endpoint requires POST.'
      });
    }

    /*
     * Check Blob environment variable without
     * exposing its secret value.
     */
    const blobToken =
      process.env.BLOB_READ_WRITE_TOKEN;

    console.log(
      '[UPLOAD DIAGNOSTIC] BLOB_READ_WRITE_TOKEN exists:',
      Boolean(blobToken)
    );

    if (!blobToken) {
      return response.status(500).json({
        success: false,
        error:
          'BLOB_READ_WRITE_TOKEN is missing from the Vercel production environment.',
        diagnostic:
          'The Blob Store is connected to the project, but the Blob token is not available to this deployment.'
      });
    }

    /*
     * Read the request body.
     */
    let body;

    try {
      body = await request.json();

      console.log(
        '[UPLOAD DIAGNOSTIC] Request body received:',
        JSON.stringify(body)
      );
    } catch (bodyError) {
      console.error(
        '[UPLOAD DIAGNOSTIC] Could not read JSON body:',
        bodyError
      );

      return response.status(400).json({
        success: false,
        error:
          'The upload endpoint could not read the JSON request body.',
        diagnostic:
          bodyError?.message ||
          String(bodyError)
      });
    }

    /*
     * Check the values being sent by the browser.
     */
    console.log(
      '[UPLOAD DIAGNOSTIC] pathname:',
      body?.pathname
    );

    console.log(
      '[UPLOAD DIAGNOSTIC] contentType:',
      body?.contentType
    );

    console.log(
      '[UPLOAD DIAGNOSTIC] size:',
      body?.size
    );

    if (!body?.pathname) {
      return response.status(400).json({
        success: false,
        error:
          'No pathname was supplied by the browser.',
        diagnostic:
          'The browser reached /api/upload but did not send a Blob pathname.'
      });
    }

    /*
     * Ask Vercel Blob to generate the client upload token.
     */
    console.log(
      '[UPLOAD DIAGNOSTIC] Calling handleUpload...'
    );

    const jsonResponse =
      await handleUpload({
        body,
        request,

        onBeforeGenerateToken: async (
          pathname,
          clientPayload,
          multipart
        ) => {
          console.log(
            '----------------------------------------'
          );

          console.log(
            '[UPLOAD DIAGNOSTIC] onBeforeGenerateToken'
          );

          console.log(
            '[UPLOAD DIAGNOSTIC] pathname:',
            pathname
          );

          console.log(
            '[UPLOAD DIAGNOSTIC] multipart:',
            multipart
          );

          console.log(
            '[UPLOAD DIAGNOSTIC] clientPayload:',
            clientPayload
          );

          console.log(
            '----------------------------------------'
          );

          return {
            allowedContentTypes: [
              'video/mp4',
              'video/quicktime',
              'video/webm',
              'video/x-msvideo',
              'video/mpeg',
              'video/3gpp'
            ],

            maximumSizeInBytes:
              5 * 1024 * 1024 * 1024,

            addRandomSuffix: true,

            tokenPayload: JSON.stringify({
              source:
                'bikeztagram-ai',
              clientPayload:
                clientPayload || null
            })
          };
        },

        onUploadCompleted: async ({
          blob,
          tokenPayload
        }) => {
          console.log(
            '========================================'
          );

          console.log(
            '[UPLOAD DIAGNOSTIC] BLOB UPLOAD COMPLETED'
          );

          console.log(
            '[UPLOAD DIAGNOSTIC] pathname:',
            blob?.pathname
          );

          console.log(
            '[UPLOAD DIAGNOSTIC] URL:',
            blob?.url
          );

          console.log(
            '[UPLOAD DIAGNOSTIC] token payload:',
            tokenPayload
          );

          console.log(
            '========================================'
          );
        }
      });

    console.log(
      '[UPLOAD DIAGNOSTIC] handleUpload succeeded.'
    );

    console.log(
      '[UPLOAD DIAGNOSTIC] Response:',
      JSON.stringify(jsonResponse)
    );

    return response.status(200).json(
      jsonResponse
    );

  } catch (error) {
    /*
     * This is the important part.
     *
     * We return the complete diagnostic information
     * to the browser so we can see the actual failure.
     */
    console.error(
      '========================================'
    );

    console.error(
      '[UPLOAD DIAGNOSTIC] HANDLE UPLOAD FAILED'
    );

    console.error(
      '[UPLOAD DIAGNOSTIC] Error name:',
      error?.name
    );

    console.error(
      '[UPLOAD DIAGNOSTIC] Error message:',
      error?.message
    );

    console.error(
      '[UPLOAD DIAGNOSTIC] Error stack:',
      error?.stack
    );

    console.error(
      '[UPLOAD DIAGNOSTIC] Full error:',
      error
    );

    console.error(
      '========================================'
    );

    return response.status(400).json({
      success: false,

      error:
        error?.message ||
        'Vercel Blob upload token generation failed.',

      diagnostic: {
        name:
          error?.name ||
          'UnknownError',

        message:
          error?.message ||
          String(error),

        stack:
          error?.stack ||
          'No stack trace available'
      }
    });
  }
}
