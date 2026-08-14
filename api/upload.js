import {
  issueSignedToken,
  presignUrl
} from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    let body = req.body;

    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const filename =
      typeof body?.filename === 'string'
        ? body.filename
        : 'video.mp4';

    const contentType =
      typeof body?.contentType === 'string'
        ? body.contentType
        : 'video/mp4';

    const size =
      Number(body?.size) || 0;

    if (!contentType.startsWith('video/')) {
      return res.status(400).json({
        success: false,
        error: 'Only video files are allowed.'
      });
    }

    if (!size) {
      return res.status(400).json({
        success: false,
        error: 'Video size was not supplied.'
      });
    }

    const maximumSizeInBytes =
      100 * 1024 * 1024;

    if (size > maximumSizeInBytes) {
      return res.status(400).json({
        success: false,
        error:
          'This version currently supports videos up to 100 MB.'
      });
    }

    const extension =
      filename.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase() ||
      '.mp4';

    const pathname =
      `videos/${Date.now()}-${crypto.randomUUID()}${extension}`;

    console.log(
      '[UPLOAD] Creating OIDC signed upload URL:',
      pathname
    );

    /*
     * Short-lived permission for the browser to PUT
     * exactly this video into exactly this pathname.
     */
    const uploadToken =
      await issueSignedToken({
        pathname,
        operations: ['put'],
        allowedContentTypes: [contentType],
        maximumSizeInBytes,
        validUntil:
          Date.now() + 15 * 60 * 1000
      });

    const upload =
      await presignUrl(
        uploadToken,
        {
          pathname,
          operation: 'put',
          validUntil:
            Date.now() + 15 * 60 * 1000
        }
      );

    /*
     * Create a separate short-lived GET URL for the
     * Gemini analysis request.
     */
    const readToken =
      await issueSignedToken({
        pathname,
        operations: ['get'],
        validUntil:
          Date.now() + 60 * 60 * 1000
      });

    const read =
      await presignUrl(
        readToken,
        {
          pathname,
          operation: 'get',
          validUntil:
            Date.now() + 60 * 60 * 1000
        }
      );

    console.log(
      '[UPLOAD] Signed URLs created successfully'
    );

    return res.status(200).json({
      success: true,
      pathname,
      uploadUrl: upload.presignedUrl,
      videoUrl: read.presignedUrl
    });

  } catch (error) {
    console.error(
      '[UPLOAD] FAILED:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        'Failed to create signed Blob upload URL.'
    });
  }
}
