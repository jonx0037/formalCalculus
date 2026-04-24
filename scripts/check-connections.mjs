#!/usr/bin/env node
/**
 * check-connections.mjs — Validator for topic cross-link health.
 *
 * Flags:
 *   - Stale language ("(live links)", "(planned topics)").
 *   - Unused legacy <div class="topic-callout"> markup.
 *   - Hand-authored "Connections & Further Reading" headings that would
 *     duplicate the auto-rendered ConnectionsSection.
 *   - Frontmatter entries (connections / downstreamConnections / formalmlConnections)
 *     that reference unknown topic slugs.
 *   - Thin relationship prose (<40 chars) — catches placeholder fillers.
 *   - Internal /topics/<slug> links pointing at topics not in the graph.
 *
 * Exit 0 on clean, 1 on any finding. Run via `pnpm check:connections`.
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');
const topicsDir = join(repoRoot, 'src/content/topics');
const graphPath = join(repoRoot, 'src/data/curriculum-graph.json');

const graph = JSON.parse(await readFile(graphPath, 'utf8'));
const validSlugs = new Set(graph.nodes.map((n) => n.id));

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { fm: null, body: raw };

  const fmText = match[1];
  const body = match[2];
  const fm = {};

  const arrayFields = ['connections', 'downstreamConnections', 'formalmlConnections'];
  for (const field of arrayFields) {
    const re = new RegExp(`^${field}:\\s*\\n((?:  -[\\s\\S]*?)(?=\\n[a-zA-Z]|$))`, 'm');
    const m = fmText.match(re);
    if (!m) continue;
    const entries = [];
    let current = null;
    for (const line of m[1].split('\n')) {
      if (line.startsWith('  - topic:')) {
        if (current) entries.push(current);
        current = { topic: line.replace(/^  - topic:\s*"?([^"]*)"?\s*$/, '$1').trim() };
      } else if (current && line.match(/^ {4}relationship:/)) {
        current.relationship = line.replace(/^ {4}relationship:\s*"?([\s\S]*?)"?\s*$/, '$1').trim();
      }
    }
    if (current) entries.push(current);
    fm[field] = entries;
  }
  return { fm, body };
}

const issues = [];
const files = (await readdir(topicsDir)).filter((f) => f.endsWith('.mdx')).sort();

for (const file of files) {
  const slug = file.replace(/\.mdx$/, '');
  const raw = await readFile(join(topicsDir, file), 'utf8');
  const { fm, body } = parseFrontmatter(raw);

  if (/topic-callout/.test(body)) {
    issues.push([slug, 'legacy <div class="topic-callout"> still present']);
  }
  if (/\(live links\)|\(planned topics\)/i.test(body)) {
    issues.push([slug, 'stale "(live links)" or "(planned topics)" qualifier']);
  }
  if (/## \d+\.\s+Connections\s*(&|and)\s*Further Reading/.test(body)) {
    issues.push([slug, 'hand-authored "Connections & Further Reading" heading (duplicates auto-section)']);
  }

  if (!fm) continue;

  for (const field of ['connections', 'downstreamConnections', 'formalmlConnections']) {
    const entries = fm[field] ?? [];
    for (const entry of entries) {
      if (!entry.topic) continue;
      if (field !== 'formalmlConnections' && !validSlugs.has(entry.topic)) {
        issues.push([slug, `${field}: unknown slug "${entry.topic}"`]);
      }
      const prose = entry.relationship ?? '';
      if (prose.length > 0 && prose.length < 40) {
        issues.push([slug, `${field}: thin relationship for "${entry.topic}" (${prose.length} chars)`]);
      }
    }
  }

  for (const match of body.matchAll(/\]\(\/topics\/([a-z0-9-]+)\)/g)) {
    const linked = match[1];
    if (!validSlugs.has(linked)) {
      issues.push([slug, `internal link to unknown slug "/topics/${linked}"`]);
    }
  }
}

if (issues.length === 0) {
  console.log(`✓ check-connections: all ${files.length} topics pass.`);
  process.exit(0);
}

const bySlug = new Map();
for (const [slug, msg] of issues) {
  if (!bySlug.has(slug)) bySlug.set(slug, []);
  bySlug.get(slug).push(msg);
}
for (const [slug, msgs] of [...bySlug.entries()].sort()) {
  console.log(`\n${slug}`);
  for (const msg of msgs) console.log(`  • ${msg}`);
}
console.log(`\n${issues.length} issue(s) across ${bySlug.size} topic(s).`);
process.exit(1);
