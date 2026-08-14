import { handleUpload } from '@vercel/blob/client';

export default async function handler(request, response) {
  try {
    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        console.log('[UPLOAD] Generating client upload token');
        console.log('[UPLOAD] Pathname:', pathname);
        console.log('[UPLOAD] Multipart:', multipart);

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
            source: 'bikeztagram-ai',
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
          '[UPLOAD] Blob upload completed successfully'
        );

        console.log(
          '[UPLOAD] Blob pathname:',
          blob.pathname
        );

        console.log(
          '[UPLOAD] Blob URL:',
          blob.url
        );

        console.log(
          '[UPLOAD] Token payload:',
          tokenPayload
        );
      }
    });

    console.log(
      '[UPLOAD] Client token response created successfully'
    );

    return response.status(200).json(jsonResponse);

  } catch (error) {
    console.error(
      '[UPLOAD] FAILED:',
      error
    );

    return response.status(400).json({
      error:
        error?.message ||
        'Failed to create Blob client upload token.'
    });
  }
}
