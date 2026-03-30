# Claude Code Handoff Brief: Epsilon-Delta & Continuity

**Project:** formalCalculus — [formalcalculus.com](https://www.formalcalculus.com)  
**Repo:** `github.com/jonx0037/formalCalculus`  
**Stack:** Astro 6 · React 19 · MDX · Tailwind CSS 4 · D3.js 7 · KaTeX · Vercel  
**Package Manager:** pnpm  
**Status:** Ready for implementation  
**Reference Notebook:** `notebooks/epsilon-delta/02_epsilon_delta.ipynb`  
**Reference Doc:** `docs/plans/formalcalculus-handoff-reference.md`

---

## 1. Objective

Add a new topic page **"Epsilon-Delta & Continuity"** as the **second topic in the Limits & Continuity track** on formalcalculus.com.

1. This is **topic 2 of 32** and the **second topic published** on formalcalculus.com. The scaffold, shared infrastructure, and Topic 1 (`sequences-limits`) are already deployed and live.
2. **Prerequisite:** `sequences-limits`. This topic extends the ε-N definition of sequence convergence to the ε-δ definition of function limits and then to continuity.
3. **Downstream within formalCalculus:**
   - `completeness-compactness` (direct) — compactness + continuity → EVT, uniform continuity on compact sets
   - `uniform-convergence` (direct) — uniform convergence preserves continuity
   - `derivative` (direct) — differentiability requires continuity
   - `riemann-integral` (indirect) — continuous functions are Riemann integrable
4. **Forward links to formalml.com:**
   - `convex-analysis` — Continuity of convex functions, semicontinuity, Lipschitz gradient condition
   - `gradient-descent` — Lipschitz gradient assumption in convergence rate proofs
   - `pac-learning` — Continuous hypothesis classes, uniform convergence of empirical processes
5. This topic **extends** the shared utility module `limits.ts` (created by Topic 1) with function-limit and continuity utilities.

**Content scope:**

- The ε-δ definition of function limits: $\lim_{x \to a} f(x) = L$
- One-sided limits and limits at infinity
- Limit laws (algebra of limits for functions) — proved from the ε-δ definition
- Continuity at a point (three-condition definition and ε-δ reformulation)
- Algebra of continuous functions (sums, products, compositions)
- Types of discontinuities: removable, jump, essential
- Sequential characterization of limits and continuity (connecting back to Topic 1)
- Intermediate Value Theorem (IVT) with proof and root-finding application
- Extreme Value Theorem (EVT) with proof sketch using Bolzano-Weierstrass
- Uniform continuity and Lipschitz continuity — the continuity hierarchy
- ML connections: activation function continuity, loss landscape smoothness, Lipschitz constraints in WGANs, IVT, and decision boundaries

---

## 2. MDX File

### Location

```
src/content/topics/epsilon-delta.mdx
```

The entry `id` will be `epsilon-delta`. The dynamic route resolves to `/topics/epsilon-delta`.

### Frontmatter

```yaml
---
title: "Epsilon-Delta & Continuity"
subtitle: "From sequence limits to function limits — the ε-δ definition, continuity, the Intermediate and Extreme Value Theorems, and the Lipschitz condition that controls gradient descent"
status: "published"
difficulty: "foundational"
prerequisites:
  - "sequences-limits"
tags:
  - "calculus"
  - "limits"
  - "continuity"
  - "epsilon-delta"
  - "intermediate-value-theorem"
  - "extreme-value-theorem"
  - "lipschitz"
  - "uniform-continuity"
domain: "limits-continuity"
videoId: null
notebookPath: "notebooks/epsilon-delta/02_epsilon_delta.ipynb"
githubUrl: "https://github.com/jonx0037/formalCalculus/blob/main/src/content/topics/epsilon-delta.mdx"
datePublished: 2026-03-29
estimatedReadTime: 45
abstract: "A function f has limit L at a if for every ε > 0, there exists δ > 0 such that 0 < |x - a| < δ implies |f(x) - L| < ε. This ε-δ definition extends the ε-N framework for sequences to arbitrary functions and serves as the foundation for all subsequent calculus. Continuity at a point means the limit equals the function value — equivalently, small perturbations in the input produce small perturbations in the output. The Intermediate Value Theorem guarantees that continuous functions on intervals cannot 'skip' values, which implies the existence of roots and decision boundaries. The Extreme Value Theorem guarantees that continuous functions on closed, bounded intervals attain their maximum and minimum — the theoretical foundation for the existence of optimal parameters in constrained optimization. Beyond pointwise continuity, Lipschitz continuity — |f(x) - f(y)| ≤ K|x - y| — quantifies how 'well-behaved' a function is. In machine learning, the Lipschitz constant of the loss gradient directly controls gradient descent convergence rates, spectral normalization enforces Lipschitz constraints on neural network layers for Wasserstein GANs, and the continuity properties of activation functions (ReLU is continuous but not differentiable; sigmoid is smooth with K = 1/4) determine whether gradient-based training is possible at all."
formalmlConnections:
  - topic: "convex-analysis"
    site: "formalml"
    relationship: "Convex functions on open sets are automatically continuous — a non-trivial theorem. Semicontinuity generalizes continuity for optimization, and the Lipschitz gradient condition (∇f is L-Lipschitz) is the key assumption in gradient descent convergence proofs."
  - topic: "gradient-descent"
    site: "formalml"
    relationship: "The convergence rate of gradient descent on smooth functions depends on the Lipschitz constant of the gradient: step size η must satisfy η < 2/L for L-smooth functions. The continuity of the loss landscape is the minimal requirement for gradient-based optimization."
  - topic: "pac-learning"
    site: "formalml"
    relationship: "Continuous hypothesis classes and the uniform convergence of empirical risk to true risk rely on continuity and compactness arguments developed here."
connections:
  - topic: "sequences-limits"
    relationship: "The ε-δ definition of function limits extends the ε-N definition of sequence convergence. The Bolzano-Weierstrass Theorem (from sequences-limits) is used in the proof of the Extreme Value Theorem, and the sequential characterization of continuity bridges both frameworks."
references:
  - type: "book"
    title: "Understanding Analysis"
    authors: "Abbott"
    year: 2015
    note: "Chapter 4 develops continuity with the ε-δ definition and proves IVT and EVT — the primary reference for our exposition"
  - type: "book"
    title: "Principles of Mathematical Analysis"
    authors: "Rudin"
    year: 1976
    note: "Chapter 4 on continuity — the definitive compact treatment of uniform continuity and compactness"
  - type: "book"
    title: "Analysis I"
    authors: "Tao"
    year: 2016
    note: "Chapter 9 on continuous functions and Chapter 13 on uniform continuity — first-principles construction with careful scaffolding"
  - type: "book"
    title: "Convex Optimization"
    authors: "Boyd & Vandenberghe"
    year: 2004
    note: "Section 2.2 on convex function continuity, Section 9.3 on Lipschitz gradient conditions for convergence"
  - type: "paper"
    title: "Wasserstein Generative Adversarial Networks"
    authors: "Arjovsky, Chintala & Bottou"
    year: 2017
    url: "https://proceedings.mlr.press/v70/arjovsky17a.html"
    note: "The 1-Lipschitz constraint on the WGAN critic is a direct application of Lipschitz continuity to generative modeling"
  - type: "paper"
    title: "Spectral Normalization for Generative Adversarial Networks"
    authors: "Miyato, Kataoka, Koyama & Yoshida"
    year: 2018
    url: "https://arxiv.org/abs/1802.05957"
    note: "Spectral normalization enforces the Lipschitz constraint by normalizing weight matrices by their spectral norm"
---
```

---

## 3. Content Outline

### Section 1: Overview & Motivation

**Opening example:** Show a loss function landscape. Ask: "When we change the parameters slightly, does the loss change by a small amount — or could it jump discontinuously? If we know a set of parameters gives positive loss, and another gives negative loss, must there be parameters that give exactly zero loss?" These are questions about continuity, and the ε-δ framework makes them precise.

Connect to Topic 1: "In [Sequences, Limits & Convergence](/topics/sequences-limits), we made 'arbitrarily close' precise for sequences with the ε-N definition. Now we extend this to functions."

No TheoremBlocks. No viz. 2–3 paragraphs setting up the "why."

### Section 2: The ε-δ Definition of a Function Limit

This is the core section — build it with the same patience as the ε-N section in Topic 1:

1. Informal intuition: "as x approaches a, f(x) approaches L."
2. First attempt at precision: "for x close to a, f(x) is close to L."
3. Full formal definition with quantifier structure.
4. Explain the role of "0 <" in |x - a| — we exclude x = a itself.
5. Geometric interpretation: the ε-δ "box" on the graph.
6. Worked example: prove $\lim_{x \to 1} (2x + 1) = 3$ from the definition.
7. Worked example: prove $\lim_{x \to 2} x^2 = 4$ from the definition (harder — requires bounding a factor).
8. Worked non-example: show $\lim_{x \to 0} \sin(1/x)$ does not exist.

- **TheoremBlock:** Definition 1 (Limit of a Function) — $\lim_{x \to a} f(x) = L$ if $\forall \varepsilon > 0,\ \exists \delta > 0:\ 0 < |x - a| < \delta \Rightarrow |f(x) - L| < \varepsilon$.
- **TheoremBlock:** Example 1 — Proof that $\lim_{x \to 1} (2x+1) = 3$.
- **TheoremBlock:** Example 2 — Proof that $\lim_{x \to 2} x^2 = 4$.
- **TheoremBlock:** Proposition 1 (Uniqueness of Limits) — If $\lim_{x \to a} f(x)$ exists, it is unique.
- **TheoremBlock:** Proof

- **Viz component:** `EpsilonDeltaExplorer` — the flagship interactive visualization for this topic. User drags $\varepsilon$ slider, component computes and displays sufficient $\delta$. The epsilon band (horizontal) and the delta band (vertical) form a "box" on the graph. Multiple function presets.

Static image: `epsilon-delta-definition.png` from notebook.

### Section 3: One-Sided Limits and Limits at Infinity

- **TheoremBlock:** Definition 2 (Left-Hand Limit) — $\lim_{x \to a^-} f(x) = L$.
- **TheoremBlock:** Definition 3 (Right-Hand Limit) — $\lim_{x \to a^+} f(x) = L$.
- **TheoremBlock:** Proposition 2 — $\lim_{x \to a} f(x) = L$ if and only if both one-sided limits exist and equal $L$.
- **TheoremBlock:** Proof
- **TheoremBlock:** Definition 4 (Limit at Infinity) — $\lim_{x \to \infty} f(x) = L$.

ML context callout: One-sided limits appear at ReLU's kink at 0 (both one-sided limits exist and are equal, so the limit exists and ReLU is continuous). Limits at infinity describe the asymptotic behavior of sigmoid and tanh.

Static image: `one-sided-limits.png` from notebook.

### Section 4: Continuity at a Point

The three-condition definition, then the ε-δ reformulation:

1. State the three conditions: f(a) defined, limit exists, limit equals f(a).
2. Show the ε-δ reformulation (note: "0 <" drops out).
3. Sequential characterization: If f is continuous at a ⟺ for every sequence $x_n \to a$, we have $f(x_n) \to f(a)$.

- **TheoremBlock:** Definition 5 (Continuity at a Point) — f is continuous at a if $\lim_{x \to a} f(x) = f(a)$.
- **TheoremBlock:** Theorem 1 (Sequential Characterization of Continuity) — f is continuous at a if and only if for every sequence $(x_n)$ with $x_n \to a$, we have $f(x_n) \to f(a)$.
- **TheoremBlock:** Proof — Forward direction: given ε, use ε-δ to find δ, then use convergence of $x_n$ to find N. Reverse direction (contrapositive): if f is not continuous, construct a sequence witnessing discontinuity.
- **TheoremBlock:** Remark 1 — The sequential characterization is the bridge between Topic 1 and this topic. It lets us apply all the sequence-convergence theorems (Monotone Convergence, Squeeze, Bolzano-Weierstrass) in the function setting.

### Section 5: Algebra of Continuous Functions

- **TheoremBlock:** Theorem 2 (Algebra of Continuous Functions) — If f and g are continuous at a, then so are $f + g$, $f \cdot g$, $f/g$ (if $g(a) \neq 0$), and $f \circ g$ (if g is continuous at a and f is continuous at g(a)).
- **TheoremBlock:** Proof — Reduce to the sequential characterization: if $x_n \to a$, then $f(x_n) \to f(a)$ and $g(x_n) \to g(a)$, so by the Algebra of Limits for sequences (Theorem 3 from Topic 1), $(f+g)(x_n) = f(x_n) + g(x_n) \to f(a) + g(a) = (f+g)(a)$.
- **TheoremBlock:** Corollary 1 — Every polynomial is continuous on $\mathbb{R}$. Every rational function is continuous on its domain.
- **TheoremBlock:** Remark 2 — In ML, this is why compositions of continuous layers produce continuous networks. If each activation and affine map is continuous, the full network $f = \sigma_L \circ W_L \circ \cdots \circ \sigma_1 \circ W_1$ is continuous by iterated composition.

### Section 6: Types of Discontinuities

- **TheoremBlock:** Definition 6 (Removable Discontinuity) — f has a removable discontinuity at a if $\lim_{x \to a} f(x)$ exists, but either f(a) is undefined or $f(a) \neq \lim_{x \to a} f(x)$.
- **TheoremBlock:** Definition 7 (Jump Discontinuity) — f has a jump discontinuity at a if both one-sided limits exist but $\lim_{x \to a^-} f(x) \neq \lim_{x \to a^+} f(x)$.
- **TheoremBlock:** Definition 8 (Essential Discontinuity) — f has an essential discontinuity at a if at least one of the one-sided limits fails to exist.

Concrete examples: $\sin(x)/x$ at 0 (removable), floor function (jump), $\sin(1/x)$ at 0 (essential).

- **Viz component:** `ContinuityTypesExplorer` — interactive gallery of four function types (continuous, removable, jump, essential) with toggle and the ε-δ box showing why continuity fails for each type.

Static image: `continuity-types.png` from notebook.

### Section 7: The Intermediate Value Theorem

- **TheoremBlock:** Theorem 3 (Intermediate Value Theorem) — If $f: [a,b] \to \mathbb{R}$ is continuous and $y$ is any value between $f(a)$ and $f(b)$, then there exists $c \in (a,b)$ such that $f(c) = y$.
- **TheoremBlock:** Proof — Define $S = \{x \in [a,b] : f(x) \leq y\}$. $S$ is non-empty (contains a or b) and bounded above by b. Let $c = \sup S$ (least upper bound — this is where completeness of $\mathbb{R}$ is used). Show $f(c) = y$ by ruling out $f(c) < y$ and $f(c) > y$ using continuity. Fully expanded, every step.
- **TheoremBlock:** Corollary 2 (Root Existence) — If f is continuous on [a,b] and $f(a) \cdot f(b) < 0$, then there exists $c \in (a,b)$ with $f(c) = 0$.
- **TheoremBlock:** Remark 3 — IVT is the theoretical foundation of the bisection method and, more broadly, of decision boundary existence. If a continuous classifier assigns positive scores to one region and negative scores to another, IVT guarantees a decision boundary exists between them.

- **Viz component:** `IVTExplorer` — interactive IVT demonstration. User selects a function, adjusts endpoints, drags a target $y$ value, and the component highlights $c$ where $f(c) = y$. Includes a bisection animation mode that shows iterative root-finding.

Static image: `ivt-demonstration.png` from notebook.

### Section 8: The Extreme Value Theorem

- **TheoremBlock:** Theorem 4 (Extreme Value Theorem) — If $f: [a,b] \to \mathbb{R}$ is continuous, then f attains its maximum and minimum. There exist $c, d \in [a,b]$ such that $f(c) \leq f(x) \leq f(d)$ for all $x \in [a,b]$.
- **TheoremBlock:** Proof — (Maximum case.) f is bounded above on [a,b]: if not, we could find $x_n$ with $f(x_n) > n$, then by Bolzano-Weierstrass extract a convergent subsequence $x_{n_k} \to x^*$, and by continuity $f(x_{n_k}) \to f(x^*)$ — but $f(x_{n_k}) > n_k \to \infty$, contradiction. So $M = \sup_{x \in [a,b]} f(x)$ exists. Now find a sequence with $f(x_n) \to M$: apply Bolzano-Weierstrass again to get $x_{n_k} \to d \in [a,b]$ (closed interval, so $d \in [a,b]$). By continuity, $f(d) = M$. The minimum case is analogous (apply to $-f$).
- **TheoremBlock:** Remark 4 — EVT is the existence theorem for optimization: it guarantees that $\min_{x \in [a,b]} f(x)$ has a solution when f is continuous, and the domain is compact. In ML, regularization and weight clipping create compact parameter spaces, ensuring that minimizers exist.

Static image: `evt-demonstration.png` from notebook.

### Section 9: Uniform Continuity and Lipschitz Continuity

- **TheoremBlock:** Definition 9 (Uniform Continuity) — f is uniformly continuous on D if $\forall \varepsilon > 0,\ \exists \delta > 0:\ \forall x, y \in D,\ |x - y| < \delta \Rightarrow |f(x) - f(y)| < \varepsilon$.
- **TheoremBlock:** Definition 10 (Lipschitz Continuity) — f is Lipschitz continuous with constant $K \geq 0$ on D if $|f(x) - f(y)| \leq K|x - y|$ for all $x, y \in D$.
- **TheoremBlock:** Proposition 3 — Lipschitz $\Rightarrow$ uniformly continuous $\Rightarrow$ continuous. Both converses are false.
- **TheoremBlock:** Proof — Lipschitz $\Rightarrow$ uniform continuity: given ε, set $\delta = \varepsilon / K$. Uniform continuity $\Rightarrow$ continuity: immediate (uniform is a stronger statement). Counterexamples for converses: $\sqrt{x}$ on $[0,1]$ is uniformly continuous but not Lipschitz (slope → ∞); $\sin(1/x)$ on $(0,1)$ is continuous but not uniformly continuous.
- **TheoremBlock:** Theorem 5 (Heine-Cantor) — If f is continuous on a compact set (closed and bounded in $\mathbb{R}$), then f is uniformly continuous.
- **TheoremBlock:** Remark 5 — The Heine-Cantor theorem explains why compactness matters for optimization. On compact domains, continuity automatically implies uniform continuity, providing uniform control over function behavior.

- **Viz component:** `LipschitzExplorer` — interactive visualization showing the Lipschitz cone constraint. The user selects a function, adjusts the Lipschitz constant $K$, and drags a point to view the cone. The function must stay inside the cone centered at any point.

Static image: `lipschitz-continuity.png` from notebook.

### Section 10: Connections to ML

Four subsections with explicit formalml.com forward links:

1. **Activation function continuity** — Gallery of activations (ReLU, sigmoid, tanh, GELU, step) with continuity and Lipschitz annotations. ReLU is continuous but not differentiable at 0; the step function is discontinuous and cannot be trained with GD. The "no differentiable ≠ not continuous" distinction matters. Forward link to `gradient-descent`.
2. **Loss landscape smoothness** — MSE is smooth, hinge is continuous but not differentiable, cross-entropy is smooth on $(0,1)$ but singular at 0, 0-1 loss is discontinuous. The continuity hierarchy determines which optimization method is applicable. Forward link to `convex-analysis`.
3. **Lipschitz constraints in GANs** — The WGAN critic must be 1-Lipschitz to ensure the Wasserstein distance is well-defined. Spectral normalization enforces this by normalizing weight matrices by their spectral norm. The Lipschitz constant K controls the trade-off between expressiveness and stability.
4. **IVT and decision boundaries** — If a continuous classifier assigns positive scores on one side and negative scores on another, IVT guarantees a decision boundary exists. Forward link to `pac-learning`.

Static images: `activation-functions.png`, `loss-landscape-continuity.png` from notebook.

### Section 11: Computational Notes

Python code for:
- Evaluating limits numerically (compute $f(a + h)$ for decreasing $h$)
- Testing continuity at a point with the sequential characterization
- Estimating Lipschitz constants numerically ($\max |f(x) - f(y)| / |x - y|$ over a grid)
- Bisection root-finding (IVT algorithm)

### Section 12: Connections & Further Reading

Cross-reference table (within formalCalculus):

- [Sequences, Limits & Convergence](/topics/sequences-limits) — prerequisite. The ε-N definition that this topic extends.
- **Completeness & Compactness** *(coming soon)* — generalizes EVT via compactness, Heine-Cantor for uniform continuity.
- **Uniform Convergence** *(coming soon)* — when does uniform convergence of continuous functions produce a continuous limit?
- **The Derivative & Chain Rule** *(coming soon)* — differentiability implies continuity; the derivative is a limit.
- **The Riemann Integral & FTC** *(coming soon)* — continuous functions are Riemann integrable.
- **Mean Value Theorem & Taylor Expansion** *(coming soon)* — MVT requires continuity on [a,b].

References section listing the books/papers from the frontmatter.

---

## 4. Visualizations

### 4.1 `EpsilonDeltaExplorer.tsx`

- **File:** `src/components/viz/EpsilonDeltaExplorer.tsx`
- **What it visualizes:** The ε-δ definition of a function limit. The main plot shows a function graph with a horizontal ε-band around $L$ and a vertical δ-band around $a$. The intersection forms an "ε-δ box." The function graph is highlighted green inside the box and amber outside.
- **User interactions:**
  - Draggable $\varepsilon$ slider (range: 0.01 to 2.0, logarithmic scale). As ε shrinks, δ shrinks, and the box tightens.
  - Dropdown for function preset:
    - $f(x) = 2x + 1$ at $a = 1$, $L = 3$ (linear — δ = ε/2)
    - $f(x) = x^2$ at $a = 2$, $L = 4$ (quadratic — δ depends on ε non-linearly)
    - $f(x) = \sin(x)/x$ at $a = 0$, $L = 1$ (removable singularity — open circle at a)
    - $f(x) = \sqrt{x}$ at $a = 1$, $L = 1$ (square root — δ grows faster than ε)
    - $f(x) = 1/x$ at $a = 1$, $L = 1$ (rational function)
  - "Zoom to neighborhood" button that magnifies the ε-δ box region.
  - Numerical readout of current ε, computed δ, and the δ/ε ratio.
- **Data source:** Inline computation. The function `computeDelta(f, a, L, epsilon)` computes a sufficient δ by sampling. Import `computeEpsilonDelta` from `limits.ts` (new function added in §6).
- **Layout:** Single panel with controls above. The ε slider is the primary interaction.
- **Hydration:** `client:visible`
- **This is the flagship visualization for this topic.** It should mirror the polish of `EpsilonNExplorer` from Topic 1. The reader should be able to "feel" the ε-δ definition by dragging the slider and watching the box shrink.

### 4.2 `ContinuityTypesExplorer.tsx`

- **File:** `src/components/viz/ContinuityTypesExplorer.tsx`
- **What it visualizes:** Four types of function behavior at a point: continuous, removable discontinuity, jump discontinuity, essential discontinuity. Each panel shows the function graph near the point, with annotations explaining which condition of continuity fails.
- **User interactions:**
  - Tab selector: "Continuous" | "Removable" | "Jump" | "Essential"
  - For each tab, an ε slider shows the ε-δ box and whether a valid δ can be found:
    - Continuous: valid δ exists for any ε → box works.
    - Removable: limit exists but f(a) is wrong → dotted line to correct value.
    - Jump: left and right limits disagree → no single δ works.
    - Essential: oscillation → no valid δ at any ε.
- **Data source:** Inline computation. Functions are hardcoded per tab.
- **Layout:** Full-width single panel with tab switcher. Similar structure to `ConvergenceTheoremsExplorer` from Topic 1.
- **Hydration:** `client:visible`

### 4.3 `IVTExplorer.tsx`

- **File:** `src/components/viz/IVTExplorer.tsx`
- **What it visualizes:** The Intermediate Value Theorem interactively. A continuous function on $[a, b]$ with a draggable target $y$ value. The component highlights the point(s) $c$ where $f(c) = y$ and shows why continuity is necessary.
- **User interactions:**
  - Draggable horizontal line for the target $y$ value (range: between $f(a)$ and $f(b)$). As the user drags $y$, the point(s) $c$ update in real time.
  - Function preset dropdown:
    - $f(x) = x^3 - 2x - 2$ on $[0, 3]$ — cubic with one root
    - $f(x) = \cos(x)$ on $[0, \pi]$ — decreasing, one crossing
    - $f(x) = x \sin(x)$ on $[0, 4\pi]$ — multiple crossings
  - "Bisection mode" toggle that animates the bisection algorithm step-by-step, showing how IVT proves root existence constructively.
- **Data source:** Inline computation.
- **Layout:** Single panel with controls above.
- **Hydration:** `client:visible`

### 4.4 `LipschitzExplorer.tsx`

- **File:** `src/components/viz/LipschitzExplorer.tsx`
- **What it visualizes:** The Lipschitz cone constraint. At any point $(x_0, f(x_0))$, the function must stay inside a cone with slope $\pm K$. The user drags the point to see the cone follow, and adjusts $K$ to see how the constraint tightens.
- **User interactions:**
  - $K$ slider (range: 0.1 to 5.0) adjusts the Lipschitz constant.
  - Drag a point along the function to reposition the cone center.
  - Function preset dropdown:
    - $\sin(x)$, $K = 1$ (Lipschitz — function stays inside cone)
    - $x^2$ on $[-2, 2]$, $K = 4$ (Lipschitz on bounded domain)
    - $\sqrt{x}$ on $[0, 2]$ (NOT Lipschitz — cone fails near 0)
  - Visual indicator: green "✓ Inside cone" or red "✗ Outside cone" status badge.
- **Data source:** Inline computation.
- **Layout:** Single panel with controls.
- **Hydration:** `client:visible`

---

## 5. Data Modules

### 5.1 `epsilon-delta-data.ts`

- **File:** `src/data/epsilon-delta-data.ts`
- **Exported interfaces:**

```typescript
export interface FunctionPreset {
  name: string;
  label: string;             // LaTeX-renderable label for the function
  fn: (x: number) => number;
  a: number;                 // Point where the limit is evaluated
  L: number;                 // Limit value
  domain: [number, number];  // Display domain [xMin, xMax]
  deltaFormula: string;      // Human-readable delta formula (e.g., "ε/2")
  computeDelta: (epsilon: number) => number;  // Exact or conservative δ(ε)
  continuousAtA: boolean;
  lipschitzK: number | null; // Lipschitz constant, or null if not Lipschitz
}

export interface DiscontinuityPreset {
  name: string;
  label: string;
  type: 'continuous' | 'removable' | 'jump' | 'essential';
  fn: (x: number) => number;
  a: number;                 // Point of (dis)continuity
  leftLimit: number | null;
  rightLimit: number | null;
  fOfA: number | null;       // f(a), or null if undefined
  explanation: string;       // Which continuity condition fails
}
```

- **Exported constants (lazy):**

```typescript
export function getFunctionPresets(): FunctionPreset[];
export function getDiscontinuityPresets(): DiscontinuityPreset[];
export function getIVTPresets(): { name: string; fn: (x: number) => number; domain: [number, number]; label: string; }[];
export function getLipschitzPresets(): { name: string; fn: (x: number) => number; domain: [number, number]; label: string; K: number | null; isLipschitz: boolean; }[];
```

Returns the preset functions used by `EpsilonDeltaExplorer`, `ContinuityTypesExplorer`, `IVTExplorer`, and `LipschitzExplorer`. Defined once, shared across components.

- **Computation:** Eager is fine — presets are lightweight constant data with simple closures.

---

## 6. Shared Utility Module Updates

### Extend `src/components/viz/shared/limits.ts`

Add the following to the existing `limits.ts` module (created by Topic 1). Do **not** modify or remove existing exports — only add new ones.

**New exported interfaces:**

```typescript
export interface EpsilonDeltaResult {
  delta: number;             // Computed delta for given epsilon
  epsilon: number;           // The epsilon used
  a: number;                 // The point
  L: number;                 // The limit
  verified: boolean;         // Whether the delta was numerically verified
}

export interface ContinuityCheck {
  isContinuous: boolean;
  type: 'continuous' | 'removable' | 'jump' | 'essential' | 'unknown';
  leftLimit: number | null;
  rightLimit: number | null;
  fOfA: number | null;
}

export interface LipschitzEstimate {
  isLipschitz: boolean;
  K: number;                 // Estimated Lipschitz constant
  worstPair: [number, number]; // The (x, y) pair achieving max |f(x)-f(y)|/|x-y|
}
```

**New exported functions:**

```typescript
/**
 * Compute a sufficient delta for the ε-δ definition of lim_{x→a} f(x) = L.
 * Uses binary search over candidate delta values and verifies numerically.
 * Returns null if no valid delta is found within the search bounds.
 */
export function computeEpsilonDelta(
  f: (x: number) => number,
  a: number,
  L: number,
  epsilon: number,
  samplePoints?: number,
): EpsilonDeltaResult | null;

/**
 * Check continuity at a point by evaluating one-sided limits numerically.
 */
export function checkContinuity(
  f: (x: number) => number,
  a: number,
  samplePoints?: number,
): ContinuityCheck;

/**
 * Estimate the Lipschitz constant of f on [a, b] by sampling.
 */
export function estimateLipschitz(
  f: (x: number) => number,
  a: number,
  b: number,
  samplePoints?: number,
): LipschitzEstimate;

/**
 * Bisection root-finding: find c ∈ (a,b) with |f(c)| < tolerance.
 * Returns the sequence of midpoints (for animation) and the final root.
 */
export function bisection(
  f: (x: number) => number,
  a: number,
  b: number,
  tolerance?: number,
  maxSteps?: number,
): { root: number; steps: { a: number; b: number; mid: number; fMid: number }[] };
```

**Backward compatibility:** All existing exports from Topic 1 (`computeEpsilonN`, `checkCauchy`, `estimateConvergenceRate`, `generateSequence`, `seededRandom`, `ConvergenceResult`, `CauchyCheck`) remain unchanged. The new functions are purely additive.

---

## 7. Curriculum Graph Updates

### `src/data/curriculum-graph.json`

**Update node status** (node already exists in the graph):

```json
{ "id": "epsilon-delta", "label": "Epsilon-Delta & Continuity", "domain": "limits-continuity", "status": "published", "url": "/topics/epsilon-delta" }
```

Change `"status": "planned"` → `"status": "published"`.

**No new edges needed.** All edges from/to `epsilon-delta` should already be defined in the scaffold:

- `sequences-limits` → `epsilon-delta` (prerequisite)
- `epsilon-delta` → `completeness-compactness` (downstream)
- `epsilon-delta` → `derivative` (downstream)

Verify these edges exist. If `epsilon-delta` → `uniform-convergence` is not present, add:

```json
{ "source": "epsilon-delta", "target": "uniform-convergence" }
```

### `src/data/curriculum.ts`

Move `"Epsilon-Delta & Continuity"` from the `planned` array to the `published` array in the `limits-continuity` track:

```typescript
{
  id: 'limits-continuity',
  // ...
  published: ['Sequences, Limits & Convergence', 'Epsilon-Delta & Continuity'],
  planned: [
    'Completeness & Compactness',
    'Uniform Convergence',
  ],
}
```

---

## 8. Cross-References

### Topics this topic links FROM (backward references)

- [Sequences, Limits & Convergence](/topics/sequences-limits) — "As we established in [Sequences, Limits & Convergence](/topics/sequences-limits), the ε-N definition makes 'convergence' precise for sequences. Now we extend this framework to functions."
  - Reference the Algebra of Limits for sequences (used to prove the Algebra of Continuous Functions).
  - Reference the Bolzano-Weierstrass Theorem (used in EVT proof).
  - Reference the Cauchy criterion and completeness of ℝ (used in IVT proof).

### Topics that should link TO this topic (update existing MDX)

Update `sequences-limits.mdx` Section 10 (Connections & Further Reading):

**Change** the forward reference from plain text to a live link:

```mdx
<!-- BEFORE -->
**Epsilon-Delta & Continuity** *(coming soon)* — extends the ε-N framework to function limits and continuity.

<!-- AFTER -->
[Epsilon-Delta & Continuity](/topics/epsilon-delta) — extends the ε-N framework to function limits and continuity.
```

Leave all other forward references in `sequences-limits.mdx` as plain text "(coming soon)" — they are not yet published.

### Forward references to planned formalCalculus topics (plain text + "(coming soon)")

- **Completeness & Compactness** *(coming soon)* — compactness + continuity → EVT; Heine-Cantor for uniform continuity on compact sets.
- **Uniform Convergence** *(coming soon)* — when does uniform convergence of continuous functions preserve continuity?
- **The Derivative & Chain Rule** *(coming soon)* — differentiability implies continuity; the derivative is a limit.
- **The Riemann Integral & FTC** *(coming soon)* — continuous functions are Riemann integrable.
- **Mean Value Theorem & Taylor Expansion** *(coming soon)* — MVT requires continuity on [a,b] and differentiability on (a,b).

### Forward references to formalml.com (informational links, not prerequisites)

Use the `formalml-badge` CSS class for these links:

```mdx
The Lipschitz gradient condition is the key assumption in [Gradient Descent](https://formalml.com/topics/gradient-descent) <span class="formalml-badge">formalML</span> convergence rate proofs.
```

Specific forward links:

- `convex-analysis` — Section 10 (continuity of convex functions, Lipschitz gradients)
- `gradient-descent` — Section 10 (Lipschitz gradient assumption)
- `pac-learning` — Section 10 (continuous hypothesis classes, decision boundaries)

---

## 9. Images

Copy the following notebook-generated figures to `public/images/topics/epsilon-delta/`:

| Filename | Description |
|----------|-------------|
| `epsilon-delta-definition.png` | Three-panel ε-δ definition for linear, quadratic, and sin(x)/x functions |
| `one-sided-limits.png` | Three-panel: one-sided limits agree, disagree (jump), limits at infinity (sigmoid) |
| `continuity-types.png` | Four-panel: continuous, removable, jump, essential discontinuities |
| `ivt-demonstration.png` | Two-panel: IVT theorem + bisection root-finding |
| `evt-demonstration.png` | Three-panel: EVT holds, fails on open interval, fails with discontinuity |
| `lipschitz-continuity.png` | Three-panel: Lipschitz cone, uniformly continuous but not Lipschitz, continuous but not uniform |
| `activation-functions.png` | Six-panel gallery of ML activations with continuity/Lipschitz annotations |
| `loss-landscape-continuity.png` | Four-panel comparison of loss functions by continuity properties |

All images referenced in MDX with:

```mdx
![The ε-δ definition](/images/topics/epsilon-delta/epsilon-delta-definition.png)
```

---

## 10. Testing Checklist

### Topic content

- [ ] Topic page renders at `/topics/epsilon-delta`
- [ ] Title, subtitle, difficulty badge ("foundational"), reading time display correctly
- [ ] Abstract renders in the info box
- [ ] Prerequisites section shows link to `sequences-limits`
- [ ] formalML forward links box renders with badges (convex-analysis, gradient-descent, pac-learning)
- [ ] All TheoremBlocks render KaTeX correctly (10 definitions/propositions/theorems, 2 examples, 5 remarks)
- [ ] All proofs display with ∎ tombstone
- [ ] Static images load from `public/images/topics/epsilon-delta/`
- [ ] All internal cross-references to `sequences-limits` resolve (not 404)

### Viz components

- [ ] `EpsilonDeltaExplorer` loads on scroll (`client:visible`)
- [ ] `EpsilonDeltaExplorer` ε slider is draggable and updates δ and box in real time
- [ ] `EpsilonDeltaExplorer` function preset dropdown works for all 5 presets
- [ ] `EpsilonDeltaExplorer` zoom button magnifies ε-δ box region
- [ ] `EpsilonDeltaExplorer` numerical readout updates (ε, δ, δ/ε ratio)
- [ ] `ContinuityTypesExplorer` all four tabs render and switch
- [ ] `ContinuityTypesExplorer` ε slider works within each tab
- [ ] `IVTExplorer` draggable y-line updates c in real time
- [ ] `IVTExplorer` function preset dropdown works
- [ ] `IVTExplorer` bisection mode animates step-by-step
- [ ] `LipschitzExplorer` K slider adjusts cone
- [ ] `LipschitzExplorer` draggable point repositions cone center
- [ ] `LipschitzExplorer` inside/outside cone status indicator works

### Cross-references

- [ ] Link to `sequences-limits` works (resolves to published page)
- [ ] `sequences-limits.mdx` has been updated: "Epsilon-Delta & Continuity" is now a live link, not plain text
- [ ] All other forward references use plain text + "(coming soon)"
- [ ] All formalml.com links open in a new tab with `target="_blank" rel="noopener"`

### Infrastructure

- [ ] New exports in `limits.ts` compile with no TypeScript errors
- [ ] Existing `limits.ts` exports still compile (backward compatibility)
- [ ] `epsilon-delta-data.ts` data module compiles
- [ ] Page is responsive (viz components stack vertically on mobile)
- [ ] "Foundational" difficulty badge is styled correctly (green)
- [ ] Curriculum graph shows `epsilon-delta` as "published" (not "coming soon")
- [ ] Pagefind indexes the new topic on rebuild
- [ ] Build succeeds with zero errors: `pnpm build`

---

## 11. Build Order

1. **Extend `src/components/viz/shared/limits.ts`** — Add `computeEpsilonDelta`, `checkContinuity`, `estimateLipschitz`, `bisection`, and the new interfaces (`EpsilonDeltaResult`, `ContinuityCheck`, `LipschitzEstimate`). Run console log tests. Verify existing exports still compile.
2. **Create `src/data/epsilon-delta-data.ts`** — Function presets, discontinuity presets, IVT presets, Lipschitz presets. Verify exports compile.
3. **Create `epsilon-delta.mdx`** with full frontmatter and all markdown/LaTeX content. Use `TheoremBlock` for all formal elements. No interactive components yet — just the prose and static images.
4. Copy notebook figures to `public/images/topics/epsilon-delta/` and verify they load in the MDX.
5. **Build `EpsilonDeltaExplorer.tsx`** — the flagship component. Start with the ε slider and δ computation, then add function presets and zoom. This is the most important visualization on the page.
6. **Build `ContinuityTypesExplorer.tsx`** — tabbed four-panel component showing each discontinuity type.
7. **Build `IVTExplorer.tsx`** — draggable y-line + bisection animation.
8. **Build `LipschitzExplorer.tsx`** — draggable point + cone + K slider.
9. Embed all four components in the MDX at their appropriate section positions with `client:visible`.
10. **Update `sequences-limits.mdx`** — Change the "Epsilon-Delta & Continuity *(coming soon)*" forward reference to a live link: `[Epsilon-Delta & Continuity](/topics/epsilon-delta)`.
11. **Update curriculum graph data** — change `epsilon-delta` status from `"planned"` to `"published"` in `curriculum-graph.json`.
12. **Update `curriculum.ts`** — move `"Epsilon-Delta & Continuity"` from `planned` to `published` in the `limits-continuity` track.
13. Run topic content and viz checklist (§10).
14. `pnpm build` — verify zero errors.
15. Commit and deploy.

---

## Appendix A: Key Differences from Topic 1 Brief

1. **Second topic.** One topic (`sequences-limits`) is already published and live. This topic has a real prerequisite link (not just an empty `[]`), and it must update the prerequisite's MDX with a live link.
2. **Extends the shared utility module.** Unlike Topic 1 which *created* `limits.ts`, this topic *extends* it. Backward compatibility is critical — do not modify existing function signatures or interfaces.
3. **Four viz components** (vs. five in Topic 1). The flagship `EpsilonDeltaExplorer` mirrors the pedagogical role of `EpsilonNExplorer` from Topic 1. The `ContinuityTypesExplorer` uses the same tabbed pattern as the `ConvergenceTheoremsExplorer`.
4. **Two major theorems with full proofs.** IVT and EVT are the capstone results. Both proofs use completeness of $\mathbb{R}$ and should reference the Bolzano-Weierstrass Theorem from Topic 1 — a genuine cross-reference, not just a forward link.
5. **Richer ML connections.** The Lipschitz continuity section directly connects to WGAN theory and spectral normalization — these are concrete, modern ML applications that go beyond the "GD is a convergent sequence" connection of Topic 1.
6. **Foundational difficulty with extra scaffolding.** The ε-δ definition for functions is notoriously harder than ε-N for sequences because δ can depend on both ε and the point a. The exposition must be patient: informal first, then formal, then worked examples with every algebraic step expanded.

---

## Appendix B: Formal Element Inventory

| Type | # | Title |
|------|---|-------|
| Definition | 1 | Limit of a Function |
| Definition | 2 | Left-Hand Limit |
| Definition | 3 | Right-Hand Limit |
| Definition | 4 | Limit at Infinity |
| Definition | 5 | Continuity at a Point |
| Definition | 6 | Removable Discontinuity |
| Definition | 7 | Jump Discontinuity |
| Definition | 8 | Essential Discontinuity |
| Definition | 9 | Uniform Continuity |
| Definition | 10 | Lipschitz Continuity |
| Example | 1 | Proof that $\lim_{x \to 1} (2x + 1) = 3$ |
| Example | 2 | Proof that $\lim_{x \to 2} x^2 = 4$ |
| Proposition | 1 | Uniqueness of Limits (for functions) |
| Proposition | 2 | Two-sided limit ⟺ , both one-sided limits agree |
| Proposition | 3 | Lipschitz ⟹ uniformly continuous ⟹ continuous |
| Theorem | 1 | Sequential Characterization of Continuity |
| Theorem | 2 | Algebra of Continuous Functions |
| Theorem | 3 | Intermediate Value Theorem |
| Theorem | 4 | Extreme Value Theorem |
| Theorem | 5 | Heine-Cantor Theorem |
| Corollary | 1 | Polynomials and rational functions are continuous |
| Corollary | 2 | Root existence (sign change → root) |
| Remark | 1 | Sequential characterization bridges Topics 1 and 2 |
| Remark | 2 | Compositions of continuous layers → continuous networks |
| Remark | 3 | IVT and decision boundary existence |
| Remark | 4 | EVT and existence of minimizers in optimization |
| Remark | 5 | Heine-Cantor: compactness upgrades continuity to uniform continuity |
| Proof | — | 8 proofs total (Propositions 1–3, Theorems 1–5 sketch, Corollary 1) |

---

*Brief version: v1 | Created: 2026-03-29 | Author: Jonathan Rocha*  
*Reference notebook: `notebooks/epsilon-delta/02_epsilon_delta.ipynb`*  
*Reference doc: `docs/plans/formalcalculus-handoff-reference.md`*
