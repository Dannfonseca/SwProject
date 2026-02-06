export type VisionImage = { buffer: Buffer; mimeType: string };

export const extractMonstersFromImagesViaVision = async (images: VisionImage[]) => {
  const url = process.env.VISION_SERVICE_URL;
  if (!url) return null;

  const form = new FormData();
  images.forEach((img, idx) => {
    const blob = new Blob([img.buffer], { type: img.mimeType || 'image/png' });
    form.append('images', blob, `image_${idx}.png`);
  });

  const res = await fetch(`${url.replace(/\/$/, '')}/detect`, {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vision service error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const names = Array.isArray(data?.names) ? data.names : [];
  return names.filter((n: any) => typeof n === 'string');
};