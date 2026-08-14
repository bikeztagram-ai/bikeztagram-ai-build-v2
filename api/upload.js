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

    const safePathname =
      pathname.startsWith('videos/')
        ? pathname
        : `videos/${pathname}`;

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

    const safeContentType =
      allowedContentTypes.includes(
        contentType
      )
        ? contentType
        : 'video/mp4';

    const validUntil =
      Date.now() +
      30 * 60 * 1000;

    console.log(
      '[UPLOAD] Creating OIDC signed upload token:',
      safePathname
    );

    /*
     * The token is scoped to this exact video
     * pathname and expires after 30 minutes.
     *
     * Vercel authenticates this Function to the
     * private Blob store using OIDC.
     */
    const token =
      await issueSignedToken({
        pathname:
          safePathname,

        operations: [
          'put'
        ],

        validUntil,

        allowedContentTypes:
          allowedContentTypes,

        maximumSizeInBytes
      });

    console.log(
      '[UPLOAD] OIDC signed token created successfully.'
    );

    /*
     * Turn the signed token into the actual
     * browser PUT URL.
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

        validUntil
      }
    );

    if (!presignedUrl) {
      throw new Error(
        'Vercel did not return a presigned upload URL.'
      );
    }

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
        validUntil
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
