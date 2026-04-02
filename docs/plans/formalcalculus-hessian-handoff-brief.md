# Claude Code Handoff Brief: The Hessian & Second-Order Analysis

**Project:** formalCalculus — [formalcalculus.com](https://www.formalcalculus.com)  
**Repo:** `github.com/jonx0037/formalCalculus`  
**Stack:** Astro 6 · React 19 · MDX · Tailwind CSS 4 · D3.js 7 · KaTeX · Vercel  
**Package Manager:** pnpm  
**Status:** Ready for implementation  
**Reference Notebook:** `notebooks/hessian/11_hessian_second_order.ipynb`  
**Reference Doc:** `docs/plans/formalcalculus-handoff-reference.md`

---

## 1. Objective

Add a new topic page **"The Hessian & Second-Order Analysis"** as the **third topic in the Multivariable Differential Calculus track** on formalcalculus.com.

1. This is **topic 11 of 32** and the **eleventh topic published** on formalcalculus.com. All four topics in the Limits & Continuity track (`sequences-limits`, `epsilon-delta`, `completeness-compactness`, `uniform-convergence`), all four topics in the Single-Variable Calculus track (`derivative`, `mean-value-taylor`, `riemann-integral`, `improper-integrals`), and the first two topics in the Multivariable Differential Calculus track (`gradient`, `jacobian`) are deployed and live.
2. **Prerequisites:** `jacobian`. The Hessian is literally the Jacobian of the gradient: $H_f = J(\nabla f)$. The reader must understand the Jacobian matrix as the matrix of all first-order partial derivatives of a vector-valued function (Topic 10), because the gradient $\nabla f: \mathbb{R}^n \to \mathbb{R}^n$ is itself a vector-valued function whose Jacobian is the Hessian. The chain rule from Topic 10 is needed for the second-order chain rule. The gradient and partial derivatives (Topic 9) are implicitly required through the Jacobian's prerequisite chain, but the only *direct* prerequisite is `jacobian`.
3. **Difficulty: intermediate.** The reader has now seen the full first-order multivariable toolkit — partial derivatives, the gradient, the Jacobian, and the chain rule. The conceptual leap here is from first-order to second-order: the Hessian captures *curvature*, not just slope. The key abstractions — classifying critical points via eigenvalues, the second-order Taylor expansion as a quadratic form, Newton's method as using curvature to take better steps — are conceptually rich but build cleanly on the linear algebra already used for Jacobians. The proofs in this topic are shorter than the chain rule proof in Topic 10, but the eigenvalue analysis requires comfort with $2 \times 2$ (and eventually $n \times n$) symmetric matrices.
4. **Downstream within formalCalculus:**
   - `inverse-implicit` (direct) — The Inverse Function Theorem requires $\det J_f(a) \neq 0$, and the Implicit Function Theorem uses the gradient/Hessian of constraint functions to characterize constraint surfaces. The second-order analysis from this topic provides the machinery for analyzing the local structure of level sets near critical points of the constraint function.
   - `series-convergence` (indirect) — The second-order Taylor expansion from this topic generalizes to higher-order Taylor expansions in Track 5. The Hessian provides the quadratic term; the general Taylor expansion provides all terms.
   - `approximation-theory` (indirect) — Second-order approximation is the bridge between local Taylor analysis (this topic) and global approximation theory (Stone-Weierstrass, universal approximation).
   - `stability-dynamical` (indirect) — The Hessian of a Lyapunov function determines the stability type of an equilibrium. The eigenvalue analysis introduced here reappears in ODE stability theory.
5. **Forward links to formalml.com:**
   - `gradient-descent` — Second-order optimization methods (Newton's method, quasi-Newton, L-BFGS) use the Hessian or its approximation to precondition gradient descent. The condition number $\kappa(H_f) = \lambda_{\max}/\lambda_{\min}$ of the Hessian determines how much the loss landscape stretches gradient steps in different directions — and explains why gradient descent is slow on ill-conditioned problems. Adaptive optimizers (e.g., Adam, AdaGrad) implicitly approximate the diagonal elements of the Hessian.
   - `convex-analysis` — A twice continuously differentiable function $f$ is convex if and only if $H_f(x) \succeq 0$ (positive semidefinite) for all $x$. The Hessian is the second-order certificate of convexity. Strong convexity ($H_f \succeq \mu I$ for $\mu > 0$) gives convergence rate guarantees for gradient descent.
   - `information-geometry` — The Fisher information matrix $I(\theta)$ is the expected Hessian of the negative log-likelihood: $I(\theta) = \mathbb{E}[-H_{\log p(x|\theta)}]$ (under regularity conditions). The natural gradient $I(\theta)^{-1} \nabla L(\theta)$ uses this curvature structure to take steps that are invariant to reparametrization — the Riemannian analog of Newton's method on the statistical manifold.
6. This topic **extends** the shared utility module `multivariate.ts` (created by Topic 9, extended by Topic 10) with `hessianMatrix`, `eigenvalues2x2`, `eigenvaluesSymmetric`, `classifyCriticalPoint`, `quadraticForm`, `newtonStep`, and `conditionNumber`. All existing functions in `multivariate.ts` remain unchanged.

**Content scope:**

- Second-order partial derivatives: $\frac{\partial^2 f}{\partial x_i \partial x_j}(a)$ — differentiating a partial derivative with respect to another variable
- Clairaut's theorem: if $f$ is $C^2$ (both mixed partials are continuous), then $\frac{\partial^2 f}{\partial x_i \partial x_j} = \frac{\partial^2 f}{\partial x_j \partial x_i}$ — mixed partials commute, making the Hessian symmetric
- The Hessian matrix: $H_f(a) = \begin{pmatrix} \frac{\partial^2 f}{\partial x_1^2}(a) & \cdots & \frac{\partial^2 f}{\partial x_1 \partial x_n}(a) \\ \vdots & \ddots & \vdots \\ \frac{\partial^2 f}{\partial x_n \partial x_1}(a) & \cdots & \frac{\partial^2 f}{\partial x_n^2}(a) \end{pmatrix}$ — the $n \times n$ symmetric matrix of all second-order partial derivatives
- The Hessian as the Jacobian of the gradient: $H_f(a) = J(\nabla f)(a)$ — this is the precise relationship. The gradient $\nabla f: \mathbb{R}^n \to \mathbb{R}^n$ is a vector-valued function; its Jacobian matrix is the Hessian
- The second-order Taylor expansion: $f(a + h) = f(a) + \nabla f(a) \cdot h + \frac{1}{2} h^T H_f(a) h + o(\|h\|^2)$ — the quadratic approximation. The Hessian provides the curvature term that the gradient approximation (first-order Taylor) misses
- Critical point classification: at a critical point $a$ (where $\nabla f(a) = 0$), the second-order behavior is governed by $H_f(a)$. If $H_f(a)$ is positive definite → local minimum. If negative definite → local maximum. If indefinite (has both positive and negative eigenvalues) → saddle point. If singular (has a zero eigenvalue) → inconclusive
- Eigenvalue analysis: the eigenvalues of $H_f(a)$ are the principal curvatures — the maximum and minimum curvatures of $f$ at $a$. The eigenvectors are the principal curvature directions. The determinant $\det H_f = \prod \lambda_i$ and the trace $\text{tr}\,H_f = \sum \lambda_i$ provide summary statistics
- Newton's method in $\mathbb{R}^n$: $x_{k+1} = x_k - H_f(x_k)^{-1} \nabla f(x_k)$ — using the Hessian to take curvature-corrected steps. Quadratic convergence near a strict local minimum where $H_f$ is positive definite. Comparison with gradient descent: GD uses first-order information only; Newton uses second-order and converges faster, but requires computing/inverting the Hessian
- ML connections: loss surface curvature (condition number determines GD convergence rate), saddle points in high-dimensional optimization (in high dimensions, saddle points vastly outnumber local minima), second-order optimizers (Newton, L-BFGS, natural gradient), Hessian-free optimization (conjugate gradient on the quadratic approximation), the Gauss-Newton approximation (approximating the Hessian of a least-squares loss)

---

## 2. MDX File

### Location

```
src/content/topics/hessian.mdx
```

The entry `id` will be `hessian`. The dynamic route resolves to `/topics/hessian`.

### Frontmatter

```yaml
---
title: "The Hessian & Second-Order Analysis"
subtitle: "Second-order partial derivatives, the Hessian matrix as the Jacobian of the gradient, critical point classification via eigenvalues, the second-order Taylor expansion, and Newton's method — the curvature machinery behind second-order optimization"
status: "published"
difficulty: "intermediate"
prerequisites:
  - "jacobian"
tags:
  - "calculus"
  - "hessian"
  - "second-derivative"
  - "critical-point"
  - "saddle-point"
  - "eigenvalue"
  - "quadratic-form"
  - "newton-method"
  - "curvature"
  - "convexity"
  - "loss-surface"
  - "second-order-optimization"
domain: "multivar-differential"
videoId: null
notebookPath: "notebooks/hessian/11_hessian_second_order.ipynb"
githubUrl: "https://github.com/jonx0037/formalCalculus/blob/main/src/content/topics/hessian.mdx"
datePublished: 2026-04-02
estimatedReadTime: 50
abstract: "The Hessian matrix H_f(a) collects all second-order partial derivatives of a scalar-valued function f: ℝⁿ → ℝ into an n × n symmetric matrix. It is precisely the Jacobian of the gradient: H_f = J(∇f) — the first-order derivative of the first-order derivative. Where the gradient tells us which direction is uphill (first-order, slope), the Hessian tells us how the surface curves (second-order, curvature). The eigenvalues of the Hessian are the principal curvatures: all positive indicate a bowl (local minimum), all negative indicate a dome (local maximum), and mixed signs indicate a saddle point. The second-order Taylor expansion f(a+h) ≈ f(a) + ∇f(a)·h + ½ hᵀ H_f(a) h approximates the function by a paraboloid, and classifying critical points reduces to analyzing this quadratic form. Newton's method x_{k+1} = x_k - H_f(x_k)⁻¹ ∇f(x_k) exploits the Hessian to take curvature-corrected optimization steps, achieving quadratic convergence where gradient descent converges only linearly. In machine learning, the Hessian governs loss surface geometry: its condition number κ(H) = λ_max/λ_min determines how much gradient descent struggles with elongated valleys, its spectrum reveals whether critical points are minima or saddle points (in high-dimensional problems, saddle points dominate), and second-order methods — from Newton to L-BFGS to natural gradient — all use the Hessian or its approximations to improve convergence. The Hessian is the bridge between the first-order world (gradient descent) and the second-order world (curvature-aware optimization)."
formalmlConnections:
  - topic: "gradient-descent"
    site: "formalml"
    relationship: "Second-order optimization methods (Newton, quasi-Newton, L-BFGS) use the Hessian to precondition gradient descent. The condition number κ(H_f) = λ_max/λ_min determines the convergence rate — gradient descent takes O(κ) iterations, while Newton's method converges quadratically. Adaptive optimizers like Adam implicitly approximate diagonal Hessian elements."
  - topic: "convex-analysis"
    site: "formalml"
    relationship: "A C² function f is convex if and only if H_f(x) ⪰ 0 for all x. Strong convexity (H_f ⪰ μI) provides the convergence rate guarantee μ/L for gradient descent, where L is the Lipschitz constant of the gradient (equivalently, the largest eigenvalue of the Hessian)."
  - topic: "information-geometry"
    site: "formalml"
    relationship: "The Fisher information matrix I(θ) equals the expected Hessian of the negative log-likelihood E[-H_{log p(x|θ)}] under regularity conditions. The natural gradient I(θ)⁻¹ ∇L(θ) is Newton's method adapted to the Riemannian geometry of the statistical manifold — the curvature here is the Hessian of the KL divergence."
connections:
  - topic: "jacobian"
    relationship: "The Hessian is the Jacobian of the gradient: H_f(a) = J(∇f)(a). This is the foundational identity — it says the Hessian is not a new concept but the Jacobian machinery from Topic 10 applied to the specific vector-valued function ∇f. The chain rule from Topic 10 also enables the second-order chain rule for composed functions."
  - topic: "gradient"
    relationship: "The gradient ∇f(a) from Topic 9 provides the first-order information (slope). The Hessian provides the second-order information (curvature). At a critical point where ∇f(a) = 0, the gradient vanishes and the Hessian takes over — it determines whether the critical point is a minimum, maximum, or saddle."
  - topic: "derivative"
    relationship: "The single-variable second derivative f''(a) from Topic 5 is the 1 × 1 case of the Hessian. The second derivative test (f''(a) > 0 → local min, f''(a) < 0 → local max) generalizes to the eigenvalue criterion: positive definite Hessian → local min, negative definite → local max."
  - topic: "mean-value-taylor"
    relationship: "Taylor's theorem from Topic 6 provides the single-variable version of the second-order expansion f(a+h) = f(a) + f'(a)h + ½f''(a)h² + O(h³). The multivariable second-order Taylor expansion in this topic replaces f''(a)h² with the quadratic form h^T H_f(a) h."
references:
  - type: "book"
    title: "Analysis on Manifolds"
    authors: "Munkres"
    year: 1991
    note: "Chapter 3 develops higher-order derivatives and the second-order Taylor formula in ℝⁿ"
  - type: "book"
    title: "Calculus on Manifolds"
    authors: "Spivak"
    year: 1965
    note: "Chapter 2 treats higher derivatives and the Taylor expansion for multilinear maps"
  - type: "book"
    title: "Principles of Mathematical Analysis"
    authors: "Rudin"
    year: 1976
    note: "Chapter 9 on second-order differentiation — Theorem 9.41 is Clairaut's theorem on symmetry of mixed partials"
  - type: "book"
    title: "Numerical Optimization"
    authors: "Nocedal & Wright"
    year: 2006
    note: "Chapters 2–3 on Newton's method, quasi-Newton methods, and the role of the Hessian in optimization convergence theory"
  - type: "book"
    title: "Convex Optimization"
    authors: "Boyd & Vandenberghe"
    year: 2004
    note: "Chapter 9 on Newton's method for unconstrained optimization — convergence analysis via the Hessian's condition number"
  - type: "book"
    title: "Deep Learning"
    authors: "Goodfellow, Bengio & Courville"
    year: 2016
    note: "Section 8.2 on challenges in optimization including saddle points, ill-conditioning, and the role of the Hessian spectrum"
  - type: "paper"
    title: "Identifying and Attacking the Saddle Point Problem in High-Dimensional Non-Convex Optimization"
    authors: "Dauphin, Pascanu, Gulcehre, Cho, Ganguli & Bengio"
    year: 2014
    url: "https://arxiv.org/abs/1406.2572"
    note: "Shows that in high-dimensional optimization, saddle points dominate local minima — the Hessian spectrum at critical points has a mixture of positive and negative eigenvalues with high probability"
  - type: "paper"
    title: "Adam: A Method for Stochastic Optimization"
    authors: "Kingma & Ba"
    year: 2015
    url: "https://arxiv.org/abs/1412.6980"
    note: "The Adam optimizer's per-parameter learning rates implicitly approximate diagonal Hessian elements via second-moment estimates"
---
```

---

## 3. Content Outline

### Section 1: Overview & Motivation

**Opening example:** Gradient descent moves "downhill" — in the direction of steepest descent, $-\nabla L(\theta)$. But it ignores *curvature*. In a narrow valley of the loss landscape, the gradient points roughly across the valley rather than along it, causing the optimizer to zigzag. The Hessian captures this curvature: its eigenvalues tell you how steep the valley is in each direction, and its eigenvectors tell you which directions those are. Second-order methods use the Hessian to take smarter steps — correcting for curvature so the optimizer moves along the valley floor instead of bouncing between the walls. The price is computing (or approximating) an $n \times n$ matrix of second derivatives, which is why most deep learning uses first-order methods. But understanding the Hessian is essential for understanding *why* gradient descent behaves the way it does.

No TheoremBlocks. No viz. 2–3 paragraphs setting up the motivation: first-order (gradient) captures slope; second-order (Hessian) captures curvature. The Hessian is the natural next step after the Jacobian — specifically, $H_f = J(\nabla f)$.

### Section 2: Second-Order Partial Derivatives & Clairaut's Theorem

**Foundation section.** Partial derivatives are themselves functions, so we can differentiate them again. The four second-order partial derivatives of $f(x,y)$ are $f_{xx}, f_{xy}, f_{yx}, f_{yy}$. The question is: Does order matter? Clairaut's theorem says no (under continuity assumptions).

**TheoremBlocks:**

- **Definition 1: Second-Order Partial Derivative** — Let $f: \mathbb{R}^n \to \mathbb{R}$ have partial derivative $\frac{\partial f}{\partial x_j}$ in a neighborhood of $a$. If $\frac{\partial f}{\partial x_j}$ is itself differentiable with respect to $x_i$ at $a$, the *second-order partial derivative* is $\frac{\partial^2 f}{\partial x_i \partial x_j}(a) = \frac{\partial}{\partial x_i}\left(\frac{\partial f}{\partial x_j}\right)(a).$ When $i = j$, this is the *unmixed* (or *pure*) second partial derivative $\frac{\partial^2 f}{\partial x_i^2}$. When $i \neq j$, this is a *mixed* partial derivative. Notation: $f_{x_i x_j}(a)$, $\partial_{ij} f(a)$, $D_i D_j f(a)$.
- **Theorem 1: Clairaut's Theorem (Symmetry of Mixed Partials)** — Let $f: \mathbb{R}^n \to \mathbb{R}$ and suppose the mixed partial derivatives $\frac{\partial^2 f}{\partial x_i \partial x_j}$ and $\frac{\partial^2 f}{\partial x_j \partial x_i}$ both exist and are continuous in a neighborhood of $a$. Then $\frac{\partial^2 f}{\partial x_i \partial x_j}(a) = \frac{\partial^2 f}{\partial x_j \partial x_i}(a).$ In short: if $f \in C^2$, the order of differentiation does not matter. This ensures the Hessian matrix is *symmetric*.
- **Proof of Theorem 1** — Consider $n = 2$, $f: \mathbb{R}^2 \to \mathbb{R}$, and the mixed partials $f_{xy}$ and $f_{yx}$ near $(a, b)$. Define the second-difference quotient $\Delta(h, k) = f(a+h, b+k) - f(a+h, b) - f(a, b+k) + f(a, b)$. Let $\phi(x) = f(x, b+k) - f(x, b)$. Then $\Delta(h,k) = \phi(a+h) - \phi(a)$. By the Mean Value Theorem, $\Delta(h,k) = h \phi'(\xi) = h[f_x(\xi, b+k) - f_x(\xi, b)]$ for some $\xi$ between $a$ and $a+h$. Applying MVT again to $g(y) = f_x(\xi, y)$: $\Delta(h,k) = hk \cdot f_{xy}(\xi, \eta)$ for some $\eta$ between $b$ and $b+k$. By the same argument with the roles of $x$ and $y$ reversed: $\Delta(h,k) = hk \cdot f_{yx}(\xi', \eta')$ for some $\xi', \eta'$. As $(h,k) \to (0,0)$: $(\xi, \eta) \to (a, b)$ and $(\xi', \eta') \to (a, b)$. Since $f_{xy}$ and $f_{yx}$ are continuous at $(a,b)$: $f_{xy}(a,b) = \lim_{(h,k) \to (0,0)} \frac{\Delta(h,k)}{hk} = f_{yx}(a,b)$.
- **Example 1: Second-order partials of $f(x,y) = x^2 y + \sin(xy)$** — $f_x = 2xy + y\cos(xy)$, $f_y = x^2 + x\cos(xy)$. Then $f_{xx} = 2y - y^2\sin(xy)$, $f_{xy} = 2x + \cos(xy) - xy\sin(xy)$, $f_{yx} = 2x + \cos(xy) - xy\sin(xy)$, $f_{yy} = -x^2\sin(xy)$. Observe $f_{xy} = f_{yx}$ — Clairaut's theorem confirmed. The four second partials, assembled into a $2 \times 2$ matrix, form the Hessian.
- **Remark 1: From second derivative to Hessian matrix** — In single-variable calculus (Topic 5), the second derivative $f''(a)$ is a single number. For $f: \mathbb{R}^n \to \mathbb{R}$, the second-order information consists of $n^2$ second partial derivatives. Clairaut's theorem reduces this to $\frac{n(n+1)}{2}$ independent values (upper triangle of a symmetric matrix). For $n = 2$: 3 values ($f_{xx}, f_{xy}, f_{yy}$). For $n = 100$ (a small neural network): 5,050 values. For $n = 10^8$ (a large language model): storing the full Hessian is infeasible — motivating the approximations discussed in Section 8.

### Section 3: The Hessian Matrix

**Core definition section.** Introduce the Hessian as a matrix, then immediately connect it to the Jacobian: $H_f = J(\nabla f)$.

**TheoremBlocks:**

- **Definition 2: The Hessian Matrix** — Let $f: \mathbb{R}^n \to \mathbb{R}$ be twice differentiable at $a$. The *Hessian matrix* of $f$ at $a$ is the $n \times n$ matrix $H_f(a) = \begin{pmatrix} \frac{\partial^2 f}{\partial x_1^2}(a) & \frac{\partial^2 f}{\partial x_1 \partial x_2}(a) & \cdots & \frac{\partial^2 f}{\partial x_1 \partial x_n}(a) \\ \frac{\partial^2 f}{\partial x_2 \partial x_1}(a) & \frac{\partial^2 f}{\partial x_2^2}(a) & \cdots & \frac{\partial^2 f}{\partial x_2 \partial x_n}(a) \\ \vdots & \vdots & \ddots & \vdots \\ \frac{\partial^2 f}{\partial x_n \partial x_1}(a) & \frac{\partial^2 f}{\partial x_n^2}(a) & \cdots & \frac{\partial^2 f}{\partial x_n^2}(a) \end{pmatrix}.$ If $f \in C^2$, then $H_f(a)$ is symmetric by Clairaut's theorem. Notation: $H_f(a)$, $\nabla^2 f(a)$, $D^2 f(a)$.
- **Proposition 1: Hessian is the Jacobian of the Gradient** — Let $f: \mathbb{R}^n \to \mathbb{R}$ be $C^2$. The gradient $\nabla f: \mathbb{R}^n \to \mathbb{R}^n$ is a vector-valued function with component functions $(\nabla f)_i = \frac{\partial f}{\partial x_i}$. Its Jacobian matrix is $J(\nabla f)(a)_{ij} = \frac{\partial}{\partial x_j}\left(\frac{\partial f}{\partial x_i}\right)(a) = \frac{\partial^2 f}{\partial x_j \partial x_i}(a) = H_f(a)_{ij}.$ Therefore $H_f(a) = J(\nabla f)(a)$. The Hessian is the Jacobian of the gradient.
- **Proof of Proposition 1** — Direct verification. The $i$-th component of $\nabla f$ is $g_i(x) = \frac{\partial f}{\partial x_i}(x)$. By Definition 2 of Topic 10, the Jacobian of $g = \nabla f$ has entries $J_g(a)_{ij} = \frac{\partial g_i}{\partial x_j}(a) = \frac{\partial}{\partial x_j}\frac{\partial f}{\partial x_i}(a) = \frac{\partial^2 f}{\partial x_j \partial x_i}(a)$. By Clairaut's theorem (Theorem 1), $\frac{\partial^2 f}{\partial x_j \partial x_i} = \frac{\partial^2 f}{\partial x_i \partial x_j} = H_f(a)_{ij}$. Therefore $J(\nabla f)(a) = H_f(a)$.
- **Example 2: Hessian of a paraboloid** — $f(x,y) = x^2 + 4y^2$. Gradient: $\nabla f = (2x, 8y)$. Hessian: $H_f = \begin{pmatrix} 2 & 0 \\ 0 & 8 \end{pmatrix}$ — constant, independent of $(x,y)$. The eigenvalues are 2 and 8. The surface curves 4 times more steeply in the $y$-direction than in the $x$-direction. This is the prototypical ill-conditioned loss surface: gradient descent zigzags because the curvatures are unequal.
- **Example 3: Hessian of a saddle function** — $f(x,y) = x^2 - y^2$. Gradient: $\nabla f = (2x, -2y)$. Hessian: $H_f = \begin{pmatrix} 2 & 0 \\ 0 & -2 \end{pmatrix}$. One positive eigenvalue (2, curves upward in $x$) and one negative eigenvalue ($-2$, curves downward in $y$). The origin is a saddle point — a critical point that is neither a minimum nor a maximum.
- **Example 4: Hessian of a neural network loss** — Consider a loss $L(\theta_1, \theta_2) = (y - \sigma(\theta_1 x_1 + \theta_2 x_2))^2$ where $\sigma$ is the sigmoid. The Hessian $H_L(\theta)$ has entries involving $\sigma'$ and $\sigma''$ — it depends on the data $(x_1, x_2, y)$ and the current parameters $\theta$. Unlike the paraboloid, this Hessian is *not* constant — the curvature of the loss surface changes as the parameters move. Computing this $2 \times 2$ matrix is cheap; computing a $10^8 \times 10^8$ matrix for a real network is not.

**Visualization:** `HessianEigenExplorer` embedded here — the flagship visualization.

**Static image:** `hessian-matrix-construction.png` from the notebook.

### Section 4: Critical Point Classification

**The second derivative test in $\mathbb{R}^n$.** At a critical point $a$ (where $\nabla f(a) = 0$), the first-order Taylor term vanishes and the second-order term dominates: $f(a+h) \approx f(a) + \frac{1}{2} h^T H_f(a) h$. The sign behavior of this quadratic form — does it produce all positive values, all negative values, or both? — determines whether $a$ is a local min, local max, or saddle.

**TheoremBlocks:**

- **Definition 3: Positive Definite, Negative Definite, Indefinite** — A symmetric $n \times n$ matrix $A$ is:
  - *Positive definite* ($A \succ 0$) if $h^T A h > 0$ for all $h \neq 0$. Equivalently, all eigenvalues of $A$ are positive.
  - *Negative definite* ($A \prec 0$) if $h^T A h < 0$ for all $h \neq 0$. Equivalently, all eigenvalues are negative.
  - *Positive semidefinite* ($A \succeq 0$) if $h^T A h \ge 0$ for all $h$. Equivalently, all eigenvalues are nonnegative.
  - *Negative semidefinite* ($A \preceq 0$) if $h^T A h \le 0$ for all $h$. Equivalently, all eigenvalues are nonpositive.
  - *Indefinite* if $h^T A h$ takes both positive and negative values. Equivalently, $A$ has both positive and negative eigenvalues.
- **Proposition 2: Eigenvalue Criterion for Definiteness** — Let $A$ be a symmetric $n \times n$ matrix with eigenvalues $\lambda_1 \le \lambda_2 \le \cdots \le \lambda_n$. Then: (a) $A \succ 0 \iff \lambda_1 > 0$. (b) $A \prec 0 \iff \lambda_n < 0$. (c) $A$ is indefinite $\iff$ $\lambda_1 < 0 < \lambda_n$. For $n = 2$: $A = \begin{pmatrix} a & b \\ b & c \end{pmatrix}$ is positive definite iff $a > 0$ and $\det A = ac - b^2 > 0$. It is indefinite iff $\det A < 0$.
- **Definition 4: Saddle Point** — A point $a$ is a *saddle point* of $f$ if $\nabla f(a) = 0$ and $H_f(a)$ is indefinite — i.e., $f$ curves upward in some directions and downward in others. Near a saddle point, $f(a + h) > f(a)$ for some directions $h$ and $f(a + h) < f(a)$ for others. The origin of $f(x,y) = x^2 - y^2$ is the canonical example.
- **Theorem 2: The Second Derivative Test (Multivariable)** — Let $f: \mathbb{R}^n \to \mathbb{R}$ be $C^2$ near $a$, and suppose $\nabla f(a) = 0$ (so $a$ is a critical point). Then:
  1. If $H_f(a) \succ 0$ (positive definite), then $a$ is a strict local minimum.
  2. If $H_f(a) \prec 0$ (negative definite), then $a$ is a strict local maximum.
  3. If $H_f(a)$ is indefinite, then $a$ is a saddle point.
  4. If $H_f(a)$ is positive or negative *semi*definite (has a zero eigenvalue), the test is inconclusive — higher-order analysis is needed.
  
  For $n = 2$, write $H_f = \begin{pmatrix} f_{xx} & f_{xy} \\ f_{xy} & f_{yy} \end{pmatrix}$. Then: $D = f_{xx} f_{yy} - f_{xy}^2 = \det H_f$. If $D > 0$ and $f_{xx} > 0$: local min. If $D > 0$ and $f_{xx} < 0$: local max. If $D < 0$: saddle. If $D = 0$: inconclusive.
- **Proof of Theorem 2** — Sketch via the second-order Taylor expansion (proven in Section 5). At a critical point, $f(a+h) = f(a) + \frac{1}{2} h^T H_f(a) h + o(\|h\|^2)$. If $H_f(a) \succ 0$, then by the spectral theorem for symmetric matrices, $h^T H_f(a) h \ge \lambda_{\min} \|h\|^2$ where $\lambda_{\min} > 0$ is the smallest eigenvalue. For $\|h\|$ sufficiently small, the $o(\|h\|^2)$ error is dominated by $\frac{1}{2}\lambda_{\min}\|h\|^2$, so $f(a+h) > f(a)$ for all $h \neq 0$ in a neighborhood — $a$ is a strict local minimum. The negative definite case is analogous (flip the signs). For an indefinite $H_f(a)$, choose $h$ along the eigenvector with positive eigenvalue to get $f(a+h) > f(a)$, and along the eigenvector with negative eigenvalue to get $f(a+h) < f(a)$ — so $a$ is neither a local min nor max.
- **Example 5: Critical point classification** — $f(x,y) = x^4 + y^4 - 2x^2 - 2y^2 + 1$. Gradient: $\nabla f = (4x^3 - 4x, 4y^3 - 4y)$. Critical points: $(0,0)$, $(\pm 1, 0)$, $(0, \pm 1)$, $(\pm 1, \pm 1)$. Hessian: $H_f = \begin{pmatrix} 12x^2 - 4 & 0 \\ 0 & 12y^2 - 4 \end{pmatrix}$. At $(0,0)$: $H_f = \begin{pmatrix} -4 & 0 \\ 0 & -4 \end{pmatrix} \prec 0$ → local max. At $(1,0)$: $H_f = \begin{pmatrix} 8 & 0 \\ 0 & -4 \end{pmatrix}$ → indefinite → saddle. At $(1,1)$: $H_f = \begin{pmatrix} 8 & 0 \\ 0 & 8 \end{pmatrix} \succ 0$ → local min. Nine critical points total, classified by eigenvalue signs.
- **Remark 2: When the second derivative test is inconclusive** — The function $f(x,y) = x^4 + y^4$ has $\nabla f(0,0) = 0$ and $H_f(0,0) = \begin{pmatrix} 0 & 0 \\ 0 & 0 \end{pmatrix}$ — the zero matrix. The test is inconclusive. Yet the origin is clearly a local (and global) minimum: $f(x,y) = x^4 + y^4 > 0 = f(0,0)$ for all $(x,y) \neq (0,0)$. The issue is that the second-order Taylor expansion $f(a+h) \approx f(a) + \frac{1}{2}h^T H_f(a) h$ is not informative when the quadratic term vanishes — the fourth-order terms dominate. Compare with $g(x,y) = x^4 - y^4$ at the origin: same zero Hessian, but now the origin is a saddle (of fourth order).

**Visualization:** `SaddlePointExplorer` embedded here.

**Static image:** `critical-point-classification.png` from the notebook.

### Section 5: The Second-Order Taylor Expansion

**The quadratic approximation.** Just as the first-order Taylor expansion approximates $f$ by a hyperplane (the tangent plane), the second-order expansion approximates $f$ by a paraboloid. The Hessian provides the curvature information that the gradient approximation misses.

**TheoremBlocks:**

- **Theorem 3: Second-Order Taylor Expansion** — Let $f: \mathbb{R}^n \to \mathbb{R}$ be $C^2$ in a neighborhood of $a$. Then for all $h$ with $a + h$ in that neighborhood:
  $$f(a + h) = f(a) + \nabla f(a) \cdot h + \frac{1}{2} h^T H_f(a) h + R_2(h)$$
  where the remainder satisfies $\lim_{h \to 0} \frac{R_2(h)}{\|h\|^2} = 0$ (i.e., $R_2(h) = o(\|h\|^2)$). In expanded form:
  $$f(a+h) = f(a) + \sum_{i=1}^n \frac{\partial f}{\partial x_i}(a) h_i + \frac{1}{2} \sum_{i=1}^n \sum_{j=1}^n \frac{\partial^2 f}{\partial x_i \partial x_j}(a) h_i h_j + o(\|h\|^2).$$
  This is the multivariable generalization of $f(a+h) = f(a) + f'(a)h + \frac{1}{2}f''(a)h^2 + o(h^2)$ from Topic 6.
- **Proof of Theorem 3** — Apply the single-variable Taylor expansion to the function $g(t) = f(a + th)$ at $t = 0$: $g(t) = g(0) + g'(0)t + \frac{1}{2}g''(0)t^2 + o(t^2)$. We have $g(0) = f(a)$, $g'(0) = \nabla f(a) \cdot h$ (by the chain rule from Topic 9), and $g''(0) = h^T H_f(a) h$ (by differentiating again, using the chain rule to obtain $g''(t) = \sum_{i,j} \frac{\partial^2 f}{\partial x_i \partial x_j}(a + th) h_i h_j$, then evaluating at $t = 0$). Setting $t = 1$: $f(a+h) = f(a) + \nabla f(a) \cdot h + \frac{1}{2} h^T H_f(a) h + o(\|h\|^2)$. The error bound conversion from $o(t^2)$ to $o(\|h\|^2)$ uses the fact that $t = 1$ is fixed and the expansion is in powers of $\|h\|$.
- **Example 6: Quadratic approximation of $f(x,y) = e^{x+y}$ near the origin** — $f(0,0) = 1$, $\nabla f(0,0) = (1, 1)$, $H_f(0,0) = \begin{pmatrix} 1 & 1 \\ 1 & 1 \end{pmatrix}$. Second-order expansion: $e^{x+y} \approx 1 + x + y + \frac{1}{2}(x^2 + 2xy + y^2) = 1 + (x+y) + \frac{1}{2}(x+y)^2$. This matches the known Taylor series $e^u \approx 1 + u + \frac{1}{2}u^2$ with $u = x + y$.

**Static image:** `second-order-taylor.png` from the notebook.

### Section 6: Eigenvalue Analysis & Curvature

**The eigenvalues and eigenvectors of $H_f(a)$ have geometric meaning.** The eigenvalues are the principal curvatures — the maximum and minimum curvatures of $f$ at $a$. The eigenvectors are the principal curvature directions. This section connects the algebraic classification (Definition 3) to geometric visualization.

**TheoremBlocks:**

- **Example 7: Curvature of the elliptic paraboloid** — For $f(x,y) = ax^2 + by^2$ with $a, b > 0$: $H_f = \begin{pmatrix} 2a & 0 \\ 0 & 2b \end{pmatrix}$. Eigenvalues: $\lambda_1 = 2a$, $\lambda_2 = 2b$, with eigenvectors along the coordinate axes. The condition number $\kappa = \lambda_{\max}/\lambda_{\min} = \max(a,b)/\min(a,b)$ measures eccentricity. When $a = b$, $\kappa = 1$ (circular contours, isotropic curvature). When $a \gg b$ or $a \ll b$, $\kappa \gg 1$ (elliptical contours, anisotropic curvature — gradient descent zigzags).
- **Example 8: The monkey saddle** — $f(x,y) = x^3 - 3xy^2$. Gradient: $\nabla f = (3x^2 - 3y^2, -6xy)$, so $(0,0)$ is a critical point. Hessian at origin: $H_f(0,0) = \begin{pmatrix} 6x & -6y \\ -6y & -6x \end{pmatrix}\bigg|_{(0,0)} = \begin{pmatrix} 0 & 0 \\ 0 & 0 \end{pmatrix}$. The second derivative test is inconclusive. Yet the surface has three "valleys" meeting at the origin (picture a monkey sitting with both legs and a tail hanging down). This is a degenerate critical point requiring higher-order analysis.
- **Remark 3: The condition number and optimization** — For a quadratic $f(x) = \frac{1}{2}x^T A x - b^T x + c$ with $A \succ 0$, gradient descent converges in $O(\kappa \log(1/\epsilon))$ iterations, where $\kappa = \lambda_{\max}(A)/\lambda_{\min}(A)$ is the condition number. Newton's method converges in $O(\log\log(1/\epsilon))$ iterations (quadratic convergence). The gap is dramatic: for $\kappa = 1000$, GD needs $\sim 7000$ steps while Newton needs $\sim 10$. The condition number $\kappa(H_f)$ at a local minimum of a non-quadratic loss measures the local version of this problem.

**Visualization:** `CurvatureHeatmapExplorer` embedded here.

**Static image:** `eigenvalue-curvature.png` from the notebook.

### Section 7: Newton's Method

**Using the Hessian to take curvature-corrected steps.** Newton's method applies the quadratic approximation iteratively: at each step, approximate $f$ by a paraboloid, find the minimum of the paraboloid (which has a closed-form solution), and move there.

**TheoremBlocks:**

- **Example 9: Newton's method derivation** — At the current iterate $x_k$, approximate $f$ by its second-order Taylor expansion: $f(x_k + h) \approx f(x_k) + \nabla f(x_k) \cdot h + \frac{1}{2} h^T H_f(x_k) h$. This is a quadratic in $h$, minimized when $\nabla f(x_k) + H_f(x_k) h = 0$, i.e., $h^* = -H_f(x_k)^{-1} \nabla f(x_k)$. The Newton update is $x_{k+1} = x_k + h^* = x_k - H_f(x_k)^{-1} \nabla f(x_k)$. Compare with gradient descent: $x_{k+1} = x_k - \eta \nabla f(x_k)$. Newton replaces the scalar step size $\eta$ with the matrix $H_f^{-1}$ — a direction- and curvature-dependent step that accounts for the local shape of the surface.
- **Example 10: Newton on the Rosenbrock function** — $f(x,y) = (1-x)^2 + 100(y-x^2)^2$. The minimum is at $(1,1)$. Gradient descent converges slowly because the loss landscape is a narrow, curved valley (condition number $\kappa \approx 2500$ at the minimum). Newton's method converges in a few iterations because it uses the Hessian to navigate the curvature.
- **Remark 4: Newton's method can fail** — Newton's method requires $H_f(x_k)$ to be positive definite (otherwise the quadratic model has no minimum — it has a maximum or saddle). At a saddle point, $H_f$ is indefinite, and the Newton step may move *toward* the saddle rather than away from it. This is why second-order methods in ML often use *modified* Newton methods that ensure the step direction is always a descent direction — replacing $H_f^{-1}$ with $(H_f + \mu I)^{-1}$ for some $\mu > 0$ (Levenberg-Marquardt damping) or using only the positive part of the eigenvalue decomposition.

**Visualization:** `NewtonMethodExplorer` embedded here.

**Static image:** `newton-vs-gd.png` from the notebook.

### Section 8: Connections to ML

This is a substantial section with four subsections, parallel to the ML section in the Jacobian topic.

**Subsection 8.1: Loss surface curvature.**

The Hessian of the loss function $L(\theta)$ at the current parameters $\theta$ determines how the loss surface curves. The eigenvalues of $H_L(\theta)$ are the curvatures in each principal direction. Large condition number $\kappa(H_L) = \lambda_{\max}/\lambda_{\min}$ means the surface is an elongated valley — gradient descent overshoots in steep directions and barely moves in flat directions. This is why learning rate tuning is hard: no single scalar $\eta$ works well for all directions simultaneously. Batch normalization, layer normalization, and weight initialization schemes all implicitly improve the Hessian's condition number.

**Subsection 8.2: Saddle points in high dimensions.**

Dauphin et al. (2014) showed that in high-dimensional optimization, saddle points are exponentially more common than local minima. At a random critical point of a generic function on $\mathbb{R}^n$, each eigenvalue of the Hessian is independently positive or negative with roughly equal probability. A local minimum requires *all* $n$ eigenvalues to be positive — probability $\sim 2^{-n}$. A saddle point (mixed eigenvalue signs) has probability $\sim 1 - 2^{1-n}$. For $n = 1000$: the probability of a random critical point being a local minimum is $\sim 2^{-1000} \approx 0$. The practical implication: when gradient descent "gets stuck" in high dimensions, it is almost certainly near a saddle point, not a local minimum. Gradient descent can escape saddle points (slowly); Newton's method can be attracted *to* saddle points (because $H_f^{-1}$ amplifies components along eigenvectors with small eigenvalues, which near saddle points includes directions with negative curvature).

**Subsection 8.3: Second-order optimizers.**

- **Full Newton:** $\theta_{k+1} = \theta_k - H_L^{-1} \nabla L$. Quadratic convergence but $O(n^2)$ memory and $O(n^3)$ computation per step. Impractical for $n > 10^4$.
- **Quasi-Newton (L-BFGS):** Approximates $H_L^{-1}$ from gradient differences across recent steps — stores $O(mn)$ where $m \sim 10$–$20$ is the memory parameter. Widely used in scientific computing and small-scale ML.
- **Hessian-free optimization:** Uses conjugate gradient to solve $H_f(x_k) h = -\nabla f(x_k)$ without forming $H_f$ explicitly — only requires Hessian-vector products $H_f v$, which can be computed via automatic differentiation in $O(n)$ time (one forward + one backward pass per product).
- **Natural gradient:** $\theta_{k+1} = \theta_k - I(\theta_k)^{-1} \nabla L(\theta_k)$ where $I(\theta)$ is the Fisher information matrix. This is Newton's method on the KL divergence rather than the loss — it adapts the step to the geometry of the probability distribution. → [Information Geometry](https://formalml.com/topics/information-geometry) → formalML.
- **Adam and diagonal approximations:** Adam's per-parameter adaptive learning rate $\eta / \sqrt{v_t + \epsilon}$ implicitly approximates the diagonal of $|H_L|^{1/2}$. The second-moment estimate $v_t$ tracks the mean square of gradients, which under stationary conditions approximates the diagonal Fisher information.

**Subsection 8.4: Hessian spectrum in practice.**

Empirical studies of neural network loss surfaces show that the Hessian spectrum is highly structured: most eigenvalues are near zero (flat directions corresponding to redundant parameters), a few are large and positive (high-curvature directions), and at saddle points, a few are negative. The "effective dimension" of the optimization problem is much smaller than $n$, which explains why first-order methods work surprisingly well despite the theoretical superiority of second-order methods. The Gauss-Newton approximation $G = J^T J$ (where $J$ is the Jacobian of the residuals) is always positive semidefinite and provides a useful approximation to the Hessian for least-squares problems, avoiding the indefiniteness issue of the full Hessian.

Forward references (external links, new tab):
- [Gradient Descent](https://formalml.com/topics/gradient-descent) → formalML
- [Convex Analysis](https://formalml.com/topics/convex-analysis) → formalML
- [Information Geometry](https://formalml.com/topics/information-geometry) → formalML

Forward references (within formalCalculus, plain text):
- **Inverse & Implicit Function Theorems** *(coming soon)* uses the Hessian to analyze the local structure of constraint surfaces near degenerate points.
- **Stability & Dynamical Systems** *(coming soon)* uses eigenvalue analysis of the Hessian of a Lyapunov function to classify equilibrium stability.

**Static images:** `newton-vs-gd.png`, `saddle-points-high-dim.png` from the notebook.

### Section 9: Connections & Further Reading

Standard cross-reference table linking to all referenced formalCalculus topics and formalml.com topics. DAG diagram showing `hessian`'s position in the prerequisite graph: `derivative → gradient → jacobian → hessian → inverse-implicit`.

---

## 4. Visualizations

### 4.1 HessianEigenExplorer (Flagship)

- **Component name:** `HessianEigenExplorer`
- **Filename:** `src/components/viz/HessianEigenExplorer.tsx`
- **What it visualizes:** A contour plot of $f: \mathbb{R}^2 \to \mathbb{R}$ with a user-selectable point $a$. At $a$, the Hessian matrix $H_f(a)$ is displayed, along with its eigenvalues and eigenvectors (drawn as arrows on the contour plot, scaled by eigenvalue magnitude, colored by sign: blue for positive, red for negative). A companion panel shows the quadratic form $q(h) = h^T H_f(a) h$ as a 3D paraboloid surface, rotated so the principal curvature directions align with the eigenvectors. This makes the abstract "positive definite = bowl, negative definite = dome, indefinite = saddle" classification immediately visible.
- **User interactions:**
  - Click/drag point $a$ on the contour plot. As $a$ moves across the surface, the Hessian, eigenvalues, and eigenvectors update in real time — the user can watch the curvature change as they traverse the landscape.
  - Function preset dropdown: paraboloid $x^2 + 4y^2$ (positive definite everywhere), saddle $x^2 - y^2$ (indefinite everywhere), mixed $x^4 + y^4 - 2x^2 - 2y^2 + 1$ (has minima, maxima, and saddles depending on location), Rosenbrock $(1-x)^2 + 100(y-x^2)^2$ (ill-conditioned).
  - Toggle: "Show eigenvectors" — overlay eigenvector arrows on the contour plot.
  - Toggle: "Show quadratic form" — display the $h^T H_f(a) h$ paraboloid in a companion panel.
- **Numerical readout:** $H_f(a)$ (matrix entries), eigenvalues $\lambda_1, \lambda_2$, eigenvectors $v_1, v_2$, $\det H_f(a)$, $\text{tr}\, H_f(a)$, condition number $\kappa = |\lambda_{\max}|/|\lambda_{\min}|$, classification (local min / local max / saddle / inconclusive).
- **Data source:** Inline computation via `multivariate.ts`.
- **Panel layout:** Two-panel: left = contour plot with point and eigenvector arrows, right = quadratic form surface $h^T H h$ (pseudo-3D rendering via `project3D`). Readout panel below.
- **Reference pattern:** This is the flagship visualization, paralleling `JacobianGridExplorer` (Topic 10), `PartialDerivativeSliceExplorer` (Topic 9), and `SecantToTangentExplorer` (Topic 5). The eigenvalue coloring (blue = positive, red = negative) immediately communicates the critical point type.

### 4.2 SaddlePointExplorer

- **Component name:** `SaddlePointExplorer`
- **Filename:** `src/components/viz/SaddlePointExplorer.tsx`
- **What it visualizes:** A pseudo-3D surface rendering of $f: \mathbb{R}^2 \to \mathbb{R}$ with critical points automatically detected and marked. Each critical point is colored by its classification (green = local min, red = local max, yellow = saddle). At the selected critical point, eigenvector directions are drawn as lines on the surface, colored by eigenvalue sign, showing the directions of positive and negative curvature. A "ride the saddle" animation shows a ball placed at a saddle point: it slides downhill along the negative-eigenvalue direction but remains unstable along the positive-eigenvalue direction.
- **User interactions:**
  - Click a critical point to select it and display its Hessian analysis.
  - Function preset dropdown: $x^4 + y^4 - 2x^2 - 2y^2 + 1$ (nine critical points), $\sin(x)\sin(y)$ (periodic landscape), $e^{-(x^2+y^2)} + e^{-((x-1)^2 + (y-1)^2)}$ (two peaks with a saddle between them).
  - Toggle: "Animate trajectory" — drop a ball at the selected saddle point and animate its trajectory under gradient flow (escaping along the negative curvature direction).
  - View angle slider: rotate the pseudo-3D surface.
- **Numerical readout:** Critical point coordinates, $H_f$ matrix, eigenvalues, classification.
- **Data source:** Inline computation via `multivariate.ts` — uses `classifyCriticalPoint` and `eigenvalues2x2`.
- **Panel layout:** Single wide panel with pseudo-3D surface (using `project3D` from the shared module), critical points marked, eigenvector lines overlaid.

### 4.3 NewtonMethodExplorer

- **Component name:** `NewtonMethodExplorer`
- **Filename:** `src/components/viz/NewtonMethodExplorer.tsx`
- **What it visualizes:** Side-by-side comparison of gradient descent and Newton's method on the same loss surface. The left panel shows GD iterates (connected by arrows), the right panel shows Newton iterates. Both start from the same initial point. A companion panel shows the convergence curves ($f(x_k)$ vs. iteration $k$) on a log scale, making the difference between linear (GD) and quadratic (Newton) convergence visually obvious.
- **User interactions:**
  - Click to set the starting point.
  - Step size $\eta$ slider for gradient descent (Newton has no step size — it is determined by the Hessian).
  - "Step" button: advance both optimizers by one iteration. "Run" button: animate to convergence (or max iterations).
  - Function preset dropdown: paraboloid $5x^2 + y^2$ (ill-conditioned, $\kappa = 5$), Rosenbrock (severely ill-conditioned), $x^2 + y^2$ (isotropic — GD and Newton perform identically), Beale's function.
  - Toggle: "Show quadratic model" — at the current Newton iterate, overlay the quadratic approximation $q(h) = f(x_k) + \nabla f^T h + \frac{1}{2} h^T H h$ as contours, showing that Newton steps to the minimum of this model.
- **Numerical readout:** Current iterate, $f(x_k)$, $\|\nabla f(x_k)\|$, $\kappa(H_f(x_k))$, iteration count, convergence status.
- **Data source:** Inline computation via `multivariate.ts` — uses `newtonStep`, `gradientDescent` (from Topic 9 module), `hessianMatrix`, `conditionNumber`.
- **Panel layout:** Three-panel: left = GD contour trajectory, center = Newton contour trajectory, right = convergence curves ($f$ vs. iteration).

### 4.4 CurvatureHeatmapExplorer

- **Component name:** `CurvatureHeatmapExplorer`
- **Filename:** `src/components/viz/CurvatureHeatmapExplorer.tsx`
- **What it visualizes:** A heatmap over the domain of $f$ showing the condition number $\kappa(H_f(x)) = |\lambda_{\max}|/|\lambda_{\min}|$ (or the minimum eigenvalue $\lambda_{\min}$, or the maximum eigenvalue $\lambda_{\max}$, selectable by dropdown). High-condition-number regions are colored warm (these are the "hard" parts of the landscape for GD); low-condition-number regions are cool. Critical points are marked with symbols. The heatmap makes the ill-conditioned structure of a loss surface immediately visible — you can *see* where gradient descent will struggle.
- **User interactions:**
  - Heatmap quantity dropdown: "Condition number $\kappa$", "Min eigenvalue $\lambda_{\min}$", "Max eigenvalue $\lambda_{\max}$", "Determinant $\det H$", "Trace $\text{tr}\, H$".
  - Function preset dropdown: same as HessianEigenExplorer.
  - Color scale toggle: linear vs. log scale (condition numbers can span orders of magnitude).
  - Click a point to display the full Hessian analysis at that location (matrix, eigenvalues, eigenvectors, classification).
- **Numerical readout:** At clicked point: $H_f$, $\lambda_1, \lambda_2$, $\kappa$, $\det H$, $\text{tr}\, H$.
- **Data source:** Inline computation via `multivariate.ts` — uses `hessianMatrix`, `eigenvalues2x2`, `conditionNumber`.
- **Panel layout:** Single wide panel with heatmap. Clicked-point readout below.

---

## 5. Data Modules

### 5.1 `hessian-data.ts`

- **Filename:** `src/data/hessian-data.ts`
- **Exported interfaces:**

```typescript
interface HessianSurfacePreset {
  name: string;
  label: string;                                    // Display label
  f: (x: number, y: number) => number;             // f: ℝ² → ℝ
  grad: (x: number, y: number) => [number, number];  // Analytical gradient
  hessian: (x: number, y: number) => [[number, number], [number, number]];  // Analytical Hessian
  xDomain: [number, number];
  yDomain: [number, number];
  criticalPoints: Array<{
    point: [number, number];
    type: 'local-min' | 'local-max' | 'saddle' | 'degenerate';
  }>;
  description?: string;
}

interface NewtonPreset {
  name: string;
  label: string;
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => [number, number];
  hessian: (x: number, y: number) => [[number, number], [number, number]];
  xDomain: [number, number];
  yDomain: [number, number];
  defaultStart: [number, number];
  minimum: [number, number];
  conditionNumber: number;                          // Approximate κ at the minimum
  description?: string;
}
```

- **Exported constants:**
  - `HESSIAN_SURFACE_PRESETS: HessianSurfacePreset[]` — 4 presets for HessianEigenExplorer, SaddlePointExplorer, and CurvatureHeatmapExplorer: paraboloid $x^2 + 4y^2$ (PD everywhere), saddle $x^2 - y^2$ (indefinite everywhere), multi-critical $x^4 + y^4 - 2x^2 - 2y^2 + 1$ (9 critical points), Rosenbrock $(1-x)^2 + 100(y-x^2)^2$ (ill-conditioned).
  - `NEWTON_PRESETS: NewtonPreset[]` — 4 presets for NewtonMethodExplorer: isotropic paraboloid ($\kappa = 1$), elliptic paraboloid ($\kappa = 5$), Rosenbrock ($\kappa \approx 2500$), Beale's function.

- **Computation:** All eager (function references are cheap; no heavy computation at import time).

---

## 6. Shared Utility Module Updates: `multivariate.ts`

### Location

```
src/components/viz/shared/multivariate.ts
```

### New Interfaces (add to existing module)

```typescript
/** Hessian matrix result at a point */
export interface HessianResult {
  point: number[];               // evaluation point
  matrix: number[][];            // n × n Hessian matrix (symmetric)
  eigenvalues: number[];         // sorted ascending
  eigenvectors: number[][];      // corresponding eigenvectors
  determinant: number;
  trace: number;
  classification: 'positive-definite' | 'negative-definite' | 'indefinite' | 'positive-semidefinite' | 'negative-semidefinite' | 'zero';
}

/** Critical point classification result */
export interface CriticalPointResult {
  point: number[];
  gradient: number[];            // should be near zero
  hessian: HessianResult;
  type: 'local-min' | 'local-max' | 'saddle' | 'degenerate';
}

/** Newton step result */
export interface NewtonStepResult {
  currentPoint: number[];
  gradient: number[];
  hessian: number[][];
  newtonDirection: number[];     // -H⁻¹ ∇f
  nextPoint: number[];
  functionValue: number;
  gradientNorm: number;
  conditionNumber: number;
}

/** Quadratic form evaluation */
export interface QuadraticFormResult {
  point: number[];               // evaluation point h
  matrix: number[][];            // the matrix A
  value: number;                 // h^T A h
}
```

### New Functions (add to existing module)

```typescript
/** Compute the Hessian matrix numerically via central differences on the gradient.
 *  f: ℝⁿ → ℝ, returns n × n symmetric matrix.
 *  Internally computes the gradient at nearby points and differentiates again. */
export function hessianMatrix(
  f: (...args: number[]) => number,
  point: number[],
  h?: number                      // step size, default 1e-5
): HessianResult;

/** Compute eigenvalues and eigenvectors of a 2 × 2 symmetric matrix.
 *  Returns eigenvalues sorted ascending and corresponding unit eigenvectors.
 *  Uses the closed-form formula for 2 × 2 symmetric eigenvalues. */
export function eigenvalues2x2(
  M: [[number, number], [number, number]]
): { eigenvalues: [number, number]; eigenvectors: [[number, number], [number, number]] };

/** Compute eigenvalues of a symmetric matrix (general n × n).
 *  Uses the QR algorithm for n > 2.
 *  Guarded to n ≤ 10 for browser performance. */
export function eigenvaluesSymmetric(
  M: number[][]
): { eigenvalues: number[]; eigenvectors: number[][] };

/** Classify a critical point of f: ℝⁿ → ℝ.
 *  Computes the gradient (should be near zero) and the Hessian,
 *  then classifies based on eigenvalue signs. */
export function classifyCriticalPoint(
  f: (...args: number[]) => number,
  point: number[],
  h?: number
): CriticalPointResult;

/** Evaluate the quadratic form h^T A h for a symmetric matrix A. */
export function quadraticForm(
  A: number[][],
  h: number[]
): number;

/** Compute one Newton step: x_{k+1} = x_k - H_f(x_k)⁻¹ ∇f(x_k).
 *  Returns the step, the next point, and diagnostic information.
 *  Uses 2 × 2 matrix inversion directly; for n > 2, uses Gaussian elimination. */
export function newtonStep(
  f: (...args: number[]) => number,
  point: number[],
  h?: number
): NewtonStepResult;

/** Compute the condition number κ = |λ_max| / |λ_min| of a symmetric matrix.
 *  Returns Infinity if the matrix is singular (λ_min = 0). */
export function conditionNumber(
  M: number[][]
): number;
```

### Backward Compatibility

All existing functions in `multivariate.ts` remain unchanged:
- From Topic 9: `numericalGradient`, `analyticalGradient`, `directionalDerivative`, `generateContours`, `generateWireframe`, `project3D`, `gradientDescent`, `gradientFlow`, `checkDifferentiability` — unchanged.
- From Topic 10: `jacobianMatrix`, `jacobianDeterminant`, `multivariateChainRule`, `linearMapComposition`, `areaDistortion`, `coordinateTransform`, `determinant` (internal helper) — unchanged.

The new functions extend the module with Hessian-specific computation. `hessianMatrix` internally uses the existing `numericalGradient` function (computing the gradient at shifted points and differencing) for numerical Hessian computation. The existing `determinant` helper is used by `hessianMatrix` for the determinant field. The existing `gradientDescent` function is reused in `NewtonMethodExplorer` for side-by-side comparison.

Designed to be extended by:
- Topic 12 (`inverse-implicit`): adds `inverseJacobianApprox`, `implicitFunctionSlice`, `newtonMethodMultivariate`

---

## 7. Curriculum Graph Updates

### `src/data/curriculum-graph.json`

**Change node status:**
```json
{ "id": "hessian", "label": "The Hessian & Second-Order Analysis", "domain": "multivar-differential", "status": "published", "url": "/topics/hessian" }
```
Change `"status"` from `"planned"` to `"published"`.

**Edges** (should already exist — verify):
```json
{ "source": "jacobian", "target": "hessian" }
{ "source": "hessian", "target": "inverse-implicit" }
```

If the `jacobian → hessian` edge does not exist, add it (it should be present from Topic 10). Verify the `hessian → inverse-implicit` edge exists.

### `src/data/curriculum.ts`

In the `multivar-differential` track definition, move `"The Hessian & Second-Order Analysis"` from `planned` to `published`. The remaining topic (`inverse-implicit`) stays in `planned`.

---

## 8. Cross-References

### Existing topics that should link TO this topic

- **`jacobian.mdx`** — Section 8 mentions "The Hessian & Second-Order Analysis *(coming soon)* classifies critical points using the Hessian ($= J(\nabla f)$)." Update to a live link: `[The Hessian & Second-Order Analysis](/topics/hessian)`. Also check Section 1 (overview mentions downstream) and Section 4 (any forward references to second-order chain rule or Hessian).
- **`gradient.mdx`** — Section 5 (gradient and level sets) or Section 9 (ML connections) may mention the Hessian or second derivative test. If any forward references say "coming soon," update them to live links.

### Topics this topic links FROM

- `jacobian` — prerequisite (live link). $H_f = J(\nabla f)$.
- `gradient` — gradient as first-order, Hessian as second-order (live link).
- `derivative` — single-variable second derivative as $1 \times 1$ Hessian (live link).
- `mean-value-taylor` — single-variable Taylor expansion generalized (live link).
- `epsilon-delta` — limits in the second-order Taylor remainder (live link).

### Forward references to planned topics (plain text + "(coming soon)")

- **Inverse & Implicit Function Theorems** *(coming soon)* — referenced in Section 4 (local invertibility near non-degenerate critical points) and Section 6 (constraint surfaces).
- **Stability & Dynamical Systems** *(coming soon)* — referenced in Section 6 (Lyapunov function Hessian).
- **Series Convergence & Tests** *(coming soon)* — referenced indirectly via higher-order Taylor expansions.

### formalml.com forward links (informational, external, new tab)

- `gradient-descent` — Sections 7, 8.1, 8.3
- `convex-analysis` — Section 8.1, Section 8.3
- `information-geometry` — Section 8.3

---

## 9. Images

Copy the following images from the notebook export to `public/images/topics/hessian/`:

| # | Filename | Description |
|---|----------|-------------|
| 1 | `second-order-partials.png` | Three-panel: $f_{xx}$, $f_{xy}$, $f_{yy}$ as surface plots for a sample function, demonstrating Clairaut's theorem ($f_{xy} = f_{yx}$) |
| 2 | `hessian-matrix-construction.png` | Hessian assembly: gradient vector field, differentiate again, assemble into symmetric matrix — with numerical Hessians for paraboloid, saddle, and Rosenbrock |
| 3 | `critical-point-classification.png` | Six-panel: three surfaces (bowl, saddle, monkey saddle) with critical points marked and Hessian eigenvalue annotations at each |
| 4 | `eigenvalue-curvature.png` | Contour plots with eigenvector arrows scaled by eigenvalue magnitude, colored by sign (blue/red), for paraboloid and Rosenbrock |
| 5 | `second-order-taylor.png` | Three-panel: original surface, first-order Taylor (tangent plane), second-order Taylor (paraboloid), with approximation error shrinking |
| 6 | `newton-vs-gd.png` | Side-by-side contour trajectories: GD zigzags on ill-conditioned surface while Newton converges in a few steps; convergence curve comparison |
| 7 | `saddle-points-high-dim.png` | Histogram of Hessian eigenvalue distributions at random critical points for increasing dimension $n$, showing saddle point dominance |
| 8 | `condition-number-heatmap.png` | Heatmap of $\kappa(H_f)$ over the domain for Rosenbrock, showing the narrow high-$\kappa$ valley |
| 9 | `gauss-newton-approximation.png` | Three-panel: full Hessian $H$, Gauss-Newton approximation $J^T J$, and difference $H - J^T J$, for a nonlinear least-squares problem |

---

## 10. Testing Checklist

### Build & route

- [ ] `pnpm build` succeeds with zero errors
- [ ] Page renders at `/topics/hessian`
- [ ] "Intermediate" difficulty badge is styled correctly (yellow/amber)
- [ ] `hessian` appears under the Multivariable Differential Calculus track on the curriculum page
- [ ] `gradient`, `jacobian` show as "published," `hessian` shows as "published," remaining Track 3 topic (`inverse-implicit`) shows as "coming soon"
- [ ] Pagefind indexes the new topic on rebuild

### Content

- [ ] All TheoremBlocks render LaTeX correctly (4 Definitions, 3 Theorems, 10 Examples, 4 Remarks, 2 Propositions, 3 Proofs)
- [ ] All 9 static images load from `public/images/topics/hessian/`
- [ ] All internal cross-references resolve (links to `jacobian`, `gradient`, `derivative`, `mean-value-taylor`, `epsilon-delta` work)
- [ ] All formalml.com links open in a new tab with `target="_blank" rel="noopener"`
- [ ] All forward references to unwritten topics use plain text + "(coming soon)"

### Visualizations

- [ ] All 4 viz components load on scroll (`client:visible`)
- [ ] `HessianEigenExplorer` click/drag updates Hessian and eigenvalues at selected point
- [ ] `HessianEigenExplorer` function preset dropdown changes the surface and contour plot
- [ ] `HessianEigenExplorer` eigenvector arrows update in real-time, colored by eigenvalue sign
- [ ] `HessianEigenExplorer` quadratic form panel renders pseudo-3D paraboloid
- [ ] `SaddlePointExplorer` detects and marks critical points with correct classification colors
- [ ] `SaddlePointExplorer` animation shows trajectory escaping saddle point
- [ ] `NewtonMethodExplorer` side-by-side comparison runs correctly
- [ ] `NewtonMethodExplorer` convergence curves display on log scale
- [ ] `NewtonMethodExplorer` quadratic model overlay renders at current Newton iterate
- [ ] `CurvatureHeatmapExplorer` heatmap renders for all quantity options
- [ ] `CurvatureHeatmapExplorer` click displays full Hessian analysis at point

### Cross-references

- [ ] Links to `jacobian` work (resolve to published page)
- [ ] `jacobian.mdx` updated: Hessian forward references are now live links (Section 8, any other mentions)
- [ ] `gradient.mdx` updated: Hessian forward references are now live links (if applicable)
- [ ] All other forward references use plain text + "(coming soon)"
- [ ] All formalml.com links open in a new tab with `target="_blank" rel="noopener"`

### Infrastructure

- [ ] `multivariate.ts` extended with new Hessian functions — compiles with no TypeScript errors
- [ ] All existing `multivariate.ts` functions unchanged (backward compatibility preserved)
- [ ] `hessian-data.ts` data module compiles
- [ ] No modifications to `limits.ts`, `differentiation.ts`, or `integration.ts`
- [ ] Page is responsive (viz components stack vertically on mobile)
- [ ] Curriculum graph shows `hessian` as "published" (not "coming soon")
- [ ] `jacobian → hessian` edge renders in the prerequisite graph

---

## 11. Build Order

1. **Extend `src/components/viz/shared/multivariate.ts`** — Add the new interfaces (`HessianResult`, `CriticalPointResult`, `NewtonStepResult`, `QuadraticFormResult`) and functions (`hessianMatrix`, `eigenvalues2x2`, `eigenvaluesSymmetric`, `classifyCriticalPoint`, `quadraticForm`, `newtonStep`, `conditionNumber`). Write console log tests to verify. `hessianMatrix` should internally use `numericalGradient` (existing) to compute gradients at shifted points and differ them. `eigenvalues2x2` should use the closed-form formula. Do not modify any existing functions or interfaces.
2. **Create `src/data/hessian-data.ts`** — Surface presets with analytical gradients and Hessians, Newton presets. Verify exports compile.
3. **Create `hessian.mdx`** with full frontmatter and all markdown/LaTeX content. Use `TheoremBlock` for all formal elements (4 definitions, 3 theorems, 2 propositions, 10 examples, 4 remarks, 3 proofs). No interactive components yet — just the prose and static images.
4. Copy notebook figures to `public/images/topics/hessian/` and verify they load in the MDX.
5. **Build `HessianEigenExplorer.tsx`** — the flagship component. Start with the contour plot, then add click-to-evaluate Hessian, then eigenvalue/eigenvector arrows, then the quadratic form companion panel. Uses `hessianMatrix`, `eigenvalues2x2`, `quadraticForm`, and `generateContours` (existing) from the shared module.
6. **Build `SaddlePointExplorer.tsx`** — Pseudo-3D surface with critical point detection and classification. Uses `classifyCriticalPoint`, `eigenvalues2x2`, and `project3D` (existing).
7. **Build `NewtonMethodExplorer.tsx`** — Side-by-side GD vs. Newton comparison. Uses `newtonStep`, `gradientDescent` (existing), `hessianMatrix`, `conditionNumber`.
8. **Build `CurvatureHeatmapExplorer.tsx`** — Heatmap of Hessian diagnostic quantities. Uses `hessianMatrix`, `eigenvalues2x2`, `conditionNumber`.
9. Embed all four components in the MDX at their appropriate section positions with `client:visible`.
10. **Update `jacobian.mdx`** — Change forward references to "The Hessian & Second-Order Analysis *(coming soon)*" to live links: `[The Hessian & Second-Order Analysis](/topics/hessian)`. Check Section 8 (ML connections subsection) and any other mentions.
11. **Update `gradient.mdx`** — Change any forward references to the Hessian topic from "(coming soon)" to live links (if applicable).
12. **Update curriculum graph data** — Change `hessian` status from `"planned"` to `"published"` in `curriculum-graph.json`. Verify `jacobian → hessian` and `hessian → inverse-implicit` edges exist.
13. **Update `curriculum.ts`** — Move `"The Hessian & Second-Order Analysis"` from `planned` to `published` in the `multivar-differential` track.
14. Run topic content and viz checklist (§10).
15. `pnpm build` — verify zero errors.
16. Commit and deploy.

---

## Appendix A: Key Differences from the Jacobian Brief (Topic 10)

1. **Third topic in the track, not the second.** The shared module `multivariate.ts` already contains both the gradient (Topic 9) and the Jacobian (Topic 10) functions. This topic extends it again with Hessian-specific functions. Backward compatibility with all existing functions — from both Topic 9 and Topic 10 — is mandatory.
2. **Return to scalar-valued functions.** Topic 10 generalized from $f: \mathbb{R}^n \to \mathbb{R}$ to $f: \mathbb{R}^n \to \mathbb{R}^m$ (vector-valued). The Hessian takes us back to $f: \mathbb{R}^n \to \mathbb{R}$ (scalar-valued) — but now we differentiate twice. The Jacobian of $\nabla f: \mathbb{R}^n \to \mathbb{R}^n$ gives the $n \times n$ Hessian. The concept is: the *first* derivative of a scalar function is a vector (the gradient), the *second* derivative is a matrix (the Hessian), and the Hessian is the Jacobian of the gradient.
3. **Eigenvalue analysis is the new core skill.** Topics 9–10 used linear algebra only for matrix-vector products and determinants. This topic requires eigenvalue decomposition — the eigenvalues of $H_f$ determine the classification, the condition number, and the convergence rate. The closed-form $2 \times 2$ eigenvalue formula is sufficient for all visualizations, but the mathematical exposition covers the general $n \times n$ case.
4. **The ML connection shifts from "what" to "why."** In Topics 9–10, the ML connections were about *what* the gradient/Jacobian *is* in ML (gradient descent, backpropagation). In this topic, the ML connection is about *why* things work (or don't work): why GD zigzags (ill-conditioning), why saddle points are a bigger problem than local minima (Hessian spectrum), why adaptive optimizers help (implicit Hessian approximation). The connection is diagnostic rather than constructive.
5. **The visualizations emphasize classification and comparison.** Unlike the grid-deformation metaphor of Topic 10, the Hessian visualizations are about *classifying* points (min/max/saddle) and *comparing* algorithms (GD vs. Newton). The flagship `HessianEigenExplorer` makes eigenvalue signs visible through color coding, and `NewtonMethodExplorer` makes convergence rate differences visible through side-by-side trajectories.
6. **The proofs are shorter, but the analysis is deeper.** The chain rule proof in Topic 10 was the longest proof in the curriculum so far. The Hessian topic has shorter proofs (Clairaut via the MVT, second-derivative test via Taylor), but the *analysis* — eigenvalue classification, condition number interpretation, Newton convergence — requires more conceptual depth. The reader is doing less proof-following and more mathematical reasoning.

---

## Appendix B: Formal Element Inventory

| Type | # | Title |
|------|---|-------|
| Definition | 1 | Second-Order Partial Derivative |
| Definition | 2 | The Hessian Matrix |
| Definition | 3 | Positive Definite, Negative Definite, Indefinite |
| Definition | 4 | Saddle Point |
| Theorem | 1 | Clairaut's Theorem (Symmetry of Mixed Partials) |
| Theorem | 2 | The Second Derivative Test (Multivariable) |
| Theorem | 3 | Second-Order Taylor Expansion |
| Proposition | 1 | Hessian is the Jacobian of the Gradient |
| Proposition | 2 | Eigenvalue Criterion for Definiteness |
| Example | 1 | Second-order partials of $f(x,y) = x^2 y + \sin(xy)$ |
| Example | 2 | Hessian of a paraboloid $f(x,y) = x^2 + 4y^2$ |
| Example | 3 | Hessian of a saddle function $f(x,y) = x^2 - y^2$ |
| Example | 4 | Hessian of a neural network loss |
| Example | 5 | Critical point classification: $f(x,y) = x^4 + y^4 - 2x^2 - 2y^2 + 1$ |
| Example | 6 | Quadratic approximation of $e^{x+y}$ |
| Example | 7 | Curvature of the elliptic paraboloid |
| Example | 8 | The monkey saddle $f(x,y) = x^3 - 3xy^2$ |
| Example | 9 | Newton's method derivation |
| Example | 10 | Newton on Rosenbrock |
| Remark | 1 | From second derivative to Hessian matrix |
| Remark | 2 | When the second derivative test is inconclusive |
| Remark | 3 | The condition number and optimization |
| Remark | 4 | Newton's method can fail |
| Proof | — | 3 proofs total (Theorem 1, Theorem 2 sketch, Proposition 1) |

---

*Brief version: v1 | Created: 2026-04-02 | Author: Jonathan Rocha*  
*Reference notebook: `notebooks/hessian/11_hessian_second_order.ipynb`*  
*Reference doc: `docs/plans/formalcalculus-handoff-reference.md`*
