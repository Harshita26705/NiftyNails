/**
 * Downscale a photo in the browser before upload: faster on mobile data, and re-encoding through a canvas
 * drops EXIF/GPS metadata. Returns a JPEG Blob plus the drawn bitmap size.
 */
export async function downscaleImage(file: File, maxSide = 1600, quality = 0.9): Promise<{ blob: Blob; width: number; height: number; url: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo (JPG, PNG or WebP).");
  if (file.size > 25 * 1024 * 1024) throw new Error("That photo is very large — please choose one under 25 MB.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("We couldn't read that image. Try a JPG or PNG.");
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process the image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't prepare the image."))), "image/jpeg", quality),
  );
  return { blob, width, height, url: URL.createObjectURL(blob) };
}
