# Claude Code Handoff Brief: Line Integrals & Conservative Fields

**Project:** formalCalculus — [formalcalculus.com](https://www.formalcalculus.com)  
**Repo:** `github.com/jonx0037/formalCalculus`  
**Stack:** Astro 6 · React 19 · MDX · Tailwind CSS 4 · D3.js 7 · KaTeX · Vercel  
**Package Manager:** pnpm  
**Status:** Ready for implementation  
**Reference Notebook:** `notebooks/line-integrals/15_line_integrals.ipynb`  
**Reference Doc:** `docs/plans/formalcalculus-handoff-reference.md`

---

## 1. Objective

Add a new topic page **"Line Integrals & Conservative Fields"** as the **third topic in the Multivariable Integral Calculus track** on formalcalculus.com.

1. This is **topic 15 of 32** and the **fifteenth topic published** on formalcalculus.com. All four topics in the Limits & Continuity track (`sequences-limits`, `epsilon-delta`, `completeness-compactness`, `uniform-convergence`), all four topics in the Single-Variable Calculus track (`derivative`, `mean-value-taylor`, `riemann-integral`, `improper-integrals`), all four topics in the Multivariable Differential Calculus track (`gradient`, `jacobian`, `hessian`, `inverse-implicit`), and the first two topics in the Multivariable Integral Calculus track (`multiple-integrals`, `change-of-variables`) are deployed and live.
2. **Prerequisites:** `multiple-integrals` and `gradient`. Multiple Integrals (Topic 13) provides the double integral machinery needed for Green's theorem — the link between line integrals and area integrals. The gradient (Topic 9) provides the gradient vector $\nabla f$ that characterizes conservative fields: a vector field $\mathbf{F}$ is conservative if and only if $\mathbf{F} = \nabla f$ for some potential function $f$. The Gradient Theorem (FTC for line integrals) says $\int_C \nabla f \cdot d\mathbf{r} = f(\mathbf{b}) - f(\mathbf{a})$ — this is a direct application of the gradient concept to integration along paths. Note: `change-of-variables` is **not** a prerequisite. Line integrals do not require coordinate substitution machinery; they parameterize curves directly. The change-of-variables formula feeds into `surface-integrals` instead, where the surface area element involves the Jacobian of the parameterization map.
3. **Difficulty: intermediate.** The reader knows multiple integrals and Fubini (Topic 13, intermediate), partial derivatives and the gradient (Topic 9, foundational), and the chain rule (Topics 5 and 10). The conceptual leap here is integrating along *curves* rather than over *regions* — the integral's domain is a one-dimensional object embedded in $\mathbb{R}^n$. The formalism is new (parameterized curves, arc length element $ds$, the work integral $\int_C \mathbf{F} \cdot d\mathbf{r}$), but each piece reduces to single-variable integration via parameterization.
4. **Third topic in Track 4.** After this, only Surface Integrals & the Divergence Theorem remain to complete the Multivariable Integral Calculus track. That final topic has the heaviest dependency structure of any topic in the track — it requires all three predecessors (`multiple-integrals`, `change-of-variables`, and `line-integrals`).
5. **Downstream within formalCalculus:**
   - `surface-integrals` (direct) — Surface integrals generalize line integrals from curves to surfaces. Stokes' theorem $\oint_C \mathbf{F} \cdot d\mathbf{r} = \iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S}$ generalizes Green's theorem from 2D to 3D, relating a line integral around a boundary to a surface integral of the curl. The divergence theorem $\iint_S \mathbf{F} \cdot d\mathbf{S} = \iiint_E \nabla \cdot \mathbf{F}\,dV$ relates surface integrals to volume integrals. Completing this topic is a prerequisite gate for Topic 16.
   - `first-order-odes` (indirect) — Exact differential equations $M(x,y)\,dx + N(x,y)\,dy = 0$ are exact when $\partial M / \partial y = \partial N / \partial x$ — the same criterion as conservative vector fields. The integrating factor technique is the ODE analog of finding a potential function.
   - `metric-spaces` (indirect) — Path length as $\int_C ds$ becomes the intrinsic metric on a Riemannian manifold. Geodesics are length-minimizing curves.
   - `calculus-of-variations` (indirect) — The calculus of variations studies functionals $J[\gamma] = \int_a^b L(\gamma(t), \gamma'(t), t)\,dt$ — these are line integrals over path space. The Euler-Lagrange equation characterizes extremal paths.
6. **Forward links to formalml.com:**
   - `gradient-descent` — Gradient flow $\dot{\theta}(t) = -\nabla L(\theta(t))$ is a continuous-time ODE whose solution traces a curve in parameter space. The Gradient Theorem quantifies the total loss decrease along this curve: $L(\theta(T)) - L(\theta(0)) = \int_C \nabla L \cdot d\mathbf{r} = -\int_0^T \|\nabla L(\theta(t))\|^2\,dt \le 0$. This identity is why gradient flow always decreases the loss — the integral of $\|\nabla L\|^2$ along the path is the total "work done." Discrete gradient descent approximates this flow.
   - `smooth-manifolds` — Line integrals are integrals of differential 1-forms $\omega = P\,dx + Q\,dy$ along curves. Conservative fields correspond to exact 1-forms ($\omega = df$). The exactness criterion $\partial P / \partial y = \partial Q / \partial x$ says $\omega$ is *closed*. On simply connected domains, closed = exact (Poincaré lemma). On domains with holes, closed ≠ exact — the gap is measured by de Rham cohomology $H^1_{\text{dR}}$. Green's theorem is the 2D instance of Stokes' theorem for differential forms.
   - `information-geometry` — Geodesics on the statistical manifold (curves of minimum Fisher-Rao length) are characterized by line integrals of the metric tensor. The natural gradient $\tilde{\nabla}L = I(\theta)^{-1}\nabla L$ follows geodesics rather than straight lines in parameter space.
7. This topic **extends** the shared utility module `integration.ts` (created by Topic 7, extended by Topics 8, 13, and 14) with `lineIntegralScalar`, `lineIntegralVector`, `computeCirculation`, `computeWorkIntegral`, and `arcLength`. All existing functions in `integration.ts` remain unchanged. It also **extends** `multivariate.ts` (created by Topic 9, extended by Topics 10–14) with `curl2D`, `divergence2D`, `isConservative2D`, and `potentialFunction2D`. All existing functions in `multivariate.ts` remain unchanged.
8. **Resolves forward references from Topics 13 and 9.**
   - Topic 13 (`multiple-integrals`) Section 8/9: "Green's theorem connects line integrals to double integrals over the enclosed region." Forward ref to line integrals.
   - Topic 9 (`gradient`) Section on gradient and level sets: "The gradient of a potential function gives a conservative vector field" — forward ref to conservative fields.
   - Topic 14 (`change-of-variables`) Section 1: "Path parameterization is a change of variables from the parameter domain to the curve" — indirect forward ref.

**Content scope:**

- Parameterized curves in $\mathbb{R}^n$: smooth, piecewise-smooth, reparameterization, arc length
- Scalar line integrals: $\int_C f\,ds = \int_a^b f(\mathbf{r}(t))\,\|\mathbf{r}'(t)\|\,dt$ — integrating a function over a curve, weighted by arc length
- Vector line integrals (work integrals): $\int_C \mathbf{F} \cdot d\mathbf{r} = \int_a^b \mathbf{F}(\mathbf{r}(t)) \cdot \mathbf{r}'(t)\,dt$ — integrating a vector field along a directed path
- Properties: linearity, additivity over path concatenation, orientation reversal
- Conservative vector fields: $\mathbf{F} = \nabla f$ for a potential function $f$
- The Gradient Theorem (FTC for line integrals): $\int_C \nabla f \cdot d\mathbf{r} = f(\mathbf{r}(b)) - f(\mathbf{r}(a))$ — the integral depends only on the endpoints
- Path independence: equivalent to conservativeness on connected domains
- Exactness criterion: $\frac{\partial P}{\partial y} = \frac{\partial Q}{\partial x}$ on simply connected domains — necessary and sufficient
- Non-simply-connected domains: the vortex field $\mathbf{F} = \left(\frac{-y}{x^2+y^2}, \frac{x}{x^2+y^2}\right)$ is closed but not exact — the topology of the domain matters
- Green's theorem: $\oint_C (P\,dx + Q\,dy) = \iint_D \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)\,dA$ — the connection between line integrals and double integrals
- Curl as infinitesimal circulation: $(\nabla \times \mathbf{F}) \cdot \hat{\mathbf{k}} = \lim_{r \to 0} \frac{1}{\pi r^2} \oint_{C_r} \mathbf{F} \cdot d\mathbf{r}$
- Area computation via line integrals: $A = \frac{1}{2} \oint_C (x\,dy - y\,dx)$
- ML connections: gradient flow as continuous-time gradient descent, energy-based models and potential functions, loss landscape path analysis, natural gradient as geodesic flow

---

## 2. MDX File

### Location

```
src/content/topics/line-integrals.mdx
```

The entry `id` will be `line-integrals`. The dynamic route resolves to `/topics/line-integrals`.

### Frontmatter

```yaml
---
title: "Line Integrals & Conservative Fields"
subtitle: "Integrating functions and vector fields along curves — the Gradient Theorem as the FTC for paths, conservative fields and potential functions, path independence, Green's theorem connecting circulation to double integrals, and gradient flow as continuous-time optimization."
status: "published"
difficulty: "intermediate"
prerequisites:
  - "multiple-integrals"
  - "gradient"
tags:
  - "calculus"
  - "line-integral"
  - "vector-field"
  - "conservative-field"
  - "potential-function"
  - "gradient-theorem"
  - "path-independence"
  - "greens-theorem"
  - "circulation"
  - "curl"
  - "exact-form"
  - "gradient-flow"
domain: "multivar-integral"
videoId: null
notebookPath: "notebooks/line-integrals/15_line_integrals.ipynb"
githubUrl: "https://github.com/jonx0037/formalCalculus/blob/main/src/content/topics/line-integrals.mdx"
datePublished: 2026-04-25
estimatedReadTime: 50
abstract: "Line integrals extend integration from intervals and regions to curves. Given a parameterized curve C in ℝⁿ and a scalar function f, the scalar line integral ∫_C f ds = ∫_a^b f(r(t)) ‖r'(t)‖ dt sums f along C weighted by arc length. Given a vector field F, the vector line integral (work integral) ∫_C F · dr = ∫_a^b F(r(t)) · r'(t) dt measures the total work done by F along C. A vector field F is conservative if F = ∇f for some potential function f. The Gradient Theorem — the Fundamental Theorem of Calculus for line integrals — states that ∫_C ∇f · dr = f(r(b)) − f(r(a)): the integral depends only on the endpoints, not the path. This is equivalent to path independence: the integral of a conservative field between two points is the same regardless of which curve connects them. In ℝ², the exactness criterion ∂P/∂y = ∂Q/∂x characterizes conservative fields on simply connected domains. On domains with holes, closed fields need not be exact — the topology of the domain matters, as demonstrated by the vortex field. Green's theorem provides the bridge between line integrals and double integrals: the circulation ∮_C F · dr around a closed curve equals the double integral ∬_D (∂Q/∂x − ∂P/∂y) dA over the enclosed region. The integrand is the 2D curl of F, measuring infinitesimal rotation. Green's theorem also yields the area formula A = ½ ∮_C (x dy − y dx). In machine learning, gradient flow dθ/dt = −∇L(θ) traces a curve in parameter space along which the loss decreases monotonically — the Gradient Theorem guarantees L(θ(T)) − L(θ(0)) = −∫₀ᵀ ‖∇L(θ(t))‖² dt ≤ 0. Energy-based models define a scalar potential whose gradient field governs the model's dynamics. The natural gradient follows geodesics on the statistical manifold rather than straight lines in parameter space."
formalmlConnections:
  - topic: "gradient-descent"
    site: "formalml"
    relationship: "Gradient flow dθ/dt = −∇L(θ) traces a curve in parameter space. The Gradient Theorem gives L(θ(T)) − L(θ(0)) = −∫₀ᵀ ‖∇L‖² dt ≤ 0, proving the loss decreases monotonically along the flow. Discrete gradient descent approximates this continuous path, and the integral quantifies convergence."
  - topic: "smooth-manifolds"
    site: "formalml"
    relationship: "Line integrals are integrals of differential 1-forms ω = P dx + Q dy along curves. Conservative fields are exact forms (ω = df). The gap between closed and exact forms — measured by de Rham cohomology H¹ — is the topological obstruction to conservativeness. Green's theorem is the 2D Stokes' theorem."
  - topic: "information-geometry"
    site: "formalml"
    relationship: "Geodesics on the statistical manifold minimize the Fisher-Rao length functional — a line integral of the metric tensor. The natural gradient follows these geodesics, and path length in the Fisher-Rao metric measures statistical distinguishability."
connections:
  - topic: "multiple-integrals"
    relationship: "Green's theorem converts a line integral around a closed curve into a double integral over the enclosed region. The double integral machinery from Topic 13 — Fubini, Type I/II regions, iterated integration — is applied directly."
  - topic: "gradient"
    relationship: "The gradient ∇f is the engine of conservative fields. The Gradient Theorem is the direct connection: ∫_C ∇f · dr = f(b) − f(a). The gradient's orthogonality to level sets (Topic 9) explains why work integrals along level curves vanish."
  - topic: "derivative"
    relationship: "The Fundamental Theorem of Calculus (Topic 7, via Topic 5) has a direct analog: the Gradient Theorem is the FTC for line integrals. The chain rule d/dt f(r(t)) = ∇f(r(t)) · r'(t) is the key step in its proof."
  - topic: "jacobian"
    relationship: "The multivariate chain rule J_{f∘g} = J_f · J_g (Topic 10) generalizes the chain rule step in the Gradient Theorem proof to vector-valued functions. The Jacobian framework clarifies why ∫_C F · dr is parameterization-independent."
  - topic: "epsilon-delta"
    relationship: "Continuity of F along the curve and continuity of r'(t) are the hypotheses that make the Riemann sum definition of the line integral well-defined. The limit of the approximating sums exists by the same uniform continuity argument as Topic 7."
  - topic: "completeness-compactness"
    relationship: "Compactness of the curve image r([a,b]) ensures that continuous vector fields are bounded on C and that the line integral is well-defined as a finite number."
  - topic: "riemann-integral"
    relationship: "After parameterization, every line integral reduces to a single-variable Riemann integral ∫_a^b g(t) dt. The existence and properties of line integrals follow from the 1D theory in Topic 7."
references:
  - type: "book"
    title: "Calculus on Manifolds"
    authors: "Spivak"
    year: 1965
    note: "Chapter 4 — integration on chains, Stokes' theorem in the language of differential forms"
  - type: "book"
    title: "Vector Calculus, Linear Algebra, and Differential Forms"
    authors: "Hubbard & Hubbard"
    year: 2015
    note: "Chapter 6 — line integrals, conservative fields, Green's theorem with geometric exposition"
  - type: "book"
    title: "Analysis on Manifolds"
    authors: "Munkres"
    year: 1991
    note: "Chapter 5 — line integrals and Green's theorem with rigorous measurability conditions"
  - type: "book"
    title: "Div, Grad, Curl, and All That"
    authors: "Schey"
    year: 2005
    note: "Chapters 2-3 — physical motivation for line integrals via work, circulation, and flux"
  - type: "book"
    title: "Principles of Mathematical Analysis"
    authors: "Rudin"
    year: 1976
    note: "Chapter 10 — differential forms and Stokes' theorem in Rⁿ"
  - type: "paper"
    title: "A Tutorial on Energy-Based Learning"
    authors: "LeCun, Chopra, Hadsell, Ranzato & Huang"
    year: 2006
    note: "Energy functions as potential functions whose gradient fields govern model dynamics"
  - type: "paper"
    title: "Natural Gradient Works Efficiently in Learning"
    authors: "Amari"
    year: 1998
    note: "The natural gradient as a geodesic direction on the statistical manifold — line integral of the Fisher information metric"
---
```

---

## 3. Content Outline

### Section 1: Overview & Motivation

**Opening example:** You're training a neural network. At each step, gradient descent moves the parameter vector $\theta$ a small distance in the direction $-\nabla L(\theta)$. The parameters trace a *curve* through parameter space — a winding path from initialization to (hopefully) a minimum. How much does the loss decrease along that entire path? The answer is a line integral: $\Delta L = \int_C \nabla L \cdot d\mathbf{r}$. The Gradient Theorem — the subject of this topic — says this integral equals $L(\theta_{\text{final}}) - L(\theta_{\text{init}})$, regardless of the path's shape. This is the Fundamental Theorem of Calculus, generalized from intervals to curves in $\mathbb{R}^n$.

But not every vector field is a gradient. When a field *is* a gradient — when it is *conservative* — integration becomes dramatically simpler: the integral depends only on the endpoints, not the path. When a field is not conservative, the path matters, and the distinction between "conservative" and "not conservative" becomes a topological question about the domain.

No TheoremBlocks. No viz. 2–3 paragraphs.

### Section 2: Parameterized Curves

**Setting the stage.** Before we can integrate along curves, we need to say precisely what a curve is and how to measure length along it.

**Geometric-first:** A curve in $\mathbb{R}^n$ is a path traced out by a moving point. The parameterization $\mathbf{r}(t) = (x_1(t), \ldots, x_n(t))$ for $t \in [a, b]$ gives the position at "time" $t$. The velocity vector $\mathbf{r}'(t)$ points along the curve, and its magnitude $\|\mathbf{r}'(t)\|$ is the speed. Arc length is the integral of speed: $s = \int_a^b \|\mathbf{r}'(t)\|\,dt$.

**TheoremBlocks:**

- **Definition 1: Parameterized Curve** — A *parameterized curve* in $\mathbb{R}^n$ is a continuous function $\mathbf{r}: [a, b] \to \mathbb{R}^n$. The curve is *smooth* if $\mathbf{r}$ is $C^1$ and $\mathbf{r}'(t) \neq \mathbf{0}$ for all $t \in (a, b)$ (the velocity never vanishes — the particle never stops). The curve is *piecewise smooth* if $[a, b]$ can be partitioned into finitely many subintervals on each of which $\mathbf{r}$ is smooth.
- **Definition 2: Arc Length** — The *arc length* of a smooth curve $\mathbf{r}: [a, b] \to \mathbb{R}^n$ is $\displaystyle L(C) = \int_a^b \|\mathbf{r}'(t)\|\,dt$. The *arc length element* is $ds = \|\mathbf{r}'(t)\|\,dt$.
- **Remark 1: Reparameterization invariance** — If $\phi: [\alpha, \beta] \to [a, b]$ is a $C^1$ bijection with $\phi'(\tau) > 0$ (orientation-preserving), then $\tilde{\mathbf{r}}(\tau) = \mathbf{r}(\phi(\tau))$ traces the same curve in the same direction, and $\int_\alpha^\beta \|\tilde{\mathbf{r}}'(\tau)\|\,d\tau = \int_a^b \|\mathbf{r}'(t)\|\,dt$. Arc length does not depend on how fast we traverse the curve — it is a geometric property of the curve itself. This is a 1D change of variables (Topic 14, Theorem 1) applied to the arc length integral.
- **Example 1: Circle of radius $R$** — $\mathbf{r}(t) = (R\cos t, R\sin t)$ for $t \in [0, 2\pi]$. $\mathbf{r}'(t) = (-R\sin t, R\cos t)$, $\|\mathbf{r}'(t)\| = R$, $L = \int_0^{2\pi} R\,dt = 2\pi R$.
- **Example 2: Helix** — $\mathbf{r}(t) = (\cos t, \sin t, t)$ for $t \in [0, 2\pi]$. $\|\mathbf{r}'(t)\| = \sqrt{\sin^2 t + \cos^2 t + 1} = \sqrt{2}$, $L = 2\pi\sqrt{2}$.
- **Example 3: Parabolic arc** — $\mathbf{r}(t) = (t, t^2)$ for $t \in [0, 1]$. $\|\mathbf{r}'(t)\| = \sqrt{1 + 4t^2}$. This integral requires the $\sinh^{-1}$ formula or numerical quadrature — not every arc length computation is elementary.

**Static image:** `parameterized-curves.png` from the notebook.

### Section 3: Scalar Line Integrals

**Integrating a function along a curve.** The scalar line integral $\int_C f\,ds$ sums the values of $f$ along $C$, weighted by arc length. If $f = 1$, we recover the arc length. If $f$ represents density (mass per unit length), the integral gives total mass.

**Geometric-first:** Imagine a wire bent into the shape of $C$, with density $f(x, y)$ at each point. The total mass is $\int_C f\,ds$. The wire analogy makes clear why we weight by $ds$ rather than $dt$: the physical mass depends on the curve's geometry, not on how fast we parameterize it.

**TheoremBlocks:**

- **Definition 3: Scalar Line Integral** — Let $C$ be a smooth curve parameterized by $\mathbf{r}: [a, b] \to \mathbb{R}^n$, and let $f: C \to \mathbb{R}$ be continuous. The *scalar line integral* of $f$ over $C$ is:
$$\int_C f\,ds = \int_a^b f(\mathbf{r}(t))\,\|\mathbf{r}'(t)\|\,dt.$$
This is a Riemann integral (Topic 7) of the composite function $t \mapsto f(\mathbf{r}(t)) \cdot \|\mathbf{r}'(t)\|$ over $[a, b]$.
- **Proposition 1: Parameterization Independence** — The scalar line integral $\int_C f\,ds$ is independent of the parameterization of $C$ (including orientation). Any two smooth parameterizations of the same curve give the same value.
- **Proof of Proposition 1** — Let $\mathbf{r}: [a, b] \to \mathbb{R}^n$ and $\tilde{\mathbf{r}} = \mathbf{r} \circ \phi: [\alpha, \beta] \to \mathbb{R}^n$ with $\phi$ a $C^1$ bijection. By the chain rule, $\tilde{\mathbf{r}}'(\tau) = \mathbf{r}'(\phi(\tau)) \cdot \phi'(\tau)$, so $\|\tilde{\mathbf{r}}'(\tau)\| = \|\mathbf{r}'(\phi(\tau))\| \cdot |\phi'(\tau)|$. Then $\int_\alpha^\beta f(\tilde{\mathbf{r}}(\tau)) \|\tilde{\mathbf{r}}'(\tau)\|\,d\tau = \int_\alpha^\beta f(\mathbf{r}(\phi(\tau))) \|\mathbf{r}'(\phi(\tau))\| |\phi'(\tau)|\,d\tau$. By the substitution rule (Topic 14, Theorem 1) with $t = \phi(\tau)$, this equals $\int_a^b f(\mathbf{r}(t)) \|\mathbf{r}'(t)\|\,dt$. The absolute value $|\phi'(\tau)|$ ensures the result holds regardless of whether $\phi$ preserves or reverses orientation.
- **Example 4: Mass of a semicircular wire** — A wire follows $C: \mathbf{r}(t) = (\cos t, \sin t)$ for $t \in [0, \pi]$ with density $f(x, y) = y$. Then $\int_C f\,ds = \int_0^\pi \sin t \cdot 1\,dt = [-\cos t]_0^\pi = 2$.
- **Example 5: Average value along a curve** — The average value of $f$ over $C$ is $\bar{f} = \frac{1}{L(C)} \int_C f\,ds$, analogous to $\bar{f} = \frac{1}{b-a} \int_a^b f(x)\,dx$ from single-variable calculus.

**Static image:** `scalar-line-integral.png` from the notebook.

### Section 4: Vector Line Integrals — The Work Integral

**The central construction.** The vector line integral $\int_C \mathbf{F} \cdot d\mathbf{r}$ measures the *work* done by a force field $\mathbf{F}$ on a particle moving along $C$. Unlike the scalar line integral, this integral is *orientation-sensitive* — reversing the direction of traversal negates the result.

**Geometric-first:** At each point on $C$, the vector field $\mathbf{F}$ has a component tangent to the curve and a component perpendicular to it. Only the tangent component contributes to work. The dot product $\mathbf{F} \cdot \mathbf{r}'(t)$ extracts exactly this tangent component (times the speed). Integrating over $t$ sums up the infinitesimal contributions $\mathbf{F} \cdot d\mathbf{r}$ along the entire path.

**TheoremBlocks:**

- **Definition 4: Vector Line Integral** — Let $C$ be a smooth curve parameterized by $\mathbf{r}: [a, b] \to \mathbb{R}^n$ and $\mathbf{F}: \mathbb{R}^n \to \mathbb{R}^n$ a continuous vector field. The *vector line integral* (or *work integral*) of $\mathbf{F}$ along $C$ is:
$$\int_C \mathbf{F} \cdot d\mathbf{r} = \int_a^b \mathbf{F}(\mathbf{r}(t)) \cdot \mathbf{r}'(t)\,dt.$$
In $\mathbb{R}^2$, writing $\mathbf{F} = (P, Q)$ and $d\mathbf{r} = (dx, dy)$, this becomes $\int_C P\,dx + Q\,dy = \int_a^b [P(\mathbf{r}(t))\,x'(t) + Q(\mathbf{r}(t))\,y'(t)]\,dt$.
- **Remark 2: Orientation matters** — Reversing the curve $C$ (traversing from $\mathbf{r}(b)$ to $\mathbf{r}(a)$) negates the integral: $\int_{-C} \mathbf{F} \cdot d\mathbf{r} = -\int_C \mathbf{F} \cdot d\mathbf{r}$. This is because $\mathbf{r}'(t)$ reverses sign under orientation reversal, and the dot product is linear. By contrast, the scalar line integral $\int_C f\,ds$ is orientation-independent because $\|\mathbf{r}'(t)\|$ is always positive.
- **Remark 3: Parameterization independence** — The vector line integral is independent of the *orientation-preserving* parameterization. Any two parameterizations that traverse $C$ in the same direction yield the same value. The proof is the same substitution argument as Proposition 1, but without the absolute value — the sign of $\phi'(\tau)$ cancels the reversed limits, preserving the integral's value.
- **Theorem 1: Properties of Line Integrals** — Let $C$, $C_1$, $C_2$ be piecewise-smooth curves, $\mathbf{F}$, $\mathbf{G}$ continuous vector fields, and $\alpha, \beta \in \mathbb{R}$.
  1. *Linearity:* $\int_C (\alpha\mathbf{F} + \beta\mathbf{G}) \cdot d\mathbf{r} = \alpha\int_C \mathbf{F} \cdot d\mathbf{r} + \beta\int_C \mathbf{G} \cdot d\mathbf{r}$.
  2. *Additivity over path concatenation:* If $C = C_1 + C_2$ (the endpoint of $C_1$ is the start of $C_2$), then $\int_C \mathbf{F} \cdot d\mathbf{r} = \int_{C_1} \mathbf{F} \cdot d\mathbf{r} + \int_{C_2} \mathbf{F} \cdot d\mathbf{r}$.
  3. *Orientation reversal:* $\int_{-C} \mathbf{F} \cdot d\mathbf{r} = -\int_C \mathbf{F} \cdot d\mathbf{r}$.
- **Example 6: Work by a constant force** — $\mathbf{F} = (3, 4)$, $C$ is the line segment from $(0, 0)$ to $(2, 1)$: $\mathbf{r}(t) = (2t, t)$, $\mathbf{r}'(t) = (2, 1)$, $\int_C \mathbf{F} \cdot d\mathbf{r} = \int_0^1 (3 \cdot 2 + 4 \cdot 1)\,dt = 10$. The work equals $\mathbf{F} \cdot \Delta\mathbf{r} = (3, 4) \cdot (2, 1) = 10$ — for constant fields, the integral is just a dot product.
- **Example 7: Work by a radial field** — $\mathbf{F}(x, y) = (x, y)$, $C$ is the upper semicircle from $(1, 0)$ to $(-1, 0)$: $\mathbf{r}(t) = (\cos t, \sin t)$, $\mathbf{r}'(t) = (-\sin t, \cos t)$, $\int_C \mathbf{F} \cdot d\mathbf{r} = \int_0^\pi (\cos t)(-\sin t) + (\sin t)(\cos t)\,dt = \int_0^\pi 0\,dt = 0$. The radial field is everywhere perpendicular to the circle — it does zero work along any circular arc.
- **Example 8: Work by a non-conservative field** — $\mathbf{F}(x, y) = (-y, x)$, $C_1$ is the line segment from $(1, 0)$ to $(0, 1)$, $C_2$ is the quarter-circle from $(1, 0)$ to $(0, 1)$. Compute both: $\int_{C_1} \mathbf{F} \cdot d\mathbf{r} = 0$ and $\int_{C_2} \mathbf{F} \cdot d\mathbf{r} = \pi/2$. Different paths, different integrals — this field is not conservative.

**Visualization:** `LineIntegralExplorer` embedded here — the flagship visualization.

**Static image:** `vector-line-integral.png` from the notebook.

### Section 5: Conservative Fields & the Gradient Theorem

**The central theorem.** This is the FTC for line integrals — the most important result in the topic, and the theorem that explains why "gradient" and "conservative" are the same concept.

**Geometric-first:** If $\mathbf{F} = \nabla f$, then the work integral $\int_C \mathbf{F} \cdot d\mathbf{r}$ is just the total change in $f$ along the curve — the difference between the "heights" at the endpoints. Think of $f$ as elevation: a hiker following a trail gains elevation $f(\text{end}) - f(\text{start})$ regardless of the trail's shape. The gradient field $\nabla f$ always points uphill, so walking along a contour (level curve of $f$) does zero work — the gradient is perpendicular to level sets (Topic 9).

**TheoremBlocks:**

- **Definition 5: Conservative Vector Field** — A vector field $\mathbf{F}: D \to \mathbb{R}^n$ (where $D \subseteq \mathbb{R}^n$ is open and connected) is *conservative* if there exists a $C^1$ function $f: D \to \mathbb{R}$ such that $\mathbf{F} = \nabla f$ on $D$. The function $f$ is called a *potential function* (or *scalar potential*) for $\mathbf{F}$.
- **Remark 4: Potential functions are unique up to a constant** — If $f$ and $g$ are both potential functions for $\mathbf{F}$ on a connected domain $D$, then $\nabla(f - g) = \mathbf{0}$ on $D$, so $f - g$ is constant. This follows from the fact that a function with zero gradient on a connected domain must be constant (a consequence of the Mean Value Theorem, Topic 6).
- **Theorem 2: The Gradient Theorem (FTC for Line Integrals)** — Let $f: D \to \mathbb{R}$ be a $C^1$ function on an open set $D \subseteq \mathbb{R}^n$, and let $C$ be a piecewise-smooth curve in $D$ from $\mathbf{a}$ to $\mathbf{b}$. Then:
$$\int_C \nabla f \cdot d\mathbf{r} = f(\mathbf{b}) - f(\mathbf{a}).$$
- **Proof of Theorem 2** — Full proof. Define $g(t) = f(\mathbf{r}(t))$ for $t \in [a, b]$. By the chain rule (Topic 5 for scalar functions, Topic 10 for the multivariable version):
$$g'(t) = \nabla f(\mathbf{r}(t)) \cdot \mathbf{r}'(t).$$
This is the key identity — the integrand of the line integral is exactly $g'(t)$. By the Fundamental Theorem of Calculus (Topic 7, Theorem 2):
$$\int_C \nabla f \cdot d\mathbf{r} = \int_a^b g'(t)\,dt = g(b) - g(a) = f(\mathbf{r}(b)) - f(\mathbf{r}(a)).$$
- **Example 9: Gravitational potential** — $\mathbf{F}(x, y) = (2x, 2y)$ with potential $f(x, y) = x^2 + y^2$. For any curve $C$ from $(1, 0)$ to $(0, 3)$: $\int_C \mathbf{F} \cdot d\mathbf{r} = f(0, 3) - f(1, 0) = 9 - 1 = 8$. No parameterization needed — just endpoint evaluation.
- **Example 10: Verifying Example 7 via the Gradient Theorem** — The radial field $\mathbf{F}(x, y) = (x, y) = \nabla\left(\frac{x^2 + y^2}{2}\right)$. The curve from $(1, 0)$ to $(-1, 0)$ gives $f(-1, 0) - f(1, 0) = \frac{1}{2} - \frac{1}{2} = 0$. The Gradient Theorem reproduces Example 7's result instantly.

**Visualization:** `PotentialFunctionExplorer` embedded here.

**Static image:** `gradient-theorem.png` from the notebook.

### Section 6: Path Independence & the Exactness Criterion

**Characterizing conservative fields.** When is a vector field conservative? The Gradient Theorem shows that conservative fields have path-independent integrals. The converse is also true: path independence implies conservativeness. The practical test — the exactness criterion — provides a computable check.

**TheoremBlocks:**

- **Definition 6: Path Independence** — A vector field $\mathbf{F}: D \to \mathbb{R}^n$ has *path-independent* line integrals if $\int_{C_1} \mathbf{F} \cdot d\mathbf{r} = \int_{C_2} \mathbf{F} \cdot d\mathbf{r}$ for every pair of piecewise-smooth curves $C_1, C_2$ in $D$ that share the same endpoints.
- **Definition 7: Closed Curve** — A curve $C$ parameterized by $\mathbf{r}: [a, b] \to \mathbb{R}^n$ is *closed* if $\mathbf{r}(a) = \mathbf{r}(b)$. We write $\oint_C$ for integrals over closed curves.
- **Theorem 3: Equivalence of Conservative, Path-Independent, and Zero-Circulation** — Let $\mathbf{F}: D \to \mathbb{R}^n$ be a continuous vector field on an open connected domain $D$. The following are equivalent:
  1. $\mathbf{F}$ is conservative ($\mathbf{F} = \nabla f$ for some $C^1$ function $f$).
  2. $\int_C \mathbf{F} \cdot d\mathbf{r}$ is path-independent in $D$.
  3. $\oint_C \mathbf{F} \cdot d\mathbf{r} = 0$ for every piecewise-smooth closed curve $C$ in $D$.
- **Proof of Theorem 3** — Full proof of equivalences $(1) \Rightarrow (2) \Rightarrow (3) \Rightarrow (1)$.

  $(1) \Rightarrow (2)$: Immediate from the Gradient Theorem — the integral equals $f(\mathbf{b}) - f(\mathbf{a})$, which depends only on the endpoints.

  $(2) \Rightarrow (3)$: If $C$ is closed, its start and end points coincide: $\mathbf{a} = \mathbf{b}$. Split $C$ at any interior point into two curves $C_1$ and $C_2$ from $\mathbf{a}$ to $\mathbf{p}$ and from $\mathbf{p}$ to $\mathbf{a}$. By path independence, $\int_{C_1} \mathbf{F} \cdot d\mathbf{r} = \int_{-C_2} \mathbf{F} \cdot d\mathbf{r} = -\int_{C_2} \mathbf{F} \cdot d\mathbf{r}$, so $\oint_C = \int_{C_1} + \int_{C_2} = 0$.

  $(3) \Rightarrow (1)$: Fix a base point $\mathbf{a} \in D$ and define $f(\mathbf{x}) = \int_C \mathbf{F} \cdot d\mathbf{r}$ where $C$ is any path from $\mathbf{a}$ to $\mathbf{x}$. The zero-circulation condition ensures this is well-defined (different paths give the same value). To show $\nabla f = \mathbf{F}$: compute $\frac{\partial f}{\partial x_i}(\mathbf{x})$ by choosing the path to $\mathbf{x} + h\mathbf{e}_i$ as: any path from $\mathbf{a}$ to $\mathbf{x}$, then a straight segment from $\mathbf{x}$ to $\mathbf{x} + h\mathbf{e}_i$. The difference $f(\mathbf{x} + h\mathbf{e}_i) - f(\mathbf{x}) = \int_0^h F_i(\mathbf{x} + s\mathbf{e}_i)\,ds$. By the FTC (Topic 7), dividing by $h$ and taking $h \to 0$ gives $\frac{\partial f}{\partial x_i}(\mathbf{x}) = F_i(\mathbf{x})$.

- **Definition 8: Simply Connected Domain** — An open connected domain $D \subseteq \mathbb{R}^2$ is *simply connected* if every closed curve in $D$ can be continuously shrunk to a point without leaving $D$. Informally: $D$ has no holes. Formally: every closed curve in $D$ is homotopic to a constant curve.
- **Theorem 4: Exactness Criterion** — Let $\mathbf{F} = (P, Q): D \to \mathbb{R}^2$ be a $C^1$ vector field on an open, simply connected domain $D \subseteq \mathbb{R}^2$. Then $\mathbf{F}$ is conservative if and only if:
$$\frac{\partial P}{\partial y} = \frac{\partial Q}{\partial x} \quad \text{on } D.$$
- **Remark 5: Why "simply connected"?** — The condition $\partial P / \partial y = \partial Q / \partial x$ says $\mathbf{F}$ is *closed* (its 1-form $P\,dx + Q\,dy$ is closed). On simply connected domains, closed = exact (= conservative). On domains with holes, closed ≠ exact. The gap is topological, not analytical.
- **Example 11: Testing conservativeness** — $\mathbf{F}(x, y) = (2xy + y^2, x^2 + 2xy)$. Check: $\frac{\partial P}{\partial y} = 2x + 2y = \frac{\partial Q}{\partial x}$. Conservative. Find $f$: from $f_x = 2xy + y^2$ we get $f(x, y) = x^2 y + xy^2 + g(y)$. Then $f_y = x^2 + 2xy + g'(y) = x^2 + 2xy$ forces $g'(y) = 0$, so $f(x, y) = x^2 y + xy^2 + C$.
- **Example 12: The vortex field — topology matters** — $\mathbf{F}(x, y) = \left(\frac{-y}{x^2+y^2}, \frac{x}{x^2+y^2}\right)$ on $D = \mathbb{R}^2 \setminus \{(0,0)\}$. Check: $\frac{\partial P}{\partial y} = \frac{y^2 - x^2}{(x^2+y^2)^2} = \frac{\partial Q}{\partial x}$. The exactness condition holds, yet $\oint_C \mathbf{F} \cdot d\mathbf{r} = 2\pi$ around the unit circle — *not* zero. The catch: $D$ is not simply connected (it has a hole at the origin). The vortex field is the canonical example showing that topology matters. The "potential function" $f(x,y) = \arctan(y/x)$ is multi-valued — it gains $2\pi$ each time we circle the origin.

**Visualization:** `ConservativeFieldExplorer` embedded here.

**Static image:** `path-independence.png` from the notebook.

### Section 7: Green's Theorem

**The bridge between line integrals and double integrals.** Green's theorem converts a line integral around a closed curve into a double integral over the enclosed region. This is the 2D special case of the generalized Stokes' theorem — the single most powerful identity in vector calculus.

**Geometric-first:** Walk around the boundary of a region $D$. At each point, the vector field $\mathbf{F}$ pushes you along (or against) your direction of travel. The total work around the loop — the *circulation* — equals the integral of the "rotation" of $\mathbf{F}$ over the interior. The "rotation" is $\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}$, which is the 2D curl.

**TheoremBlocks:**

- **Theorem 5: Green's Theorem** — Let $D \subseteq \mathbb{R}^2$ be a bounded region with piecewise-smooth boundary $\partial D$ oriented counterclockwise. Let $\mathbf{F} = (P, Q): \bar{D} \to \mathbb{R}^2$ be a $C^1$ vector field. Then:
$$\oint_{\partial D} P\,dx + Q\,dy = \iint_D \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)\,dA.$$
- **Proof of Theorem 5** — Full proof for Type I and Type II regions. We show $\oint_{\partial D} P\,dx = -\iint_D \frac{\partial P}{\partial y}\,dA$ and $\oint_{\partial D} Q\,dy = \iint_D \frac{\partial Q}{\partial x}\,dA$ separately, then add.

  *Proof of $\oint P\,dx = -\iint \frac{\partial P}{\partial y}\,dA$:* Let $D$ be a Type I region: $a \le x \le b$, $g_1(x) \le y \le g_2(x)$. The right side is:
  $$-\iint_D \frac{\partial P}{\partial y}\,dA = -\int_a^b \int_{g_1(x)}^{g_2(x)} \frac{\partial P}{\partial y}(x, y)\,dy\,dx = -\int_a^b \bigl[P(x, g_2(x)) - P(x, g_1(x))\bigr]\,dx.$$
  The boundary $\partial D$ traversed counterclockwise consists of: the bottom curve $C_1: y = g_1(x)$ from $x = a$ to $x = b$, the right side, the top curve $C_3: y = g_2(x)$ from $x = b$ to $x = a$, and the left side. On $C_1$: $\int_{C_1} P\,dx = \int_a^b P(x, g_1(x))\,dx$. On $C_3$ (reversed): $\int_{C_3} P\,dx = -\int_a^b P(x, g_2(x))\,dx$. On the vertical sides, $dx = 0$, so their contributions vanish. Adding: $\oint_{\partial D} P\,dx = \int_a^b P(x, g_1(x))\,dx - \int_a^b P(x, g_2(x))\,dx = -\int_a^b [P(x, g_2(x)) - P(x, g_1(x))]\,dx$.

  The proof for $Q\,dy$ is analogous using a Type II description. For general regions, decompose into Type I and Type II pieces; interior boundary contributions cancel in pairs.

- **Example 13: Circulation of $\mathbf{F} = (-y, x)$ around the unit circle** — Direct computation: $\oint_C (-y\,dx + x\,dy)$ with $\mathbf{r}(t) = (\cos t, \sin t)$ gives $\int_0^{2\pi} (\sin^2 t + \cos^2 t)\,dt = 2\pi$. Green's theorem: $\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y} = 1 - (-1) = 2$, so $\iint_D 2\,dA = 2\pi$. Both give $2\pi$. The rotation field $(-y, x)$ has constant curl $2$ — every point in the disk contributes equally to the circulation.
- **Example 14: Area via Green's theorem** — Setting $P = -y/2$, $Q = x/2$ gives $\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y} = 1/2 + 1/2 = 1$, so:
$$A(D) = \iint_D dA = \frac{1}{2}\oint_{\partial D} (x\,dy - y\,dx).$$
This is the *Shoelace formula* for polygonal areas (a special case when $\partial D$ is a polygon) and the formula used by planimeters.
- **Remark 6: Green's theorem as a conservation law** — Green's theorem says that the "total rotation inside $D$" equals the "total circulation around $\partial D$." The interior quantity (curl) and the boundary quantity (circulation) are related by an exact balance. This is the prototype of all conservation laws in physics — and the 2D instance of Stokes' theorem.

**Visualization:** `GreenTheoremExplorer` embedded here.

**Static image:** `greens-theorem.png` from the notebook.

### Section 8: Curl & Circulation

**The infinitesimal rotation.** The integrand in Green's theorem — $\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}$ — is the 2D curl. It measures how much the vector field "rotates" around each point. Formalizing this via a limit of circulations gives a pointwise interpretation of curl.

**TheoremBlocks:**

- **Definition 9: 2D Curl (Scalar Curl)** — For $\mathbf{F} = (P, Q): D \to \mathbb{R}^2$ of class $C^1$, the *2D curl* (or *scalar curl*) is:
$$\text{curl}\,\mathbf{F}(x, y) = \frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}.$$
This is the $\hat{\mathbf{k}}$-component of the 3D curl $\nabla \times \mathbf{F}$, with $\mathbf{F}$ viewed as the 3D field $(P, Q, 0)$.
- **Proposition 2: Curl as Infinitesimal Circulation** — Let $\mathbf{F}$ be $C^1$ at $\mathbf{p}$, and let $C_r$ be the circle of radius $r$ centered at $\mathbf{p}$, oriented counterclockwise. Then:
$$\text{curl}\,\mathbf{F}(\mathbf{p}) = \lim_{r \to 0} \frac{1}{\pi r^2} \oint_{C_r} \mathbf{F} \cdot d\mathbf{r}.$$
The curl is the circulation per unit area in the limit of infinitesimally small loops.
- **Proof sketch of Proposition 2** — By Green's theorem, $\oint_{C_r} \mathbf{F} \cdot d\mathbf{r} = \iint_{D_r} \text{curl}\,\mathbf{F}\,dA$. By the Mean Value Theorem for double integrals (Topic 13, Proposition 1), $\iint_{D_r} \text{curl}\,\mathbf{F}\,dA = \text{curl}\,\mathbf{F}(\mathbf{p}_r) \cdot \pi r^2$ for some $\mathbf{p}_r \in D_r$. As $r \to 0$, $\mathbf{p}_r \to \mathbf{p}$ and continuity of $\text{curl}\,\mathbf{F}$ gives the limit.
- **Remark 7: Conservative ⟺ curl-free (on simply connected domains)** — Theorem 4 can be restated: on a simply connected domain, $\mathbf{F}$ is conservative if and only if $\text{curl}\,\mathbf{F} = 0$ everywhere. Green's theorem explains why: if $\text{curl}\,\mathbf{F} = 0$ on $D$, then $\oint_C \mathbf{F} \cdot d\mathbf{r} = \iint_D \text{curl}\,\mathbf{F}\,dA = 0$ for every closed curve $C$ bounding a region in $D$. On simply connected domains, every closed curve bounds a region in $D$, so the zero-circulation condition (Theorem 3) is satisfied.
- **Example 15: Identifying rotation** — For the rotation field $\mathbf{F} = (-y, x)$: $\text{curl}\,\mathbf{F} = 1 - (-1) = 2$. Constant positive curl — rigid rotation. For the shear field $\mathbf{F} = (y, 0)$: $\text{curl}\,\mathbf{F} = 0 - 1 = -1$. Constant negative curl — clockwise shearing. For the expansion field $\mathbf{F} = (x, y)$: $\text{curl}\,\mathbf{F} = 0 - 0 = 0$. Curl-free — pure expansion, no rotation.

**Visualization:** `CurlExplorer` embedded here.

**Static image:** `curl-circulation.png` from the notebook.

### Section 9: Computational Notes

**NumPy/SciPy implementation.** Practical code for computing line integrals numerically.

- `scipy.integrate.quad` for parameterized line integrals.
- Numerical conservative field test via finite differences.
- Potential function recovery via numerical integration along axis-aligned paths.
- Plotting vector fields with `matplotlib.pyplot.quiver` and streamlines with `matplotlib.pyplot.streamplot`.

Code snippets for:
1. Computing $\int_C \mathbf{F} \cdot d\mathbf{r}$ given $\mathbf{F}$ and $\mathbf{r}(t)$.
2. Testing conservativeness via $\partial P / \partial y \approx \partial Q / \partial x$ (finite difference check).
3. Recovering a potential function by integrating $P$ along $x$, then solving for $g(y)$.
4. Verifying Green's theorem numerically: compute both sides and compare.

### Section 10: Connections to ML

This section is substantial — line integrals appear in ML in three distinct ways.

**10.1 Gradient Flow as Continuous-Time Gradient Descent**

The ODE $\dot{\theta}(t) = -\nabla L(\theta(t))$ defines a curve $\theta(t)$ in parameter space. The total loss change along this curve is:
$$L(\theta(T)) - L(\theta(0)) = \int_0^T \nabla L(\theta(t)) \cdot \dot{\theta}(t)\,dt = -\int_0^T \|\nabla L(\theta(t))\|^2\,dt \le 0.$$
The first equality is the chain rule; the second substitutes $\dot{\theta} = -\nabla L$. The integral $\int_0^T \|\nabla L\|^2\,dt$ is the "total gradient magnitude" along the path — it quantifies how much the loss decreases. This is the Gradient Theorem (Theorem 2) applied to $f = L$, giving the loss difference as a line integral of $\nabla L$.

Discrete gradient descent $\theta_{t+1} = \theta_t - \eta\nabla L(\theta_t)$ approximates this flow. The step size $\eta$ controls how closely the discrete path follows the continuous flow. When $\eta$ is small, the discrete path stays near the continuous one, and convergence analysis borrows from the continuous theory.

→ [Gradient Descent](https://formalml.com/topics/gradient-descent) → formalML

**10.2 Energy-Based Models**

An energy-based model defines a scalar potential $E(\mathbf{x}; \theta)$ over input space. The negative gradient $-\nabla_{\mathbf{x}} E$ pushes inputs toward low-energy configurations. The dynamics $\dot{\mathbf{x}} = -\nabla_{\mathbf{x}} E$ are a gradient flow in input space — a conservative system where the "work done" on $\mathbf{x}$ equals the energy change $E(\mathbf{x}_{\text{final}}) - E(\mathbf{x}_{\text{init}})$, independent of path. Hopfield networks, Boltzmann machines, and score-based diffusion models all define energy landscapes whose gradient fields govern inference and generation.

**10.3 Natural Gradient & Geodesic Paths**

Standard gradient descent follows the direction $-\nabla L$ in Euclidean parameter space. The *natural gradient* follows $-I(\theta)^{-1}\nabla L$, where $I(\theta)$ is the Fisher information matrix. This corresponds to steepest descent in the Fisher-Rao metric on the statistical manifold — the direction that maximally decreases the loss per unit of *statistical distance*.

The length of a curve $\theta(t)$ in the Fisher-Rao metric is $\int_a^b \sqrt{\dot{\theta}(t)^T I(\theta(t)) \dot{\theta}(t)}\,dt$ — a scalar line integral (Definition 3) with $f = \sqrt{\dot{\theta}^T I \dot{\theta}}$ and the arc length element of the Fisher-Rao metric. Geodesics are curves that minimize this length integral — the calculus of variations **(coming soon)** provides the Euler-Lagrange equation for finding them.

→ [Information Geometry](https://formalml.com/topics/information-geometry) → formalML

**Static image:** `ml-connections.png` from the notebook.

### Section 11: Connections & Further Reading

Cross-reference table linking to all prerequisite topics (live links), downstream topics (live link for `surface-integrals` if published, otherwise "(coming soon)"), and forward references to formalml.com.

Prerequisite DAG diagram showing this topic's position: `gradient → line-integrals → surface-integrals` and `multiple-integrals → line-integrals → surface-integrals`.

**Forward references to planned topics (plain text + "(coming soon)"):**

- **Surface Integrals & the Divergence Theorem** *(coming soon)* — Stokes' theorem generalizes Green's theorem from 2D to 3D: $\oint_C \mathbf{F} \cdot d\mathbf{r} = \iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S}$. The divergence theorem relates surface integrals to volume integrals.
- **First-Order ODEs & Existence Theorems** *(coming soon)* — Exact differential equations $M\,dx + N\,dy = 0$ are exact when $M_y = N_x$, the same criterion as conservative fields. The integrating factor technique corresponds to finding a potential function.
- **Metric Spaces & Topology** *(coming soon)* — Path length defines the intrinsic metric on a Riemannian manifold. Simply connected vs. non-simply-connected domains are a topological distinction formalized via fundamental groups and homotopy.
- **Calculus of Variations** *(coming soon)* — Functionals $J[\gamma] = \int_a^b L(\gamma, \gamma', t)\,dt$ are line integrals over path space. Extremal paths satisfy the Euler-Lagrange equation.

---

## 4. Visualizations

### 4.1 LineIntegralExplorer (Flagship)

- **Component name:** `LineIntegralExplorer`
- **Filename:** `src/components/viz/LineIntegralExplorer.tsx`
- **What it visualizes:** A 2D vector field with an animated particle traversing a user-selected curve. As the particle moves, the work integral accumulates — the dot product $\mathbf{F} \cdot d\mathbf{r}$ at each point is shown as a contribution (positive when $\mathbf{F}$ aligns with the path, negative when opposed). A running total displays the integral value, with a bar chart showing the accumulated work. **This is the flagship component** — the work integral made tangible through animation.
- **Interactions:**
  - Vector field presets: constant $(1, 0)$, radial $(x, y)$, rotation $(-y, x)$, saddle $(x, -y)$, gravity $(0, -1)$, vortex $\frac{(-y, x)}{x^2+y^2}$.
  - Path presets: line segment, semicircle, full circle, parabolic arc, S-curve. Each connects two fixed endpoints (except the full circle).
  - "Animate" button: particle traverses the curve at adjustable speed, accumulating the work integral in real time.
  - Speed slider: controls animation speed.
  - Toggle: show/hide vector field arrows.
  - Toggle: show/hide tangent component projection (the component of $\mathbf{F}$ along the curve at the particle's position).
- **Readout:** Current position $\mathbf{r}(t)$, $\mathbf{F}(\mathbf{r}(t))$, $\mathbf{F} \cdot \mathbf{r}'(t)$ at current position, cumulative integral, exact value (if known).
- **Layout:** Single panel. Vector field background with superimposed curve and animated particle. Below: running integral bar chart (positive contributions green, negative contributions red).
- **Performance:** Vector field arrows rendered on a 15×15 grid. Arrow scale normalized by the max field magnitude. Use D3 transitions for particle animation.
- **Color scale:** Use `vizColors.diverging` for the tangent component readout (green = aligned, red = opposed).

### 4.2 ConservativeFieldExplorer

- **Component name:** `ConservativeFieldExplorer`
- **Filename:** `src/components/viz/ConservativeFieldExplorer.tsx`
- **What it visualizes:** Two side-by-side vector fields: one conservative, one non-conservative. The user draws multiple paths between the same two endpoints. For the conservative field, all paths yield the same integral. For the non-conservative field, different paths yield different integrals. This is the path independence concept made visceral.
- **Interactions:**
  - Conservative field presets: gradient $(2x, 2y)$, gravitational $(-x/(x^2+y^2)^{3/2}, -y/(x^2+y^2)^{3/2})$, quadratic $(2xy, x^2)$.
  - Non-conservative field presets: rotation $(-y, x)$, shear $(y, 0)$, asymmetric $(y^2, x)$.
  - Click two points to set endpoints, then click intermediate waypoints to define a piecewise-linear path. Add up to 4 paths.
  - "Reset paths" button to clear.
  - Toggle: show/hide potential function contours (for conservative fields only).
- **Readout:** Integral value for each path (displayed in a small table). For conservative fields, all values match. For non-conservative fields, values differ.
- **Layout:** Two-panel side-by-side. Left: conservative field with paths. Right: non-conservative field with paths. Below: integral comparison table.

### 4.3 GreenTheoremExplorer

- **Component name:** `GreenTheoremExplorer`
- **Filename:** `src/components/viz/GreenTheoremExplorer.tsx`
- **What it visualizes:** A region $D$ with boundary $\partial D$, a vector field $\mathbf{F}$, and simultaneous computation of both sides of Green's theorem. The left panel shows the line integral around $\partial D$ (animated particle with accumulating work). The right panel shows the double integral of curl over $D$ (heatmap of $\text{curl}\,\mathbf{F}$ with Riemann sum approximation). Both values converge to the same number.
- **Interactions:**
  - Region presets: unit disk, rectangle, triangle, annulus (for demonstrating failure on non-simply-connected domains).
  - Vector field presets: rotation $(-y, x)$, quadratic $(x^2, xy)$, exponential $(e^x\sin y, e^x\cos y)$.
  - Boundary partition slider (n = 4–100): controls how many segments approximate the boundary curve.
  - Interior partition slider (m = 4–40): controls the curl heatmap / Riemann sum resolution.
  - "Animate" button: simultaneously runs the boundary traversal and the interior sum accumulation.
- **Readout:** Line integral value $\oint_{\partial D} \mathbf{F} \cdot d\mathbf{r}$, double integral value $\iint_D \text{curl}\,\mathbf{F}\,dA$, difference.
- **Layout:** Two-panel side-by-side. Left: boundary with animated particle. Right: interior with curl heatmap. Below: numerical comparison.

### 4.4 PotentialFunctionExplorer

- **Component name:** `PotentialFunctionExplorer`
- **Filename:** `src/components/viz/PotentialFunctionExplorer.tsx`
- **What it visualizes:** A 3D surface $z = f(x, y)$ (the potential function) with its gradient field $\nabla f$ projected onto the $xy$-plane below. A curve $C$ on the surface connects two points; the height difference $f(\mathbf{b}) - f(\mathbf{a})$ equals the line integral $\int_C \nabla f \cdot d\mathbf{r}$. The 3D view makes the Gradient Theorem visually obvious: the "work done by gravity" depends only on the elevation change.
- **Interactions:**
  - Potential function presets: $x^2 + y^2$ (paraboloid), $xy$ (saddle), $\sin(x)\cos(y)$ (wavy), $-\ln(x^2+y^2)$ (logarithmic well).
  - Click two points on the $xy$-plane to set endpoints.
  - Path presets between the selected endpoints: straight line, arc, zigzag.
  - 3D rotation (drag to orbit).
  - Toggle: show/hide gradient vectors on the $xy$-plane.
  - Toggle: show/hide contour lines on the surface and/or the $xy$-plane.
- **Readout:** $f(\mathbf{a})$, $f(\mathbf{b})$, $f(\mathbf{b}) - f(\mathbf{a})$, computed line integral (should match).
- **Layout:** Single 3D panel (D3 + isometric projection or Three.js lite). Gradient vector overlay below the surface.
- **Performance:** Surface rendered as a mesh (20×20 grid). Gradient arrows on a 10×10 grid. Smooth curve rendering via cubic interpolation.

### 4.5 CurlExplorer

- **Component name:** `CurlExplorer`
- **Filename:** `src/components/viz/CurlExplorer.tsx`
- **What it visualizes:** A 2D vector field with a color-coded heatmap of the 2D curl $\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}$. Small "paddlewheel" indicators at grid points rotate at rates proportional to the local curl. An interactive circle can be placed and resized; the circulation around the circle is computed and displayed, confirming $\text{curl}\,\mathbf{F} \approx \frac{1}{\pi r^2}\oint_{C_r} \mathbf{F} \cdot d\mathbf{r}$ for small $r$.
- **Interactions:**
  - Vector field presets: rotation $(-y, x)$ (constant curl), shear $(y, 0)$ (constant negative curl), point vortex (curl = 0 away from origin), gradient field $(2x, 2y)$ (curl = 0 everywhere), mixed $(xy, -x^2)$ (variable curl).
  - Click to place the center of the test circle.
  - Radius slider ($r = 0.1$–$2.0$).
  - Toggle: show/hide paddlewheel indicators.
  - Toggle: show/hide curl heatmap.
- **Readout:** Curl value at center, circulation $\oint_{C_r} \mathbf{F} \cdot d\mathbf{r}$, area $\pi r^2$, ratio (circulation/area), difference from curl at center.
- **Layout:** Single panel. Vector field with curl heatmap overlay and interactive circle.
- **Color scale:** Use `vizColors.diverging` for curl heatmap (blue = clockwise/negative curl, white = 0, red = counterclockwise/positive curl).

---

## 5. Data Modules

### 5.1 `line-integrals-data.ts`

**Filename:** `src/data/line-integrals-data.ts`

**Exported interfaces:**

```typescript
export interface VectorField2DPreset {
  name: string;
  label: string;
  P: (x: number, y: number) => number;
  Q: (x: number, y: number) => number;
  isConservative: boolean;
  potential?: (x: number, y: number) => number; // if conservative
  curl: (x: number, y: number) => number;
  description: string;
}

export interface CurvePreset {
  name: string;
  label: string;
  r: (t: number) => [number, number]; // parameterization
  rPrime: (t: number) => [number, number]; // velocity
  domain: [number, number]; // [a, b]
  isClosed: boolean;
  description: string;
}

export interface RegionPreset {
  name: string;
  label: string;
  boundary: CurvePreset;
  isSimplyConnected: boolean;
  description: string;
}
```

**Exported constants:**

```typescript
export const vectorFieldPresets: VectorField2DPreset[];    // 8-10 presets
export const curvePresets: CurvePreset[];                   // 6-8 presets  
export const regionPresets: RegionPreset[];                 // 4 presets
export const conservativeFieldPresets: VectorField2DPreset[];  // 3 conservative
export const nonConservativeFieldPresets: VectorField2DPreset[];  // 3 non-conservative
export const potentialPresets: { name: string; f: (x: number, y: number) => number; grad: VectorField2DPreset }[];
```

**Lazy initialization:** Use the lazy `getPresets()` pattern for any presets that involve expensive setup.

---

## 6. Shared Utility Module Updates

### 6.1 `integration.ts` (Extension)

**New functions:**

```typescript
/** Compute scalar line integral ∫_C f ds via parameterization */
export function lineIntegralScalar(
  f: (x: number, y: number) => number,
  r: (t: number) => [number, number],
  rPrime: (t: number) => [number, number],
  domain: [number, number],
  nPoints?: number
): number;

/** Compute vector line integral ∫_C F · dr via parameterization */
export function lineIntegralVector(
  F: (x: number, y: number) => [number, number],
  r: (t: number) => [number, number],
  rPrime: (t: number) => [number, number],
  domain: [number, number],
  nPoints?: number
): number;

/** Compute circulation ∮_C F · dr around a closed curve */
export function computeCirculation(
  F: (x: number, y: number) => [number, number],
  r: (t: number) => [number, number],
  rPrime: (t: number) => [number, number],
  domain: [number, number],
  nPoints?: number
): number;

/** Compute arc length ∫_a^b ‖r'(t)‖ dt */
export function arcLength(
  rPrime: (t: number) => [number, number],
  domain: [number, number],
  nPoints?: number
): number;

/** Compute work integral incrementally, returning an array of cumulative values */
export function computeWorkIntegral(
  F: (x: number, y: number) => [number, number],
  r: (t: number) => [number, number],
  rPrime: (t: number) => [number, number],
  domain: [number, number],
  nSteps: number
): { t: number; position: [number, number]; contribution: number; cumulative: number }[];
```

**Backward compatibility:** All existing functions from Topics 7, 8, 13, and 14 are unchanged. The new functions are purely additive.

### 6.2 `multivariate.ts` (Extension)

**New functions:**

```typescript
/** Compute 2D curl: ∂Q/∂x - ∂P/∂y via finite differences */
export function curl2D(
  F: (x: number, y: number) => [number, number],
  x: number,
  y: number,
  h?: number
): number;

/** Compute 2D divergence: ∂P/∂x + ∂Q/∂y via finite differences */
export function divergence2D(
  F: (x: number, y: number) => [number, number],
  x: number,
  y: number,
  h?: number
): number;

/** Test conservativeness: check ∂P/∂y ≈ ∂Q/∂x on a grid */
export function isConservative2D(
  F: (x: number, y: number) => [number, number],
  domain: { xRange: [number, number]; yRange: [number, number] },
  gridSize?: number,
  tolerance?: number
): { conservative: boolean; maxDeviation: number };

/** Recover potential function by integrating along axis-aligned paths from origin */
export function potentialFunction2D(
  F: (x: number, y: number) => [number, number],
  x: number,
  y: number,
  nPoints?: number
): number;
```

**Backward compatibility:** All existing functions from Topics 9–14 are unchanged.

---

## 7. Curriculum Graph Updates

**Add node:**
```json
{ "id": "line-integrals", "label": "Line Integrals & Conservative Fields", "domain": "multivar-integral", "status": "published", "url": "/topics/line-integrals" }
```

**Add edges:**
```json
{ "source": "multiple-integrals", "target": "line-integrals" }
{ "source": "gradient", "target": "line-integrals" }
{ "source": "line-integrals", "target": "surface-integrals" }
```

**Verify existing edges.** The `multiple-integrals → line-integrals` and `gradient → line-integrals` edges may already exist from the Topic 13 and Topic 9 briefs. If so, verify they are present. The `line-integrals → surface-integrals` edge is new.

**Important:** Do NOT add an edge from `change-of-variables` to `line-integrals`. The curriculum DAG correctly shows that `change-of-variables` feeds into `surface-integrals`, not `line-integrals`. Line integrals do not require coordinate substitution machinery.

**Verify the downstream planned node exists.** If `surface-integrals` with `"status": "planned"` is not present, add it.

### `src/data/curriculum.ts`

In the `multivar-integral` track definition, move `"Line Integrals & Conservative Fields"` from `planned` to `published`. The `planned` array should now contain only `"Surface Integrals & the Divergence Theorem"`.

---

## 8. Cross-References

### Existing topics that should link TO this topic

- **`multiple-integrals.mdx`** — Forward ref to line integrals and Green's theorem. Update any "(coming soon)" references to live links: `[Line Integrals & Conservative Fields](/topics/line-integrals)`. Specifically check Section 9 (ML connections) and the Connections & Further Reading section.
- **`gradient.mdx`** — Forward ref to conservative fields and the Gradient Theorem. Check Sections on gradient and level sets, and the forward references section. Update "(coming soon)" to live links.
- **`change-of-variables.mdx`** — Indirect forward ref ("Path parameterization is a change of variables from the parameter domain to the curve"). If present as "(coming soon)", update to a live link.

### Topics this topic links FROM

- `multiple-integrals` — prerequisite (live link). Green's theorem requires double integrals.
- `gradient` — prerequisite (live link). Conservative fields = gradient fields.
- `derivative` — chain rule in the Gradient Theorem proof (live link, cross-track).
- `jacobian` — multivariate chain rule for parameterization independence (live link, cross-track).
- `riemann-integral` — every line integral reduces to a 1D Riemann integral after parameterization (live link, cross-track).
- `epsilon-delta` — continuity hypotheses (live link, cross-track).
- `completeness-compactness` — compactness of curve image (live link, cross-track).
- `mean-value-taylor` — MVT used in the potential function uniqueness argument (live link, cross-track).

### Forward references to planned topics (plain text + "(coming soon)")

- **Surface Integrals & the Divergence Theorem** *(coming soon)* — referenced in Sections 7, 8, and 11. Stokes' theorem generalizes Green's theorem to 3D surfaces.
- **First-Order ODEs & Existence Theorems** *(coming soon)* — referenced in Section 11. Exact differential equations share the conservativeness criterion.
- **Metric Spaces & Topology** *(coming soon)* — referenced in Section 6 (simply connected domains) and Section 11. Fundamental groups and homotopy formalize the topological obstructions to conservativeness.
- **Calculus of Variations** *(coming soon)* — referenced in Section 10.3 (geodesics as length-minimizing curves) and Section 11.

### formalml.com forward links (informational, external, new tab)

- `gradient-descent` — Sections 1, 10.1
- `smooth-manifolds` — Sections 6, 7, 11
- `information-geometry` — Section 10.3

---

## 9. Images

| # | Filename | Description |
|---|----------|-------------|
| 1 | `parameterized-curves.png` | Three examples: circle, helix (3D projection), parabolic arc with velocity vectors |
| 2 | `scalar-line-integral.png` | Wire density $f(x,y) = y$ along semicircle, with ds elements shown |
| 3 | `vector-line-integral.png` | Vector field with curve, tangent component projection at sample points |
| 4 | `gradient-theorem.png` | Potential surface $z = f(x,y)$ with two paths between same endpoints, height difference labeled |
| 5 | `path-independence.png` | Four-panel: conservative field with three paths (same integral), non-conservative field with three paths (different integrals) |
| 6 | `vortex-field.png` | Vortex field $\frac{(-y,x)}{x^2+y^2}$ with circulation $2\pi$ around origin, highlighting the hole |
| 7 | `greens-theorem.png` | Region $D$ with boundary traversal and interior curl heatmap, both sides computed |
| 8 | `curl-circulation.png` | Three-panel: positive curl (rotation), negative curl (shear), zero curl (expansion) with paddlewheels |
| 9 | `ml-connections.png` | Four-panel: gradient flow path, energy-based model landscape, natural gradient vs. Euclidean gradient, discrete vs. continuous paths |

---

## 10. Testing Checklist

- [ ] MDX renders at `/topics/line-integrals`
- [ ] All TheoremBlocks render LaTeX correctly (9 definitions, 5 theorems, 2 propositions, 15 examples, 7 remarks, 3 proofs)
- [ ] All 5 viz components load on scroll and function correctly
- [ ] All cross-references resolve (no 404s)
- [ ] Forward references use plain text + "(coming soon)"
- [ ] Curriculum graph and curriculum.ts updated
- [ ] Static images load from `public/images/topics/line-integrals/`
- [ ] Responsive layout on mobile
- [ ] Pagefind indexes the new topic
- [ ] `pnpm build` succeeds with zero errors

---

## 11. Build Order

1. Extend `integration.ts` — add `lineIntegralScalar`, `lineIntegralVector`, `computeCirculation`, `arcLength`, `computeWorkIntegral`. Test `lineIntegralVector` against known values: constant field $(1,0)$ along unit segment = 1, rotation field $(-y,x)$ around unit circle = $2\pi$.
2. Extend `multivariate.ts` — add `curl2D`, `divergence2D`, `isConservative2D`, `potentialFunction2D`. Test `curl2D` on rotation field = 2, on gradient field = 0. Test `isConservative2D` correctly classifies both types.
3. Create `line-integrals-data.ts` — all presets for vector fields, curves, and regions.
4. Create `line-integrals.mdx` — full frontmatter and content. No viz yet.
5. Copy notebook figures to `public/images/topics/line-integrals/`.
6. Build `LineIntegralExplorer.tsx` (flagship).
7. Build `ConservativeFieldExplorer.tsx`.
8. Build `GreenTheoremExplorer.tsx`.
9. Build `PotentialFunctionExplorer.tsx`.
10. Build `CurlExplorer.tsx`.
11. Embed all components with `client:visible`.
12. Update `multiple-integrals.mdx` forward refs to live links.
13. Update `gradient.mdx` forward refs to live links.
14. Update `change-of-variables.mdx` forward refs to live links (if any).
15. Update curriculum graph — add node and edges.
16. Update `curriculum.ts` — mark topic published.
17. Run testing checklist.
18. `pnpm build` — zero errors.
19. Commit and deploy.

---

## Appendix A: Key Differences from the Change of Variables Brief (Topic 14)

1. **Different prerequisite structure.** Topic 14 requires `multiple-integrals` + `inverse-implicit` (one from each of Tracks 3 and 4). Topic 15 requires `multiple-integrals` + `gradient` — a Track 4 + Track 3 pairing, but the Track 3 prerequisite is the *first* topic in that track (gradient, foundational) rather than the *last* (inverse-implicit, advanced). This reduces Topic 15's prerequisite load.
2. **No coordinate substitution machinery.** Topic 14 was all about changing coordinates (polar, cylindrical, spherical, general diffeomorphisms). Topic 15 parameterizes curves directly — the integral $\int_C \mathbf{F} \cdot d\mathbf{r} = \int_a^b \mathbf{F}(\mathbf{r}(t)) \cdot \mathbf{r}'(t)\,dt$ is a straightforward 1D integral after parameterization, with no Jacobian determinant. This is simpler conceptually, but it introduces a new domain (curves rather than regions).
3. **The flagship viz is animated.** Topic 14's flagship was a static grid deformation. Topic 15's flagship shows a particle traversing a curve with accumulating work — animation is essential to the concept. The reader needs to *see* the dot product $\mathbf{F} \cdot d\mathbf{r}$ contribute (positively or negatively) at each point.
4. **Topology enters the picture.** Topic 14 dealt with diffeomorphisms on well-behaved open sets. Topic 15 introduces simply connected domains and the topological obstruction to conservativeness (the vortex field example). This is the first topic where the *shape* of the domain — not just its boundary — affects the mathematics.
5. **Green's theorem connects back to Topic 13.** Green's theorem converts a line integral to a double integral, directly invoking the machinery from Topic 13 (Fubini, Type I/II regions). Topic 14 also built on Topic 13, but through coordinate changes rather than through boundary-interior relationships.
6. **The ML connection is gradient flow.** Topic 14's ML connection was normalizing flows (density transformation). Topic 15's is gradient flow — continuous-time gradient descent as a curve in parameter space, with the Gradient Theorem quantifying the total loss decrease. This connection is arguably more fundamental: every ML practitioner uses gradient descent, while normalizing flows are specialized.
7. **Three full proofs.** The Gradient Theorem, the equivalence theorem, and Green's theorem all receive full proofs. The Gradient Theorem proof is elegant (chain rule + FTC), the equivalence proof is constructive (building the potential function from path integrals), and the Green's theorem proof uses the Type I/II decomposition from Topic 13.
8. **Curl is introduced.** The 2D curl $\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}$ is a new differential operator that will be generalized in Topic 16 (surface integrals) to the full 3D curl $\nabla \times \mathbf{F}$.

---

## Appendix B: Formal Element Inventory

| Type | # | Title |
|------|---|-------|
| Definition | 1 | Parameterized Curve |
| Definition | 2 | Arc Length |
| Definition | 3 | Scalar Line Integral |
| Definition | 4 | Vector Line Integral |
| Definition | 5 | Conservative Vector Field |
| Definition | 6 | Path Independence |
| Definition | 7 | Closed Curve |
| Definition | 8 | Simply Connected Domain |
| Definition | 9 | 2D Curl (Scalar Curl) |
| Theorem | 1 | Properties of Line Integrals |
| Theorem | 2 | The Gradient Theorem (FTC for Line Integrals) |
| Theorem | 3 | Equivalence of Conservative, Path-Independent, and Zero-Circulation |
| Theorem | 4 | Exactness Criterion |
| Theorem | 5 | Green's Theorem |
| Proposition | 1 | Parameterization Independence |
| Proposition | 2 | Curl as Infinitesimal Circulation |
| Example | 1 | Circle of radius $R$ |
| Example | 2 | Helix |
| Example | 3 | Parabolic arc |
| Example | 4 | Mass of a semicircular wire |
| Example | 5 | Average value along a curve |
| Example | 6 | Work by a constant force |
| Example | 7 | Work by a radial field |
| Example | 8 | Work by a non-conservative field |
| Example | 9 | Gravitational potential |
| Example | 10 | Verifying Example 7 via the Gradient Theorem |
| Example | 11 | Testing conservativeness |
| Example | 12 | The vortex field — topology matters |
| Example | 13 | Circulation of $(-y, x)$ around the unit circle |
| Example | 14 | Area via Green's theorem |
| Example | 15 | Identifying rotation (three curl examples) |
| Remark | 1 | Reparameterization invariance |
| Remark | 2 | Orientation matters |
| Remark | 3 | Parameterization independence (vector) |
| Remark | 4 | Potential functions are unique up to a constant |
| Remark | 5 | Why "simply connected"? |
| Remark | 6 | Green's theorem as a conservation law |
| Remark | 7 | Conservative ⟺ curl-free (on simply connected domains) |
| Proof | — | 3 proofs (Proposition 1 — parameterization independence, Theorem 2 — Gradient Theorem, Theorem 3 — equivalence theorem, Theorem 5 — Green's theorem). Note: 4 proofs total, counting Proposition 2 sketch. |

---

*Brief version: v1 | Created: 2026-04-03 | Author: Jonathan Rocha*  
*Reference notebook: `notebooks/line-integrals/15_line_integrals.ipynb`*  
*Reference doc: `docs/plans/formalcalculus-handoff-reference.md`*
