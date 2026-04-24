#!/usr/bin/env node
/**
 * check-connections.mjs — Validator for topic cross-link health.
 *
 * Flags (errors, exit 1):
 *   - Stale language ("(live links)", "(planned topics)").
 *   - Unused legacy <div class="topic-callout"> markup.
 *   - Hand-authored "Connections & Further Reading" headings that would
 *     duplicate the auto-rendered ConnectionsSection.
 *   - Frontmatter entries (connections / downstreamConnections /
 *     formalmlConnections) that reference unknown topic slugs.
 *   - Thin relationship prose (<40 chars) — catches placeholder fillers.
 *   - Internal /topics/<slug> links pointing at topics not in the graph.
 *
 * Warns (non-fatal, exit still 0):
 *   - downstreamConnections entries that aren't direct graph successors of
 *     the current topic. These are author-curated forward references — valid
 *     but worth flagging in case of typo.
 *
 * Exit 0 on clean (possibly with warnings), 1 on any error.
 * Run via `pnpm check:connections`.
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import matter from 'gray-matter';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');
const topicsDir = join(repoRoot, 'src/content/topics');
const graphPath = join(repoRoot, 'src/data/curriculum-graph.json');

const graph = JSON.parse(await readFile(graphPath, 'utf8'));
const validSlugs = new Set(graph.nodes.map((n) => n.id));

// Build graph downstream map: slug -> Set of direct downstream slugs.
const downstreamMap = new Map();
for (const edge of graph.edges) {
  const existing = downstreamMap.get(edge.source);
  if (existing) existing.add(edge.target);
  else downstreamMap.set(edge.source, new Set([edge.target]));
}

const errors = [];
const warnings = [];

const files = (await readdir(topicsDir)).filter((f) => f.endsWith('.mdx')).sort();

for (const file of files) {
  const slug = file.replace(/\.mdx$/, '');
  const raw = await readFile(join(topicsDir, file), 'utf8');
  const parsed = matter(raw);
  const fm = parsed.data;
  const body = parsed.content;

  if (/topic-callout/.test(body)) {
    errors.push([slug, 'legacy <div class="topic-callout"> still present']);
  }
  if (/\(live links\)|\(planned topics\)/i.test(body)) {
    errors.push([slug, 'stale "(live links)" or "(planned topics)" qualifier']);
  }
  if (/## \d+\.\s+Connections\s*(&|and)\s*Further Reading/.test(body)) {
    errors.push([
      slug,
      'hand-authored "Connections & Further Reading" heading (duplicates auto-section)',
    ]);
  }

  const graphDownstream = downstreamMap.get(slug) ?? new Set();

  for (const field of [
    'connections',
    'downstreamConnections',
    'formalmlConnections',
    'formalstatisticsConnections',
  ]) {
    const entries = fm?.[field] ?? [];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object' || !entry.topic) continue;
      const isCrossSite =
        field === 'formalmlConnections' || field === 'formalstatisticsConnections';
      if (!isCrossSite && !validSlugs.has(entry.topic)) {
        errors.push([slug, `${field}: unknown slug "${entry.topic}"`]);
      }
      const prose = typeof entry.relationship === 'string' ? entry.relationship : '';
      if (prose.length > 0 && prose.length < 40) {
        errors.push([
          slug,
          `${field}: thin relationship for "${entry.topic}" (${prose.length} chars)`,
        ]);
      }
      if (field === 'downstreamConnections' && !graphDownstream.has(entry.topic)) {
        warnings.push([
          slug,
          `downstreamConnections: "${entry.topic}" is not a direct graph successor (forward reference)`,
        ]);
      }
    }
  }

  for (const match of body.matchAll(/\]\(\/topics\/([a-z0-9-]+)\)/g)) {
    const linked = match[1];
    if (!validSlugs.has(linked)) {
      errors.push([slug, `internal link to unknown slug "/topics/${linked}"`]);
    }
  }
}

function print(label, groups) {
  if (groups.length === 0) return;
  const bySlug = new Map();
  for (const [slug, msg] of groups) {
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(msg);
  }
  console.log(`\n${label}:`);
  for (const [slug, msgs] of [...bySlug.entries()].sort()) {
    console.log(`  ${slug}`);
    for (const msg of msgs) console.log(`    • ${msg}`);
  }
}

print('Warnings', warnings);
print('Errors', errors);

if (errors.length === 0 && warnings.length === 0) {
  console.log(`✓ check-connections: all ${files.length} topics pass.`);
  process.exit(0);
}

const warnCount = warnings.length;
const errCount = errors.length;
console.log(
  `\n${errCount} error(s), ${warnCount} warning(s) across ${files.length} topics.`,
);
process.exit(errCount > 0 ? 1 : 0);
