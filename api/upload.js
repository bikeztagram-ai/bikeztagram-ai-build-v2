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
    const {
      pathname = '',
      contentType = 'video/mp4',
      size = 0
    } = req.body || {};

    if (!pathname) {
      return res.status(400).json({
        success: false,
        error: 'No pathname supplied.'
      });
    }

    /*
     * Keep the upload inside the videos folder.
     * This prevents a client from requesting a
     * signed URL for an arbitrary Blob pathname.
     */
    const safePathname =
      pathname.startsWith('videos/')
        ? pathname
        : `videos/${pathname}`;

    /*
     * Maximum individual video size:
     * 5 GB.
     *
     * This is deliberately large enough for
     * genuine motorcycle / GoPro footage.
     */
    const maximumSizeInBytes =
      5 * 1024 * 1024 * 1024;

    if (
      Number(size) > maximumSizeInBytes
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Video is larger than the 5 GB upload limit.'
      });
    }

    const allowedContentTypes = [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-msvideo',
      'video/mpeg',
      'video/3gpp'
    ];

    /*
     * Normalise the browser MIME type.
     */
    const safeContentType =
      allowedContentTypes.includes(
        contentType
      )
        ? contentType
        : 'video/mp4';

    console.log(
      '[UPLOAD] Creating OIDC signed upload token:',
      safePathname
    );

    /*
     * Vercel's current signed-URL system works
     * with OIDC automatically on Vercel.
     *
     * The token is restricted to:
     *
     * - PUT only
     * - this pathname
     * - approved video MIME types
     * - maximum 5 GB
     *
     * No BLOB_READ_WRITE_TOKEN is exposed to
     * the browser.
     */
    const token =
      await issueSignedToken({
        pathname:
          safePathname,

        operations: [
          'put'
        ],

        allowedContentTypes:
          allowedContentTypes,

        maximumSizeInBytes
      });

    console.log(
      '[UPLOAD] OIDC signed token created.'
    );

    /*
     * Create a short-lived PUT URL.
     *
     * 30 minutes gives a phone enough time to
     * upload a large motorcycle video over a
     * slower mobile connection.
     */
    const {
      presignedUrl
    } = await presignUrl(
      token,
      {
        pathname:
          safePathname,

        operation:
          'put',

        validUntil:
          Date.now() +
          30 * 60 * 1000,

        access:
          'private'
      }
    );

    console.log(
      '[UPLOAD] Signed PUT URL created successfully.'
    );

    return res.status(200).json({
      success: true,

      uploadUrl:
        presignedUrl,

      pathname:
        safePathname,

      contentType:
        safeContentType,

      expiresAt:
        Date.now() +
        30 * 60 * 1000
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
