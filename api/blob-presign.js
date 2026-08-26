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
    const token = String(process.env.PUBLIC_BLOB_READ_WRITE_TOKEN || "").trim();

    if (!token) return res.status(500).json({ error: "PUBLIC_BLOB_READ_WRITE_TOKEN is missing." });
    if (!filename || filename === "media" || !size) return res.status(400).json({ error: "filename and size are required" });
    if (size > 500 * 1024 * 1024) return res.status(413).json({ error: "Media exceeds the 500 MB upload limit" });

    const allowed = new Set(["video/mp4", "video/quicktime", "video/webm", "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
    if (!allowed.has(mimeType)) return res.status(415).json({ error: `Unsupported media type: ${mimeType}` });

    const pathname = `${mediaType === "image" ? "images" : "videos"}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
    const validUntil = Date.now() + 15 * 60 * 1000;

    // One short-lived delegation is deliberately scoped to this exact pathname and
    // exact upload size/type. It can mint both the direct PUT and the immediate
    // authenticated GET used by Gemini/captions after the upload completes.
    const delegation = await issueSignedToken({
      token,
      pathname,
      operations: ["put", "get"],
      validUntil,
      allowedContentTypes: [mimeType],
      maximumSizeInBytes: size,
    });

    const { presignedUrl: uploadUrl } = await presignUrl(delegation, {
      pathname,
      operation: "put",
      access: "public",
      validUntil,
      allowedContentTypes: [mimeType],
      maximumSizeInBytes: size,
      addRandomSuffix: false,
    });

    // The preview store is returning 403 for the bare public URL. Do not guess that
    // the store is publicly readable just because the upload delegation uses public
    // access. Return a short-lived signed GET URL for the exact same object instead.
    // The pathname remains canonical, while downstream readers get an authenticated
    // URL that works whether the backing store is public or private.
    const { presignedUrl: readUrl } = await presignUrl(delegation, {
      pathname,
      operation: "get",
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
      store: "canonical-blob-signed-read",
    });
  } catch (error) {
    console.error("Bikeztagram Blob upload signing error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create Blob upload URL." });
  }
}
