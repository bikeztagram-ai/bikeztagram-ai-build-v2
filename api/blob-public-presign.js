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
    if (!filename || filename === "media" || !size) return res.status(400).json({ error: "filename and size are required" });
    if (size > 500 * 1024 * 1024) return res.status(413).json({ error: "Media exceeds the 500 MB upload limit" });
    const allowed = new Set(["video/mp4","video/quicktime","video/webm","image/jpeg","image/png","image/webp","image/gif","image/heic","image/heif"]);
    if (!allowed.has(mimeType)) return res.status(415).json({ error: `Unsupported media type: ${mimeType}` });

    // Public-store contract: signed PUT only, followed by the stable public
    // Blob URL. Downstream Gemini/caption/render stages fetch this URL directly.
    const pathname = `${mediaType === "image" ? "images" : "videos"}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
    const validUntil = Date.now() + 15 * 60 * 1000;
    const token = await issueSignedToken({ pathname, operations: ["put"], validUntil });
    const { presignedUrl } = await presignUrl(token, { pathname, operation: "put", validUntil });

    return res.status(200).json({
      presignedUrl,
      url: presignedUrl.split("?")[0],
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
