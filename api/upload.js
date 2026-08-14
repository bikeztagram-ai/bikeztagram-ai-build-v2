import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      console.error(
        'BIKEZTAGRAM: BLOB_READ_WRITE_TOKEN is missing'
      );

      return res.status(500).json({
        error: 'BLOB_READ_WRITE_TOKEN is missing',
      });
    }

    /*
     * Vercel Pages API routes normally provide the parsed
     * request body through req.body.
     *
     * Do NOT manually JSON.parse it unless necessary.
     */
    const body = req.body;

    if (!body) {
      console.error(
        'BIKEZTAGRAM: Blob upload request body is missing'
      );

      return res.status(400).json({
        error: 'Missing Blob upload request body',
      });
    }

    console.log(
      'BIKEZTAGRAM: Blob client token request received'
    );

    console.log(
      'BIKEZTAGRAM: request body:',
      body
    );

    const jsonResponse = await handleUpload({
      token,
      body,
      request: req,

      onBeforeGenerateToken: async (
        pathname,
        clientPayload,
        multipart
      ) => {
        console.log(
          'BIKEZTAGRAM: generating Blob client token',
          {
            pathname,
            multipart,
          }
        );

        return {
          allowedContentTypes: [
            'video/mp4',
            'video/quicktime',
            'video/webm',
          ],

          maximumSizeInBytes:
            500 * 1024 * 1024,

          addRandomSuffix: true,

          tokenPayload: JSON.stringify({
            pathname,
            clientPayload:
              clientPayload || null,
          }),
        };
      },

      onUploadCompleted: async ({
        blob,
        tokenPayload,
      }) => {
        console.log(
          'BIKEZTAGRAM: Blob upload completed',
          {
            url: blob?.url,
            pathname: blob?.pathname,
          }
        );

        console.log(
          'BIKEZTAGRAM: Blob token payload',
          tokenPayload
        );
      },
    });

    console.log(
      'BIKEZTAGRAM: handleUpload completed',
      {
        type: jsonResponse?.type,
        hasClientToken:
          Boolean(
            jsonResponse?.clientToken
          ),
      }
    );

    return res.status(200).json(
      jsonResponse
    );

  } catch (error) {
    console.error(
      'BIKEZTAGRAM: Blob client upload error',
      error
    );

    return res.status(500).json({
      success: false,

      error:
        error instanceof Error
          ? error.message
          : String(error),

      errorName:
        error?.name ||
        'UnknownError',
    });
  }
}
