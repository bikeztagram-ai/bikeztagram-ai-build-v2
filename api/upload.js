import { put } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }

    const url = new URL(
      req.url,
      `https://${req.headers.host || "localhost"}`
    );

    let filename = url.searchParams.get("filename");

    const contentType = req.headers["content-type"] || "";

    let body = req;

    // If the existing Bikeztagram frontend sends a raw video body,
    // keep using the request stream directly.
    if (!filename) {
      filename = `video-${Date.now()}.mp4`;
    }

    const safeFilename = filename
      .replace(/[^\w.\-/]/g, "_")
      .replace(/^\/+/, "");

    const blob = await put(`videos/${safeFilename}`, body, {
      access: "public",
      storeId: process.env.BLOB_PUBLIC_STORE_ID,
      addRandomSuffix: true,
    });

    return res.status(200).json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      downloadUrl: blob.downloadUrl,
      contentType: blob.contentType,
      size: blob.size,
    });
  } catch (error) {
    console.error("Bikeztagram upload error:", error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to upload video.",
    });
  }
}
