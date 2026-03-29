import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const topics = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/topics' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    status: z.enum(['published', 'draft']),
    difficulty: z.enum(['foundational', 'intermediate', 'advanced']),
    prerequisites: z.array(z.string()),
    tags: z.array(z.string()),
    domain: z.enum([
      'limits-continuity',
      'single-variable',
      'multivar-differential',
      'multivar-integral',
      'series-approximation',
      'odes',
      'measure-integration',
      'functional-analysis',
    ]),
    videoId: z.string().nullable().optional(),
    notebookPath: z.string(),
    githubUrl: z.string().url().nullable().optional(),
    datePublished: z.coerce.date(),
    estimatedReadTime: z.number(),
    abstract: z.string(),
    formalmlConnections: z
      .array(
        z.object({
          topic: z.string(),
          site: z.literal('formalml'),
          relationship: z.string(),
        }),
      )
      .optional(),
    connections: z.array(
      z.object({
        topic: z.string(),
        relationship: z.string(),
      }),
    ),
    references: z.array(
      z.object({
        type: z.enum(['book', 'paper']),
        title: z.string(),
        authors: z.string(),
        year: z.number(),
        url: z.string().url().optional(),
        note: z.string().optional(),
      }),
    ),
  }),
});

export const collections = { topics };
