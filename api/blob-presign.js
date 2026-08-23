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

    // The protected production contract defines BLOB_READ_WRITE_TOKEN as the
    // canonical Blob credential. Upload signing and server-side reads MUST use
    // the same store credential; using a second PUBLIC_* token can silently
    // upload into a different store from the one Gemini reads.
    const token = String(process.env.BLOB_READ_WRITE_TOKEN || "").trim();

    if (!token) return res.status(500).json({ error: "BLOB_READ_WRITE_TOKEN is missing." });
    if (!filename || filename === "media" || !size) return res.status(400).json({ error: "filename and size are required" });
    if (size > 500 * 1024 * 1024) return res.status(413).json({ error: "Media exceeds the 500 MB upload limit" });

    const allowed = new Set(["video/mp4", "video/quicktime", "video/webm", "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
    if (!allowed.has(mimeType)) return res.status(415).json({ error: `Unsupported media type: ${mimeType}` });

    const pathname = `${mediaType === "image" ? "images" : "videos"}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
    const validUntil = Date.now() + 15 * 60 * 1000;

    // One short-lived delegation is scoped to this exact pathname, size and type.
    // The same canonical store credential mints both PUT and GET permissions.
    const delegation = await issueSignedToken({
      token,
      pathname,
      operations: ["put", "get"],
      validUntil,
      allowedContentTypes: [mimeType],
      maximumSizeInBytes: size,
    });

    // The Blob store was deliberately protected, so the signed upload must use
    // private access. The signed GET below is the authenticated read hand-off to
    // Gemini/captions and never exposes the store token to the browser.
    const { presignedUrl: uploadUrl } = await presignUrl(delegation, {
      pathname,
      operation: "put",
      access: "private",
      validUntil,
      allowedContentTypes: [mimeType],
      maximumSizeInBytes: size,
      addRandomSuffix: false,
    });

    const { presignedUrl: readUrl } = await presignUrl(delegation, {
      pathname,
      operation: "get",
      access: "private",
      validUntil,
    });

    return res.status(200).json({
      presignedUrl: uploadUrl,
      url: readUrl,
      readUrl,
      pathname,
      mimeType,
      size,
      expiresAt: validUntil,
      store: "canonical-private-blob-signed-read",
    });
  } catch (error) {
    console.error("Bikeztagram Blob upload signing error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create Blob upload URL." });
  }
}
