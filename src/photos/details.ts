// Manual photo details. Key by photo title, or by filename (without .jpg) when the
// title isn't unique or the filename can't be parsed (e.g. a comma inside the title).
// Anything set here overrides what's read from the filename and EXIF.
//   'Katla Ice Caves': { date: '2023-08-12', camera: 'Canonet QL17' },
export interface PhotoDetails {
  title?: string;
  place?: string;
  date?: string; // YYYY-MM-DD
  camera?: string;
}

const MINOLTA_SUPERIA = 'Minolta Freedom TELE · Fujifilm Superia Premium 400';

export const DETAILS: Record<string, PhotoDetails> = {
  // film, from the Things That Won't Change exhibit guide
  'Katla Ice Caves': { camera: MINOLTA_SUPERIA },
  'Mountains over Vík': { camera: MINOLTA_SUPERIA },
  'Afterimage': { camera: 'Canon Canonet QL17 · Kentmere Pan 100' },

  // commas inside the title: "Title, Place, Year" can't tell them apart
  '(15X10) Lungta, Prayers in the Morning, 2025': { title: 'Lungta, Prayers in the Morning', place: undefined },
  '(15X10) Nine Steps, and a Couple More': { title: 'Nine Steps, and a Couple More', place: undefined },
};
