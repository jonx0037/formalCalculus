#!/usr/bin/env node
// audit-stats-reciprocity.mjs — Lists every formalstatisticsConnections pair
// across formalCalculus topics. Compare against Appendix A of the cross-site
// linking handoff brief to confirm reciprocity with formalStatistics's
// formalcalculusPrereqs entries.
//
// Run: node scripts/audit-stats-reciprocity.mjs
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import matter from 'gray-matter';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const topicsDir = join(scriptDir, '..', 'src/content/topics');

const files = (await readdir(topicsDir)).filter((f) => f.endsWith('.mdx')).sort();

const pairs = [];
const byCalcTopic = new Map();

for (const file of files) {
  const slug = file.replace(/\.mdx$/, '');
  const raw = await readFile(join(topicsDir, file), 'utf8');
  const fm = matter(raw).data;
  const entries = fm?.formalstatisticsConnections ?? [];
  byCalcTopic.set(slug, entries.map((e) => e.topic));
  for (const e of entries) {
    if (e?.topic) pairs.push([slug, e.topic]);
  }
}

console.log(`# formalstatisticsConnections audit — ${files.length} topics, ${pairs.length} forward links\n`);
console.log(`## By formalCalculus topic\n`);
for (const [slug, stats] of [...byCalcTopic.entries()].sort()) {
  if (stats.length === 0) {
    console.log(`- **${slug}** — (no stats connections)`);
  } else {
    console.log(`- **${slug}** → ${stats.map((s) => `\`${s}\``).join(', ')}`);
  }
}

const byStatsTopic = new Map();
for (const [calc, stat] of pairs) {
  if (!byStatsTopic.has(stat)) byStatsTopic.set(stat, []);
  byStatsTopic.get(stat).push(calc);
}

console.log(`\n## By formalStatistics topic (${byStatsTopic.size} unique)\n`);
for (const [stat, calcs] of [...byStatsTopic.entries()].sort()) {
  console.log(`- **${stat}** ← ${calcs.map((c) => `\`${c}\``).join(', ')}`);
}

const missing = [...byCalcTopic.entries()].filter(([_, s]) => s.length === 0).map(([k]) => k);
console.log(`\n## Topics without any formalstatisticsConnections (${missing.length})\n`);
for (const m of missing) console.log(`- ${m}`);
