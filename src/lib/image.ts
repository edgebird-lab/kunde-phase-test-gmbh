/**
 * Image-Helper: liefert eine sichere src + alt für ein Image-Datenobjekt.
 * Bilder im JSON haben typischerweise key/position/description/alt — der echte
 * src wird vom Build-Script aus einem Asset-Mapping oder Platzhalter befüllt.
 */

export interface ImageData {
  key?: string;
  position?: string;
  description?: string;
  alt?: string;
  src?: string;
}

/**
 * Liefert einen src-Pfad. Fällt auf einen Picsum-Platzhalter zurück, wenn nichts
 * gesetzt ist — so sieht die generierte Site auch ohne hochgeladene Assets schon
 * aus wie eine echte Webseite (statt Broken-Image-Icons).
 */
export function imageSrc(img: ImageData | undefined, seed = 'placeholder', w = 1200, h = 800): string {
  if (img?.src) return img.src;
  // Deterministischer Picsum-Seed pro Bild → stabile Vorschau
  const safeSeed = encodeURIComponent(`${seed}-${img?.key ?? 'x'}`);
  return `https://picsum.photos/seed/${safeSeed}/${w}/${h}`;
}

export function imageAlt(img: ImageData | undefined, fallback = ''): string {
  return (img?.alt || img?.description || fallback || '').trim();
}

/**
 * Findet ein Bild anhand seines key in einem Bild-Array.
 */
export function findImage(images: ImageData[] | undefined, key: string): ImageData | undefined {
  return images?.find((i) => i.key === key);
}
