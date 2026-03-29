# Claude Code Handoff Brief: Sequences, Limits & Convergence

**Project:** formalCalculus — [formalcalculus.com](https://www.formalcalculus.com)  
**Repo:** `github.com/jonx0037/formalCalculus`  
**Stack:** Astro 6 · React 19 · MDX · Tailwind CSS 4 · D3.js 7 · KaTeX · Vercel  
**Package Manager:** pnpm  
**Status:** Ready for implementation  
**Reference Notebook:** `notebooks/sequences-limits/01_sequences_limits.ipynb`  
**Reference Doc:** `docs/plans/formalcalculus-handoff-reference.md`

---

## 1. Objective

Add a new topic page **"Sequences, Limits & Convergence"** as the **first topic in the Limits & Continuity track** on formalcalculus.com.

1. This is **topic 1 of 32** — the inaugural topic of the entire formalCalculus curriculum. It is the **first topic ever implemented** on this codebase. The scaffold (Astro config, layouts, components, curriculum data, shared hooks/types) is in place but no content has been published yet. This brief covers both the topic content and any first-topic verification steps.
2. **No prerequisites.** This is a foundational-level entry point. It assumes high-school algebra and basic function concepts.
3. **Downstream within formalCalculus:** `epsilon-delta` (direct), `riemann-integral` (direct), `series-convergence` (direct). These three topics depend on the sequence and limit machinery introduced here.
4. **Forward links to formalml.com:**
   - `gradient-descent` — GD as a convergent sequence, convergence rates
   - `pac-learning` — Empirical risk convergence, uniform convergence of empirical processes
   - `random-walks` — MCMC mixing as sequence convergence
   - `concentration-inequalities` — Convergence rate bounds
   - `measure-theoretic-probability` — Modes of convergence (a.s., in probability, in distribution)
5. This topic **creates** the shared utility module `limits.ts` at `src/components/viz/shared/limits.ts`. This module will be extended by Topics 2–4 in the Limits & Continuity track.

**Content scope:**

- Sequences in $\mathbb{R}$: definition as functions $a: \mathbb{N} \to \mathbb{R}$, notation, boundedness, monotonicity
- The $\varepsilon$-$N$ definition of convergence — the foundational formal definition
- Convergence theorems: Monotone Convergence Theorem, Squeeze Theorem, Algebra of Limits
- Subsequences and the Bolzano-Weierstrass Theorem
- Cauchy sequences and the completeness of $\mathbb{R}$
- Rates of convergence: sublinear, linear, superlinear, quadratic — with ML algorithm examples
- ML connections: gradient descent as a convergent sequence, Robbins-Monro conditions for SGD, MCMC mixing, empirical risk convergence

---

## 2. MDX File

### Location

```
src/content/topics/sequences-limits.mdx
```

The entry `id` will be `sequences-limits`. The dynamic route resolves to `/topics/sequences-limits`.

### Frontmatter

```yaml
---
title: "Sequences, Limits & Convergence"
subtitle: "The rigorous foundation of calculus — making 'arbitrarily close' precise with the ε-N definition, and the convergence theorems that guarantee your algorithms actually converge"
status: "published"
difficulty: "foundational"
prerequisites: []
tags:
  - "calculus"
  - "sequences"
  - "limits"
  - "convergence"
  - "epsilon-n"
  - "bolzano-weierstrass"
  - "cauchy-sequences"
  - "completeness"
domain: "limits-continuity"
videoId: null
notebookPath: "notebooks/sequences-limits/01_sequences_limits.ipynb"
githubUrl: "https://github.com/jonx0037/formalCalculus/blob/main/src/content/topics/sequences-limits.mdx"
datePublished: 2026-03-29
estimatedReadTime: 40
abstract: "A sequence in ℝ is a function a: ℕ → ℝ. We say (aₙ) converges to L if for every ε > 0, there exists N ∈ ℕ such that n ≥ N implies |aₙ - L| < ε. This definition — the ε-N definition — is where calculus becomes rigorous. The Monotone Convergence Theorem guarantees that every bounded monotone sequence converges, the Squeeze Theorem lets us establish limits by trapping a sequence between two convergent bounds, and the Algebra of Limits lets us decompose complex limits into simpler pieces. The Bolzano-Weierstrass Theorem — every bounded sequence has a convergent subsequence — is the compactness result that underpins the existence of minimizers in optimization. Cauchy sequences provide a criterion for convergence that does not require knowing the limit in advance, and the completeness of ℝ (every Cauchy sequence converges) is the structural property that makes calculus work. For machine learning, gradient descent θₜ₊₁ = θₜ - η∇f(θₜ) defines a sequence whose convergence is the entire point; the rate of convergence — sublinear O(1/n) for SGD, linear O(rⁿ) for GD on strongly convex functions, quadratic for Newton's method — determines practical algorithm selection. The Robbins-Monro conditions on learning rate schedules (Σηₜ = ∞, Σηₜ² < ∞) are statements about series convergence that we formalize here."
formalmlConnections:
  - topic: "gradient-descent"
    site: "formalml"
    relationship: "Gradient descent defines a sequence θₜ in ℝᵈ whose convergence analysis — rates, conditions, step-size requirements — rests directly on the sequence convergence theory developed here."
  - topic: "pac-learning"
    site: "formalml"
    relationship: "The convergence of empirical risk R̂ₙ(h) → R(h) as n → ∞ is a sequence convergence result. Uniform convergence of empirical processes (Glivenko-Cantelli) extends this to function classes."
  - topic: "random-walks"
    site: "formalml"
    relationship: "MCMC sampling produces a sequence of states whose convergence to the target distribution is characterized by mixing time — how many steps until the sequence is 'close enough.'"
  - topic: "concentration-inequalities"
    site: "formalml"
    relationship: "Concentration inequalities quantify convergence rates for sequences of random variables — how fast empirical averages converge to expectations."
  - topic: "measure-theoretic-probability"
    site: "formalml"
    relationship: "Modes of convergence in probability (a.s., in probability, in distribution, in Lᵖ) generalize the sequence convergence concepts introduced here to random variable sequences."
connections: []
references:
  - type: "book"
    title: "Understanding Analysis"
    authors: "Abbott"
    year: 2015
    note: "Chapters 2–3 develop sequences and limits with exceptional clarity — the gold standard for rigorous-but-accessible real analysis"
  - type: "book"
    title: "Principles of Mathematical Analysis"
    authors: "Rudin"
    year: 1976
    note: "Chapter 3 on numerical sequences and series — the definitive reference for the completeness-centric approach"
  - type: "book"
    title: "Analysis I"
    authors: "Tao"
    year: 2016
    note: "Chapters 5–6 construct ℝ via Cauchy sequences and develop limits from first principles — ideal for readers who want to see the foundations built from scratch"
  - type: "book"
    title: "Convex Optimization"
    authors: "Boyd & Vandenberghe"
    year: 2004
    note: "Sections 9.2–9.3 on gradient descent convergence rates — direct application of sequence convergence theory"
  - type: "paper"
    title: "A Stochastic Approximation Method"
    authors: "Robbins & Monro"
    year: 1951
    url: "https://doi.org/10.1214/aoms/1177729586"
    note: "The original Robbins-Monro conditions for SGD convergence — the learning rate schedule conditions are series convergence statements"
---
```

---

## 3. Content Outline

### Section 1: Overview & Motivation

**Opening example:** Display a training loss curve from gradient descent — the reader has seen this a thousand times. Ask: "When we say the loss 'converges,' what exactly do we mean? How close is 'close enough'? And how do we know it won't start going back up?" The rest of the topic answers these questions rigorously.

No TheoremBlocks. No viz. 2–3 paragraphs setting up the "why."

### Section 2: Sequences in ℝ

- **TheoremBlock:** Definition 1 (Sequence) — A sequence in $\mathbb{R}$ is a function $a: \mathbb{N} \to \mathbb{R}$.
- **TheoremBlock:** Definition 2 (Bounded Sequence) — A sequence $(a_n)$ is bounded if there exists $M > 0$ such that $|a_n| \leq M$ for all $n$.
- **TheoremBlock:** Definition 3 (Monotone Sequence) — A sequence $(a_n)$ is increasing if $a_n \leq a_{n+1}$ for all $n$; decreasing if $a_n \geq a_{n+1}$.

Gallery of concrete examples: $1/n$, $(1 + 1/n)^n$, $r^n$, $(-1)^n/n$ — each annotated with its ML context (learning rates, Euler's constant in softmax, discount factors, oscillating SGD).

- **Viz component:** `SequenceGalleryExplorer` — interactive version of the static notebook figure.

### Section 3: The ε-N Definition of Convergence

This is the heart of the topic. Build it carefully:

1. Informal intuition: "the terms get arbitrarily close to $L$."
2. Make it precise: "for every $\varepsilon > 0$..." — introduce the quantifier structure.
3. Full formal definition.
4. Worked example: prove $\lim 1/n = 0$ from the definition, expanding every step.
5. Worked non-example: show that $(-1)^n$ does not converge.

- **TheoremBlock:** Definition 4 (Convergence of a Sequence) — $(a_n)$ converges to $L \in \mathbb{R}$ if $\forall \varepsilon > 0,\ \exists N \in \mathbb{N}:\ n \geq N \Rightarrow |a_n - L| < \varepsilon$.
- **TheoremBlock:** Example 1 — Proof that $\lim_{n \to \infty} 1/n = 0$.
- **TheoremBlock:** Proposition 1 (Uniqueness of Limits) — If $(a_n)$ converges, the limit is unique.
- **TheoremBlock:** Proof — Expand fully with triangle inequality.
- **TheoremBlock:** Proposition 2 (Convergent ⇒ Bounded) — Every convergent sequence is bounded.
- **TheoremBlock:** Proof

- **Viz component:** `EpsilonNExplorer` — the flagship interactive visualization. User drags $\varepsilon$ slider, component computes and highlights $N$, shows which terms are inside the $\varepsilon$-band. Supports multiple sequence presets.

### Section 4: Convergence Theorems

Three key theorems, each with full proof:

- **TheoremBlock:** Theorem 1 (Monotone Convergence Theorem) — Every bounded monotone sequence converges.
- **TheoremBlock:** Proof — Use completeness of $\mathbb{R}$ (least upper bound property). Full expansion.
- **TheoremBlock:** Theorem 2 (Squeeze Theorem) — If $a_n \leq b_n \leq c_n$ and $\lim a_n = \lim c_n = L$, then $\lim b_n = L$.
- **TheoremBlock:** Proof — Direct from the $\varepsilon$-$N$ definition.
- **TheoremBlock:** Theorem 3 (Algebra of Limits) — Limits respect addition, multiplication, and division (with $B \neq 0$).
- **TheoremBlock:** Proof — Prove the product rule (the hardest case). Use the bound on convergent sequences.
- **TheoremBlock:** Remark 1 — These theorems are exactly the tools that gradient descent convergence proofs use: Monotone Convergence for descent arguments, Squeeze for rate bounds.

- **Viz component:** `ConvergenceTheoremsExplorer` — three-panel visualization with interactive demonstrations of each theorem. Squeeze panel lets user adjust the bounding sequences.

### Section 5: Subsequences & Bolzano-Weierstrass

- **TheoremBlock:** Definition 5 (Subsequence) — $(a_{n_k})$ where $n_1 < n_2 < n_3 < \cdots$.
- **TheoremBlock:** Proposition 3 — If $(a_n) \to L$, then every subsequence $(a_{n_k}) \to L$.
- **TheoremBlock:** Proof
- **TheoremBlock:** Theorem 4 (Bolzano-Weierstrass) — Every bounded sequence in $\mathbb{R}$ has a convergent subsequence.
- **TheoremBlock:** Proof — Bisection argument, fully expanded. This is where the completeness of $\mathbb{R}$ is essential.
- **TheoremBlock:** Remark 2 — Bolzano-Weierstrass is the one-dimensional version of the compactness argument that guarantees the existence of minimizers on compact sets. In optimization, if the loss function is continuous and the parameter space is compact, a minimizer exists.

Static image: `bolzano-weierstrass.png` from notebook.

### Section 6: Cauchy Sequences & Completeness

- **TheoremBlock:** Definition 6 (Cauchy Sequence) — $(a_n)$ is Cauchy if $\forall \varepsilon > 0,\ \exists N:\ m, n \geq N \Rightarrow |a_m - a_n| < \varepsilon$.
- **TheoremBlock:** Proposition 4 — Every convergent sequence is Cauchy.
- **TheoremBlock:** Proof
- **TheoremBlock:** Theorem 5 (Completeness of ℝ) — Every Cauchy sequence in $\mathbb{R}$ converges.
- **TheoremBlock:** Proof — Use Bolzano-Weierstrass to extract a convergent subsequence, then show the full sequence converges to the same limit.
- **TheoremBlock:** Remark 3 — The Cauchy criterion is powerful because it lets us prove convergence without knowing the limit. This is exactly how many convergence proofs in ML work: we show that iterates $\theta_t$ satisfy $\|\theta_{t+1} - \theta_t\| \to 0$ rather than identifying the limit explicitly.

- **Viz component:** `CauchyExplorer` — shows pairwise distances $|a_m - a_n|$ shrinking for Cauchy sequences and not shrinking for non-Cauchy (harmonic series). Toggleable sequence presets.

### Section 7: Rates of Convergence

This section bridges pure analysis and algorithm efficiency:

- **TheoremBlock:** Definition 7 (Rates of Convergence) — Sublinear $O(1/n^p)$, linear $|a_{n+1} - L| \leq r|a_n - L|$, superlinear, quadratic $|a_{n+1} - L| \leq C|a_n - L|^2$.
- **TheoremBlock:** Example 2 — SGD on convex functions: $O(1/\sqrt{n})$ sublinear rate.
- **TheoremBlock:** Example 3 — GD on strongly convex functions: linear rate with $r = (L - \mu)/(L + \mu)$.
- **TheoremBlock:** Example 4 — Newton's method near a root: quadratic rate.

Static image: `convergence-rates.png` from notebook (log-scale comparison).

### Section 8: Connections to ML

Explicit ML connections with formalml.com forward links. This is the mandatory "why you need this" section.

Four subsections:

1. **Gradient descent as a convergent sequence** — $\theta_{t+1} = \theta_t - \eta \nabla f(\theta_t)$ with interactive demo.
2. **Learning rate schedules & Robbins-Monro** — $\sum \eta_t = \infty$ and $\sum \eta_t^2 < \infty$ as series conditions.
3. **MCMC mixing** — Markov chain states converging to the target distribution. Forward link to `random-walks`.
4. **Empirical risk convergence** — $\hat{R}_n(h) \to R(h)$ by the law of large numbers. Forward link to `pac-learning`.

- **Viz component:** `GradientDescentSequenceExplorer` — interactive version of the notebook figure. User adjusts learning rate $\eta$, watches the GD sequence converge/diverge on $f(x) = x^2$.

Static images: `gd-as-sequence.png`, `robbins-monro-schedules.png` from notebook.

### Section 9: Computational Notes

Python code for sequence generation, numerical convergence testing, and rate estimation. Short — 3–4 code blocks showing:

- Generating sequences with NumPy
- Testing the Cauchy criterion numerically
- Estimating convergence rate from iterates
- Using SciPy's `optimize.minimize` and extracting the iteration sequence

### Section 10: Connections & Further Reading

Cross-reference table (within formalCalculus only — no topics exist yet, so use plain text + "(coming soon)" for all downstream topics):

- **Epsilon-Delta & Continuity** *(coming soon)* — extends the ε-N framework to function limits and continuity.
- **The Riemann Integral & FTC** *(coming soon)* — uses limits of Riemann sums (sequences!).
- **Series Convergence & Tests** *(coming soon)* — partial sums of series are sequences.
- **Completeness & Compactness** *(coming soon)* — the Bolzano-Weierstrass theorem generalized to higher dimensions.

References section listing the books/papers from the front matter.

---

## 4. Visualizations

### 4.1 `SequenceGalleryExplorer.tsx`

- **File:** `src/components/viz/SequenceGalleryExplorer.tsx`
- **What it visualizes:** Four preset sequences ($1/n$, $(1+1/n)^n$, $0.9^n$, $(-1)^n/n$) plotted as scatter plots with limit lines and ML context annotations.
- **User interactions:** Dropdown to select sequence preset. Slider for maximum $n$ displayed (range: 10–200). Hover on a point to see the exact $(n, a_n)$ value.
- **Data source:** Inline computation — sequences are simple enough to generate in the component.
- **Layout:** Single panel, responsive width. Sequence selector dropdown above the plot.
- **Hydration:** `client:visible`

### 4.2 `EpsilonNExplorer.tsx`

- **File:** `src/components/viz/EpsilonNExplorer.tsx`
- **What it visualizes:** The ε-N definition of convergence. The main plot shows the sequence with a horizontal ε-band around $L$ and a vertical marker at $N$. Terms inside the band are green; terms outside are amber.
- **User interactions:**
  - Draggable $\varepsilon$ slider (range: 0.01 to 1.0, logarithmic scale). As $\varepsilon$ shrinks, $N$ increases and is recomputed.
  - Dropdown for sequence preset (same four as `SequenceGalleryExplorer`, plus $n^2/(n^2+1) \to 1$).
  - "Zoom to neighborhood" button that magnifies the region around $L$ to show convergence behavior at small $\varepsilon$.
- **Data source:** Inline computation. The function `computeN(sequence, epsilon, limit)` finds the smallest $N$ such that all terms past $N$ are within $\varepsilon$ of $L$.
- **Layout:** Single panel with controls above. The $\varepsilon$ slider is the primary interaction.
- **Hydration:** `client:visible`
- **This is the flagship visualization.** It should be polished, smooth, and immediately intuitive. The reader should be able to "feel" the ε-N definition by dragging the slider.

### 4.3 `ConvergenceTheoremsExplorer.tsx`

- **File:** `src/components/viz/ConvergenceTheoremsExplorer.tsx`
- **What it visualizes:** Three panels (tabbed, not side-by-side, to use full width) demonstrating Monotone Convergence, Squeeze Theorem, and Algebra of Limits.
- **User interactions:**
  - Tab selector: "Monotone Convergence" | "Squeeze Theorem" | "Algebra of Limits"
  - Monotone tab: sequence preset selector, bound line drawn.
  - Squeeze tab: slider to adjust the "squeeze width" — upper and lower bounding sequences converge at adjustable rates, trapped sequence follows.
  - Algebra tab: two input sequences with limit display; shows sum, product, and quotient sequences with their limits.
- **Data source:** Inline computation for all three panels.
- **Layout:** Full-width single panel with tab switcher.
- **Hydration:** `client:visible`

### 4.4 `CauchyExplorer.tsx`

- **File:** `src/components/viz/CauchyExplorer.tsx`
- **What it visualizes:** Two-panel comparison — a Cauchy sequence (partial sums of $1/k^2$) vs. a non-Cauchy sequence (harmonic series partial sums $H_n$). Shows pairwise distance $|a_m - a_n|$ shrinking (or not).
- **User interactions:** Slider for $N$ threshold. Pairwise distance display shows $\max_{m,n \geq N} |a_m - a_n|$ decreasing with $N$ for the Cauchy sequence. Sequence preset dropdown.
- **Data source:** Inline computation.
- **Layout:** Side-by-side panels. Left: Cauchy. Right: non-Cauchy.
- **Hydration:** `client:visible`

### 4.5 `GradientDescentSequenceExplorer.tsx`

- **File:** `src/components/viz/GradientDescentSequenceExplorer.tsx`
- **What it visualizes:** Gradient descent on $f(x) = x^2$ as a convergent sequence. Shows the function curve with GD path overlaid (arrows from point to point).
- **User interactions:**
  - Slider for learning rate $\eta$ (range: 0.05 to 1.0). User sees convergent, slowly convergent, and divergent behavior as $\eta$ changes.
  - Slider for starting point $x_0$ (range: -4 to 4).
  - Numerical display of current iterate, step count, and $|x_t - 0|$.
  - "Play/Pause" button for animated stepping.
- **Data source:** Inline computation. GD update rule is trivial.
- **Layout:** Single panel with controls below.
- **Hydration:** `client:visible`

---

## 5. Data Modules

### 5.1 `sequences-limits-data.ts`

- **File:** `src/data/sequences-limits-data.ts`
- **Exported interfaces:**

```typescript
export interface SequencePreset {
  name: string;
  label: string;         // LaTeX-renderable label
  fn: (n: number) => number;
  limit: number;
  mlNote: string;        // Short ML context string
  convergenceRate: 'sublinear' | 'linear' | 'superlinear' | 'quadratic' | 'none';
}
```

- **Exported constants (lazy):**

```typescript
export function getSequencePresets(): SequencePreset[];
```

Returns the preset sequences used by `SequenceGalleryExplorer` and `EpsilonNExplorer`. Defined once, shared across components.

- **Computation:** Eager is fine here — the presets are lightweight constant data, not expensive computations.

---

## 6. Shared Utility Module: `limits.ts`

### Create `src/components/viz/shared/limits.ts`

This is the **first shared utility module** for formalCalculus. It will be extended by Topics 2–4 in the Limits & Continuity track.

**Exported interfaces:**

```typescript
export interface ConvergenceResult {
  converges: boolean;
  limit: number | null;
  N: number | null;         // for a given epsilon
  rate: 'sublinear' | 'linear' | 'superlinear' | 'quadratic' | 'unknown';
}

export interface CauchyCheck {
  isCauchy: boolean;
  maxGap: number;           // max |a_m - a_n| for m, n >= N
  N: number;
}
```

**Exported functions:**

```typescript
/**
 * Compute the smallest N such that |a_n - L| < epsilon for all n >= N.
 * Returns null if no such N is found within maxTerms.
 */
export function computeEpsilonN(
  sequence: (n: number) => number,
  limit: number,
  epsilon: number,
  maxTerms?: number,
): number | null;

/**
 * Check the Cauchy criterion: find max |a_m - a_n| for m, n >= N.
 */
export function checkCauchy(
  sequence: (n: number) => number,
  N: number,
  windowSize?: number,
): CauchyCheck;

/**
 * Estimate convergence rate from a sequence of errors |a_n - L|.
 */
export function estimateConvergenceRate(
  errors: number[],
): 'sublinear' | 'linear' | 'superlinear' | 'quadratic' | 'unknown';

/**
 * Generate the first n terms of a sequence.
 */
export function generateSequence(
  fn: (n: number) => number,
  start: number,
  count: number,
): { n: number; value: number }[];

/**
 * Seeded pseudo-random number generator (deterministic).
 * Uses a simple LCG. Never use Math.random() in viz components.
 */
export function seededRandom(seed: number): () => number;
```

**Important:** All functions should be pure and deterministic. No `Math.random()`. Use `seededRandom()` when randomness is needed.

---

## 7. Curriculum Graph Updates

### `src/data/curriculum-graph.json`

**Update node status** (node already exists in the graph):

```json
{ "id": "sequences-limits", "label": "Sequences, Limits & Convergence", "domain": "limits-continuity", "status": "published", "url": "/topics/sequences-limits" }
```

Change `"status": "planned"` → `"status": "published"`.

**No new edges needed.** All edges from/to `sequences-limits` are already defined in the scaffold:

- `sequences-limits` → `epsilon-delta`
- `sequences-limits` → `riemann-integral`
- `sequences-limits` → `series-convergence`

### `src/data/curriculum.ts`

Move `"Sequences, Limits & Convergence"` from the `planned` array to the `published` array in the `limits-continuity` track:

```typescript
{
  id: 'limits-continuity',
  // ...
  published: ['Sequences, Limits & Convergence'],
  planned: [
    'Epsilon-Delta & Continuity',
    'Completeness & Compactness',
    'Uniform Convergence',
  ],
}
```

---

## 8. Cross-References

### Topics this topic links FROM

None — no prerequisites, no existing topics to reference.

### Topics that should link TO this topic

None yet — no other topics exist. When `epsilon-delta` is implemented, it should reference this topic as a prerequisite.

### Forward references to planned formalCalculus topics (plain text + "(coming soon)")

- **Epsilon-Delta & Continuity** *(coming soon)* extends the $\varepsilon$-$N$ framework to function limits.
- **The Riemann Integral & FTC** *(coming soon)* defines the integral as a limit of Riemann sums — a sequence.
- **Series Convergence & Tests** *(coming soon)* treats partial sums as sequences.
- **Completeness & Compactness** *(coming soon)* generalizes Bolzano-Weierstrass to $\mathbb{R}^n$.

### Forward references to formalml.com (informational links, not prerequisites)

Use the `formalml-badge` CSS class for these links:

```mdx
This is precisely the convergence analysis used in [Gradient Descent](https://formalml.com/topics/gradient-descent) <span class="formalml-badge">formalML</span>.
```

Specific forward links:

- `gradient-descent` — Section 8 (GD as convergent sequence, convergence rates)
- `pac-learning` — Section 8 (empirical risk convergence)
- `random-walks` — Section 8 (MCMC mixing)
- `concentration-inequalities` — Section 7 (convergence rate bounds)
- `measure-theoretic-probability` — Section 10 (modes of convergence)

---

## 9. Images

Copy the following notebook-generated figures to `public/images/topics/sequences-limits/`:

| Filename | Description |
|----------|-------------|
| `sequence-gallery.png` | Four-panel gallery of fundamental sequences with ML context annotations |
| `epsilon-n-definition.png` | Three-panel ε-N definition for three ε values (0.3, 0.1, 0.05) |
| `convergence-theorems.png` | Three-panel figure: Monotone Convergence, Squeeze, Algebra of Limits |
| `bolzano-weierstrass.png` | Two-panel: bounded oscillating sequence → extracted convergent subsequence |
| `cauchy-sequences.png` | Two-panel: Cauchy (Σ1/k²) vs. non-Cauchy (harmonic series) |
| `convergence-rates.png` | Log-scale comparison of sublinear, linear, superlinear, quadratic rates |
| `gd-as-sequence.png` | Three-panel GD on f(x)=x² with η = 0.3, 0.7, 0.95 |
| `robbins-monro-schedules.png` | Learning rate schedules with cumulative Ση² comparison |

All images referenced in MDX with:

```mdx
![Convergence rates comparison](/images/topics/sequences-limits/convergence-rates.png)
```

---

## 10. Testing Checklist

### First-topic verification (one-time)

- [ ] `pnpm install` completes without errors
- [ ] `pnpm dev` starts dev server at localhost:4321
- [ ] Homepage renders at `/`
- [ ] Curriculum page renders at `/paths`
- [ ] Topic card for Sequences, Limits & Convergence shows as "published" (not "coming soon")
- [ ] All other topic cards still show as "planned"
- [ ] Theme toggle (dark/light) works on all pages
- [ ] Nav links work (Curriculum, formalML →, GitHub)
- [ ] Footer links work

### Topic content

- [ ] Topic page renders at `/topics/sequences-limits`
- [ ] Title, subtitle, difficulty badge, reading time display correctly
- [ ] Abstract renders in the info box
- [ ] formalML forward links box renders with badges
- [ ] All TheoremBlocks render KaTeX correctly (11 total: 7 definitions/propositions/theorems, 2 examples, 2 remarks)
- [ ] All proofs display with ∎ tombstone
- [ ] Static images load from `public/images/topics/sequences-limits/`

### Viz components

- [ ] `SequenceGalleryExplorer` loads on scroll (`client:visible`)
- [ ] `SequenceGalleryExplorer` dropdown switches between presets
- [ ] `SequenceGalleryExplorer` $n$ slider adjusts displayed range
- [ ] `EpsilonNExplorer` ε slider is draggable and updates $N$ and band in real time
- [ ] `EpsilonNExplorer` sequence preset dropdown works
- [ ] `EpsilonNExplorer` zoom button magnifies neighborhood
- [ ] `ConvergenceTheoremsExplorer` all three tabs render and switch
- [ ] `ConvergenceTheoremsExplorer` Squeeze tab slider adjusts bounds
- [ ] `CauchyExplorer` side-by-side panels render
- [ ] `CauchyExplorer` $N$ slider shows pairwise gaps shrinking/not shrinking
- [ ] `GradientDescentSequenceExplorer` η slider shows convergent → divergent transition
- [ ] `GradientDescentSequenceExplorer` play/pause animation works

### Infrastructure

- [ ] `limits.ts` shared module exports compile with no TypeScript errors
- [ ] `sequences-limits-data.ts` data module compiles
- [ ] No forward references to planned topics as live links (all use plain text + "(coming soon)")
- [ ] All formalml.com links open in new tab with `target="_blank" rel="noopener"`
- [ ] Page is responsive (viz components stack vertically on mobile)
- [ ] "Foundational" difficulty badge is styled correctly (green)
- [ ] Pagefind indexes the new topic on rebuild
- [ ] Build succeeds with zero errors: `pnpm build`

---

## 11. Build Order

1. **Create `src/components/viz/shared/limits.ts`** — the shared utility module. Implement `computeEpsilonN`, `checkCauchy`, `estimateConvergenceRate`, `generateSequence`, `seededRandom`. Write console log tests to verify. This module is used by all viz components.
2. **Create `src/data/sequences-limits-data.ts`** — sequence presets. Verify exports compile.
3. **Create `sequences-limits.mdx`** with full frontmatter and all markdown/LaTeX content. Use `TheoremBlock` for all formal elements (7 definitions/propositions/theorems, 5 proofs, 4 examples, 2 remarks). No interactive components yet — just the prose and static images.
4. Copy notebook figures to `public/images/topics/sequences-limits/` and verify they load in the MDX.
5. **Build `EpsilonNExplorer.tsx`** — the flagship component. Start with the ε slider and N computation, then add sequence presets and zoom. This is the most important visualization on the page.
6. **Build `SequenceGalleryExplorer.tsx`** — simpler component. Dropdown + slider + scatter plot.
7. **Build `ConvergenceTheoremsExplorer.tsx`** — tabbed three-panel component.
8. **Build `CauchyExplorer.tsx`** — side-by-side comparison.
9. **Build `GradientDescentSequenceExplorer.tsx`** — η slider + animated GD path.
10. Embed all five components in the MDX at their appropriate section positions with `client:visible`.
11. **Update curriculum graph data** — change `sequences-limits` status from `"planned"` to `"published"` in `curriculum-graph.json`.
12. **Update `curriculum.ts`** — move `"Sequences, Limits & Convergence"` from `planned` to `published` in the `limits-continuity` track.
13. Run first-topic verification checklist (§10).
14. Run topic content and viz checklist (§10).
15. `pnpm build` — verify zero errors.
16. Commit and deploy.

---

## Appendix A: Key Differences from formalml.com Briefs

1. **First topic ever.** There are no existing topics to reference or cross-link. All internal cross-references are forward references marked "(coming soon)." The first topic verification checklist confirms that the entire scaffold works end-to-end.
2. **Foundational difficulty with careful scaffolding.** Unlike formalml.com foundational topics (which assumed linear algebra and multivariable calculus), this is truly foundational — the reader may be encountering $\varepsilon$-$N$ proofs for the first time. Every proof step must be fully expanded. The editorial voice should be patient and concrete without being condescending.
3. **Creates the first shared utility module.** `limits.ts` is the formalCalculus equivalent of what `informationTheory.ts` was for formalml.com — the first track-level shared module. It must be designed to be extended by Topics 2–4. Keep the interface clean and the functions pure.
4. **ML motivation is woven throughout, not just a capstone section.** Every definition and theorem includes a remark or callout connecting it to ML practice. The "Connections to ML" section (§8) is substantial—it's where the forward links on formalml.com live.
5. **Five viz components.** More than most formalml.com topics (which averaged 3–4). The `EpsilonNExplorer` is the flagship — it should be the most polished component on the site and immediately convey the ε-N definition through interaction.
6. **Cross-site forward links.** The `formalmlConnections` frontmatter field and `formalml-badge` CSS class are new to formalCalculus. These render as visual badges linking to formalml.com topics — not prerequisites, but "where this leads" pointers.

---

## Appendix B: Formal Element Inventory

| Type | # | Title |
|------|---|-------|
| Definition | 1 | Sequence |
| Definition | 2 | Bounded Sequence |
| Definition | 3 | Monotone Sequence |
| Definition | 4 | Convergence of a Sequence |
| Definition | 5 | Subsequence |
| Definition | 6 | Cauchy Sequence |
| Definition | 7 | Rates of Convergence |
| Proposition | 1 | Uniqueness of Limits |
| Proposition | 2 | Convergent ⇒ Bounded |
| Proposition | 3 | Subsequences of convergent sequences converge to the same limit |
| Proposition | 4 | Convergent ⇒ Cauchy |
| Theorem | 1 | Monotone Convergence Theorem |
| Theorem | 2 | Squeeze Theorem |
| Theorem | 3 | Algebra of Limits |
| Theorem | 4 | Bolzano-Weierstrass |
| Theorem | 5 | Completeness of ℝ |
| Example | 1 | Proof that lim 1/n = 0 |
| Example | 2 | SGD sublinear rate |
| Example | 3 | GD linear rate on strongly convex |
| Example | 4 | Newton's method quadratic rate |
| Remark | 1 | Convergence theorems in GD proofs |
| Remark | 2 | Bolzano-Weierstrass and existence of minimizers |
| Remark | 3 | Cauchy criterion without knowing the limit |
| Proof | — | 7 proofs total (Propositions 1–4, Theorems 1–2, Theorem 3 product rule) |

---

*Brief version: v1 | Created: 2026-03-29 | Author: Jonathan Rocha*  
*Reference notebook: `notebooks/sequences-limits/01_sequences_limits.ipynb`*  
*Reference doc: `docs/plans/formalcalculus-handoff-reference.md`*
