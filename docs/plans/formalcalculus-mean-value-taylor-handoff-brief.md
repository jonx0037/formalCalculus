# Claude Code Handoff Brief: Mean Value Theorem & Taylor Expansion

**Project:** formalCalculus — [formalcalculus.com](https://www.formalcalculus.com)  
**Repo:** `github.com/jonx0037/formalCalculus`  
**Stack:** Astro 6 · React 19 · MDX · Tailwind CSS 4 · D3.js 7 · KaTeX · Vercel  
**Package Manager:** pnpm  
**Status:** Ready for implementation  
**Reference Notebook:** `notebooks/mean-value-taylor/06_mean_value_taylor.ipynb`  
**Reference Doc:** `docs/plans/formalcalculus-handoff-reference.md`

---

## 1. Objective

Add a new topic page **"Mean Value Theorem & Taylor Expansion"** as the **second topic in the Single-Variable Calculus track** on formalcalculus.com.

1. This is **topic 6 of 32** and the **sixth topic published** on formalcalculus.com. All four topics in the Limits & Continuity track (`sequences-limits`, `epsilon-delta`, `completeness-compactness`, `uniform-convergence`) plus the first topic in the Single-Variable Calculus track (`derivative`) are deployed and live.
2. **Prerequisites:** `derivative` and `completeness-compactness`. The derivative definition, chain rule, and differentiation rules come from Topic 5. Rolle's theorem requires the Extreme Value Theorem, which was proved in Topic 3 via compactness of closed bounded intervals (Heine-Borel). The reader has seen ε-δ proofs, understands differentiation as a limit, and knows that continuous functions on compact sets achieve their extrema.
3. **Difficulty upgrade within the track.** This is the first **intermediate** topic in the Single-Variable Calculus track. The jump from `derivative` (foundational) reflects the deeper proof techniques — Rolle's theorem and MVT require combining differentiation with compactness/EVT from Track 1, and Taylor's theorem involves inductive remainder estimation. The reader is building mathematical maturity through these combinations.
4. **Downstream within formalCalculus:**
   - `riemann-integral` (direct) — The Fundamental Theorem of Calculus (Part 2) uses the Mean Value Theorem in its proof. Taylor's theorem also provides the framework for understanding approximation quality of Riemann sums.
   - `improper-integrals` (direct) — Taylor expansion of integrands near singularities, asymptotic expansion of special functions (Stirling's approximation for Gamma).
   - `power-taylor-series` (direct) — Taylor polynomials are finite truncations of Taylor series. This topic provides the approximation theory; the series topic addresses convergence of the infinite sum.
   - `hessian` (indirect) — The second-order Taylor expansion $f(x+h) \approx f(x) + f'(x)h + \frac{1}{2}f''(x)h^2$ generalizes to $f(\mathbf{x}+\mathbf{h}) \approx f(\mathbf{x}) + \nabla f \cdot \mathbf{h} + \frac{1}{2}\mathbf{h}^T H \mathbf{h}$, where $H$ is the Hessian.
   - `gradient` (indirect) — MVT generalizes to the multivariable setting; Taylor expansion of $f: \mathbb{R}^n \to \mathbb{R}$ is the foundation of gradient descent convergence analysis.
5. **Forward links to formalml.com:**
   - `gradient-descent` — Taylor expansion is the primary analytical tool for proving gradient descent convergence rates. The descent lemma $f(y) \leq f(x) + \nabla f(x)^T(y-x) + \frac{L}{2}\|y-x\|^2$ is a direct consequence of second-order Taylor expansion with Lipschitz gradient. Newton's method uses the quadratic Taylor model directly.
   - `proximal-methods` — Proximal operators are defined via local quadratic models (Taylor + regularization). The Moreau envelope uses the same Taylor-inspired local quadratic structure.
   - `smooth-manifolds` — Taylor expansion on manifolds; the exponential map as a "Taylor-like" local coordinate system.
6. This topic **extends** the shared utility module `differentiation.ts` (created by Topic 5) with Taylor polynomial computation, remainder estimation, and MVT-related utilities.

**Content scope:**

- Rolle's Theorem: If $f$ is continuous on $[a,b]$, differentiable on $(a,b)$, and $f(a) = f(b)$, then there exists $c \in (a,b)$ with $f'(c) = 0$
- The Mean Value Theorem: $f'(c) = \frac{f(b) - f(a)}{b - a}$ for some $c \in (a,b)$ — the secant slope equals an interior tangent slope
- Consequences of MVT: zero derivative implies constant, sign of derivative determines monotonicity, Lipschitz continuity from bounded derivatives
- Cauchy's Mean Value Theorem (generalized MVT): $\frac{f'(c)}{g'(c)} = \frac{f(b) - f(a)}{g(b) - g(a)}$
- L'Hôpital's Rule derived from Cauchy MVT
- Taylor's Theorem: $f(x) = \sum_{k=0}^{n} \frac{f^{(k)}(a)}{k!}(x-a)^k + R_n(x)$ — local polynomial approximation with quantitative error control
- Remainder forms: Lagrange ($R_n = \frac{f^{(n+1)}(c)}{(n+1)!}(x-a)^{n+1}$), integral remainder
- Taylor polynomials vs. Taylor series: when does $R_n \to 0$ as $n \to \infty$?
- Failure of Taylor series: $e^{-1/x^2}$ is $C^\infty$ with all derivatives zero at $0$, but is not identically zero — smooth does not imply analytic
- ML connections: Taylor expansion in GD convergence proofs (descent lemma), Newton's method as second-order Taylor optimization, loss surface local analysis, Hessian-based curvature

---

## 2. MDX File

### Location

```
src/content/topics/mean-value-taylor.mdx
```

The entry `id` will be `mean-value-taylor`. The dynamic route resolves to `/topics/mean-value-taylor`.

### Frontmatter

```yaml
---
title: "Mean Value Theorem & Taylor Expansion"
subtitle: "Local approximation theory — the theorems that connect a function's derivatives to its global behavior, and the polynomial approximations that power convergence analysis in optimization"
status: "published"
difficulty: "intermediate"
prerequisites:
  - "derivative"
  - "completeness-compactness"
tags:
  - "calculus"
  - "mean-value-theorem"
  - "rolles-theorem"
  - "taylor-expansion"
  - "taylor-polynomial"
  - "remainder-estimation"
  - "lhopitals-rule"
  - "local-approximation"
  - "convergence-rates"
  - "newtons-method"
domain: "single-variable"
videoId: null
notebookPath: "notebooks/mean-value-taylor/06_mean_value_taylor.ipynb"
githubUrl: "https://github.com/jonx0037/formalCalculus/blob/main/src/content/topics/mean-value-taylor.mdx"
datePublished: 2026-03-30
estimatedReadTime: 45
abstract: "The Mean Value Theorem says that if f is continuous on [a,b] and differentiable on (a,b), there exists c ∈ (a,b) where f'(c) = [f(b) - f(a)]/(b - a) — the instantaneous rate of change at some interior point equals the average rate of change over the whole interval. Geometrically, this means every secant line has a parallel tangent line somewhere between the endpoints. This single theorem has sweeping consequences: it proves that functions with zero derivative are constant, that the sign of f' determines monotonicity, and that bounded derivatives imply Lipschitz continuity. The proof goes through Rolle's theorem — the special case where f(a) = f(b), so the guaranteed interior point is a local extremum with f'(c) = 0 — which itself depends on the Extreme Value Theorem from compactness. Taylor's theorem extends the Mean Value Theorem from first-order to arbitrary-order approximation: near any point a, a sufficiently smooth function is approximated by its degree-n Taylor polynomial Tₙ(x) = Σ f⁽ᵏ⁾(a)/k! (x - a)ᵏ, with the Lagrange remainder Rₙ = f⁽ⁿ⁺¹⁾(c)/(n+1)! (x - a)ⁿ⁺¹ providing a quantitative error bound. Taylor expansion is the analytical engine behind convergence rate proofs in optimization: the descent lemma f(y) ≤ f(x) + ∇f(x)ᵀ(y - x) + (L/2)‖y - x‖² is a second-order Taylor bound, and Newton's method achieves quadratic convergence by optimizing the local quadratic Taylor model at each step."
formalmlConnections:
  - topic: "gradient-descent"
    site: "formalml"
    relationship: "The descent lemma — the cornerstone inequality in gradient descent convergence proofs — is a direct consequence of second-order Taylor expansion with Lipschitz gradient. Newton's method replaces f with its local quadratic Taylor model at each step, achieving quadratic convergence where GD achieves only linear."
  - topic: "proximal-methods"
    site: "formalml"
    relationship: "Proximal operators minimize f(y) + (1/2t)‖y - x‖², which is the second-order Taylor model of f at x plus a quadratic penalty. The Moreau envelope uses the same Taylor-inspired local quadratic structure."
  - topic: "smooth-manifolds"
    site: "formalml"
    relationship: "Taylor expansion on manifolds generalizes via the exponential map. The MVT extends to curves on manifolds, and Taylor approximation in local coordinates is the foundation for Riemannian optimization."
connections:
  - topic: "derivative"
    relationship: "The derivative definition and differentiation rules from Topic 5 are the raw material. Rolle's theorem and MVT are statements about the derivative — they assert the existence of points where f' takes specific values. Taylor's theorem builds polynomial approximations from higher-order derivatives f', f'', ..., f⁽ⁿ⁾."
  - topic: "completeness-compactness"
    relationship: "Rolle's theorem requires the Extreme Value Theorem: a continuous function on [a,b] achieves its maximum and minimum. The EVT was proved in Topic 3 using compactness (Heine-Borel). The chain Rolle → MVT → Taylor is built on the compactness foundation."
  - topic: "sequences-limits"
    relationship: "Taylor remainder estimation involves limits of the form Rₙ(x) → 0 as n → ∞. Convergence rate analysis (linear, quadratic) for Newton's method uses the sequence convergence framework from Topic 1."
  - topic: "epsilon-delta"
    relationship: "The continuity and differentiability hypotheses in Rolle's theorem and MVT are formalized using the ε-δ framework from Topic 2. L'Hôpital's Rule requires careful handling of limits of ratios."
references:
  - type: "book"
    title: "Understanding Analysis"
    authors: "Abbott"
    year: 2015
    note: "Chapter 5 develops MVT from Rolle's theorem with exceptional clarity; Chapter 6 covers Taylor's theorem — the primary reference for our rigorous-but-accessible approach"
  - type: "book"
    title: "Principles of Mathematical Analysis"
    authors: "Rudin"
    year: 1976
    note: "Chapter 5 on differentiation covers MVT and Taylor's theorem in the definitive compact style"
  - type: "book"
    title: "Calculus"
    authors: "Spivak"
    year: 2008
    note: "Chapters 11–12 develop MVT and Taylor's theorem with unmatched geometric intuition alongside full rigor — exceptional treatment of the Taylor remainder"
  - type: "book"
    title: "Convex Optimization"
    authors: "Boyd & Vandenberghe"
    year: 2004
    note: "Section 9.1 on unconstrained minimization — the descent lemma and convergence rate proofs that directly use Taylor expansion"
  - type: "book"
    title: "Introductory Lectures on Convex Optimization"
    authors: "Nesterov"
    year: 2004
    note: "Chapter 1 develops the Lipschitz gradient framework and descent lemma — the canonical application of Taylor expansion to optimization convergence analysis"
---
```

---

## 3. Content Outline

### Section 1: Overview & Motivation

**Opening example:** You're training a neural network and observe that the loss drops from $L(\theta_0) = 2.4$ to $L(\theta_{100}) = 0.03$ over 100 steps. Can you guarantee that at some point during training, the loss was decreasing at a rate of exactly $\frac{0.03 - 2.4}{100} = -0.0237$ per step? The Mean Value Theorem says *yes* — and this kind of "existence of an intermediate rate" argument is exactly what convergence proofs exploit. Moreover, *how well* can you approximate the loss near the current parameter? Taylor expansion answers: the first-order approximation gives gradient descent, the second-order approximation gives Newton's method. The quality of these approximations determines the convergence rate.

No TheoremBlocks. No viz. 2–3 paragraphs setting up the "why."

### Section 2: Rolle's Theorem

**Geometric-first.** Start with the picture: a continuous curve that starts and ends at the same height must have a "turning point" — a place where the tangent is horizontal. If you drive from home to home, at some point your velocity was exactly zero (you turned around).

**TheoremBlocks:**

- **Theorem 1: Rolle's Theorem** — If $f$ is continuous on $[a,b]$, differentiable on $(a,b)$, and $f(a) = f(b)$, then there exists $c \in (a,b)$ such that $f'(c) = 0$.
- **Proof of Theorem 1** — Full proof. By the Extreme Value Theorem (Topic 3, via Heine-Borel), $f$ achieves its maximum $M$ and minimum $m$ on $[a,b]$. **Case 1:** If $M = m$, then $f$ is constant on $[a,b]$ and $f'(c) = 0$ for every $c \in (a,b)$. **Case 2:** If $M \neq m$, then since $f(a) = f(b)$, at least one of $M$ or $m$ is achieved at an interior point $c \in (a,b)$. At a local extremum, $f'(c) = 0$ (since the left and right difference quotients have opposite signs — Topic 5, from the definition of the derivative and the sign of the difference quotient on each side). Every step is expanded.
- **Example 1: Rolle's on $f(x) = x^2 - 4x + 3$ on $[1, 3]$** — Verify $f(1) = f(3) = 0$. Find $c$: $f'(x) = 2x - 4 = 0 \Rightarrow c = 2 \in (1,3)$. Geometric picture: the parabola dips below the $x$-axis and turns around at $x = 2$.
- **Remark 1: Why all three hypotheses matter** — (i) Not continuous: step function on $[0,1]$ with $f(0) = f(1) = 0$ but no zero of $f'$. (ii) Not differentiable: $f(x) = |x|$ on $[-1, 1]$ has $f(-1) = f(1) = 1$, but $f'$ doesn't exist at $x = 0$ (Topic 5, Example 3). (iii) Not $f(a) = f(b)$: the identity $f(x) = x$ on $[0,1]$ has $f'(x) = 1 \neq 0$ everywhere.

**Visualization:** `RollesTheoremExplorer` embedded here.

**Static image:** `rolles-theorem.png` from the notebook.

### Section 3: The Mean Value Theorem

**Geometric-first.** The MVT says: for any continuous curve with a well-defined secant line, there's a point where the tangent is parallel to the secant. Tilt your head until the secant is horizontal — now it's Rolle's theorem. The MVT is Rolle's theorem applied to the tilted function.

**TheoremBlocks:**

- **Theorem 2: The Mean Value Theorem** — If $f$ is continuous on $[a,b]$ and differentiable on $(a,b)$, then there exists $c \in (a,b)$ such that $f'(c) = \frac{f(b) - f(a)}{b - a}$.
- **Proof of Theorem 2** — Full proof by reduction to Rolle. Define $g(x) = f(x) - \frac{f(b) - f(a)}{b - a}(x - a)$ (subtract the secant line). Then $g$ is continuous on $[a,b]$, differentiable on $(a,b)$, and $g(a) = f(a)$, $g(b) = f(b) - (f(b) - f(a)) = f(a) = g(a)$. By Rolle's theorem, there exists $c \in (a,b)$ with $g'(c) = 0$. But $g'(x) = f'(x) - \frac{f(b) - f(a)}{b - a}$, so $g'(c) = 0$ gives $f'(c) = \frac{f(b) - f(a)}{b - a}$.
- **Example 2: MVT on $f(x) = x^3$ on $[0, 2]$** — Secant slope: $\frac{8 - 0}{2 - 0} = 4$. Find $c$: $f'(x) = 3x^2 = 4 \Rightarrow c = \frac{2}{\sqrt{3}} \approx 1.155 \in (0, 2)$.

**Visualization:** `MeanValueTheoremExplorer` embedded here.

**Static image:** `mean-value-theorem.png` from the notebook.

### Section 4: Consequences of the Mean Value Theorem

**This is where MVT earns its name.** The MVT is not just a theoretical curiosity — it's the bridge between local information (the derivative at a point) and global behavior (the function's values over an interval). Three key consequences:

**TheoremBlocks:**

- **Corollary 1: Zero Derivative Implies Constant** — If $f'(x) = 0$ for all $x \in (a,b)$, then $f$ is constant on $(a,b)$.
- **Proof of Corollary 1** — For any $x_1, x_2 \in (a,b)$ with $x_1 < x_2$, MVT gives $f(x_2) - f(x_1) = f'(c)(x_2 - x_1) = 0 \cdot (x_2 - x_1) = 0$.
- **Corollary 2: Monotonicity from Derivative Sign** — If $f'(x) > 0$ for all $x \in (a,b)$, then $f$ is strictly increasing on $(a,b)$. If $f'(x) < 0$, then $f$ is strictly decreasing.
- **Proof of Corollary 2** — For $x_1 < x_2$, MVT gives $f(x_2) - f(x_1) = f'(c)(x_2 - x_1)$. Since $f'(c) > 0$ and $x_2 - x_1 > 0$, we have $f(x_2) > f(x_1)$.
- **Corollary 3: Bounded Derivative Implies Lipschitz** — If $|f'(x)| \leq M$ for all $x \in (a,b)$, then $|f(x) - f(y)| \leq M|x - y|$ for all $x, y \in (a,b)$.
- **Proof of Corollary 3** — MVT gives $|f(x) - f(y)| = |f'(c)||x - y| \leq M|x - y|$.
- **Remark 2: Lipschitz continuity and ML** — The Lipschitz constant $M$ bounds how fast $f$ can change. In ML, the Lipschitz gradient condition $\|\nabla f(x) - \nabla f(y)\| \leq L\|x - y\|$ is the single most important regularity assumption in convergence proofs for gradient descent. It comes directly from applying MVT (or its multivariable analog) to $\nabla f$.

**Static image:** `mvt-consequences.png` from the notebook.

### Section 5: Cauchy's Mean Value Theorem and L'Hôpital's Rule

**TheoremBlocks:**

- **Theorem 3: Cauchy's Mean Value Theorem** — If $f$ and $g$ are continuous on $[a,b]$ and differentiable on $(a,b)$ with $g'(x) \neq 0$ for all $x \in (a,b)$, then there exists $c \in (a,b)$ such that $\frac{f'(c)}{g'(c)} = \frac{f(b) - f(a)}{g(b) - g(a)}$.
- **Proof of Theorem 3** — Define $h(x) = f(x)(g(b) - g(a)) - g(x)(f(b) - f(a))$. Verify $h(a) = h(b)$. Apply Rolle's theorem to $h$.
- **Theorem 4: L'Hôpital's Rule ($0/0$ form)** — If $\lim_{x \to a} f(x) = \lim_{x \to a} g(x) = 0$, and $\lim_{x \to a} \frac{f'(x)}{g'(x)} = L$ exists, then $\lim_{x \to a} \frac{f(x)}{g(x)} = L$.
- **Proof of Theorem 4** — Proof via Cauchy MVT: For $x$ near $a$ (with $x \neq a$), Cauchy's MVT on $[a, x]$ gives $c_x$ between $a$ and $x$ with $\frac{f(x)}{g(x)} = \frac{f(x) - f(a)}{g(x) - g(a)} = \frac{f'(c_x)}{g'(c_x)}$. As $x \to a$, $c_x \to a$ (squeeze), so $\frac{f'(c_x)}{g'(c_x)} \to L$.
- **Example 3: L'Hôpital's applied** — $\lim_{x \to 0} \frac{\sin x}{x} = \lim_{x \to 0} \frac{\cos x}{1} = 1$. Note: we can *now* prove this rigorously, whereas before we relied solely on the geometric argument.
- **Remark 3: L'Hôpital's caveats** — The converse does not hold: $\lim f'/g'$ may fail to exist even when $\lim f/g$ exists (example: $f(x) = x^2 \sin(1/x)$, $g(x) = x$). L'Hôpital is a *sufficient* condition, not necessary. Also applies to $\infty/\infty$, $x \to \infty$, and via substitution to $0 \cdot \infty$ and $\infty - \infty$ forms.

**Static image:** `lhopitals-rule.png` from the notebook.

### Section 6: Taylor Polynomials

**Geometric-first.** The tangent line $T_1(x) = f(a) + f'(a)(x-a)$ is the best *linear* approximation to $f$ near $a$ (Topic 5, Proposition 1). But what if we allow *quadratic* approximation? The best quadratic that matches $f$ in value, slope, and curvature at $a$ is $T_2(x) = f(a) + f'(a)(x-a) + \frac{f''(a)}{2}(x-a)^2$. The pattern continues: the degree-$n$ Taylor polynomial matches $f$ through its first $n$ derivatives at $a$.

**TheoremBlocks:**

- **Definition 1: Taylor Polynomial** — The degree-$n$ Taylor polynomial of $f$ centered at $a$ is $T_n(x) = \sum_{k=0}^{n} \frac{f^{(k)}(a)}{k!}(x - a)^k = f(a) + f'(a)(x-a) + \frac{f''(a)}{2!}(x-a)^2 + \cdots + \frac{f^{(n)}(a)}{n!}(x-a)^n$. The special case $a = 0$ gives the **Maclaurin polynomial**.
- **Proposition 1: Taylor Polynomial as Best Polynomial Approximation** — Among all polynomials $p$ of degree $\leq n$, the Taylor polynomial $T_n$ is the unique polynomial satisfying $p^{(k)}(a) = f^{(k)}(a)$ for $k = 0, 1, \ldots, n$. Equivalently, the error $f(x) - T_n(x)$ vanishes to order $n$ at $a$: $\lim_{x \to a} \frac{f(x) - T_n(x)}{(x-a)^n} = 0$.
- **Example 4: Taylor polynomials of $e^x$ at $a = 0$** — Since $f^{(k)}(0) = 1$ for all $k$: $T_n(x) = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots + \frac{x^n}{n!}$. Show degrees 1 through 6 approximating $e^x$ on $[-3, 3]$.
- **Example 5: Taylor polynomials of $\sin x$ at $a = 0$** — Only odd terms survive: $T_{2n+1}(x) = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \cdots$. The pattern reflects the symmetry of $\sin$.

**Visualization:** `TaylorPolynomialExplorer` embedded here — the flagship component.

**Static image:** `taylor-approximation.png` from the notebook.

### Section 7: Taylor's Theorem (with Remainder)

**The key theorem of the topic.** The Taylor polynomial $T_n$ approximates $f$ — but how well? Taylor's theorem gives a *quantitative* error bound via the remainder term.

**TheoremBlocks:**

- **Theorem 5: Taylor's Theorem (Lagrange Remainder)** — If $f$ is $(n+1)$-times differentiable on an interval containing $a$ and $x$, then $f(x) = T_n(x) + R_n(x)$ where $R_n(x) = \frac{f^{(n+1)}(c)}{(n+1)!}(x-a)^{n+1}$ for some $c$ between $a$ and $x$.
- **Proof of Theorem 5** — Full proof by induction on $n$. **Base case ($n=0$):** This is exactly the Mean Value Theorem: $f(x) = f(a) + f'(c)(x-a)$. **Inductive step:** Assume the theorem holds for $n-1$. Define the auxiliary function $\phi(t) = f(x) - \sum_{k=0}^{n} \frac{f^{(k)}(t)}{k!}(x-t)^k - \frac{f(x) - T_n(x)}{(x-a)^{n+1}}(x-t)^{n+1}$. Verify $\phi(a) = \phi(x) = 0$. By Rolle's theorem, there exists $c$ between $a$ and $x$ with $\phi'(c) = 0$. Differentiating and simplifying (the telescoping cancellation is the heart of the proof — expand it fully) yields the Lagrange remainder.
- **Remark 4: The integral form of the remainder** — $R_n(x) = \int_a^x \frac{f^{(n+1)}(t)}{n!}(x-t)^n \, dt$. This is sometimes more useful because it avoids the unknown point $c$. It also previews the Fundamental Theorem of Calculus — the integral form will be re-derived in **The Riemann Integral & FTC** *(coming soon)*.
- **Example 6: Taylor remainder for $e^x$** — $|R_n(x)| = \frac{e^c}{(n+1)!}|x|^{n+1} \leq \frac{e^{|x|}}{(n+1)!}|x|^{n+1}$. For any fixed $x$, $R_n(x) \to 0$ as $n \to \infty$ because $(n+1)!$ grows faster than $|x|^{n+1}$. This proves $e^x = \sum_{k=0}^{\infty} \frac{x^k}{k!}$ converges for all $x$.
- **Example 7: Taylor remainder for $\sin x$** — $|R_n(x)| \leq \frac{|x|^{n+1}}{(n+1)!} \to 0$ for all $x$, since all derivatives of $\sin$ are bounded by 1. Same conclusion: the Maclaurin series of $\sin x$ converges to $\sin x$ everywhere.

**Visualization:** `TaylorRemainderExplorer` embedded here.

**Static image:** `taylor-remainder.png` from the notebook.

### Section 8: When Taylor Series Fail

**A critical cautionary section.** Not every $C^\infty$ function equals its Taylor series. The fact that Taylor polynomials approximate well *locally* (small $|x-a|$, fixed $n$) does not guarantee that the Taylor *series* converges to $f$ (fixed $x$, $n \to \infty$).

**TheoremBlocks:**

- **Example 8: The function $f(x) = e^{-1/x^2}$ (with $f(0) = 0$)** — This function is $C^\infty$ everywhere. At $x = 0$, all derivatives $f^{(k)}(0) = 0$ (proved by induction using L'Hôpital's Rule — connecting to §5). So the Taylor series at $0$ is $T(x) = 0 + 0 + 0 + \cdots = 0$, but $f(x) > 0$ for all $x \neq 0$. The Taylor series converges (to $0$), but it does not converge to $f(x)$.
- **Definition 2: Analytic Function** — A function $f$ is **analytic** at $a$ if its Taylor series at $a$ converges to $f(x)$ in some neighborhood of $a$. Most functions encountered in practice ($e^x$, $\sin x$, $\cos x$, polynomials, rational functions away from poles) are analytic. The function $e^{-1/x^2}$ is the standard example of smooth-but-not-analytic.
- **Remark 5: Smooth vs. analytic in ML** — In practice, loss functions in ML are typically compositions of analytic functions (exponentials, logarithms, polynomials, ReLU is piecewise linear, hence piecewise analytic), so the Taylor expansion is a reliable local model. The distinction matters more in theory — the existence of smooth bump functions (which are $C^\infty$ with compact support and are *not* analytic) is essential for partition-of-unity arguments in differential geometry. (→ formalML: [Smooth Manifolds](https://formalml.com/topics/smooth-manifolds))

**Static image:** `smooth-not-analytic.png` from the notebook.

### Section 9: Connections to ML — Taylor Expansion in Optimization

**The most important ML connections section.** Taylor expansion is not just *used* in ML proofs — it is the primary analytical technique for understanding optimization algorithms.

**Subsection 9.1: The descent lemma.** If $\nabla f$ is $L$-Lipschitz ($\|\nabla f(x) - \nabla f(y)\| \leq L\|x - y\|$), then second-order Taylor expansion with Lagrange remainder gives $f(y) \leq f(x) + \nabla f(x)^T(y - x) + \frac{L}{2}\|y - x\|^2$. This inequality is the descent lemma — the foundation of every GD convergence proof. Setting $y = x - \frac{1}{L}\nabla f(x)$ and simplifying gives $f(y) \leq f(x) - \frac{1}{2L}\|\nabla f(x)\|^2$, which guarantees that each GD step decreases $f$ by at least $\frac{1}{2L}\|\nabla f\|^2$. (Show this in 1D where it reduces to standard MVT.)

**Subsection 9.2: Newton's method.** Newton's method approximates $f$ by its local *quadratic* Taylor model: $m(x) = f(x_k) + f'(x_k)(x - x_k) + \frac{1}{2}f''(x_k)(x - x_k)^2$. Minimizing $m$ gives $x_{k+1} = x_k - \frac{f'(x_k)}{f''(x_k)}$. For root-finding (find $x$ where $g(x) = 0$): linear Taylor gives $x_{k+1} = x_k - \frac{g(x_k)}{g'(x_k)}$. Near a root, the error satisfies $|x_{k+1} - x^*| \leq C|x_k - x^*|^2$ — quadratic convergence from Taylor remainder analysis.

**Subsection 9.3: Convergence rate comparison.** Using Taylor expansion, compare GD (first-order, linear convergence $\sim r^k$) vs. Newton (second-order, quadratic convergence $\sim r^{2^k}$). The practical trade-off: Newton needs the Hessian (expensive) but converges much faster. This is why L-BFGS and other quasi-Newton methods exist — they approximate the second-order Taylor model cheaply.

**Visualization:** `ConvergenceRateExplorer` embedded here.

**Static image:** `convergence-rate-comparison.png` from the notebook.

### Section 10: Computational Notes

**Taylor approximation in Python.** SymPy for symbolic Taylor expansion. NumPy for numerical evaluation. Error bounds in practice. Demonstrations:
- Compute Taylor polynomials of $e^x$ and compare with `np.exp`
- Measure approximation error as a function of degree $n$ and distance $|x - a|$
- SciPy's `scipy.optimize.minimize` with `method='Newton-CG'` — Newton's method in practice

**Static image:** `numerical-taylor.png` from the notebook.

### Section 11: Connections & Further Reading

Cross-reference table and DAG diagram. Same pattern as previous topics.

---

## 4. Visualizations

### 4.1 RollesTheoremExplorer

- **Component name:** `RollesTheoremExplorer`
- **Filename:** `src/components/viz/RollesTheoremExplorer.tsx`
- **What it visualizes:** A function $f$ on $[a,b]$ with $f(a) = f(b)$, the horizontal line through $f(a)$, and the critical point $c$ where $f'(c) = 0$. The tangent line at $c$ is shown, demonstrating it is horizontal (parallel to the $x$-axis).
- **User interactions:**
  - Function preset dropdown: $(x-1)(x-3)$ on $[1,3]$; $\sin(x)$ on $[0, \pi]$; $x^2 - 1$ on $[-1, 1]$; $x^3 - 3x$ on $[-\sqrt{3}, \sqrt{3}]$.
  - Point $c$ marker auto-computed and highlighted. For presets with multiple critical points, all are shown.
  - "Break hypotheses" toggle that demonstrates failure cases: (a) not continuous, (b) not differentiable, (c) $f(a) \neq f(b)$.
- **Numerical readout:** $f(a)$, $f(b)$, $c$ value(s), $f'(c)$ value(s).
- **Data source:** Inline computation (functions and their derivatives defined in the component or from `mean-value-taylor-data.ts`).
- **Panel layout:** Single panel with readout sidebar.

### 4.2 MeanValueTheoremExplorer

- **Component name:** `MeanValueTheoremExplorer`
- **Filename:** `src/components/viz/MeanValueTheoremExplorer.tsx`
- **What it visualizes:** A function $f$ on $[a,b]$, the secant line through $(a, f(a))$ and $(b, f(b))$, and the tangent line at the MVT point $c$ — parallel to the secant. The parallelism is the visual punchline.
- **User interactions:**
  - $a$ and $b$ sliders (adjustable interval endpoints).
  - Function preset dropdown: $x^2$, $x^3$, $\sin(x)$, $\sqrt{x}$, $\ln(x)$.
  - The MVT point $c$ auto-computed (numerically, using bisection or Newton's method on $f'(x) - \text{secant slope}$) and highlighted.
  - "Show all MVT points" toggle — for functions with multiple valid $c$ values.
- **Numerical readout:** Secant slope $\frac{f(b)-f(a)}{b-a}$, $c$ value(s), $f'(c)$.
- **Data source:** Inline computation + `differentiation.ts` utilities.
- **Panel layout:** Single panel with readout sidebar.
- **Reference pattern:** Extension of the derivative explorer pattern (§4 of reference doc) — reuses secant/tangent rendering.

### 4.3 TaylorPolynomialExplorer

- **Component name:** `TaylorPolynomialExplorer`
- **Filename:** `src/components/viz/TaylorPolynomialExplorer.tsx`
- **What it visualizes:** A function $f(x)$ and its Taylor polynomials $T_1, T_2, \ldots, T_n$ at a center $a$, with increasing degree. As the degree increases, the Taylor polynomial "hugs" the function over a wider interval. **This is the flagship component for the topic.**
- **User interactions:**
  - Degree $n$ slider (range: 1 to 15). As $n$ increases, higher-degree Taylor polynomials overlay the function.
  - "Animate" button that auto-increments $n$ from 1 to max with a smooth transition.
  - Function preset dropdown: $e^x$, $\sin(x)$, $\cos(x)$, $\ln(1+x)$, $\frac{1}{1+x^2}$, $(1+x)^\alpha$ (with $\alpha$ sub-slider).
  - Center $a$ slider (drag to change the expansion point — watch the Taylor polynomial shift).
  - Toggle: show/hide error shading $|f(x) - T_n(x)|$.
- **Numerical readout:** Current degree $n$, Taylor coefficients $\frac{f^{(k)}(a)}{k!}$ for $k = 0, \ldots, n$, max error on the visible interval.
- **Data source:** `mean-value-taylor-data.ts` for function presets; `differentiation.ts` for Taylor polynomial evaluation.
- **Panel layout:** Two-panel: left shows $f$ + $T_n$ overlay, right shows error magnitude $|f(x) - T_n(x)|$ on log scale.
- **Reference pattern:** Extension of the LinearApproximationExplorer pattern from Topic 5 — the linear approximation is $T_1$, and this component generalizes to $T_n$.

### 4.4 TaylorRemainderExplorer

- **Component name:** `TaylorRemainderExplorer`
- **Filename:** `src/components/viz/TaylorRemainderExplorer.tsx`
- **What it visualizes:** The Lagrange remainder bound $|R_n(x)| \leq \frac{M_{n+1}}{(n+1)!}|x-a|^{n+1}$ as a function of $x$ and $n$. Shows the *actual* error (from numerical computation) and the *bound* (from the Lagrange formula), demonstrating that the bound is conservative but valid.
- **User interactions:**
  - Degree $n$ slider (1 to 15).
  - Function preset dropdown (same presets as TaylorPolynomialExplorer).
  - Distance from center $|x - a|$ slider — watch how error grows with distance.
  - Toggle: "Actual error" / "Lagrange bound" / "Both."
- **Numerical readout:** Actual error $|f(x) - T_n(x)|$, Lagrange bound, and ratio (actual/bound).
- **Data source:** `mean-value-taylor-data.ts` + `differentiation.ts`.
- **Panel layout:** Single panel with log-scale $y$-axis for error, readout below.

### 4.5 ConvergenceRateExplorer

- **Component name:** `ConvergenceRateExplorer`
- **Filename:** `src/components/viz/ConvergenceRateExplorer.tsx`
- **What it visualizes:** Side-by-side comparison of gradient descent (first-order, uses $T_1$ model) vs. Newton's method (second-order, uses $T_2$ model) on the same objective function. Shows the iteration sequence, the local Taylor model used at each step, and the convergence rate difference (linear vs. quadratic).
- **User interactions:**
  - Function preset dropdown: $x^4 - 4x^2 + x$ (two local minima), $(x-1)^2 + 0.1\sin(5x)$ (noisy), $x^2$ (clean quadratic).
  - Initial point $x_0$ slider.
  - $\eta$ (learning rate) slider for GD.
  - "Step" button (advance one iteration) and "Play" button (auto-iterate).
  - Toggle: show/hide the local Taylor model ($T_1$ for GD, $T_2$ for Newton) at the current iterate.
- **Numerical readout:** Current iterate $x_k$, $f(x_k)$, $|x_k - x^*|$, iteration count.
- **Data source:** Inline computation.
- **Panel layout:** Two-panel: left = GD iterates with $T_1$ model overlays, right = Newton iterates with $T_2$ model overlays. Shared convergence plot below (log $|x_k - x^*|$ vs. $k$).

---

## 5. Data Modules

### 5.1 `mean-value-taylor-data.ts`

- **Filename:** `src/data/mean-value-taylor-data.ts`
- **Exported interfaces:**

```typescript
interface MVTFunctionPreset {
  name: string;
  label: string;                // Display label (e.g., "f(x) = x³")
  f: (x: number) => number;
  f_prime: (x: number) => number;
  domain: [number, number];     // Default [a, b] interval
  defaultA: number;
  defaultB: number;
}

interface RollesPreset {
  name: string;
  label: string;
  f: (x: number) => number;
  f_prime: (x: number) => number;
  a: number;
  b: number;                    // f(a) = f(b) guaranteed
  criticalPoints: number[];     // Known c values where f'(c) = 0
}

interface TaylorFunctionPreset {
  name: string;
  label: string;
  f: (x: number) => number;
  derivatives: ((x: number) => number)[];  // f, f', f'', ..., up to order 15+
  domain: [number, number];
  defaultCenter: number;
  maxDegree: number;
  knownSeries?: string;         // LaTeX representation of the series (for display)
}

interface ConvergencePreset {
  name: string;
  label: string;
  f: (x: number) => number;
  f_prime: (x: number) => number;
  f_double_prime: (x: number) => number;
  minimizer: number;            // x* (for error computation)
  domain: [number, number];
  defaultX0: number;
  defaultEta: number;
}
```

- **Exported constants:**
  - `MVT_PRESETS: MVTFunctionPreset[]` — 5 presets for MeanValueTheoremExplorer.
  - `ROLLES_PRESETS: RollesPreset[]` — 4 presets for RollesTheoremExplorer (+ 3 failure presets).
  - `TAYLOR_FUNCTION_PRESETS: TaylorFunctionPreset[]` — 6 presets with derivatives through order 15.
  - `CONVERGENCE_PRESETS: ConvergencePreset[]` — 3 presets for ConvergenceRateExplorer.
  - `SMOOTH_NOT_ANALYTIC_DATA` — Precomputed values of $e^{-1/x^2}$ and its Taylor polynomial (identically zero) for the "smooth vs. analytic" illustration.

- **Computation:** Derivatives array for Taylor presets involves defining up to 15 derivative functions — these are function references (cheap). The `SMOOTH_NOT_ANALYTIC_DATA` precomputation is a simple array of evaluated points (eager, negligible cost).

---

## 6. Shared Utility Module: `differentiation.ts` (Extension)

### Location

```
src/components/viz/shared/differentiation.ts
```

### New interfaces (additions to the existing module from Topic 5)

```typescript
interface TaylorPolynomial {
  center: number;
  degree: number;
  coefficients: number[];       // coefficients[k] = f^(k)(a) / k!
}

interface TaylorEvaluation {
  x: number;
  taylorValue: number;
  exactValue: number;
  error: number;
  lagrangeBound: number | null; // null if M_{n+1} unknown
}

interface MVTResult {
  a: number;
  b: number;
  secantSlope: number;
  c: number;                    // The MVT point (numerically computed)
  f_prime_c: number;            // f'(c), should ≈ secantSlope
}

interface NewtonStep {
  x: number;
  fx: number;
  fpx: number;
  fppx: number;
  nextX: number;
  taylorModel: TaylorPolynomial; // The local T_2 model at x
}
```

### New functions (additions)

```typescript
/** Compute the degree-n Taylor polynomial of f centered at a.
 *  `derivatives` is an array [f, f', f'', ...] of functions. */
export function computeTaylorPolynomial(
  derivatives: ((x: number) => number)[],
  a: number,
  degree: number
): TaylorPolynomial;

/** Evaluate a Taylor polynomial at x */
export function evaluateTaylorPolynomial(tp: TaylorPolynomial, x: number): number;

/** Compute Taylor evaluation with error and optional Lagrange bound */
export function evaluateTaylorWithError(
  f: (x: number) => number,
  derivatives: ((x: number) => number)[],
  a: number,
  x: number,
  degree: number,
  M_bound?: number             // Upper bound on |f^(n+1)| on [a,x] or [x,a]
): TaylorEvaluation;

/** Find the MVT point c numerically: solve f'(c) = (f(b)-f(a))/(b-a) */
export function findMVTPoint(
  f: (x: number) => number,
  f_prime: (x: number) => number,
  a: number,
  b: number,
  tolerance?: number
): MVTResult;

/** Find all MVT points (there may be multiple) */
export function findAllMVTPoints(
  f: (x: number) => number,
  f_prime: (x: number) => number,
  a: number,
  b: number,
  nSamples?: number,
  tolerance?: number
): MVTResult[];

/** One step of Newton's method for optimization: x_{k+1} = x_k - f'(x_k)/f''(x_k) */
export function newtonOptimizationStep(
  f: (x: number) => number,
  f_prime: (x: number) => number,
  f_double_prime: (x: number) => number,
  x: number
): NewtonStep;

/** One step of Newton's method for root-finding: x_{k+1} = x_k - g(x_k)/g'(x_k) */
export function newtonRootStep(
  g: (x: number) => number,
  g_prime: (x: number) => number,
  x: number
): { x: number; gx: number; nextX: number };

/** Run gradient descent for n steps, returning the full trajectory */
export function gradientDescentTrajectory(
  f: (x: number) => number,
  f_prime: (x: number) => number,
  x0: number,
  eta: number,
  nSteps: number
): Array<{ k: number; x: number; fx: number; f_prime_x: number }>;

/** Run Newton optimization for n steps, returning the full trajectory */
export function newtonTrajectory(
  f: (x: number) => number,
  f_prime: (x: number) => number,
  f_double_prime: (x: number) => number,
  x0: number,
  nSteps: number
): Array<{ k: number; x: number; fx: number; taylorModel: TaylorPolynomial }>;
```

### Backward compatibility

**Extension only** — all existing interfaces and functions from Topic 5 remain unchanged. New interfaces and functions are added. No existing code is modified.

---

## 7. Curriculum Graph Updates

### `src/data/curriculum-graph.json`

**Add node:**
```json
{ "id": "mean-value-taylor", "label": "Mean Value Theorem & Taylor Expansion", "domain": "single-variable", "status": "published", "url": "/topics/mean-value-taylor" }
```

**Add edges:**
```json
{ "source": "derivative", "target": "mean-value-taylor" },
{ "source": "completeness-compactness", "target": "mean-value-taylor" }
```

**Note:** Do *not* add edges from `mean-value-taylor` to downstream topics (`riemann-integral`, `power-taylor-series`, `hessian`) yet — those edges will be added when those topics are implemented.

### `src/data/curriculum.ts`

In the `single-variable` track, change `"Mean Value Theorem & Taylor Expansion"` from `planned` to `published`. All other unpublished topics in the track remain `planned`.

---

## 8. Cross-References

### Existing topics that should link TO `mean-value-taylor`

- **`derivative.mdx`** — If there is a forward reference like "**Mean Value Theorem & Taylor Expansion** *(coming soon)*", update it to a live link: `[Mean Value Theorem & Taylor Expansion](/topics/mean-value-taylor)`. Check §7 (higher-order derivatives preview) and §6 (chain rule section) of the derivative topic for these references.
- **`completeness-compactness.mdx`** — If there is a forward reference to this topic (e.g., in the EVT section where applications of compactness are discussed), update it to a live link.

### Topics that `mean-value-taylor` links FROM (back-references)

- `[The Derivative & Chain Rule](/topics/derivative)` — referenced throughout when invoking derivative definition, differentiation rules, and chain rule.
- `[Completeness & Compactness](/topics/completeness-compactness)` — referenced in Rolle's theorem proof (EVT via Heine-Borel).
- `[Sequences, Limits & Convergence](/topics/sequences-limits)` — referenced for convergence rate framework in §9.
- `[Epsilon-Delta & Continuity](/topics/epsilon-delta)` — referenced for continuity hypotheses in Rolle/MVT, L'Hôpital's limit handling.

### Forward references to planned topics (plain text, not links)

- **The Riemann Integral & FTC** *(coming soon)* — referenced in §7 (integral form of the Taylor remainder) and §11 (FTC depends on MVT).
- **Improper Integrals & Special Functions** *(coming soon)* — referenced in §11 (Stirling's approximation as Taylor expansion of $\ln(\Gamma)$).
- **Power Series & Taylor Series** *(coming soon)* — referenced in §8 (Taylor polynomial → Taylor series convergence) and §11.
- **Partial Derivatives & the Gradient** *(coming soon)* — referenced in §9 (multivariable Taylor expansion preview, descent lemma in $\mathbb{R}^n$).
- **The Hessian & Second-Order Analysis** *(coming soon)* — referenced in §9 (Newton's method, second-order Taylor model, Hessian as $\nabla^2 f$).

### formalml.com forward links (external, informational only)

- [Gradient Descent](https://formalml.com/topics/gradient-descent) → formalML
- [Proximal Methods](https://formalml.com/topics/proximal-methods) → formalML
- [Smooth Manifolds](https://formalml.com/topics/smooth-manifolds) → formalML

All open in new tab with `target="_blank" rel="noopener"`.

---

## 9. Images

All images from the notebook go to `public/images/topics/mean-value-taylor/`.

| Filename | Description |
|----------|-------------|
| `rolles-theorem.png` | Three-panel: Rolle's theorem on three different functions, showing $f(a) = f(b)$ and horizontal tangent at $c$ |
| `mean-value-theorem.png` | Two-panel: MVT with secant line and parallel tangent on $x^3$ and $\sin(x)$ |
| `mvt-consequences.png` | Three-panel: zero derivative → constant, positive derivative → increasing, bounded derivative → Lipschitz |
| `lhopitals-rule.png` | Two-panel: L'Hôpital's applied to $\sin(x)/x$ and $(e^x - 1)/x$ |
| `taylor-approximation.png` | Three-panel: Taylor polynomials of degrees 1, 3, 7 approximating $e^x$ on $[-3, 3]$ |
| `taylor-remainder.png` | Two-panel: actual error vs. Lagrange bound for $e^x$ and $\sin(x)$ Taylor approximations |
| `smooth-not-analytic.png` | Two-panel: $e^{-1/x^2}$ and its Taylor series (identically zero), plus error plot |
| `convergence-rate-comparison.png` | Two-panel: GD vs. Newton iteration paths on a function + log error vs. iteration (linear vs. quadratic slope) |
| `numerical-taylor.png` | Two-panel: Taylor polynomial accuracy vs. degree + accuracy vs. distance from center |

All images referenced in MDX with:

```mdx
![Rolle's theorem illustration](/images/topics/mean-value-taylor/rolles-theorem.png)
```

---

## 10. Testing Checklist

### Topic content

- [ ] Topic page renders at `/topics/mean-value-taylor`
- [ ] Title, subtitle, difficulty badge ("intermediate"), reading time display correctly
- [ ] Abstract renders in the info box
- [ ] Prerequisites section shows links to `derivative` and `completeness-compactness`
- [ ] formalML forward links box renders with badges (gradient-descent, proximal-methods, smooth-manifolds)
- [ ] All TheoremBlocks render KaTeX correctly (2 definitions, 5 theorems, 3 corollaries, 1 proposition, 8 examples, 5 remarks)
- [ ] All proofs display with ∎ tombstone
- [ ] Static images load from `public/images/topics/mean-value-taylor/`
- [ ] All internal cross-references to `derivative`, `completeness-compactness`, `sequences-limits`, `epsilon-delta` resolve (not 404)

### Viz components

- [ ] `RollesTheoremExplorer` loads on scroll (`client:visible`)
- [ ] `RollesTheoremExplorer` function preset dropdown works for all 4 presets
- [ ] `RollesTheoremExplorer` critical points auto-computed and highlighted
- [ ] `RollesTheoremExplorer` "Break hypotheses" toggle shows failure cases
- [ ] `MeanValueTheoremExplorer` loads on scroll (`client:visible`)
- [ ] `MeanValueTheoremExplorer` $a$/$b$ sliders adjust interval and update secant
- [ ] `MeanValueTheoremExplorer` MVT point $c$ auto-computed and tangent drawn parallel to secant
- [ ] `MeanValueTheoremExplorer` "Show all MVT points" toggle works
- [ ] `MeanValueTheoremExplorer` function preset dropdown works for all 5 presets
- [ ] `TaylorPolynomialExplorer` loads on scroll (`client:visible`)
- [ ] `TaylorPolynomialExplorer` degree $n$ slider updates Taylor polynomial overlay
- [ ] `TaylorPolynomialExplorer` "Animate" button auto-increments degree smoothly
- [ ] `TaylorPolynomialExplorer` function preset dropdown works for all 6 presets
- [ ] `TaylorPolynomialExplorer` center $a$ slider repositions expansion point
- [ ] `TaylorPolynomialExplorer` error toggle shows/hides shading
- [ ] `TaylorPolynomialExplorer` two-panel layout (function + error) renders correctly
- [ ] `TaylorRemainderExplorer` loads on scroll (`client:visible`)
- [ ] `TaylorRemainderExplorer` degree slider updates error curves
- [ ] `TaylorRemainderExplorer` "Actual/Bound/Both" toggle works
- [ ] `TaylorRemainderExplorer` log-scale $y$-axis renders correctly
- [ ] `ConvergenceRateExplorer` loads on scroll (`client:visible`)
- [ ] `ConvergenceRateExplorer` "Step" and "Play" buttons advance iterations
- [ ] `ConvergenceRateExplorer` GD and Newton trajectories update in real time
- [ ] `ConvergenceRateExplorer` Taylor model overlays ($T_1$ for GD, $T_2$ for Newton) toggle on/off
- [ ] `ConvergenceRateExplorer` log error plot shows linear slope (GD) vs. quadratic slope (Newton)

### Cross-references

- [ ] Links to `derivative` and `completeness-compactness` work (resolve to published pages)
- [ ] Links to `sequences-limits` and `epsilon-delta` work (resolve to published pages)
- [ ] `derivative.mdx` updated: forward references to this topic are now live links
- [ ] `completeness-compactness.mdx` updated: forward references to this topic are now live links (if any)
- [ ] All other forward references use plain text + "(coming soon)"
- [ ] All formalml.com links open in a new tab with `target="_blank" rel="noopener"`

### Infrastructure

- [ ] `differentiation.ts` extension compiles with no TypeScript errors
- [ ] All existing `differentiation.ts` exports still work (backward compatibility)
- [ ] `mean-value-taylor-data.ts` data module compiles
- [ ] Page is responsive (viz components stack vertically on mobile)
- [ ] "Intermediate" difficulty badge is styled correctly (blue)
- [ ] Curriculum graph shows `mean-value-taylor` as "published" (not "coming soon")
- [ ] Pagefind indexes the new topic on rebuild
- [ ] Build succeeds with zero errors: `pnpm build`

---

## 11. Build Order

1. **Extend `src/components/viz/shared/differentiation.ts`** — Add the new interfaces (`TaylorPolynomial`, `TaylorEvaluation`, `MVTResult`, `NewtonStep`) and new functions (`computeTaylorPolynomial`, `evaluateTaylorPolynomial`, `evaluateTaylorWithError`, `findMVTPoint`, `findAllMVTPoints`, `newtonOptimizationStep`, `newtonRootStep`, `gradientDescentTrajectory`, `newtonTrajectory`). Write console log tests to verify. Confirm all existing exports still work.
2. **Create `src/data/mean-value-taylor-data.ts`** — All presets (MVT, Rolle's, Taylor function, convergence). The Taylor presets require defining derivative arrays through order 15 for functions like $e^x$, $\sin(x)$, etc. Verify exports compile.
3. **Create `mean-value-taylor.mdx`** with full frontmatter and all markdown/LaTeX content. Use `TheoremBlock` for all formal elements (2 definitions, 5 theorems, 3 corollaries, 1 proposition, 8 examples, 5 remarks, proofs). No interactive components yet — just the prose and static images.
4. Copy notebook figures to `public/images/topics/mean-value-taylor/` and verify they load in the MDX.
5. **Build `TaylorPolynomialExplorer.tsx`** — the flagship component. Start with the degree slider and function rendering, then add function presets, center slider, animation, and error panel. This is the most important visualization on the page.
6. **Build `MeanValueTheoremExplorer.tsx`** — secant line + parallel tangent at MVT point.
7. **Build `RollesTheoremExplorer.tsx`** — simpler version of MVT explorer with f(a)=f(b) constraint.
8. **Build `TaylorRemainderExplorer.tsx`** — error analysis with log-scale plot.
9. **Build `ConvergenceRateExplorer.tsx`** — GD vs. Newton comparison with Taylor model overlays.
10. Embed all five components in the MDX at their appropriate section positions with `client:visible`.
11. **Update `derivative.mdx`** — Change any forward references to "**Mean Value Theorem & Taylor Expansion** *(coming soon)*" to live links: `[Mean Value Theorem & Taylor Expansion](/topics/mean-value-taylor)`.
12. **Update `completeness-compactness.mdx`** — Change any forward references to this topic to live links (if applicable).
13. **Update curriculum graph data** — change `mean-value-taylor` status from `"planned"` to `"published"` in `curriculum-graph.json`. Add node and edges.
14. **Update `curriculum.ts`** — move `"Mean Value Theorem & Taylor Expansion"` from `planned` to `published` in the `single-variable` track.
15. Run topic content and viz checklist (§10).
16. `pnpm build` — verify zero errors.
17. Commit and deploy.

---

## Appendix A: Key Differences from the Derivative Brief (Topic 5)

1. **Second topic in the track, not first.** The derivative topic opened the Single-Variable Calculus track and created the `differentiation.ts` shared module. This topic extends that module — backward compatibility is critical. All existing interfaces and functions must remain unchanged.
2. **Intermediate difficulty, not foundational.** The reader has now completed five topics and is comfortable with ε-δ proofs, limit arguments, and the derivative definition. The MVT proof combines differentiation (Topic 5) with compactness/EVT (Topic 3), a new kind of argument that combines tools from different tracks. Taylor's theorem proof is inductive and involves the construction of an auxiliary function. These require more mathematical maturity.
3. **Cross-track prerequisite.** This is the first topic that depends on a topic from a different track: `completeness-compactness` (Track 1, Topic 3). The EVT → Rolle → MVT chain explicitly depends on the compactness machinery. This cross-track dependency should be noted in the prose ("we use the Extreme Value Theorem, which we proved in [Completeness & Compactness](/topics/completeness-compactness) using the Heine-Borel theorem").
4. **The flagship viz is different in character.** The derivative topic's flagship (`SecantToTangentExplorer`) showed a single concept (secant → tangent). The Taylor topic's flagship (`TaylorPolynomialExplorer`) shows an *iterative process* (polynomials of degrees 1, 2, 3, ... converging to the function). This requires a different UX — the animation/slider behavior is additive (each degree adds a polynomial) rather than continuous (as in the derivative explorer's $h$ slider).
5. **The ML connection is analytical, not structural.** The derivative topic's ML connection was structural: backpropagation *is* the chain rule. The MVT/Taylor topic's ML connection is analytical: Taylor expansion is the *tool* used in convergence proofs. The connection is through *proof technique* rather than *identity*. The ConvergenceRateExplorer should make this tangible by showing how first-order and second-order Taylor models yield different convergence rates.
6. **L'Hôpital's Rule is a bonus.** It follows naturally from Cauchy's MVT and fills a gap — students have used L'Hôpital for years without seeing a proof. Including it here (rather than in a separate topic) keeps the curriculum compact and gives Cauchy's MVT a concrete application.

---

## Appendix B: Formal Element Inventory

| Type | # | Title |
|------|---|-------|
| Definition | 1 | Taylor Polynomial |
| Definition | 2 | Analytic Function |
| Proposition | 1 | Taylor Polynomial as Best Polynomial Approximation |
| Theorem | 1 | Rolle's Theorem |
| Theorem | 2 | The Mean Value Theorem |
| Theorem | 3 | Cauchy's Mean Value Theorem |
| Theorem | 4 | L'Hôpital's Rule (0/0 form) |
| Theorem | 5 | Taylor's Theorem (Lagrange Remainder) |
| Corollary | 1 | Zero Derivative Implies Constant |
| Corollary | 2 | Monotonicity from Derivative Sign |
| Corollary | 3 | Bounded Derivative Implies Lipschitz |
| Example | 1 | Rolle's on $x^2 - 4x + 3$ on $[1,3]$ |
| Example | 2 | MVT on $x^3$ on $[0,2]$ |
| Example | 3 | L'Hôpital's: $\lim \sin x / x$ |
| Example | 4 | Taylor polynomials of $e^x$ |
| Example | 5 | Taylor polynomials of $\sin x$ |
| Example | 6 | Taylor remainder for $e^x$ |
| Example | 7 | Taylor remainder for $\sin x$ |
| Example | 8 | Smooth-but-not-analytic: $e^{-1/x^2}$ |
| Remark | 1 | Why all three Rolle hypotheses matter |
| Remark | 2 | Lipschitz continuity and ML |
| Remark | 3 | L'Hôpital's caveats |
| Remark | 4 | Integral form of the Taylor remainder |
| Remark | 5 | Smooth vs. analytic in ML |
| Proof | — | 7 proofs total (Theorem 1, Theorem 2, Theorem 3, Theorem 4, Theorem 5, Corollary 1, Corollary 2) |

---

*Brief version: v1 | Created: 2026-03-30 | Author: Jonathan Rocha*  
*Reference notebook: `notebooks/mean-value-taylor/06_mean_value_taylor.ipynb`*  
*Reference doc: `docs/plans/formalcalculus-handoff-reference.md`*
