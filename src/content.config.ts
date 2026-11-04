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
    schema: z.object({ title: z.string(), venue: z.string(), year: z.number().int(), dates: z.string().optional(), photos: photoList }),
  }),
  research: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/research' }), schema: entry }),
  cartography: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/cartography' }), schema: entry }),
  projects: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/projects' }), schema: entry }),
};
