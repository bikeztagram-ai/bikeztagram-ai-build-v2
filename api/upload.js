import { handleUpload } from "@vercel/blob/client";

export default async function handler(request, response) {
  try {
    // The browser sends a JSON request here when it needs
    // a temporary Vercel Blob client token.
    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        return {
          allowedContentTypes: ["video/mp4", "video/quicktime", "video/webm"],
          addRandomSuffix: true,
          multipart: true,
          tokenPayload: JSON.stringify({
            pathname,
            clientPayload: clientPayload || null,
          }),
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("Bikeztagram Blob upload completed:", {
          url: blob.url,
          pathname: blob.pathname,
          tokenPayload,
        });
      },
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    console.error("Bikeztagram Blob client upload error:", error);

    return response.status(400).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate Blob client token.",
    });
  }
}
