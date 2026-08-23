import { issueSignedToken, presignUrl } from "@vercel/blob";

const safeName = (name) => String(name || "media").replace(/[^a-zA-Z0-9._-]/g, "_");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const filename = safeName(body?.filename);
    const mimeType = String(body?.mimeType || "application/octet-stream");
    const size = Number(body?.size || 0);
    const mediaType = body?.mediaType === "video" ? "video" : "image";
    const blobToken = String(process.env.PUBLIC_BLOB_READ_WRITE_TOKEN || "").trim();

    if (!filename || filename === "media" || !size) return res.status(400).json({ error: "filename and size are required" });
    if (size > 500 * 1024 * 1024) return res.status(413).json({ error: "Media exceeds the 500 MB upload limit" });
    if (!blobToken) return res.status(500).json({ error: "Public media Blob store is not configured. Expected PUBLIC_BLOB_READ_WRITE_TOKEN in this Vercel environment." });

    const allowed = new Set(["video/mp4","video/quicktime","video/webm","image/jpeg","image/png","image/webp","image/gif","image/heic","image/heif"]);
    if (!allowed.has(mimeType)) return res.status(415).json({ error: `Unsupported media type: ${mimeType}` });

    const pathname = `${mediaType === "image" ? "images" : "videos"}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
    const validUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;

    // Upload directly from the browser into the dedicated public media store.
    const putToken = await issueSignedToken({
      token: blobToken,
      pathname,
      operations: ["put"],
      validUntil,
    });
    const { presignedUrl } = await presignUrl(putToken, {
      token: blobToken,
      pathname,
      operation: "put",
      access: "public",
      validUntil,
      allowedContentTypes: [mimeType],
      maximumSizeInBytes: size,
    });

    // Do not guess the public URL for the analysis request. Give the server
    // a scoped GET URL for this exact object so the upload and read contracts
    // are cryptographically tied to the same pathname/store.
    const getToken = await issueSignedToken({
      token: blobToken,
      pathname,
      operations: ["get"],
      validUntil,
    });
    const { presignedUrl: readUrl } = await presignUrl(getToken, {
      token: blobToken,
      pathname,
      operation: "get",
      access: "public",
      validUntil,
    });

    return res.status(200).json({
      presignedUrl,
      url: readUrl,
      pathname,
      mimeType,
      size,
      expiresAt: validUntil,
    });
  } catch (error) {
    console.error("Bikeztagram public Blob signing error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create public Blob upload URL." });
  }
}
