// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeExternalLinks from 'rehype-external-links';

// https://astro.build/config
export default defineConfig({
  site: 'https://formalcalculus.com',
  // optimize: collapse static MDX subtrees (KaTeX output above all) into HTML strings.
  // Without it every KaTeX span becomes a JSX call and the SSR bundle peaked at ~8.3 GB RSS,
  // OOM-killing Vercel's 7 GB build machine; with it the build peaks at ~2.3 GB and the
  // rendered pages are unchanged.
  integrations: [react(), mdx({ optimize: true })],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      rehypeKatex,
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    ],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark-dimmed',
      },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
