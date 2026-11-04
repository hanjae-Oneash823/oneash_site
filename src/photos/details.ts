// Manual photo details. Keyed by photo title (the title part of the filename).
// Anything set here overrides what's read from the file's EXIF.
//   'Katla Ice Caves': { date: '2023-08-12', camera: 'Canonet QL17' },
export interface PhotoDetails {
  date?: string; // YYYY-MM-DD
  camera?: string;
}

export const DETAILS: Record<string, PhotoDetails> = {};
