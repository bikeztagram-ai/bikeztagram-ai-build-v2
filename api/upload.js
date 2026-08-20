import { handleUpload } from "@vercel/blob/client";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body) return res.status(400).json({ error: "Missing Blob upload request body" });

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error("Bikeztagram: BLOB_READ_WRITE_TOKEN is missing");
      return res.status(500).json({ error: "BLOB_READ_WRITE_TOKEN is missing" });
    }

    const jsonResponse = await handleUpload({
      token,
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        const allowedContentTypes = [
          "video/mp4", "video/quicktime", "video/webm",
          "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"
        ];
        return {
          allowedContentTypes,
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: true,
          multipart: Boolean(multipart),
          tokenPayload: JSON.stringify({ pathname, clientPayload: clientPayload || null }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("Bikeztagram: Blob media upload completed", { url: blob.url, pathname: blob.pathname });
        console.log("Bikeztagram: Blob token payload", tokenPayload);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error("Bikeztagram Blob client upload error:", error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to generate Blob client token." });
  }
}
