/**
 * Trims a canvas to the bounding box of its non-transparent pixels.
 * Returns a new canvas containing only the drawn area (no extra whitespace).
 *
 * This is a standalone implementation to avoid the broken CJS/ESM interop
 * of the `trim-canvas` npm package when bundled with Vite.
 */
export function trimCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let top = height,
    bottom = 0,
    left = width,
    right = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  // If canvas is blank (no non-transparent pixels), return original
  if (top > bottom || left > right) return canvas;

  const trimmedWidth = right - left + 1;
  const trimmedHeight = bottom - top + 1;

  // Scale down if too large to prevent Payload Too Large (100kb) errors on backend
  const MAX_SIZE = 400;
  let scale = 1;
  if (trimmedWidth > MAX_SIZE || trimmedHeight > MAX_SIZE) {
    scale = Math.min(MAX_SIZE / trimmedWidth, MAX_SIZE / trimmedHeight);
  }
  
  const finalWidth = Math.max(1, Math.floor(trimmedWidth * scale));
  const finalHeight = Math.max(1, Math.floor(trimmedHeight * scale));

  const trimmed = document.createElement("canvas");
  trimmed.width = finalWidth;
  trimmed.height = finalHeight;

  const trimmedCtx = trimmed.getContext("2d");
  if (!trimmedCtx) return canvas;

  // Draw and scale simultaneously
  trimmedCtx.drawImage(canvas, left, top, trimmedWidth, trimmedHeight, 0, 0, finalWidth, finalHeight);

  return trimmed;
}

/**
 * Exports a signature canvas as a trimmed PNG data URL.
 * Falls back to full canvas export if trim fails or canvas is empty.
 */
export function getSignatureDataUrl(sigPad: { isEmpty(): boolean; getCanvas(): HTMLCanvasElement }): string | null {
  if (sigPad.isEmpty()) return null;
  try {
    const trimmed = trimCanvas(sigPad.getCanvas());
    return trimmed.toDataURL("image/png");
  } catch {
    // Fallback: scale down full canvas
    const canvas = sigPad.getCanvas();
    const MAX_SIZE = 400;
    if (canvas.width > MAX_SIZE || canvas.height > MAX_SIZE) {
      const scale = Math.min(MAX_SIZE / canvas.width, MAX_SIZE / canvas.height);
      const scaled = document.createElement("canvas");
      scaled.width = Math.max(1, Math.floor(canvas.width * scale));
      scaled.height = Math.max(1, Math.floor(canvas.height * scale));
      const ctx = scaled.getContext("2d");
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
        return scaled.toDataURL("image/png");
      }
    }
    return canvas.toDataURL("image/png");
  }
}
