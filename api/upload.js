import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const body = req.body || {};

    const token = await handleUpload({
      body,
      request: req,

      onBeforeGenerateToken: async (
        pathname
      ) => {
        return {
          access: 'public',

          allowedContentTypes: [
            'video/mp4',
            'video/webm',
            'video/quicktime',
            'video/x-m4v'
          ],

          maximumSizeInBytes:
            100 * 1024 * 1024,

          addRandomSuffix: true
        };
      },

      onUploadCompleted: async ({
        blob,
        tokenPayload
      }) => {
        console.log(
          '[UPLOAD] Blob upload completed:',
          blob?.pathname
        );
      }
    });

    console.log('[UPLOAD] Upload token created successfully');

    return res.status(200).json(token);

  } catch (error) {
    console.error(
      '[UPLOAD] Blob upload token error:',
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        'Could not create Blob upload token.'
    });
  }
}
