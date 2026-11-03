import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const entry = z.object({
  title: z.string(),
  date: z.coerce.date(),
  summary: z.string(),
  link: z.string().url().optional(),
});

export const collections = {
  research: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/research' }), schema: entry }),
  projects: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/projects' }), schema: entry }),
};
