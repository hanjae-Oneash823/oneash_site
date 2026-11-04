import fs from 'node:fs';
import path from 'node:path';
import exifr from 'exifr';
import type { ImageMetadata } from 'astro';
import { DETAILS } from '../photos/details';

// Folder layout:
//   src/photos/<YYYY Name>/<n. (WxH) Title, Place, YYYY>.jpg  → a trip, ordered by n
//   src/photos/<(WxH) Title, Place, YYYY>.jpg                  → no trip ("other"), newest first
// Every part of the filename except the title is optional.
// Collections and exhibits (src/content) pick photos by reference, see resolvePhotos.

export interface Photo {
  image: ImageMetadata;
  path: string; // "2025 Türkiye/2. (80X40) How Days End, Fethiye, 2025", unique
  file: string; // filename without extension
  title: string;
  place?: string;
  year?: number;
  size?: string; // print size, e.g. "60 × 40"
  order?: number;
  date?: string; // YYYY-MM-DD, manual or EXIF
  camera?: string;
  trip: string; // slug of its trip page
}

export interface Trip {
  slug: string;
  name: string;
  year?: number;
  photos: Photo[];
}

const PHOTO_DIR = path.resolve('src/photos');
export const OTHER_SLUG = 'other';
const files = import.meta.glob<{ default: ImageMetadata }>('../photos/**/*.{jpg,jpeg,JPG,JPEG}', { eager: true });

// "3. (60X40) Tipsy Men, Ankara, 2025" → order 3, size 60 × 40, title, place, year
// "(15X10) Curtains, 2023" → title, year (a bare year is never taken as the place)
const FILENAME = /^(?:(\d+)\.\s*)?(?:\(([\d.]+)\s*[xX×]\s*([\d.]+)\)\s*)?(.+?)(?:,(?!\s*\d{4}$)\s*([^,]+?))?(?:,\s*(\d{4}))?$/;
const FOLDER = /^(?:(\d{4})\s+)?(.+)$/;

type Parsed = Pick<Photo, 'title' | 'place' | 'year' | 'size' | 'order'>;

export function parseFilename(base: string): Parsed {
  const m = base.match(FILENAME);
  if (!m) return { title: base };
  const [, order, w, h, title, place, year] = m;
  return {
    title: title.trim(),
    place: place?.trim(),
    year: year ? Number(year) : undefined,
    size: w && h ? `${w} × ${h}` : undefined,
    order: order ? Number(order) : undefined,
  };
}

// strip accents but keep non-Latin scripts (e.g. Hangul) so every folder gets a usable slug
export const slugify = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC').toLowerCase().trim().replace(/[\s/]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');

// film scans carry the scanner software in the camera field; that's not a camera
const NOT_CAMERAS = new Set(['EZ Controller']);

// raw EXIF date is the camera's wall clock ("2025:07:21 02:19:45"); slice it rather than build a Date,
// so the result doesn't shift with the build machine's timezone
async function readExif(file: string): Promise<{ date?: string; camera?: string }> {
  try {
    const e = await exifr.parse(path.join(PHOTO_DIR, file), { pick: ['DateTimeOriginal', 'Model'], reviveValues: false });
    const raw: string | undefined = e?.DateTimeOriginal;
    return {
      date: raw?.slice(0, 10).replaceAll(':', '-'),
      camera: e?.Model && !NOT_CAMERAS.has(e.Model) ? e.Model : undefined,
    };
  } catch (err) {
    console.warn(`[photos] could not read EXIF from ${file}:`, err);
    return {};
  }
}

const byOrder = (a: Photo, b: Photo) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.title.localeCompare(b.title);
// manual/EXIF date when present, else Jan 1 of the filename year
const when = (p: Photo) => (p.date ? Date.parse(p.date) : p.year ? Date.UTC(p.year, 0) : 0);
const newestFirst = (a: Photo, b: Photo) => when(b) - when(a);

async function load(key: string, mod: { default: ImageMetadata }): Promise<Photo> {
  const rel = key.replace('../photos/', '');
  const folder = path.dirname(rel);
  // NFC: macOS can store accented filenames decomposed (ö as o + ¨), which wouldn't match typed text
  const file = path.basename(rel).replace(/\.[^.]+$/, '').normalize('NFC');
  const parsed = parseFilename(file);
  const exif = await readExif(rel);
  const manual = DETAILS[file] ?? DETAILS[parsed.title] ?? {};
  return {
    image: mod.default,
    path: rel.replace(/\.[^.]+$/, '').normalize('NFC'),
    file,
    ...parsed,
    date: exif.date,
    camera: exif.camera,
    ...manual, // explicit keys win, including `place: undefined` to clear a misparsed place
    trip: folder === '.' ? OTHER_SLUG : slugify(folder),
  };
}

// cached: every page asks for the same library during one build
let library: Promise<{ trips: Trip[]; all: Photo[] }> | undefined;

export function getLibrary(): Promise<{ trips: Trip[]; all: Photo[] }> {
  library ??= (async () => {
    const all = await Promise.all(Object.entries(files).map(([key, mod]) => load(key, mod)));
    // every top-level folder is a trip, even before it has photos (placeholder pages)
    const dirs = fs.readdirSync(PHOTO_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name.normalize('NFC'));
    const folders = [...new Set([...dirs, ...all.map((p) => path.dirname(p.path)).filter((f) => f !== '.')])];
    const trips: Trip[] = folders
      .map((folder) => {
        const [, year, name] = folder.match(FOLDER)!;
        const slug = slugify(folder);
        return { slug, name, year: year ? Number(year) : undefined, photos: all.filter((p) => p.trip === slug).toSorted(byOrder) };
      })
      .toSorted((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.name.localeCompare(b.name));
    const other = all.filter((p) => p.trip === OTHER_SLUG).toSorted(newestFirst);
    if (other.length) trips.push({ slug: OTHER_SLUG, name: 'other', photos: other });
    return { trips, all };
  })();
  return library;
}

// A reference is a photo's title, its filename, or "folder/filename" — whichever is unique.
// Anything that matches zero or several photos fails the build, listing the candidates.
export function resolvePhotos(refs: string[], all: Photo[], where: string): Photo[] {
  return refs.map((raw) => {
    const ref = raw.normalize('NFC');
    const hits = all.filter((p) => p.title === ref || p.file === ref || p.path === ref);
    if (hits.length === 1) return hits[0];
    const detail = hits.length
      ? `matches ${hits.length} photos, use the filename or folder/filename instead:\n${hits.map((p) => `  - ${p.path}`).join('\n')}`
      : 'matches no photo (check the title or filename)';
    throw new Error(`[photos] "${ref}" in ${where} ${detail}`);
  });
}
