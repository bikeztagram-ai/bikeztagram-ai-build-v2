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
    const token = String(process.env.PUBLIC_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || "").trim();

    if (!token) return res.status(500).json({ error: "Blob read/write token is missing." });
    if (!filename || filename === "media" || !size) return res.status(400).json({ error: "filename and size are required" });
    if (size > 500 * 1024 * 1024) return res.status(413).json({ error: "Media exceeds the 500 MB upload limit" });

    const allowed = new Set(["video/mp4","video/quicktime","video/webm","image/jpeg","image/png","image/webp","image/gif","image/heic","image/heif"]);
    if (!allowed.has(mimeType)) return res.status(415).json({ error: `Unsupported media type: ${mimeType}` });

    const pathname = `${mediaType === "image" ? "images" : "videos"}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
    const validUntil = Date.now() + 15 * 60 * 1000;

    // The connected Bikeztagram media store is PUBLIC. The previous implementation
    // generated private PUT/GET URLs, which could upload successfully but left the
    // analysis pipeline unable to read the resulting object. Bind both operations
    // explicitly to the configured store token and public access mode.
    const delegation = await issueSignedToken({
      token,
      pathname,
      operations: ["put", "get"],
      validUntil,
      allowedContentTypes: [mimeType],
      maximumSizeInBytes: size,
    });

    const { presignedUrl } = await presignUrl(delegation, {
      pathname,
      operation: "put",
      access: "public",
      validUntil,
      allowedContentTypes: [mimeType],
      maximumSizeInBytes: size,
    });

    const { presignedUrl: readUrl } = await presignUrl(delegation, {
      pathname,
      operation: "get",
      access: "public",
      validUntil,
      useCache: false,
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
    console.error("Bikeztagram public Blob upload signing error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create public Blob upload URL.",
    });
  }
}
