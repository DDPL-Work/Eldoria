/**
 * Safely opens a document (PDF or Image) in a new browser tab.
 * 
 * Handles:
 * 1. HTTP / HTTPS URLs (e.g. Cloudinary, backend stream URLs)
 * 2. Blob URLs (blob:http://localhost:5173/...)
 * 3. Base64 data: URLs (converts data URL to Blob first so Chromium browsers won't block top-frame navigation)
 */
export function openDocument(doc) {
  if (!doc) return;

  const rawUrl = doc.blobUrl || doc.url || doc.data || (typeof doc === 'string' ? doc : '');
  if (!rawUrl) return;

  // 1. If it's already an HTTP / HTTPS or blob: URL, open directly
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('blob:')) {
    window.open(rawUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // 2. If it's a data: URL (base64)
  if (rawUrl.startsWith('data:')) {
    try {
      const parts = rawUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : doc.type || 'application/octet-stream';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      // Revoke after 2 minutes to free memory
      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
      return;
    } catch (err) {
      console.error('Error opening base64 document in new tab:', err);
    }
  }

  // Fallback
  window.open(rawUrl, '_blank', 'noopener,noreferrer');
}
