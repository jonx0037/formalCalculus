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
          // Optional override for the card title when titleize() produces a
          // wrong capitalization (e.g. "pac-learning" → "Pac Learning" instead
          // of "PAC Learning"). Omit when titleize is correct.
          title: z.string().optional(),
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
    // Annotated downstream topics — the auto section already lists everything
    // downstream from the curriculum graph; entries here layer prose onto
    // specific ids so those cards carry context. Un-annotated graph downstreams
    // still render, just without relationship text.
    downstreamConnections: z
      .array(
        z.object({
          topic: z.string(),
          relationship: z.string(),
        }),
      )
      .optional(),
    // Opt-out for topics that author their own in-content Connections callouts
    // (with richer prose than the auto-rendered section can express).
    // When true, <ConnectionsSection> does not render below the MDX.
    hideAutomaticConnections: z.boolean().optional(),
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
