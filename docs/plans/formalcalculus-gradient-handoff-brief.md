# Claude Code Handoff Brief: Partial Derivatives & the Gradient

**Project:** formalCalculus — [formalcalculus.com](https://www.formalcalculus.com)  
**Repo:** `github.com/jonx0037/formalCalculus`  
**Stack:** Astro 6 · React 19 · MDX · Tailwind CSS 4 · D3.js 7 · KaTeX · Vercel  
**Package Manager:** pnpm  
**Status:** Ready for implementation  
**Reference Notebook:** `notebooks/gradient/09_partial_derivatives_gradient.ipynb`  
**Reference Doc:** `docs/plans/formalcalculus-handoff-reference.md`

---

## 1. Objective

Add a new topic page **"Partial Derivatives & the Gradient"** as the **first topic in the Multivariable Differential Calculus track** on formalcalculus.com.

1. This is **topic 9 of 32** and the **ninth topic published** on formalcalculus.com. All four topics in the Limits & Continuity track (`sequences-limits`, `epsilon-delta`, `completeness-compactness`, `uniform-convergence`) plus all four topics in the Single-Variable Calculus track (`derivative`, `mean-value-taylor`, `riemann-integral`, `improper-integrals`) are deployed and live. This is the **first topic in a new track** (Multivariable Differential Calculus).
2. **Prerequisites:** `derivative`. Partial derivatives are defined by holding all variables except one fixed and taking a single-variable derivative — the entire apparatus of Topic 5 (limit definition of the derivative, differentiability, chain rule) carries directly into the multivariable setting. The gradient is a vector of partial derivatives, so the reader must know what a derivative is before we can assemble the gradient. No other prerequisites are required: the reader does not need the MVT, Taylor expansion, or integration to understand partial derivatives and the gradient.
3. **Difficulty: foundational.** This is a new concept — extending differentiation from $\mathbb{R} \to \mathbb{R}$ to $\mathbb{R}^n \to \mathbb{R}$ — and needs the same careful scaffolding that the derivative received in Topic 5. The reader is seeing multivariable calculus for the first time within formalCalculus. The conceptual leap from single-variable to multivariable is significant: the derivative is no longer a number but a vector (the gradient) or a linear map (the total derivative). The proofs are not harder than Topic 5, but the geometric reasoning is richer because we are working in $\mathbb{R}^n$.
4. **Downstream within formalCalculus:**
   - `jacobian` (direct) — The Jacobian matrix is the generalization of the gradient to vector-valued functions $f: \mathbb{R}^n \to \mathbb{R}^m$. Where the gradient is a single row of partial derivatives, the Jacobian stacks $m$ such rows. The multivariate chain rule $J_{f \circ g}(a) = J_f(g(a)) \cdot J_g(a)$ is the backbone of backpropagation.
   - `hessian` (indirect) — The Hessian is the matrix of second-order partial derivatives: $H_{ij} = \frac{\partial^2 f}{\partial x_i \partial x_j}$. Positive definiteness of the Hessian at a critical point (where $\nabla f = 0$) determines local minimality — the multivariable second derivative test.
   - `inverse-implicit` (indirect) — The Inverse Function Theorem requires the Jacobian to be invertible; the Implicit Function Theorem uses the gradient of a constraint surface.
   - `multiple-integrals` (indirect) — Partial derivatives appear in Fubini's theorem hypotheses and in computing integrands.
   - `change-of-variables` (indirect) — The Jacobian determinant in the change-of-variables formula is built from partial derivatives.
5. **Forward links to formalml.com:**
   - `gradient-descent` — Gradient descent moves in the direction $-\nabla L(\theta)$ at each step: $\theta_{t+1} = \theta_t - \eta \nabla L(\theta_t)$. The gradient is the steepest ascent direction; negating it gives the steepest descent. Everything in this topic — the gradient's definition, its relationship to directional derivatives, its orthogonality to level sets — explains *why gradient descent works geometrically*.
   - `convex-analysis` — For convex $f$, the first-order condition $f(y) \ge f(x) + \nabla f(x)^T(y - x)$ says the tangent hyperplane lies below the graph. This is the foundation of convex optimization — the gradient provides a global lower bound, not just a local approximation.
   - `smooth-manifolds` — The gradient of a constraint function $g: \mathbb{R}^n \to \mathbb{R}$ at a point on the level set $g^{-1}(c)$ is normal to the constraint surface. This geometric fact is the starting point for the theory of smooth manifolds and constraint optimization (Lagrange multipliers).
6. This topic **creates** the shared utility module `multivariate.ts` at `src/components/viz/shared/multivariate.ts`. This module will be extended by Topics 10–12 in the Multivariable Differential Calculus track (Jacobian, Hessian, Inverse/Implicit Function Theorems) and by Track 4 topics.

**Content scope:**

- Partial derivatives: $\frac{\partial f}{\partial x_i}(a) = \lim_{h \to 0} \frac{f(a_1, \ldots, a_i + h, \ldots, a_n) - f(a)}{h}$ — fixing all variables except $x_i$ and taking the ordinary derivative
- Geometric interpretation in $\mathbb{R}^2 \to \mathbb{R}$: $\frac{\partial f}{\partial x}$ is the slope of the slice $y = a_2$ (a curve on the surface); the tangent plane $z = f(a) + f_x(a)(x - a_1) + f_y(a)(y - a_2)$ is the best linear approximation
- The gradient vector: $\nabla f(a) = \left(\frac{\partial f}{\partial x_1}(a), \ldots, \frac{\partial f}{\partial x_n}(a)\right)$ — assembling partial derivatives into a vector
- Directional derivatives: $D_\mathbf{u}f(a) = \lim_{t \to 0} \frac{f(a + t\mathbf{u}) - f(a)}{t}$ and the theorem $D_\mathbf{u}f(a) = \nabla f(a) \cdot \mathbf{u}$ (when $f$ is differentiable)
- The gradient as steepest ascent: among all unit directions $\mathbf{u}$, the directional derivative $D_\mathbf{u}f$ is maximized when $\mathbf{u} = \frac{\nabla f}{\|\nabla f\|}$, with maximum value $\|\nabla f\|$
- Gradient and level sets: $\nabla f$ is orthogonal to the level set $\{x : f(x) = c\}$ at every point — the gradient points "uphill" perpendicular to contour lines
- Differentiability in $\mathbb{R}^n$: the total derivative as a linear map $Df(a): \mathbb{R}^n \to \mathbb{R}$ satisfying $\lim_{h \to 0} \frac{|f(a+h) - f(a) - Df(a) \cdot h|}{\|h\|} = 0$ — existence of all partial derivatives is necessary but not sufficient for differentiability; continuity of partial derivatives is sufficient (the $C^1$ criterion)
- The critical counterexample: $f(x,y) = \frac{xy}{x^2+y^2}$ (with $f(0,0) = 0$) has partial derivatives at the origin, but is not continuous there — partial derivatives alone do not capture the full picture
- ML connections: gradient descent $\theta_{t+1} = \theta_t - \eta \nabla L(\theta_t)$ as following the steepest descent direction, loss landscape geometry (contour plots, saddle points, local minima), feature importance via gradient magnitude ($|\partial L / \partial x_i|$), gradient-based saliency maps in deep learning

---

## 2. MDX File

### Location

```
src/content/topics/gradient.mdx
```

The entry `id` will be `gradient`. The dynamic route resolves to `/topics/gradient`.

### Frontmatter

```yaml
---
title: "Partial Derivatives & the Gradient"
subtitle: "Extending differentiation to functions of several variables — partial derivatives as single-variable slices, the gradient as the direction of steepest ascent, directional derivatives, and the total derivative as the correct notion of multivariable differentiability"
status: "published"
difficulty: "foundational"
prerequisites:
  - "derivative"
tags:
  - "calculus"
  - "partial-derivative"
  - "gradient"
  - "directional-derivative"
  - "tangent-plane"
  - "steepest-ascent"
  - "level-set"
  - "total-derivative"
  - "differentiability"
  - "gradient-descent"
domain: "multivar-differential"
videoId: null
notebookPath: "notebooks/gradient/09_partial_derivatives_gradient.ipynb"
githubUrl: "https://github.com/jonx0037/formalCalculus/blob/main/src/content/topics/gradient.mdx"
datePublished: 2026-04-01
estimatedReadTime: 45
abstract: "Partial derivatives extend single-variable differentiation to functions of several variables. Given f: ℝⁿ → ℝ, the partial derivative ∂f/∂xᵢ at a point a is computed by holding all variables except xᵢ fixed and taking the ordinary derivative — it measures the rate of change of f in the xᵢ-direction. Geometrically, for f: ℝ² → ℝ, ∂f/∂x is the slope of the curve obtained by slicing the surface z = f(x,y) with the plane y = a₂. Assembling all partial derivatives into a vector gives the gradient ∇f(a) = (∂f/∂x₁, ..., ∂f/∂xₙ). The gradient connects to directional derivatives via D_u f(a) = ∇f(a) · u: the rate of change of f in direction u is the dot product of the gradient with u. Since |∇f · u| ≤ ‖∇f‖ with equality when u = ∇f/‖∇f‖, the gradient points in the direction of steepest ascent, and its magnitude is the maximum rate of change. This is why gradient descent works: moving in the direction −∇L(θ) decreases the loss as rapidly as possible (locally). The gradient is perpendicular to level sets — contour lines on a topographic map run at right angles to the direction of steepest climb. But partial derivatives alone do not tell the whole story. The function f(x,y) = xy/(x² + y²) has both partial derivatives at the origin, yet is not even continuous there. The correct notion of differentiability in ℝⁿ is the total derivative: a linear map Df(a) satisfying lim_{h→0} |f(a+h) − f(a) − Df(a)·h| / ‖h‖ = 0. When f is differentiable, the total derivative is represented by the gradient (for scalar-valued f) or the Jacobian matrix (for vector-valued f, covered in the next topic). A sufficient condition for differentiability is that all partial derivatives exist and are continuous — the C¹ criterion. In machine learning, the gradient is the engine of optimization: SGD, Adam, and every gradient-based optimizer compute ∇L(θ) and step in the direction −∇L. Gradient magnitude |∂L/∂xᵢ| measures feature importance, saliency maps visualize which input pixels matter most to a classifier, and the geometry of loss landscapes — contour shapes, saddle points, local minima — is understood through the gradient and its higher-order relatives."
formalmlConnections:
  - topic: "gradient-descent"
    site: "formalml"
    relationship: "Gradient descent updates parameters by stepping in the direction −∇L(θ) — the steepest descent direction. The gradient's orthogonality to level sets explains why gradient descent cuts across contour lines. The directional derivative inequality D_u f ≤ ‖∇f‖ quantifies why no other direction decreases the loss faster (locally)."
  - topic: "convex-analysis"
    site: "formalml"
    relationship: "For convex functions, the gradient provides a global lower bound: f(y) ≥ f(x) + ∇f(x)ᵀ(y − x). This first-order convexity condition is the foundation of convex optimization — the gradient at any point gives a tangent hyperplane that lies entirely below the graph."
  - topic: "smooth-manifolds"
    site: "formalml"
    relationship: "The gradient of a constraint function g is normal to the level set g⁻¹(c). This geometric fact — that ∇g is perpendicular to the constraint surface — is the starting point for Lagrange multipliers and the theory of smooth submanifolds of ℝⁿ."
connections:
  - topic: "derivative"
    relationship: "Partial derivatives are single-variable derivatives in disguise: hold all variables except one fixed and apply the limit definition from Topic 5. Every concept here — the limit definition, differentiability vs. continuity, linear approximation — is the multivariable extension of its Topic 5 counterpart."
  - topic: "epsilon-delta"
    relationship: "The total derivative definition uses a multivariable limit (‖h‖ → 0 in ℝⁿ), extending the ε-δ framework from Topic 2 to higher dimensions. The C¹ criterion uses continuity of partial derivatives, also in the ε-δ sense."
  - topic: "completeness-compactness"
    relationship: "Compactness of closed bounded sets in ℝⁿ (Heine-Borel generalizes) ensures that continuous functions on compact domains achieve extrema — the multivariable Extreme Value Theorem that motivates gradient-based search for minima."
references:
  - type: "book"
    title: "Understanding Analysis"
    authors: "Abbott"
    year: 2015
    note: "Single-variable foundation — Topic 5 of formalCalculus follows Abbott's Chapter 5. This topic extends that foundation to several variables."
  - type: "book"
    title: "Analysis on Manifolds"
    authors: "Munkres"
    year: 1991
    note: "Chapters 2–3 develop partial derivatives, the total derivative, and the chain rule in ℝⁿ with full rigor and exceptional clarity — the primary reference for our multivariable treatment"
  - type: "book"
    title: "Principles of Mathematical Analysis"
    authors: "Rudin"
    year: 1976
    note: "Chapter 9 on multivariable differentiation — compact, definitive treatment of the total derivative and the inverse function theorem"
  - type: "book"
    title: "Calculus on Manifolds"
    authors: "Spivak"
    year: 1965
    note: "Chapter 2 develops the derivative as a linear map, the multivariate chain rule, and partial derivatives — elegant minimalist treatment"
  - type: "book"
    title: "Deep Learning"
    authors: "Goodfellow, Bengio & Courville"
    year: 2016
    note: "Section 4.3 on gradient-based optimization — the gradient as the engine of deep learning training"
  - type: "paper"
    title: "Visualizing the Loss Landscape of Neural Nets"
    authors: "Li, Xu, Taylor, Studer & Goldstein"
    year: 2018
    url: "https://arxiv.org/abs/1712.09913"
    note: "Loss landscape geometry — contour plots, saddle points, and the role of gradient direction in navigating high-dimensional optimization surfaces"
---
```

---

## 3. Content Outline

### Section 1: Overview & Motivation

**Opening example:** In single-variable calculus, a function $f: \mathbb{R} \to \mathbb{R}$ has one input and one direction to differentiate. But a neural network's loss $L(\theta_1, \theta_2, \ldots, \theta_n)$ depends on thousands or millions of parameters. To minimize $L$, we need to know how $L$ changes when we nudge each parameter $\theta_i$ independently — that is, a partial derivative — and then assemble those rates of change into a direction for the next step — that is, the gradient. This topic builds the theory that makes gradient-based optimization precise.

No TheoremBlocks. No viz. 2–3 paragraphs setting up the transition from $\mathbb{R}$ to $\mathbb{R}^n$.

### Section 2: Partial Derivatives

**Core definition section.** Begin with the geometric picture for $f: \mathbb{R}^2 \to \mathbb{R}$: a surface $z = f(x, y)$ in three-dimensional space. To compute $\frac{\partial f}{\partial x}$ at $(a_1, a_2)$, slice the surface with the plane $y = a_2$ — this produces a curve in the $xz$-plane. The slope of this curve at $x = a_1$ is $\frac{\partial f}{\partial x}(a_1, a_2)$. Then formalize.

**TheoremBlocks:**

- **Definition 1: Partial Derivative** — Let $f: \mathbb{R}^n \to \mathbb{R}$ and let $a = (a_1, \ldots, a_n) \in \mathbb{R}^n$. The *partial derivative of $f$ with respect to $x_i$ at $a$* is $\frac{\partial f}{\partial x_i}(a) = \lim_{h \to 0} \frac{f(a_1, \ldots, a_i + h, \ldots, a_n) - f(a)}{h}$, provided this limit exists. Plain-English gloss: hold every input fixed except $x_i$, and take the ordinary derivative with respect to $x_i$. Notation: $\frac{\partial f}{\partial x_i}(a) = f_{x_i}(a) = \partial_i f(a) = D_i f(a)$.
- **Example 1: Partial derivatives of $f(x,y) = x^2 y + \sin(y)$** — $\frac{\partial f}{\partial x} = 2xy$ (treat $y$ as constant, differentiate with respect to $x$). $\frac{\partial f}{\partial y} = x^2 + \cos(y)$ (treat $x$ as constant). Verify at the point $(1, \pi/2)$: $f_x(1, \pi/2) = \pi$, $f_y(1, \pi/2) = 1$.
- **Example 2: Partial derivatives of $f(x,y) = e^{x^2 + y^2}$** — $\frac{\partial f}{\partial x} = 2x e^{x^2 + y^2}$ (chain rule from Topic 5 applied to the single-variable function $g(t) = e^{t^2 + y^2}$). $\frac{\partial f}{\partial y} = 2y e^{x^2 + y^2}$.

**Visualization:** `PartialDerivativeSliceExplorer` embedded here.

**Static image:** `partial-derivative-slices.png` from the notebook.

### Section 3: Tangent Planes & Linear Approximation

**The multivariable generalization of the tangent line.** In Topic 5, the tangent line $y = f(a) + f'(a)(x - a)$ was the best linear approximation. Now, for $f: \mathbb{R}^2 \to \mathbb{R}$, the tangent *plane* at $(a_1, a_2)$ is $z = f(a) + f_x(a)(x - a_1) + f_y(a)(y - a_2)$. Geometric intuition: the tangent plane touches the surface at one point and "hugs" it locally.

**TheoremBlocks:**

- **Proposition 1: Tangent Plane as Linear Approximation** — If $f: \mathbb{R}^2 \to \mathbb{R}$ is differentiable at $a = (a_1, a_2)$, then $f(a_1 + h_1, a_2 + h_2) \approx f(a) + f_x(a) h_1 + f_y(a) h_2$, with error that vanishes faster than $\|(h_1, h_2)\|$ as $(h_1, h_2) \to (0,0)$. This is the 2D analog of Proposition 1 from Topic 5 (derivative as best linear approximation).
- **Remark 1: From tangent line to tangent plane to tangent hyperplane** — In $\mathbb{R}^1$, the best linear approximation is a line. In $\mathbb{R}^2$, it is a plane. In $\mathbb{R}^n$, it is a hyperplane: $f(a + h) \approx f(a) + \sum_{i=1}^n \frac{\partial f}{\partial x_i}(a) h_i$. The pattern is the same — the derivative provides the coefficients of the linear approximation. In the next topic (Jacobian), the derivative of a vector-valued function becomes a matrix, and the tangent hyperplane becomes an affine subspace.

**Static image:** `tangent-plane.png` from the notebook.

### Section 4: The Gradient Vector

**Assembling partial derivatives into a vector.** The individual partial derivatives tell us rates of change along coordinate directions. The gradient collects them into a single object that encodes the rate of change in *every* direction simultaneously.

**TheoremBlocks:**

- **Definition 2: The Gradient** — Let $f: \mathbb{R}^n \to \mathbb{R}$ be a function whose partial derivatives all exist at $a$. The *gradient of $f$ at $a$* is the vector $\nabla f(a) = \left(\frac{\partial f}{\partial x_1}(a), \frac{\partial f}{\partial x_2}(a), \ldots, \frac{\partial f}{\partial x_n}(a)\right) \in \mathbb{R}^n.$ Notation: $\nabla f(a) = \text{grad}\, f(a) = Df(a)^T$ (when $Df$ is a row vector, $\nabla f$ is the corresponding column vector — conventions vary; we follow the column-vector convention throughout).
- **Example 3: Gradient of $f(x,y) = x^2 + y^2$** — $\nabla f(x,y) = (2x, 2y)$. At any point, the gradient points radially outward from the origin — directly "uphill" on the paraboloid. At $(1, 1)$: $\nabla f = (2, 2)$, pointing toward the northeast.
- **Example 4: Gradient of $f(x,y,z) = xyz$** — $\nabla f = (yz, xz, xy)$. At $(1, 2, 3)$: $\nabla f = (6, 3, 2)$.

**Visualization:** `GradientFieldExplorer` embedded here.

**Static image:** `gradient-vector-field.png` from the notebook.

### Section 5: Directional Derivatives

**Rates of change in arbitrary directions.** Partial derivatives measure change along the coordinate axes ($\mathbf{e}_1, \mathbf{e}_2, \ldots, \mathbf{e}_n$). But we often need the rate of change in a direction $\mathbf{u}$ that is not aligned with any axis — for instance, the direction a gradient descent step actually takes.

**TheoremBlocks:**

- **Definition 3: Directional Derivative** — Let $f: \mathbb{R}^n \to \mathbb{R}$, $a \in \mathbb{R}^n$, and $\mathbf{u} \in \mathbb{R}^n$ a unit vector. The *directional derivative of $f$ at $a$ in the direction $\mathbf{u}$* is $D_\mathbf{u}f(a) = \lim_{t \to 0} \frac{f(a + t\mathbf{u}) - f(a)}{t}$, provided this limit exists. Plain-English gloss: stand at $a$, walk in direction $\mathbf{u}$, and measure how fast $f$ changes.
- **Theorem 1: Gradient–Directional Derivative Relationship** — If $f: \mathbb{R}^n \to \mathbb{R}$ is differentiable at $a$, then for every unit vector $\mathbf{u}$, the directional derivative exists and equals $D_\mathbf{u}f(a) = \nabla f(a) \cdot \mathbf{u}$.
- **Proof of Theorem 1** — Define $\varphi(t) = f(a + t\mathbf{u})$. By the chain rule (Topic 5), $\varphi'(0) = \sum_{i=1}^n \frac{\partial f}{\partial x_i}(a) \cdot u_i = \nabla f(a) \cdot \mathbf{u}$. The chain rule is valid here because $f$ is differentiable at $a$ (not merely having partial derivatives). Full expansion of the chain rule application, connecting each step back to the limit definition.
- **Example 5: Directional derivative of $f(x,y) = x^2 + y^2$ in direction $\mathbf{u} = \frac{1}{\sqrt{2}}(1,1)$** — $\nabla f(1,1) = (2, 2)$. $D_\mathbf{u}f(1,1) = (2,2) \cdot \frac{1}{\sqrt{2}}(1,1) = \frac{4}{\sqrt{2}} = 2\sqrt{2}$.

**Visualization:** `DirectionalDerivativeExplorer` embedded here.

**Static image:** `directional-derivative.png` from the notebook.

### Section 6: The Gradient as Steepest Ascent

**The geometric crown jewel of this topic.** Why does the gradient point "uphill"? Because among all unit directions, the directional derivative $D_\mathbf{u}f = \nabla f \cdot \mathbf{u}$ is maximized when $\mathbf{u}$ points in the same direction as $\nabla f$. This is a direct consequence of the Cauchy-Schwarz inequality.

**TheoremBlocks:**

- **Theorem 2: Gradient as Direction of Steepest Ascent** — Let $f: \mathbb{R}^n \to \mathbb{R}$ be differentiable at $a$ with $\nabla f(a) \neq 0$. Then among all unit vectors $\mathbf{u} \in \mathbb{R}^n$:
  1. The maximum of $D_\mathbf{u}f(a)$ is $\|\nabla f(a)\|$, achieved when $\mathbf{u} = \frac{\nabla f(a)}{\|\nabla f(a)\|}$.
  2. The minimum of $D_\mathbf{u}f(a)$ is $-\|\nabla f(a)\|$, achieved when $\mathbf{u} = -\frac{\nabla f(a)}{\|\nabla f(a)\|}$.
  3. $D_\mathbf{u}f(a) = 0$ if and only if $\mathbf{u}$ is orthogonal to $\nabla f(a)$.
- **Proof of Theorem 2** — By Theorem 1, $D_\mathbf{u}f = \nabla f \cdot \mathbf{u}$. By Cauchy-Schwarz, $|\nabla f \cdot \mathbf{u}| \le \|\nabla f\| \cdot \|\mathbf{u}\| = \|\nabla f\|$. Equality holds iff $\mathbf{u}$ is a scalar multiple of $\nabla f$, and since $\|\mathbf{u}\| = 1$, this means $\mathbf{u} = \pm \nabla f / \|\nabla f\|$. The positive sign gives maximum $\|\nabla f\|$, the negative sign gives minimum $-\|\nabla f\|$. If $\mathbf{u} \perp \nabla f$, then $\nabla f \cdot \mathbf{u} = 0$.
- **Theorem 3: Gradient is Orthogonal to Level Sets** — Let $f: \mathbb{R}^n \to \mathbb{R}$ be differentiable at $a$ with $\nabla f(a) \neq 0$. Let $S = \{x \in \mathbb{R}^n : f(x) = f(a)\}$ be the level set through $a$. If $\gamma: (-\varepsilon, \varepsilon) \to \mathbb{R}^n$ is a smooth curve with $\gamma(0) = a$ and $\gamma(t) \in S$ for all $t$, then $\nabla f(a) \cdot \gamma'(0) = 0$. In words, the gradient is perpendicular to every curve that stays on the level set.
- **Proof of Theorem 3** — Since $f(\gamma(t)) = f(a) = c$ for all $t$, differentiating with respect to $t$ at $t = 0$ gives $\frac{d}{dt}f(\gamma(t))\big|_{t=0} = \nabla f(\gamma(0)) \cdot \gamma'(0) = \nabla f(a) \cdot \gamma'(0) = 0$ by the chain rule. This holds for every tangent vector $\gamma'(0)$ to $S$ at $a$, so $\nabla f(a)$ is orthogonal to the tangent space of $S$.
- **Remark 2: Contour maps and topographic intuition** — On a topographic map, contour lines connect points at the same elevation. The gradient points in the direction of steepest climb — straight up the hillside, perpendicular to the contour lines. A hiker following the gradient path reaches the summit as fast as possible; a hiker walking along a contour line (perpendicular to the gradient) stays at the same elevation. Gradient descent reverses this: it follows $-\nabla f$, going *downhill* as steeply as possible.

**Visualization:** `ContourGradientExplorer` embedded here — the flagship visualization.

**Static image:** `gradient-contour-orthogonality.png` from the notebook.

### Section 7: Differentiability in $\mathbb{R}^n$ — The Total Derivative

**The subtle point:** having all partial derivatives is not the same as being differentiable. Partial derivatives probe a function only along coordinate axes. A function can have well-defined partial derivatives at a point but behave wildly when approached from other directions. The correct notion of differentiability requires the function to be well-approximated by a *single linear map* in *all* directions simultaneously.

**TheoremBlocks:**

- **Definition 4: Differentiability (Total Derivative)** — A function $f: \mathbb{R}^n \to \mathbb{R}$ is *differentiable at $a$* if there exists a linear map $Df(a): \mathbb{R}^n \to \mathbb{R}$ such that $\lim_{h \to 0} \frac{|f(a+h) - f(a) - Df(a)(h)|}{\|h\|} = 0.$ When $f$ is differentiable, $Df(a)$ is unique and is represented by the gradient: $Df(a)(h) = \nabla f(a) \cdot h$. (For $f: \mathbb{R}^n \to \mathbb{R}^m$, $Df(a)$ is represented by the Jacobian matrix — that is, the next topic.)
- **Theorem 4: Differentiability Implies Partial Derivatives Exist** — If $f: \mathbb{R}^n \to \mathbb{R}$ is differentiable at $a$, then all partial derivatives exist at $a$, and $Df(a)(\mathbf{e}_i) = \frac{\partial f}{\partial x_i}(a)$.
- **Proof of Theorem 4** — Set $h = t\mathbf{e}_i$ in the total derivative definition. Then $\frac{|f(a + t\mathbf{e}_i) - f(a) - Df(a)(t\mathbf{e}_i)|}{|t|} \to 0$ as $t \to 0$, which means $\frac{f(a + t\mathbf{e}_i) - f(a)}{t} \to Df(a)(\mathbf{e}_i)$. The left side is exactly the limit defining $\frac{\partial f}{\partial x_i}(a)$.
- **Remark 3: The converse is false** — Partial derivatives existing does not imply differentiability. This echoes Remark 2 of Topic 5 (continuity does not imply differentiability), but in a stronger form: the failure is more dramatic in $\mathbb{R}^n$. We can have all partial derivatives at a point and still fail to be continuous there.
- **Example 6: The critical counterexample** — $f(x,y) = \begin{cases} \frac{xy}{x^2 + y^2} & (x,y) \neq (0,0) \\ 0 & (x,y) = (0,0) \end{cases}$. Partial derivatives at origin: $f_x(0,0) = \lim_{h \to 0} \frac{f(h,0) - f(0,0)}{h} = \lim_{h \to 0} \frac{0}{h} = 0$. Similarly $f_y(0,0) = 0$. But along $y = x$: $f(x,x) = \frac{x^2}{2x^2} = \frac{1}{2} \ne 0 = f(0,0)$, so $f$ is not continuous at the origin — let alone differentiable.
- **Theorem 5: $C^1$ Criterion** — If all partial derivatives $\frac{\partial f}{\partial x_i}$ exist in a neighborhood of $a$ and are continuous at $a$, then $f$ is differentiable at $a$.
- **Proof of Theorem 5** — Sketch for $n = 2$. Write $f(a+h) - f(a) = [f(a_1+h_1, a_2+h_2) - f(a_1, a_2+h_2)] + [f(a_1, a_2+h_2) - f(a_1, a_2)]$. Apply the single-variable MVT to each bracket: the first equals $f_x(c_1, a_2+h_2) \cdot h_1$ for some $c_1$ between $a_1$ and $a_1 + h_1$; the second equals $f_y(a_1, c_2) \cdot h_2$ for some $c_2$ between $a_2$ and $a_2 + h_2$. By continuity of $f_x$ and $f_y$, the intermediate values $f_x(c_1, a_2+h_2) \to f_x(a)$ and $f_y(a_1, c_2) \to f_y(a)$ as $h \to 0$, so the error $f(a+h) - f(a) - [f_x(a)h_1 + f_y(a)h_2]$ is $o(\|h\|)$.
- **Remark 4: Differentiability implies continuity (again)** — Just as in Topic 5, differentiability at $a$ implies continuity at $a$: $|f(a+h) - f(a)| = |Df(a)(h) + o(\|h\|)| \le \|Df(a)\| \cdot \|h\| + o(\|h\|) \to 0$. The chain of implications is: $C^1 \Rightarrow \text{differentiable} \Rightarrow \text{continuous}$ and $\text{differentiable} \Rightarrow \text{partial derivatives exist}$, but none of the converses hold in general.

**Static image:** `differentiability-counterexample.png` from the notebook.

### Section 8: Computational Notes

**NumPy/SciPy implementation.** Computing gradients numerically vs. analytically.

- **Finite difference gradients:** $\frac{\partial f}{\partial x_i}(a) \approx \frac{f(a + h\mathbf{e}_i) - f(a - h\mathbf{e}_i)}{2h}$ (central difference). Discuss step size tradeoff: too large → truncation error, too small → floating-point cancellation. (Same tradeoff as Topic 5, now in $n$ dimensions.)
- **`numpy.gradient` and `scipy.optimize.approx_fprime`:** The standard library implementations.
- **Automatic differentiation preview:** `jax.grad` computes exact gradients via reverse-mode AD. This connects forward to the Jacobian topic and to the backpropagation discussion in Topic 5. Show a simple example: `grad(lambda x: x[0]**2 + x[1]**2)(jnp.array([1.0, 1.0]))` returns `[2.0, 2.0]`.

**Static image:** `numerical-gradient-verification.png` from the notebook.

### Section 9: Connections to ML

**The gradient in machine learning.** This is where the theory meets practice.

- **Gradient descent** — $\theta_{t+1} = \theta_t - \eta \nabla L(\theta_t)$: the gradient tells us the direction of steepest *ascent* of the loss; negating it gives steepest *descent*. The learning rate $\eta$ controls the step size. Theorem 2 explains why this is locally optimal: no other direction decreases $L$ faster than $-\nabla L / \|\nabla L\|$.
- **Loss landscape geometry** — Contour plots of loss functions. The gradient is perpendicular to contour lines (Theorem 3). Circular contours (isotropic loss) → gradient descent takes straight paths to the minimum. Elongated contours (anisotropic loss) → gradient descent oscillates, motivating momentum, Adam, and second-order methods (→ `hessian`).
- **Feature importance and saliency** — $|\frac{\partial L}{\partial x_i}|$ measures how sensitive the loss is to feature $x_i$. In deep learning, saliency maps compute $\frac{\partial L}{\partial \text{input pixel}}$ to visualize which pixels most affect the prediction — a direct application of partial derivatives.
- **Critical points** — A critical point has $\nabla f(a) = 0$: the loss surface is flat. But $\nabla f = 0$ does not distinguish minima from maxima from saddle points — that requires the Hessian (→ `hessian`, coming in Topic 11).

Forward references (external links, new tab):
- [Gradient Descent](https://formalml.com/topics/gradient-descent) → formalML
- [Convex Analysis](https://formalml.com/topics/convex-analysis) → formalML

Forward references (within formalCalculus, plain text):
- **The Jacobian & Multivariate Chain Rule** *(coming soon)* extends the gradient to vector-valued functions and derives the chain rule that makes backpropagation possible.
- **The Hessian & Second-Order Analysis** *(coming soon)* uses second-order partial derivatives to classify critical points and analyze loss surface curvature.

**Visualization:** `GradientDescentExplorer` embedded here.

**Static image:** `gradient-descent-landscape.png` from the notebook.

### Section 10: Connections & Further Reading

Standard cross-reference table linking to all referenced formalCalculus topics and formalml.com topics. DAG diagram showing `gradient`'s position in the prerequisite graph.

---

## 4. Visualizations

### 4.1 PartialDerivativeSliceExplorer (Flagship)

- **Component name:** `PartialDerivativeSliceExplorer`
- **Filename:** `src/components/viz/PartialDerivativeSliceExplorer.tsx`
- **What it visualizes:** A 3D wireframe surface $z = f(x, y)$ with an interactive slice plane. The user selects whether to hold $x$ or $y$ fixed, and drags a slider to move the slice plane. The resulting curve (the slice) is highlighted on the surface, and a companion 2D panel shows the slice as a standard $y$-vs-$x$ curve with its tangent line at the evaluation point — that tangent slope is the partial derivative.
- **User interactions:**
  - Toggle: "Slice $y$ = const" / "Slice $x$ = const" — selects which variable to hold fixed.
  - Slice position slider — moves the slice plane along the fixed variable's axis.
  - Evaluation point slider — moves the tangent point along the slice curve.
  - Function preset dropdown: $x^2 + y^2$ (paraboloid), $\sin(x)\cos(y)$ (egg carton), $xe^{-(x^2+y^2)}$ (monkey saddle variant), $\frac{x^2 - y^2}{2}$ (saddle).
- **Numerical readout panel:** Current slice value, evaluation point, partial derivative value, tangent line equation.
- **Data source:** Inline computation (functions defined in the component via data module presets).
- **Panel layout:** Two-panel: left shows 3D wireframe + slice plane (rendered as 2D perspective projection via D3, not WebGL), right shows the 2D slice curve with tangent line.
- **Reference pattern:** This is the flagship visualization, paralleling `SecantToTangentExplorer` (Topic 5), `EpsilonDeltaExplorer` (Topic 2), and `RiemannSumExplorer` (Topic 7) as the component that immediately conveys the core concept through interaction.

### 4.2 GradientFieldExplorer

- **Component name:** `GradientFieldExplorer`
- **Filename:** `src/components/viz/GradientFieldExplorer.tsx`
- **What it visualizes:** A 2D contour plot of $f(x,y)$ with gradient vectors overlaid as arrows. The user can click or drag a point to see the gradient vector at that location, with its magnitude and direction displayed numerically.
- **User interactions:**
  - Click/drag a point on the contour plot to evaluate the gradient at any location.
  - Function preset dropdown: $x^2 + y^2$, $x^2 - y^2$, $\sin(x)\cos(y)$, $xe^{-(x^2+y^2)}$.
  - Toggle: "Show gradient field" (arrows at grid of points) / "Show single gradient" (arrow at clicked point only).
  - Density slider: controls spacing of gradient arrows when field mode is active.
- **Data source:** Inline computation via `multivariate.ts` utilities.
- **Panel layout:** Single panel with contour plot, gradient arrows, and readout sidebar.

### 4.3 DirectionalDerivativeExplorer

- **Component name:** `DirectionalDerivativeExplorer`
- **Filename:** `src/components/viz/DirectionalDerivativeExplorer.tsx`
- **What it visualizes:** A contour plot with a point $a$ and an adjustable direction arrow $\mathbf{u}$. As the user rotates $\mathbf{u}$, the directional derivative $D_\mathbf{u}f(a) = \nabla f(a) \cdot \mathbf{u}$ updates in real time. A polar plot (rose diagram) in a companion panel shows the directional derivative as a function of angle, revealing that the maximum occurs in the gradient direction and that the zeros occur perpendicular to it.
- **User interactions:**
  - Angle slider (0° to 360°) or drag-rotate the direction arrow.
  - Drag point $a$ to move the evaluation location.
  - Function preset dropdown: $x^2 + y^2$, $2x^2 + y^2$ (anisotropic), $\sin(x+y)$.
- **Numerical readout:** $\mathbf{u}$, $\nabla f(a)$, $D_\mathbf{u}f(a)$, $\|\nabla f(a)\|$, angle between $\mathbf{u}$ and $\nabla f(a)$.
- **Data source:** Inline computation via `multivariate.ts`.
- **Panel layout:** Two-panel: left = contour plot with point and direction arrow, right = polar plot of $D_\mathbf{u}f$ vs. angle.

### 4.4 ContourGradientExplorer

- **Component name:** `ContourGradientExplorer`
- **Filename:** `src/components/viz/ContourGradientExplorer.tsx`
- **What it visualizes:** The orthogonality of the gradient to level curves. Contour lines are drawn, and at selected points, the gradient vector is shown as an arrow perpendicular to the local contour. When the user drags a point along a contour line, the gradient arrow stays perpendicular — visually confirming Theorem 3. An optional "gradient flow" mode traces the path of steepest ascent from a starting point, cutting across contour lines at right angles.
- **User interactions:**
  - Drag the point along the contour lines to see that the gradient stays perpendicular.
  - Toggle: "Gradient flow" mode — click a start point and animate the path of steepest ascent (Euler integration of $\dot{x} = \nabla f(x)$).
  - Function preset dropdown: $x^2 + y^2$ (circular contours — gradient is radial), $x^2 + 4y^2$ (elliptical contours — gradient is NOT radial).
- **Data source:** Inline computation + `multivariate.ts` gradient flow integration.
- **Panel layout:** Single panel with contour plot, gradient arrows, and optional flow trajectories.

### 4.5 GradientDescentExplorer

- **Component name:** `GradientDescentExplorer`
- **Filename:** `src/components/viz/GradientDescentExplorer.tsx`
- **What it visualizes:** Animated gradient descent on a 2D loss surface (shown as a contour plot). The user sets the starting point and learning rate, then watches the optimizer follow $-\nabla L$ step by step, leaving a trail of iterates. Shows how learning rate affects convergence: too small → slow, too large → oscillation/divergence.
- **User interactions:**
  - Click to set starting point $\theta_0$.
  - Learning rate slider: $\eta \in [0.001, 1.0]$ (log scale).
  - "Step" button (one GD step), "Run" button (animate), "Reset" button.
  - Loss function preset: $x^2 + y^2$ (isotropic), $x^2 + 10y^2$ (anisotropic — shows oscillation), Rosenbrock $(1-x)^2 + 100(y - x^2)^2$ (the classic test).
- **Numerical readout:** Current $\theta$, $L(\theta)$, $\nabla L(\theta)$, $\|\nabla L\|$, iteration count.
- **Data source:** Inline computation via `multivariate.ts`.
- **Panel layout:** Single contour plot with gradient descent trajectory, readout below.

---

## 5. Data Modules

### 5.1 `gradient-data.ts`

- **Filename:** `src/data/gradient-data.ts`
- **Exported interfaces:**

```typescript
interface SurfacePreset {
  name: string;
  label: string;                  // Display label (e.g., "f(x,y) = x² + y²")
  f: (x: number, y: number) => number;
  f_x: (x: number, y: number) => number;   // ∂f/∂x (analytical)
  f_y: (x: number, y: number) => number;   // ∂f/∂y (analytical)
  xDomain: [number, number];
  yDomain: [number, number];
  defaultPoint: [number, number];   // Default evaluation point
  contourLevels?: number;           // Number of contour levels (default 12)
}

interface DirectionalDerivativePreset {
  name: string;
  label: string;
  f: (x: number, y: number) => number;
  grad_f: (x: number, y: number) => [number, number];
  xDomain: [number, number];
  yDomain: [number, number];
  defaultPoint: [number, number];
  defaultAngle: number;            // Default direction angle in radians
}

interface LossSurfacePreset {
  name: string;
  label: string;
  L: (x: number, y: number) => number;
  grad_L: (x: number, y: number) => [number, number];
  xDomain: [number, number];
  yDomain: [number, number];
  minimum: [number, number];       // Known minimum location (for reference)
  defaultStart: [number, number];  // Default GD starting point
  defaultLR: number;               // Suggested learning rate
  notes?: string;                  // e.g., "anisotropic — expect oscillation"
}

interface DifferentiabilityCounterexample {
  name: string;
  label: string;
  f: (x: number, y: number) => number;
  f_x_at_origin: number;
  f_y_at_origin: number;
  pathValues: Array<{              // f along various paths to the origin
    label: string;                 // e.g., "y = x", "y = x²"
    value: number;                 // limit along this path
  }>;
}
```

- **Exported constants:**
  - `SURFACE_PRESETS: SurfacePreset[]` — 4 presets for PartialDerivativeSliceExplorer and GradientFieldExplorer.
  - `DIRECTIONAL_DERIVATIVE_PRESETS: DirectionalDerivativePreset[]` — 3 presets for DirectionalDerivativeExplorer.
  - `LOSS_SURFACE_PRESETS: LossSurfacePreset[]` — 3 presets for GradientDescentExplorer (isotropic, anisotropic, Rosenbrock).
  - `CONTOUR_PRESETS: SurfacePreset[]` — 3 presets for ContourGradientExplorer (circular, elliptical, saddle).
  - `COUNTEREXAMPLE_DATA: DifferentiabilityCounterexample` — The $f(x,y) = xy/(x^2+y^2)$ counterexample with path limits.

- **Computation:** All eager (function references are cheap; no heavy computation at import time).

---

## 6. Shared Utility Module: `multivariate.ts` (New Module)

### Location

```
src/components/viz/shared/multivariate.ts
```

### Interfaces

```typescript
/** A point in ℝⁿ (typically ℝ² for visualization) */
export interface PointND {
  coords: number[];
  dim: number;
}

/** Gradient result at a point */
export interface GradientResult {
  point: number[];        // evaluation point
  gradient: number[];     // gradient vector
  magnitude: number;      // ‖∇f‖
}

/** Directional derivative result */
export interface DirectionalDerivativeResult {
  point: number[];
  direction: number[];    // unit vector u
  value: number;          // D_u f(a) = ∇f · u
  gradientMag: number;    // ‖∇f‖ (for comparison)
  angle: number;          // angle between u and ∇f (radians)
}

/** Contour data for 2D visualization */
export interface ContourData {
  level: number;
  points: Array<[number, number]>;
}

/** Gradient descent step result */
export interface GDStepResult {
  point: number[];
  loss: number;
  gradient: number[];
  gradientNorm: number;
  iteration: number;
}

/** Complete gradient descent trajectory */
export interface GDTrajectory {
  steps: GDStepResult[];
  converged: boolean;
  finalLoss: number;
}

/** Wireframe surface data for pseudo-3D rendering */
export interface WireframeData {
  xGrid: number[];
  yGrid: number[];
  zValues: number[][];    // zValues[i][j] = f(xGrid[i], yGrid[j])
}
```

### Functions

```typescript
/** Compute the numerical gradient via central differences */
export function numericalGradient(
  f: (...args: number[]) => number,
  point: number[],
  h?: number              // step size, default 1e-7
): number[];

/** Compute gradient using analytical partial derivatives */
export function analyticalGradient(
  partials: Array<(...args: number[]) => number>,
  point: number[]
): GradientResult;

/** Compute directional derivative */
export function directionalDerivative(
  grad: number[],
  direction: number[]     // will be normalized internally
): DirectionalDerivativeResult;

/** Generate contour data for a 2D scalar field.
 *  Returns array of contour lines at the specified levels. */
export function generateContours(
  f: (x: number, y: number) => number,
  xDomain: [number, number],
  yDomain: [number, number],
  nLevels?: number,        // default 12
  gridSize?: number        // samples per axis, default 100
): ContourData[];

/** Generate wireframe data for pseudo-3D surface rendering */
export function generateWireframe(
  f: (x: number, y: number) => number,
  xDomain: [number, number],
  yDomain: [number, number],
  gridSize?: number        // samples per axis, default 40
): WireframeData;

/** Project a 3D point (x, y, z) to 2D for pseudo-3D wireframe rendering.
 *  Uses isometric-like projection with configurable angles. */
export function project3D(
  x: number, y: number, z: number,
  azimuth?: number,        // rotation angle, default -30°
  elevation?: number       // tilt angle, default 25°
): [number, number];

/** Run gradient descent for n steps or until convergence.
 *  Returns the full trajectory for visualization. */
export function gradientDescent(
  f: (...args: number[]) => number,
  grad_f: (...args: number[]) => number[],
  start: number[],
  learningRate: number,
  maxSteps?: number,        // default 200
  tolerance?: number        // ‖∇f‖ < tolerance → converged, default 1e-6
): GDTrajectory;

/** Compute the gradient flow (steepest ascent path) via Euler integration.
 *  Returns array of points tracing the path. */
export function gradientFlow(
  grad_f: (x: number, y: number) => [number, number],
  start: [number, number],
  stepSize?: number,        // Euler step, default 0.01
  nSteps?: number           // default 500
): Array<[number, number]>;

/** Check differentiability numerically: compare the total derivative
 *  approximation error ‖f(a+h) - f(a) - grad·h‖ / ‖h‖ as ‖h‖ → 0.
 *  Returns error at multiple h values for plotting. */
export function checkDifferentiability(
  f: (x: number, y: number) => number,
  grad_at_a: [number, number],
  a: [number, number],
  hValues?: number[]
): Array<{ hNorm: number; error: number }>;

/** Seeded pseudo-random number generator (deterministic).
 *  Re-exported from limits.ts. */
export { seededRandom } from './limits';
```

### Backward compatibility

This is a **new module** (no existing functions to preserve). Designed to be extended by:
- Topic 10 (`jacobian`): adds `jacobianMatrix`, `jacobianDeterminant`, `multivariateChainRule`, `linearMapComposition`
- Topic 11 (`hessian`): adds `hessianMatrix`, `eigenvalues2x2`, `classifyCriticalPoint`, `newtonStep`
- Topic 12 (`inverse-implicit`): adds `inverseJacobianApprox`, `implicitFunctionSlice`, `newtonMethod`

Keep interfaces clean and functions pure. Do not export computation-heavy constants — use lazy `getResults()` patterns for anything beyond function references.

---

## 7. Curriculum Graph Updates

### `src/data/curriculum-graph.json`

**Change node status:**
```json
{ "id": "gradient", "label": "Partial Derivatives & the Gradient", "domain": "multivar-differential", "status": "published", "url": "/topics/gradient" }
```
Change `"status"` from `"planned"` to `"published"`.

**Edges** (should already exist — verify):
```json
{ "source": "derivative", "target": "gradient" }
{ "source": "gradient", "target": "jacobian" }
```

If the `derivative → gradient` edge does not exist, add it. The `gradient → jacobian` edge should already be in the planned DAG.

### `src/data/curriculum.ts`

In the `multivar-differential` track definition, move `"Partial Derivatives & the Gradient"` from `planned` to `published`. The remaining three topics (`jacobian`, `hessian`, `inverse-implicit`) stay in `planned`.

---

## 8. Cross-References

### Existing topics that should link TO this topic

- **`derivative.mdx`** — Remark 1 mentions "In $\mathbb{R}^n$, the derivative will be a matrix (the Jacobian)" and Remark 3 mentions "$(J_{f \circ g})(a) = J_f(g(a)) \cdot J_g(a)$." If any of these contain a forward reference to the gradient topic as "coming soon," update it to a live link: `[Partial Derivatives & the Gradient](/topics/gradient)`.
- **`mean-value-taylor.mdx`** — If there is a forward reference to the gradient or multivariable Taylor expansion, update to a live link.

### Topics this topic links FROM

- `derivative` — prerequisite (live link)
- `epsilon-delta` — continuity of partial derivatives (live link)
- `completeness-compactness` — compactness in ℝⁿ (live link)

### Forward references to planned topics (plain text + "(coming soon)")

- **The Jacobian & Multivariate Chain Rule** *(coming soon)* — referenced in Remark 1 (tangent hyperplane → Jacobian), Section 9 (backpropagation)
- **The Hessian & Second-Order Analysis** *(coming soon)* — referenced in Section 9 (critical point classification, second derivative test)
- **Inverse & Implicit Function Theorems** *(coming soon)* — referenced briefly in Section 6 (constraint surfaces)

### formalml.com forward links (informational, external, new tab)

- `gradient-descent` — Sections 6, 9
- `convex-analysis` — Section 9
- `smooth-manifolds` — Section 6 (gradient normal to constraint surfaces)

---

## 9. Images

Copy the following images from the notebook export to `public/images/topics/gradient/`:

| # | Filename | Description |
|---|----------|-------------|
| 1 | `partial-derivative-slices.png` | Three-panel: surface $f(x,y) = x^2 + y^2$ with $y$-fixed and $x$-fixed slices highlighted, plus 2D slice curve with tangent |
| 2 | `tangent-plane.png` | Surface with tangent plane at a point, showing how the plane approximates the surface locally |
| 3 | `gradient-vector-field.png` | Contour plot with gradient arrows at grid of points, showing arrows perpendicular to contours |
| 4 | `directional-derivative.png` | Contour plot with gradient vector and several direction vectors, annotated with $D_\mathbf{u}f$ values, plus polar rose plot |
| 5 | `gradient-contour-orthogonality.png` | Two-panel: circular contours with radial gradient (isotropic) vs. elliptical contours with non-radial gradient (anisotropic) |
| 6 | `differentiability-counterexample.png` | Surface plot of $f(x,y) = xy/(x^2+y^2)$ showing the discontinuity at origin, with path limits annotated |
| 7 | `gradient-computation-comparison.png` | Two-panel: analytical vs. finite-difference gradient, plus error-vs-step-size plot |
| 8 | `gradient-descent-landscape.png` | Three-panel: GD on isotropic loss (direct path), anisotropic loss (oscillating path), and Rosenbrock (curved valley) |
| 9 | `gradient-descent-learning-rate.png` | Three-panel: same loss surface with $\eta$ too small (slow convergence), $\eta$ just right, $\eta$ too large (divergence) |

---

## 10. Testing Checklist

### Build & route

- [ ] `pnpm build` succeeds with zero errors
- [ ] Page renders at `/topics/gradient`
- [ ] "Foundational" difficulty badge is styled correctly (green)
- [ ] Track 3 header ("Multivariable Differential Calculus") renders on curriculum page
- [ ] `gradient` shows as "published," remaining Track 3 topics show as "coming soon"
- [ ] Pagefind indexes the new topic on rebuild

### Content

- [ ] All TheoremBlocks render LaTeX correctly (5 Definitions, 5 Theorems, 6 Examples, 4 Remarks, 4 Proofs)
- [ ] All 9 static images load from `public/images/topics/gradient/`
- [ ] All internal cross-references resolve (links to `derivative`, `epsilon-delta`, `completeness-compactness` work)
- [ ] All formalml.com links open in a new tab with `target="_blank" rel="noopener"`
- [ ] All forward references to unwritten topics use plain text + "(coming soon)"

### Visualizations

- [ ] All 5 viz components load on scroll (`client:visible`)
- [ ] `PartialDerivativeSliceExplorer` toggle switches between $x$-fixed and $y$-fixed slices
- [ ] `PartialDerivativeSliceExplorer` slice slider moves the slice plane and updates 2D curve
- [ ] `PartialDerivativeSliceExplorer` evaluation point slider moves tangent on 2D curve
- [ ] `PartialDerivativeSliceExplorer` function preset dropdown changes surface
- [ ] `GradientFieldExplorer` click/drag updates gradient arrow at point
- [ ] `GradientFieldExplorer` "Show gradient field" toggle displays grid of arrows
- [ ] `DirectionalDerivativeExplorer` angle slider rotates direction arrow and updates $D_\mathbf{u}f$
- [ ] `DirectionalDerivativeExplorer` polar plot updates in sync with angle
- [ ] `ContourGradientExplorer` gradient arrows stay perpendicular to contours at all points
- [ ] `ContourGradientExplorer` "Gradient flow" mode animates ascent path
- [ ] `GradientDescentExplorer` click sets starting point
- [ ] `GradientDescentExplorer` "Step" and "Run" buttons work
- [ ] `GradientDescentExplorer` learning rate slider demonstrates convergence/divergence tradeoff
- [ ] `GradientDescentExplorer` Rosenbrock preset shows curved valley navigation

### Cross-references

- [ ] Links to `derivative` work (resolve to published page)
- [ ] `derivative.mdx` updated: gradient forward reference is now a live link (if applicable)
- [ ] `mean-value-taylor.mdx` updated: gradient forward reference is now a live link (if applicable)
- [ ] All other forward references use plain text + "(coming soon)"
- [ ] All formalml.com links open in a new tab with `target="_blank" rel="noopener"`

### Infrastructure

- [ ] `multivariate.ts` shared module compiles with no TypeScript errors
- [ ] `gradient-data.ts` data module compiles
- [ ] No modifications to `limits.ts`, `differentiation.ts`, or `integration.ts` (backward compatibility preserved)
- [ ] Page is responsive (viz components stack vertically on mobile)
- [ ] Curriculum graph shows `gradient` as "published" (not "coming soon")
- [ ] `derivative → gradient` edge renders in the prerequisite graph

---

## 11. Build Order

1. **Create `src/components/viz/shared/multivariate.ts`** — the new shared utility module. Implement `numericalGradient`, `analyticalGradient`, `directionalDerivative`, `generateContours`, `generateWireframe`, `project3D`, `gradientDescent`, `gradientFlow`, `checkDifferentiability`. Write console log tests to verify. This module is used by all viz components in this topic.
2. **Create `src/data/gradient-data.ts`** — surface presets, directional derivative presets, loss surface presets, contour presets, counterexample data. Verify exports compile.
3. **Create `gradient.mdx`** with full frontmatter and all markdown/LaTeX content. Use `TheoremBlock` for all formal elements (4 definitions, 5 theorems, 6 examples, 4 remarks, proofs). No interactive components yet — just the prose and static images.
4. Copy notebook figures to `public/images/topics/gradient/` and verify they load in the MDX.
5. **Build `PartialDerivativeSliceExplorer.tsx`** — the flagship component. Start with the wireframe surface rendering (D3 pseudo-3D via `project3D`), then add the slice mechanism, and finally the 2D companion panel with a tangent line. This is the most important visualization on the page.
6. **Build `GradientFieldExplorer.tsx`** — contour plot with gradient arrows. Uses `generateContours` and `analyticalGradient` from the shared module.
7. **Build `DirectionalDerivativeExplorer.tsx`** — contour plot with rotatable direction arrow + polar plot companion.
8. **Build `ContourGradientExplorer.tsx`** — gradient orthogonality to contours + gradient flow animation.
9. **Build `GradientDescentExplorer.tsx`** — animated GD on loss surface. Uses `gradientDescent` from the shared module.
10. Embed all five components in the MDX at their appropriate section positions with `client:visible`.
11. **Update `derivative.mdx`** — Change any forward references to "Partial Derivatives & the Gradient *(coming soon)*" to live links: `[Partial Derivatives & the Gradient](/topics/gradient)`. Check Remarks 1 and 3 specifically.
12. **Update `mean-value-taylor.mdx`** — Change any forward references to the gradient topic from "(coming soon)" to live links (if applicable).
13. **Update curriculum graph data** — change `gradient` status from `"planned"` to `"published"` in `curriculum-graph.json`. Verify `derivative → gradient` edge exists.
14. **Update `curriculum.ts`** — move `"Partial Derivatives & the Gradient"` from `planned` to `published` in the `multivar-differential` track.
15. Run topic content and viz checklist (§10).
16. `pnpm build` — verify zero errors.
17. Commit and deploy.

---

## Appendix A: Key Differences from Track 2 Briefs

1. **First topic in a new track (Track 3).** All eight previous topics across two tracks are live. This topic opens the Multivariable Differential Calculus track. It has a cross-track prerequisite (`derivative` from Track 2) but no within-track predecessors.
2. **Creates a new shared utility module.** `multivariate.ts` is the Track 3 equivalent of `limits.ts` (Track 1) and `differentiation.ts`/`integration.ts` (Track 2). It must be designed to be extended by Topics 10–12 in this track. The module is larger than `differentiation.ts` because it includes contour generation, wireframe projection, and gradient descent — substantial geometric computation.
3. **First topic with genuinely multivariable visualizations.** All previous topics operated in 1D or pseudo-1D (function graphs, Riemann sum bars, computation graphs). This topic requires 2D contour plots, pseudo-3D surface rendering, vector fields, and trajectory animations. The visualization complexity is higher than that of any previous topic.
4. **Foundational difficulty — meeting the reader at a transition point.** The reader has mastered single-variable calculus across 8 topics and is now entering multivariable territory. The concepts are genuinely new (gradient as a vector, directional derivative, differentiability as a linear map), even though the tools (limits, derivatives, chain rule) are familiar. Calibrate exposition for a reader who can do single-variable proofs but has not yet thought about $\mathbb{R}^n$.
5. **The ML connection is direct and ever-present.** The gradient *is* the object of gradient descent. Unlike Topics 7–8, where ML connections are important but conceptual (expected values, normalizing constants), here the connection is operational: every ML practitioner uses $\nabla L$ on every training step. The "Connections to ML" section (§9) should be substantial but should not duplicate the deeper treatment coming in the Jacobian topic (backpropagation through networks = multivariate chain rule).
6. **The differentiability subtlety is pedagogically important.** The $f(x,y) = xy/(x^2+y^2)$ counterexample is the first time in formalCalculus that a concept (partial derivatives) is shown to be *insufficient* — that the mathematically correct definition (total derivative) requires more. This is analogous to the Riemann-to-Lebesgue transition, but it occurs within the same topic. Handle it with care: the reader should understand *why* mathematicians insist on the total derivative, not just accept it as a technicality.
7. **New track = verify track rendering.** The curriculum page must show "Partial Derivatives & the Gradient" under the Multivariable Differential Calculus track header, with the remaining three topics still marked "coming soon." Verify that the Track 3 header and track navigation render correctly.

---

## Appendix B: Formal Element Inventory

| Type | # | Title |
|------|---|-------|
| Definition | 1 | Partial Derivative |
| Definition | 2 | The Gradient |
| Definition | 3 | Directional Derivative |
| Definition | 4 | Differentiability (Total Derivative) |
| Proposition | 1 | Tangent Plane as Linear Approximation |
| Theorem | 1 | Gradient–Directional Derivative Relationship |
| Theorem | 2 | Gradient as Direction of Steepest Ascent |
| Theorem | 3 | Gradient is Orthogonal to Level Sets |
| Theorem | 4 | Differentiability Implies Partial Derivatives Exist |
| Theorem | 5 | $C^1$ Criterion |
| Example | 1 | Partial derivatives of $f(x,y) = x^2 y + \sin(y)$ |
| Example | 2 | Partial derivatives of $f(x,y) = e^{x^2+y^2}$ |
| Example | 3 | Gradient of $f(x,y) = x^2 + y^2$ |
| Example | 4 | Gradient of $f(x,y,z) = xyz$ |
| Example | 5 | Directional derivative of $f(x,y) = x^2 + y^2$ in direction $\frac{1}{\sqrt{2}}(1,1)$ |
| Example | 6 | The critical counterexample: $f(x,y) = xy/(x^2+y^2)$ |
| Remark | 1 | From tangent line to tangent plane to tangent hyperplane |
| Remark | 2 | Contour maps and topographic intuition |
| Remark | 3 | The converse is false (partial derivatives ⇏ differentiability) |
| Remark | 4 | Differentiability implies continuity (chain of implications) |
| Proof | — | 4 proofs total (Theorem 1, Theorem 2, Theorem 3, Theorem 5 sketch) |

---

*Brief version: v1 | Created: 2026-04-01 | Author: Jonathan Rocha*  
*Reference notebook: `notebooks/gradient/09_partial_derivatives_gradient.ipynb`*  
*Reference doc: `docs/plans/formalcalculus-handoff-reference.md`*
