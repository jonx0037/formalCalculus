# CLAUDE.md — formalCalculus

## Project Overview

formalCalculus is a static site of long-form calculus and analysis explainers for ML practitioners, grad students, and researchers. It fills the gap between standard calculus courses and the mathematical foundations assumed by both [formalStatistics](https://formalstatistics.com) (rigorous probability, inference, Bayesian methods) and [formalML](https://formalml.com) (the math of machine learning) — providing the rigorous calculus and analysis machinery they both rely on. Every topic gets three pillars: rigorous math, interactive visualization, and working code.

Live site: https://formalcalculus.com
Sister sites: https://formalstatistics.com · https://formalml.com

## Tech Stack

- **Framework:** Astro 6 (static site generation)
- **UI:** React 19 (interactive components only — Astro handles static markup)
- **Content:** MDX with remark-math + rehype-katex for LaTeX rendering
- **Styling:** Tailwind CSS 4
- **Visualizations:** D3.js 7 (via React components in `src/components/viz/`)
- **Search:** Pagefind (runs post-build)
- **Package manager:** pnpm (not npm — no package-lock.json)
- **Deploy:** Vercel

## Commands

```bash
pnpm dev        # Dev server at localhost:4321
pnpm build      # Production build (runs pagefind post-build)
pnpm preview    # Preview production build
```

## Project Structure

```
src/
├── pages/              # Astro routes (topics use [...slug].astro)
├── content/topics/     # MDX topic files (the content)
├── components/
│   ├── ui/             # Astro structural components (Nav, TopicCard, TheoremBlock, etc.)
│   └── viz/            # React + D3 interactive visualizations
│       └── shared/     # Shared hooks, types, color scales, utility modules
├── data/               # Curriculum graph, sample datasets
├── layouts/            # Page layout templates
├── lib/                # Utility modules
└── styles/             # Global CSS, design tokens

docs/plans/             # Planning & handoff documents
notebooks/              # Research notebooks (Jupyter, not tracked in git)
public/images/          # Static images organized by topic
```

## Content Conventions

### Mathematical exposition style

- **Geometric-first:** Introduce concepts visually and concretely before algebraic machinery. Calculus is inherently geometric — exploit this relentlessly.
- **Foundational topics:** Zero epsilon-delta formalism on first pass — stop at geometric intuition, then build rigor in dedicated sections.
- **Intermediate topics:** Formalism after geometric intuition is established.
- **Proofs:** Expand fully with every epsilon-delta step and inequality chain — never "it can be shown." Calculus proofs are where students learn mathematical reasoning; cutting corners here is unacceptable.
- **Examples:** Concrete, motivating examples before every definition. Use ML-relevant examples wherever possible (loss function continuity, gradient computation, density integration, convergence of training).
- **Bridge forward:** Every topic should include a "Connections to ML" section or callout boxes that explain exactly where this calculus appears in machine learning, with explicit links to formalml.com topics where applicable.

### Difficulty calibration

Unlike formalml.com, formalCalculus serves readers who may be *building* their mathematical maturity, not just applying it. Calibrate accordingly:

- **Foundational:** Assumes only high-school algebra and basic function concepts. Builds intuition through visualization first, then introduces formalism. This is where epsilon-delta definitions live — they are foundational to calculus, but they need careful scaffolding.
- **Intermediate:** Assumes comfort with limits, derivatives, and integrals from earlier topics. Introduces multi-variable concepts, series theory, and basic ODEs.
- **Advanced:** Assumes the full single- and multi-variable calculus toolkit. Covers measure theory, functional analysis essentials, and calculus of variations — the direct on-ramps to formalml.com topics.

### MDX topic file structure

Each topic in `src/content/topics/` is an MDX file with YAML frontmatter defining:
- title, description, domain, difficulty, prerequisites, references
- Interactive viz components are imported and embedded inline

### Visualization components

- All viz components live in `src/components/viz/`
- Use D3.js via the `useD3` hook in `viz/shared/useD3.ts`
- Use `useResizeObserver` for responsive sizing
- Shared color scales in `viz/shared/colorScales.ts`
- Shared types in `viz/shared/types.ts`
- Shared calculus utilities in track-specific modules (e.g., `viz/shared/limits.ts`, `viz/shared/integration.ts`)
- Use `.style()` for CSS custom properties in D3 SVG elements (not `.attr("style", ...)`)

### Calculus-specific visualization conventions

Calculus visualizations have unique requirements that geometry and algebra visualizations do not:

- **Epsilon-delta visualizers:** Must support dragging epsilon to see delta respond (and vice versa). Use horizontal/vertical bands with adjustable width, not just static diagrams.
- **Limit visualizations:** Show sequences converging with animated point trails. Support "zoom in" to demonstrate arbitrarily close behavior.
- **Derivative visualizations:** Secant lines animating to tangent lines. Slope fields for ODEs. Gradient vectors overlaid on contour plots.
- **Integration visualizations:** Riemann sums with adjustable partition count (slider from n=2 to n=200+). Left, right, midpoint, and trapezoidal rules are toggleable. Show convergence to the exact integral numerically.
- **Series visualizations:** Partial sum animations. Radius of convergence circles in the complex plane. Term-by-term Fourier reconstruction.
- **Vector field visualizations:** Flow lines, divergence/curl heatmaps, line integral path animation.

### Curriculum graph

- Topic metadata and prerequisite DAG defined in `src/data/curriculum-graph.json`
- Track definitions in `src/data/curriculum.ts`
- When adding a new topic, update both files and add cross-links in related topics

### Relationship to formalStatistics and formalML

formalCalculus is the prequel to **both** formalStatistics and formalML. The relationship is:

- formalCalculus topics can reference formalstatistics.com and formalml.com topics as "where this leads" — external links with visual indicators (→ formalStats badge in amber, → formalML badge in blue).
- formalCalculus never assumes knowledge from either downstream site (no circular dependencies).
- formalstatistics.com and formalml.com may eventually add "prerequisite refresher" links back to formalcalculus.com, but those updates live in their respective repos.
- The three sites share a tech stack and editorial voice but are independent codebases and deployments.

Cross-site linking convention (frontmatter):
- `formalstatisticsConnections` for forward-links to formalstatistics.com (rendered as amber cards in the auto-section, and `<a class="formalstatistics-badge">` in inline prose).
- `formalmlConnections` for forward-links to formalml.com (rendered as blue cards, `<a class="formalml-badge">`).
- Both arrays mirror the same schema: `{ topic, title?, site: 'formalstatistics' | 'formalml', relationship }`.
- In-prose convention: a `## Connections to Statistics` section immediately before the existing `## Connections to ML` section, when there are stats forward-links worth narrating. Skip when the array is empty.

## Code Style

- TypeScript throughout (Astro + React)
- Functional React components with hooks
- No class components
- Prefer named exports
- D3 selections scoped to component refs — no global DOM manipulation

## Do NOT

- Use npm or generate package-lock.json
- Commit .vscode/, .DS_Store, or firebase-debug.log
- Create draft files outside src/content/topics/ — drafts live as unpublished MDX
- Skip geometric intuition before formalism
- Write one-line proof sketches — expand or omit
- Assume the reader already knows calculus — that's what this site teaches
- Link to formalml.com topics as prerequisites — only as forward references

## Editorial Voice

- **Tone:** Informed peer, not lecturer. Think "a sharp colleague explaining something at a whiteboard" — conversational enough to use contractions and the occasional aside, but precise enough that no claim is hand-wavy. The prose should read well *as prose*, not just as a vehicle for equations.
- **Pronouns:** Default to "we" as the collaborative mathematical "we" (we define, we observe, we can now see that…). Use "you" sparingly and only for direct reader instructions — "you can verify this by…" or "try dragging the slider to see…". Avoid passive voice for derivations; if someone is doing the math, say who.
- **Assumed reader knowledge:** The reader has seen calculus before — perhaps in an undergraduate course — but doesn't yet have the rigorous foundations. They know what a derivative is informally, but may not have worked through an epsilon-delta proof. They can compute integrals but may not know why the Fundamental Theorem works. They've seen gradients but may not understand the Jacobian as a linear map. Meet them where they are and build from there.
- **Jargon and notation:** Introduce notation explicitly on first use in every topic — even standard stuff like $\lim_{n \to \infty}$ or $\frac{d}{dx}$. Never let a symbol appear without a plain-English gloss nearby. Jargon is fine once defined, but prefer the concrete name over the abstract one when both exist.
- **Attitude toward the reader:** Respect without flattery. Don't say "simply," "obviously," or "it's easy to see." If something is genuinely straightforward, the exposition will make that self-evident. If something is hard, say so — "this step is where the real work happens" is more useful than pretending it's trivial.
- **ML motivation:** Every topic should make clear *why* an ML practitioner needs this. Not as an afterthought or appendix, but woven into the exposition. "This is why your gradient descent converges" is better than "this theorem has applications in optimization."
