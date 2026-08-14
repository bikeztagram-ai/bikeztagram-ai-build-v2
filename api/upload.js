import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    // Vercel's client upload sends a JSON token-generation request.
    // Handle both parsed and string request bodies safely.
    let body = req.body;

    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    if (!body) {
      throw new Error('No upload request body received.');
    }

    console.log('[UPLOAD] Client token request received');
    console.log('[UPLOAD] Request type:', body?.type || 'unknown');

    const jsonResponse = await handleUpload({
      body,
      request: req,

      onBeforeGenerateToken: async (pathname) => {
        console.log(
          '[UPLOAD] Generating client token for:',
          pathname
        );

        return {
          // Our Blob store is configured for public video access.
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

      onUploadCompleted: async ({ blob }) => {
        console.log(
          '[UPLOAD] Blob upload completed:',
          blob?.pathname
        );
      }
    });

    console.log('[UPLOAD] Client token generated successfully');

    return res.status(200).json(jsonResponse);

  } catch (error) {
    console.error(
      '[UPLOAD] FAILED:',
      error?.message || error
    );

    return res.status(400).json({
      error:
        error?.message ||
        'Failed to generate Vercel Blob client token.'
    });
  }
}
