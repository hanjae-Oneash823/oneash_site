import path from 'node:path';
import exifr from 'exifr';
import type { ImageMetadata } from 'astro';

export type Photo = {
  image: ImageMetadata;
  name: string;
  taken?: Date;
  camera?: string;
  settings?: string; // e.g. "35mm · f/2 · 1/250s · ISO 400"
};

const PHOTO_DIR = path.resolve('src/photos');
const files = import.meta.glob<{ default: ImageMetadata }>('../photos/*.{jpg,jpeg,JPG,JPEG}', { eager: true });

const shutter = (t: number) => (t >= 1 ? `${t}s` : `1/${Math.round(1 / t)}s`);

async function readExif(file: string) {
  try {
    return await exifr.parse(path.join(PHOTO_DIR, file), {
      pick: ['Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal'],
    });
  } catch (err) {
    console.warn(`[photos] could not read EXIF from ${file}:`, err);
    return undefined;
  }
}

export async function getPhotos(): Promise<Photo[]> {
  const photos = await Promise.all(
    Object.entries(files).map(async ([key, mod]) => {
      const file = path.basename(key);
      const e = await readExif(file);
      const settings = [
        e?.FocalLength && `${Math.round(e.FocalLength)}mm`,
        e?.FNumber && `f/${e.FNumber}`,
        e?.ExposureTime && shutter(e.ExposureTime),
        e?.ISO && `ISO ${e.ISO}`,
      ].filter(Boolean).join(' · ');
      return {
        image: mod.default,
        name: file.replace(/\.[^.]+$/, ''),
        taken: e?.DateTimeOriginal,
        camera: e?.Model,
        settings: settings || undefined,
      };
    }),
  );
  // ordered by filename, numbers compared numerically ("2. x" before "10. x").
  // Rename files to reorder.
  return photos.toSorted((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}
