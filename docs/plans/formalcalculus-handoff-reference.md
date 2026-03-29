# formalCalculus — Handoff Brief Reference

> **Purpose:** Paste this document into Claude Chat when composing a new topic handoff brief.
> It captures the ground-truth codebase conventions so the brief aligns with what Claude Code
> actually sees during implementation. Modeled on the formalml.com handoff reference that
> successfully guided 35 topic implementations with zero architectural regressions.
>
> **Status:** Pre-implementation. Conventions are specified from the formalml.com patterns
> and will be confirmed/updated once the codebase is scaffolded and the first topic is deployed.

---

## 1. Tech Stack (exact versions)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Astro | 6.x |
| UI | React | 19.x |
| Content | MDX (remark-math + rehype-katex) | — |
| Styling | Tailwind CSS | 4.x |
| Visualizations | D3.js | 7.x |
| Search | Pagefind | 1.4.x |
| Package manager | **pnpm** (never npm) | — |
| Deploy | Vercel | — |
| TypeScript | 5.9.x | — |

> These match the formalml.com stack exactly. The two sites are independent codebases, but
> share infrastructure patterns for maintainability.

---

## 2. MDX Frontmatter Schema

Every topic file lives at `src/content/topics/{slug}.mdx`. The slug is the filename without extension.

```yaml
---
title: "Topic Title"                        # Required. String.
subtitle: "One-line scope description"      # Required. String.
status: "published"                         # Required. "published" | "draft"
difficulty: "intermediate"                  # Required. "foundational" | "intermediate" | "advanced"
prerequisites:                              # Required. Array of topic slugs (filenames, not labels).
  - "derivative"                            #   ← NOT "the-derivative-and-chain-rule"
tags:                                       # Required. Lowercase, hyphen-separated.
  - "calculus"
  - "differentiation"
domain: "single-variable"                   # Required. One of 8 domain keys (see §6).
videoId: null                               # Optional. YouTube video ID or null.
notebookPath: "notebooks/{folder}/{file}"   # Required. Path from repo root.
githubUrl: "https://github.com/..."         # Optional. Full URL to the MDX on GitHub, or null.
datePublished: 2026-04-15                   # Required. ISO date (YYYY-MM-DD).
estimatedReadTime: 35                       # Required. Integer, in minutes.
abstract: "Multi-sentence summary..."       # Required. One paragraph, plain text (no LaTeX).
formalmlConnections:                         # Optional. Array of formalml.com topic references.
  - topic: "gradient-descent"               #   ← slug from formalml.com, not formalcalculus.com
    site: "formalml"
    relationship: "The gradient and chain rule developed here are the foundation of gradient descent convergence analysis."
connections:                                # Required. Array of related-topic objects (within formalcalculus.com).
  - topic: "sequences-limits"               #   ← Uses the slug, not the display title.
    relationship: "Describes the connection in 1-2 sentences."
references:                                 # Required. Array of citation objects.
  - type: "book"                            #   type: "book" | "paper"
    title: "Book Title"
    authors: "Surname"                      #   or "Surname1, Surname2 & Surname3"
    year: 2016
    note: "Chapter or section relevance"
  - type: "paper"
    title: "Paper Title"
    authors: "Surname1, Surname2 & Surname3"
    year: 2011
    url: "https://doi.org/..."              #   Papers should include DOI/URL.
    note: "Brief relevance note"
---
```

### Key difference from formalml.com

formalCalculus adds a `formalmlConnections` array for cross-site forward references. These are **not prerequisites** — they are "where this math leads" pointers rendered with a distinctive visual treatment (e.g., a → formalML badge). The `connections` array remains for within-site cross-references only.

### `notebookPath` format

The brief should specify the path from the repo root. Notebooks live in `notebooks/{topic-folder}/`.

```
notebooks/sequences-limits/01_sequences_limits.ipynb
```

The notebook filename includes a two-digit topic number prefix within its track.

---

## 3. MDX Body Conventions

### Imports (after frontmatter `---`)

```mdx
import TheoremBlock from '../../components/ui/TheoremBlock.astro';
import MyVizComponent from '../../components/viz/MyVizComponent.tsx';
```

- TheoremBlock is the only UI component typically imported.
- Viz components use relative paths from `src/content/topics/`.

### Viz component embedding

```mdx
<MyVizComponent client:visible />
```

> ⚠️ **Always use `client:visible`** — this is Astro's hydration directive that loads the React
> component only when it scrolls into view. Never use `client:load` (hydrates immediately) for
> viz components — they are heavy D3 renderers that should lazy-load.

### TheoremBlock usage

```mdx
<TheoremBlock type="definition" number={1} title="Convergence of a Sequence">
A sequence $(a_n)$ converges to $L \in \mathbb{R}$...
</TheoremBlock>

<TheoremBlock type="theorem" number={1} title="Bolzano-Weierstrass Theorem">
Every bounded sequence in $\mathbb{R}$ has a convergent subsequence.
</TheoremBlock>

<TheoremBlock type="proof">
We proceed by bisection...
</TheoremBlock>
```

**Valid `type` values:** `definition`, `theorem`, `lemma`, `proposition`, `corollary`, `proof`, `remark`, `example`

**Numbering:** `number` is per-type within the topic. Definitions are numbered separately from theorems. Proofs and remarks typically omit `number`.

### Internal cross-references

Link to other topics with Markdown links using absolute paths:

```mdx
As we established in [Sequences, Limits & Convergence](/topics/sequences-limits), ...
The [Riemann Integral & FTC](/topics/riemann-integral) will formalize this intuition.
```

For planned (unwritten) topics, use plain text with an annotation:

```mdx
**Fourier Series** *(coming soon)* will extend this decomposition to periodic functions.
```

For formalml.com forward references, use external links with a visual marker:

```mdx
This is precisely the gradient vector used in [Gradient Descent](https://formalml.com/topics/gradient-descent) → formalML.
```

### Section structure pattern

Every topic follows this skeleton:

```
## Overview & Motivation          ← What and why. Concrete ML-relevant example before formalism.
## [Core Theory Sections]         ← 3-6 sections of math + viz + proofs.
## [Extensions / Variants]        ← Generalizations, computational aspects.
## Computational Notes            ← NumPy/SciPy code, numerical pitfalls.
## Connections to ML              ← Explicit bridges to ML applications and formalml.com topics.
## Connections & Further Reading  ← Cross-reference table + DAG diagram.
```

The "Connections to ML" section is **mandatory** for every topic. This is what distinguishes formalCalculus from a standard calculus textbook.

---

## 4. Visualization Component Patterns

### File location and naming

- All viz components: `src/components/viz/{ComponentName}.tsx`
- PascalCase filenames matching the component name.
- Data modules: `src/data/{topic-slug}-data.ts` (or `{descriptor}-data.ts`)

### Standard imports

```typescript
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
// Optional, depending on component needs:
import { useD3 } from './shared/useD3';
import { dimensionColors, domainColorScale } from './shared/colorScales';
import type { Point2D } from './shared/types';
```

### Two rendering approaches

**Approach A — `useD3` hook** (simpler, for single-SVG components):

```typescript
const svgRef = useD3<SVGSVGElement>(
  (svg) => {
    svg.selectAll('*').remove();
    // D3 rendering...
  },
  [data, width, height],
);
return <svg ref={svgRef} width={width} height={height} />;
```

**Approach B — `useEffect` + manual refs** (for multi-panel components):

```typescript
const leftSvgRef = useRef<SVGSVGElement>(null);
const rightSvgRef = useRef<SVGSVGElement>(null);

useEffect(() => {
  const svg = d3.select(leftSvgRef.current);
  if (!leftSvgRef.current || innerW <= 0) return;
  svg.selectAll('*').remove();
  // D3 rendering...
}, [data, innerW, innerH]);
```

### CSS custom properties (mandatory for theme support)

All viz components must use CSS custom properties for colors to support the site-wide dark/light mode toggle:

```typescript
const colors = {
  text: 'var(--color-text)',
  textMuted: 'var(--color-text-muted)',
  border: 'var(--color-border)',
  surface: 'var(--color-surface)',
  primary: 'var(--color-primary)',
  accent: 'var(--color-accent)',
};
```

Never hardcode hex colors for text, backgrounds, or borders. D3 scale colors (for data encoding) are OK as hardcoded hex — they should remain constant across themes.

### Responsive container pattern

```typescript
const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
const height = Math.min(width * 0.6, 500);

return (
  <div ref={containerRef} className="w-full">
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      ...
    </svg>
  </div>
);
```

### Export style

```typescript
export default function ComponentName() { ... }
```

Default export, named function. No class components.

### Data module conventions

- Export TypeScript interfaces for all data shapes.
- Use deterministic pseudo-random generators (seeded LCG/hash) — never `Math.random()`.
- For expensive computations, use lazy initialization (not eager module-level execution):

```typescript
// ✅ Correct — lazy
let cache: Result[] | null = null;
export function getResults(): Result[] {
  if (cache === null) cache = computeExpensiveData();
  return cache;
}

// ❌ Wrong — runs on import, blocks page load
export const results = computeExpensiveData();
```

### Calculus-specific visualization patterns

These are component patterns unique to calculus content. Briefs should reference these when specifying viz components.

**Epsilon-delta explorer:**
- Two adjustable bands (horizontal for epsilon, vertical for delta).
- Drag interaction: user drags epsilon → component computes and displays sufficient delta.
- Function graph with highlighted regions showing the epsilon-delta neighborhood.
- "Zoom in" button that magnifies the neighborhood to show convergence behavior.

**Riemann sum visualizer:**
- Partition count slider (n = 2 to 200+, logarithmic scale for high n).
- Toggle between left, right, midpoint, trapezoidal, Simpson's rules.
- Numerical display showing sum value and |sum - exact| error.
- Animated transition when changing n or rule type.

**Derivative explorer:**
- Secant line through (a, f(a)) and (a+h, f(a+h)) with h slider.
- As h → 0, secant line animates to tangent line.
- Numerical display of slope and limit.
- Side panel showing derivative function graph building point-by-point.

**Gradient/contour visualizer:**
- 2D contour plot of f(x, y) with interactive gradient vectors.
- Click to place a point → gradient vector drawn at that point.
- Optional: gradient descent path animation from clicked point.
- Side panels showing partial derivative values.

**Series convergence animator:**
- Partial sum S_n displayed as a function of n.
- Individual terms a_n shown as bars.
- Convergence/divergence diagnosis displayed.
- For power series: complex plane with radius of convergence circle.

---

## 5. Planned Topics (curriculum)

32 topics across 8 tracks. All topics are currently Planned (none published yet).

### Track 1: Limits & Continuity (4 topics)

| # | Slug | Title | Difficulty |
|---|------|-------|------------|
| 1 | `sequences-limits` | Sequences, Limits & Convergence | foundational |
| 2 | `epsilon-delta` | Epsilon-Delta & Continuity | foundational |
| 3 | `completeness-compactness` | Completeness & Compactness | intermediate |
| 4 | `uniform-convergence` | Uniform Convergence | intermediate |

### Track 2: Single-Variable Calculus (4 topics)

| # | Slug | Title | Difficulty |
|---|------|-------|------------|
| 5 | `derivative` | The Derivative & Chain Rule | foundational |
| 6 | `mean-value-taylor` | Mean Value Theorem & Taylor Expansion | intermediate |
| 7 | `riemann-integral` | The Riemann Integral & FTC | foundational |
| 8 | `improper-integrals` | Improper Integrals & Special Functions | intermediate |

### Track 3: Multivariable Differential Calculus (4 topics)

| # | Slug | Title | Difficulty |
|---|------|-------|------------|
| 9 | `gradient` | Partial Derivatives & the Gradient | foundational |
| 10 | `jacobian` | The Jacobian & Multivariate Chain Rule | intermediate |
| 11 | `hessian` | The Hessian & Second-Order Analysis | intermediate |
| 12 | `inverse-implicit` | Inverse & Implicit Function Theorems | advanced |

### Track 4: Multivariable Integral Calculus (4 topics)

| # | Slug | Title | Difficulty |
|---|------|-------|------------|
| 13 | `multiple-integrals` | Multiple Integrals & Fubini's Theorem | intermediate |
| 14 | `change-of-variables` | Change of Variables & the Jacobian Determinant | intermediate |
| 15 | `line-integrals` | Line Integrals & Conservative Fields | intermediate |
| 16 | `surface-integrals` | Surface Integrals & the Divergence Theorem | advanced |

### Track 5: Sequences, Series & Approximation (4 topics)

| # | Slug | Title | Difficulty |
|---|------|-------|------------|
| 17 | `series-convergence` | Series Convergence & Tests | foundational |
| 18 | `power-taylor-series` | Power Series & Taylor Series | intermediate |
| 19 | `fourier-series` | Fourier Series & Orthogonal Expansions | intermediate |
| 20 | `approximation-theory` | Approximation Theory & Convergence Rates | advanced |

### Track 6: Ordinary Differential Equations (4 topics)

| # | Slug | Title | Difficulty |
|---|------|-------|------------|
| 21 | `first-order-odes` | First-Order ODEs & Existence Theorems | foundational |
| 22 | `linear-systems` | Linear Systems & Matrix Exponential | intermediate |
| 23 | `stability-dynamics` | Stability & Dynamical Systems | intermediate |
| 24 | `numerical-odes` | Numerical Methods for ODEs | intermediate |

### Track 7: Measure & Integration (4 topics)

| # | Slug | Title | Difficulty |
|---|------|-------|------------|
| 25 | `sigma-algebras` | Sigma-Algebras & Measures | advanced |
| 26 | `lebesgue-integral` | The Lebesgue Integral | advanced |
| 27 | `lp-spaces` | Lp Spaces | advanced |
| 28 | `radon-nikodym` | Radon-Nikodym & Probability Densities | advanced |

### Track 8: Functional Analysis Essentials (4 topics)

| # | Slug | Title | Difficulty |
|---|------|-------|------------|
| 29 | `metric-spaces` | Metric Spaces & Topology | intermediate |
| 30 | `banach-spaces` | Normed & Banach Spaces | advanced |
| 31 | `hilbert-spaces` | Inner Product & Hilbert Spaces | advanced |
| 32 | `calculus-of-variations` | Calculus of Variations & Euler-Lagrange | advanced |

**Rule:** The slug is always the MDX filename without `.mdx`. Check this table before writing any brief.

### Forward links to formalml.com

| formalCalculus topic | Enables (formalml.com slug) | Relationship |
|---------------------|----------------------------|-------------|
| `sequences-limits` | `measure-theoretic-probability` | Sequence convergence modes used in probability (a.s., in probability, in distribution) |
| `epsilon-delta` | `convex-analysis` | Continuity of convex functions, semicontinuity |
| `completeness-compactness` | `convex-analysis`, `measure-theoretic-probability` | Extreme value theorem for optimization, compactness in measure theory |
| `uniform-convergence` | `pac-learning`, `concentration-inequalities` | Uniform convergence of empirical processes, Glivenko-Cantelli |
| `derivative` | `gradient-descent`, `shannon-entropy` | Single-variable derivatives in entropy, KL divergence |
| `mean-value-taylor` | `gradient-descent`, `proximal-methods` | Taylor expansion in convergence rate proofs |
| `riemann-integral` | `measure-theoretic-probability` | Riemann → Lebesgue transition |
| `improper-integrals` | `bayesian-nonparametrics`, `shannon-entropy` | Gamma/Beta functions in Bayesian priors, Gaussian integral |
| `gradient` | `gradient-descent`, `convex-analysis` | Gradient as steepest ascent direction |
| `jacobian` | `gradient-descent`, `smooth-manifolds` | Chain rule for backpropagation, coordinate transformations |
| `hessian` | `gradient-descent`, `information-geometry` | Second-order optimization, Fisher information matrix |
| `inverse-implicit` | `smooth-manifolds`, `lagrangian-duality` | Manifold charts, constraint qualification |
| `multiple-integrals` | `measure-theoretic-probability`, `bayesian-nonparametrics` | Joint densities, marginalizing |
| `change-of-variables` | `measure-theoretic-probability` | Pushforward measures, density transformations |
| `fourier-series` | `rate-distortion` | Orthogonal decomposition in rate-distortion theory |
| `approximation-theory` | `pac-learning` | Universal approximation, function class complexity |
| `stability-dynamics` | `gradient-descent` | Convergence as dynamical system stability |
| `numerical-odes` | `random-walks` | Discrete-time approximation of continuous processes |
| `sigma-algebras` | `measure-theoretic-probability` | Direct prerequisite — same mathematical framework |
| `lebesgue-integral` | `measure-theoretic-probability` | Direct prerequisite — Lebesgue integration for expectation |
| `lp-spaces` | `concentration-inequalities` | Norm inequalities, moment bounds |
| `radon-nikodym` | `measure-theoretic-probability`, `kl-divergence` | Densities as Radon-Nikodym derivatives, KL divergence definition |
| `metric-spaces` | `convex-analysis` | Metric structure of optimization domains |
| `hilbert-spaces` | `spectral-theorem`, `riemannian-geometry` | Inner product structure, orthogonal projections |
| `calculus-of-variations` | `lagrangian-duality`, `information-geometry` | Euler-Lagrange for optimal control, variational inference |

---

## 6. Curriculum Graph Updates

When adding a new topic, the brief should specify changes to two files:

### `src/data/curriculum-graph.json`

**Add a node:**
```json
{ "id": "new-topic-slug", "label": "Display Title", "domain": "domain-key", "status": "published", "url": "/topics/new-topic-slug" }
```

**Add edges** (prerequisite → this topic, this topic → downstream):
```json
{ "source": "prerequisite-slug", "target": "new-topic-slug" }
```

### `src/data/curriculum.ts`

Remove the topic title from the `planned` array of its domain track. Do **not** remove other topics.

### Domain keys (exhaustive list)

`limits-continuity`, `single-variable`, `multivar-differential`, `multivar-integral`, `series-approximation`, `odes`, `measure-integration`, `functional-analysis`

---

## 7. Image Conventions

- Directory: `public/images/topics/{topic-slug}/`
- Flat structure (no subdirectories within).
- Formats: PNG preferred for notebook exports; SVG for diagrams.
- Naming: Kebab-case, descriptive (e.g., `epsilon-delta-neighborhood.png`).
- Referenced in MDX with: `![Alt text](/images/topics/{slug}/filename.png)`

---

## 8. Shared Utility Modules

Unlike formalml.com (which grew shared modules organically per-track), formalCalculus should plan its shared utility modules from the start. Each track that introduces reusable mathematical functions should have a corresponding utility module.

### Planned shared utility modules

| Module | Location | Created by | Contents |
|--------|----------|------------|----------|
| `limits.ts` | `src/components/viz/shared/limits.ts` | Track 1, Topic 1 | Sequence generators, convergence checkers, epsilon-delta validators |
| `differentiation.ts` | `src/components/viz/shared/differentiation.ts` | Track 2, Topic 5 | Numerical differentiation, finite differences, chain rule composition |
| `integration.ts` | `src/components/viz/shared/integration.ts` | Track 2, Topic 7 | Riemann sum computation, quadrature rules, error estimators |
| `multivariate.ts` | `src/components/viz/shared/multivariate.ts` | Track 3, Topic 9 | Gradient computation, Jacobian/Hessian assembly, contour generation |
| `series.ts` | `src/components/viz/shared/series.ts` | Track 5, Topic 17 | Partial sums, convergence tests, power series evaluation |
| `odes.ts` | `src/components/viz/shared/odes.ts` | Track 6, Topic 21 | ODE solvers (Euler, RK4), phase portrait generators, stability analysis |

Each module is created by the first topic that needs it, then **extended** (never replaced) by subsequent topics. This is the same pattern that worked for `categoryTheory.ts` and `informationTheory.ts` in formalml.com.

---

## 9. Lessons from formalml.com (preventive error log)

These are real discrepancies found during the implementation of formalml.com. Avoid repeating them.

| Category | What went wrong | Prevention rule |
|----------|----------------|-----------------|
| Stack versions | Brief said "Astro 5 · React 18" | Always check `package.json` — currently Astro 6 · React 19 |
| Prerequisite slug | Used display title as slug | Slug = MDX filename without `.mdx`. Check §5 table. |
| `notebookPath` | Omitted subdirectory | Always include full path: `notebooks/{folder}/{file}.ipynb` |
| Data exports | Eager module-level computation | Use lazy `getResults()` pattern — never `export const x = compute()` |
| Forward links | Linked to unwritten topics | Use plain text + "(coming soon)" for planned topics |
| Duplicate constants | Defined in both data module and component | Single source of truth — export from one location |
| Dead code | Computed but unused variables | TypeScript `noUnusedLocals` will catch this |
| Disabled UI | Showed buttons for unimplemented features | Don't spec UI for features that aren't ready |

### formalCalculus-specific risks

| Risk | Prevention |
|------|------------|
| Circular dependency with formalml.com | formalCalculus never imports from or requires formalml.com. Forward refs are informational links only. |
| Difficulty miscalibration | formalCalculus "foundational" ≠ formalml.com "foundational." Our readers may be building calculus rigor for the first time. Calibrate down. |
| Overly terse proofs | Calculus proofs (especially epsilon-delta) need *more* detail than formalml.com proofs, not less. Every quantifier, every inequality, every step. |
| Missing ML motivation | Every topic must include explicit ML connections. This is not a generic calculus textbook. |

---

## 10. Brief Template Skeleton

When composing a new handoff brief, use this structure:

```markdown
# Claude Code Handoff Brief: {Topic Title}

**Project:** formalCalculus — formalcalculus.com
**Repo:** github.com/jonx0037/formalCalculus
**Stack:** Astro 6 · React 19 · MDX · Tailwind CSS 4 · D3.js 7 · KaTeX · Vercel
**Package Manager:** pnpm
**Status:** Ready for implementation
**Reference Notebook:** `notebooks/{folder}/{file}.ipynb`
**Reference Doc:** `docs/plans/formalcalculus-handoff-reference.md`

---

## 1. Objective
- Which track, position in DAG, prerequisites, and difficulty level?
- What the topic covers (3-5 bullet points).
- Key ML connections and formalml.com forward links.

## 2. MDX File
- Location: `src/content/topics/{slug}.mdx`
- Complete frontmatter (copy from §2 of the reference doc and fill in).
- Use correct slugs from the planned topics table.

## 3. Content Outline
- Section-by-section outline with section titles.
- Which sections get TheoremBlocks (with type, number, title).
- Which sections get interactive visualizations (with component names).
- Which sections get static images from the notebook.
- "Connections to ML" section outline.

## 4. Visualizations
- For each viz component:
  - Component name and filename.
  - What it visualizes (1-2 sentences).
  - User interactions (sliders, dropdowns, click/drag targets).
  - Data source (inline generation vs. data module).
  - Panel layout (single panel, side-by-side, three-panel).
  - Reference the calculus-specific viz pattern from §4 if applicable.

## 5. Data Modules
- For each data module:
  - Filename and location.
  - Exported interfaces.
  - Exported functions/constants.
  - Whether computation should be lazy or eager.

## 6. Shared Utility Module Updates
- Which shared module to create or extend (see §8).
- New interfaces and functions to add.
- Backward compatibility notes.

## 7. Curriculum Graph Updates
- Node to add (with exact slug, label, domain, status, url).
- Edges to add (with exact source → target).
- Changes to `curriculum.ts` planned arrays.

## 8. Cross-References
- Which existing topics should link TO this topic (update their MDX).
- Which existing topics this topic links FROM.
- Any forward references to planned topics (mark as plain text).
- formalml.com forward links (informational only).

## 9. Images
- List of images from the notebook to copy to `public/images/topics/{slug}/`.
- Filenames and what each depicts.

## 10. Testing Checklist
- Build succeeds: `pnpm build`
- Page renders at the correct route
- All TheoremBlocks render LaTeX correctly
- All viz components load on scroll (client:visible)
- All interactive controls function
- All cross-references resolve (no 404s)
- Responsive layout on mobile
- Pagefind indexes the new topic
```

---

## 11. Shared Infrastructure API Reference

### `useD3<T>(renderFn, deps)` — `src/components/viz/shared/useD3.ts`

Returns a `ref` to attach to an SVG element. Calls `renderFn(d3Selection)` whenever `deps` change.

### `useResizeObserver<T>()` — `src/components/viz/shared/useResizeObserver.ts`

Returns `{ ref, width, height }`. Attach `ref` to a container `<div>` to get its pixel dimensions.

### Color scales — `src/components/viz/shared/colorScales.ts`

Color scales will be defined during codebase scaffolding. For calculus content, expect:
- `functionColors`: Primary function line, secondary function line, tangent/secant line colors
- `regionColors`: Fill colors for integration regions, epsilon bands, delta bands
- `domainColorScale`: Ordinal scale mapping domain strings → distinct track colors

### Shared types — `src/components/viz/shared/types.ts`

```typescript
// Core geometric types
interface Point2D { x: number; y: number; }
interface Interval { a: number; b: number; }
interface Rectangle { x: number; y: number; width: number; height: number; }

// Calculus-specific types
interface Partition { points: number[]; n: number; }
interface RiemannSum { partition: Partition; rule: 'left' | 'right' | 'midpoint' | 'trapezoidal' | 'simpson'; value: number; }
interface TaylorApproximation { center: number; degree: number; coefficients: number[]; }
interface EpsilonDelta { epsilon: number; delta: number; x0: number; L: number; }
interface VectorField2D { u: (x: number, y: number) => number; v: (x: number, y: number) => number; }
interface ODESolution { t: number[]; y: number[][]; method: string; }
```

---

## 12. Track Completion Status

| Track | Topics | Status |
|-------|--------|--------|
| Limits & Continuity | 4 | ⬜ Planned |
| Single-Variable Calculus | 4 | ⬜ Planned |
| Multivariable Differential | 4 | ⬜ Planned |
| Multivariable Integral | 4 | ⬜ Planned |
| Series & Approximation | 4 | ⬜ Planned |
| ODEs | 4 | ⬜ Planned |
| Measure & Integration | 4 | ⬜ Planned |
| Functional Analysis | 4 | ⬜ Planned |
| **Total** | **32** | **0 published, 32 planned** |

Recommended build order by track: Limits & Continuity → Single-Variable → Multivariable Differential → Series & Approximation → Multivariable Integral → ODEs → Measure & Integration → Functional Analysis

Within each track, topics should be built in the order listed (they form a prerequisite chain).

---

## 13. Editorial Voice (summary for Claude Chat)

These rules come from `CLAUDE.md` and should be reflected in the brief's content outline:

- **Geometric-first:** Visuals and concrete examples before algebraic machinery. Calculus is inherently visual — exploit this.
- **Foundational = careful scaffolding.** Epsilon-delta definitions need extra care. Build intuition, then formalize.
- **Intermediate = algebra after geometry.** Algebraic derivations follow geometric intuition.
- **Proofs:** Fully expanded with every epsilon-delta step and inequality chain. Never "it can be shown."
- **Notation:** Introduced explicitly on first use, with plain-English gloss.
- **Tone:** Informed peer at a whiteboard. Contractions OK, hand-waving not OK.
- **Pronouns:** Mathematical "we" by default. "You" only for direct reader instructions.
- **Forbidden phrases:** "simply," "obviously," "it's easy to see," "trivially."
- **ML motivation:** Every topic includes a "Connections to ML" section explaining where this calculus appears in machine learning. Not an afterthought — woven into the exposition.

---

*Reference version: v1 | Created: 2026-03-29 | Author: Jonathan Rocha*
*Sister project reference: formalml.com handoff reference (35 topics, 8 tracks, all published)*
