import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const entry = z.object({
  title: z.string(),
  date: z.coerce.date(),
  summary: z.string(),
  link: z.string().url().optional(),
});

// photo groupings: `photos` lists references (title, filename, or folder/filename), see resolvePhotos
const photoList = z.array(z.string()).default([]);

export const collections = {
  photoCollections: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/collections' }),
    schema: z.object({ title: z.string(), photos: photoList }),
  }),
  exhibits: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/exhibits' }),
    // image(): poster path is relative to the .md file and gets optimized like any other image
    schema: ({ image }) => z.object({
      title: z.string(),
      poster: image().optional(),
      venue: z.string(),
      year: z.number().int(),
      dates: z.string().optional(),
      credits: z.array(z.string()).default([]),
      // each part of the show: intro text, then photos as a full-size stack or a grid of small prints
      sections: z
        .array(
          z.object({
            title: z.string(),
            text: z.string().optional(),
            layout: z.enum(['stack', 'grid']).default('stack'),
            photos: z.array(z.union([z.string(), z.object({ photo: z.string(), note: z.string().optional() })])).default([]),
          }),
        )
        .default([]),
    }),
  }),
  research: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/research' }), schema: entry }),
  cartography: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/cartography' }), schema: entry }),
  projects: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/projects' }), schema: entry }),
};
