# Claude Code Handoff Brief: Inverse & Implicit Function Theorems

**Project:** formalCalculus — [formalcalculus.com](https://www.formalcalculus.com)  
**Repo:** `github.com/jonx0037/formalCalculus`  
**Stack:** Astro 6 · React 19 · MDX · Tailwind CSS 4 · D3.js 7 · KaTeX · Vercel  
**Package Manager:** pnpm  
**Status:** Ready for implementation  
**Reference Notebook:** `notebooks/inverse-implicit/12_inverse_implicit.ipynb`  
**Reference Doc:** `docs/plans/formalcalculus-handoff-reference.md`

---

## 1. Objective

Add a new topic page **"Inverse & Implicit Function Theorems"** as the **fourth and final topic in the Multivariable Differential Calculus track** on formalcalculus.com.

1. This is **topic 12 of 32** and the **twelfth topic published** on formalcalculus.com. All four topics in the Limits & Continuity track (`sequences-limits`, `epsilon-delta`, `completeness-compactness`, `uniform-convergence`), all four topics in the Single-Variable Calculus track (`derivative`, `mean-value-taylor`, `riemann-integral`, `improper-integrals`), and the first three topics in the Multivariable Differential Calculus track (`gradient`, `jacobian`, `hessian`) are deployed and live. **This topic completes the Multivariable Differential Calculus track.**
2. **Prerequisites:** `hessian`. The direct prerequisite chain is `gradient → jacobian → hessian → inverse-implicit`. The Inverse Function Theorem requires det $J_f(a) \neq 0$ — the Jacobian matrix and its determinant from Topic 10 are the central objects. The Implicit Function Theorem uses the gradient of constraint functions (Topic 9) and the Hessian (Topic 11) for second-order analysis of constraint surfaces near critical points. Through the prerequisite chain, the reader has the full first- and second-order multivariable differential toolkit.
3. **Difficulty: advanced.** This is the **first advanced-difficulty topic** in formalCalculus. The reader has mastered partial derivatives, the gradient, the Jacobian, and the Hessian across Topics 9–11. The conceptual leap here is from *computation* to *existence*: the IFT and ImFT are existence theorems that tell you *when* something is guaranteed to work, not just *how* to compute it. The proof of the IFT via the contraction mapping principle is the most sophisticated argument in Track 3. The reader is expected to follow a proof that combines the completeness of $\mathbb{R}^n$ (a metric space concept from Track 1), the Jacobian as a linear map (Topic 10), and the iterative convergence framework (contraction mapping). The Implicit Function Theorem proof is derived from the IFT, which is a powerful technique that the reader may be seeing for the first time.
4. **Completes the Multivariable Differential Calculus track.** After this topic, all four topics in Track 3 are published: `gradient → jacobian → hessian → inverse-implicit`. The curriculum moves to Track 4 (Multivariable Integral Calculus) or Track 5 (Sequences, Series & Approximation) depending on scheduling priorities.
5. **Downstream within formalCalculus:**
   - `change-of-variables` (direct) — The change of variables formula $\int_U f(x)\,dx = \int_V f(\varphi(v)) |\det J_\varphi(v)|\,dv$ requires $\varphi$ to be a local diffeomorphism — i.e., locally invertible with a $C^1$ inverse. The IFT guarantees this when $\det J_\varphi \neq 0$.
   - `line-integrals` (indirect) — Conservative fields are characterized by exact differential forms. The Implicit Function Theorem provides the local structure of level sets that path integrals compute along.
   - `first-order-odes` (indirect) — The Picard-Lindelöf existence theorem uses the contraction mapping principle — the same proof technique as the IFT. The reader who understands the IFT proof will recognize the Picard iteration as the same argument in a function space.
   - `metric-spaces` (indirect) — The contraction mapping theorem is stated here for $\mathbb{R}^n$; the general version in metric/Banach spaces (Track 8) is the abstract framework behind both the IFT and ODE existence theorems.
   - `inverse-function-theorem` ↔ `calculus-of-variations` (indirect) — The Euler-Lagrange equation uses implicit differentiation on the variation functional.
6. **Forward links to formalml.com:**
   - `gradient-descent` — The IFT guarantees that gradient descent converges locally near a non-degenerate minimum: the loss function's gradient map $\nabla L: \mathbb{R}^n \to \mathbb{R}^n$ is locally invertible near $\theta^*$ when $H_L(\theta^*) = J(\nabla L)(\theta^*)$ is non-singular. This is the theoretical justification for local convergence guarantees.
   - `smooth-manifolds` — The Implicit Function Theorem is the *definition* of a smooth manifold in disguise: a level set $F^{-1}(c)$ is a smooth manifold of dimension $n - m$ exactly when $J_F$ has rank $m$ everywhere on the level set. This is the regular value theorem. Constraint surfaces in ML (e.g., the Stiefel manifold of orthogonal matrices, the probability simplex) are smooth manifolds via the ImFT.
   - `information-geometry` — The statistical manifold of a parametric family $\{p_\theta\}$ is locally diffeomorphic to $\mathbb{R}^n$ via the IFT when the Fisher information matrix (= expected Hessian of negative log-likelihood) is non-singular. Reparametrization invariance — a central concept in information geometry — relies on the IFT to guarantee that parameter transformations are locally invertible.
7. This topic **extends** the shared utility module `multivariate.ts` (created by Topic 9, extended by Topics 10 and 11) with `inverseJacobianApprox`, `implicitFunctionSlice`, `newtonMethodMultivariate`, `contractionIteration`, and `lagrangeMultiplier`. All existing functions in `multivariate.ts` remain unchanged. **This is the final extension of `multivariate.ts` for Track 3.** The module should be stable after this topic.

---

## 2. MDX File

### Location

```
src/content/topics/inverse-implicit.mdx
```

### Frontmatter

```yaml
---
title: "Inverse & Implicit Function Theorems"
subtitle: "When can you locally invert a function? When can you solve F(x, y) = 0 for y?"
status: "published"
difficulty: "advanced"
prerequisites:
  - "hessian"
tags:
  - "calculus"
  - "multivariable"
  - "inverse-function-theorem"
  - "implicit-function-theorem"
  - "manifolds"
  - "lagrange-multipliers"
domain: "multivar-differential"
videoId: null
notebookPath: "notebooks/inverse-implicit/12_inverse_implicit.ipynb"
githubUrl: "https://github.com/jonx0037/formalCalculus/blob/main/src/content/topics/inverse-implicit.mdx"
datePublished: 2026-04-15
estimatedReadTime: 45
abstract: "The Inverse Function Theorem and the Implicit Function Theorem are the two great existence theorems of multivariable calculus. The IFT tells you when a differentiable function is locally invertible: if the Jacobian matrix is non-singular at a point, the function has a smooth local inverse. The ImFT tells you when a level set F(x, y) = 0 can be locally described as the graph of a function y = g(x): when the partial Jacobian with respect to y is invertible. Together, they provide the rigorous foundation for constraint optimization (Lagrange multipliers), the definition of smooth manifolds, change of variables in integration, and the local structure of parameter spaces in machine learning."
formalmlConnections:
  - topic: "gradient-descent"
    site: "formalml"
    relationship: "The IFT guarantees local convergence of gradient descent near non-degenerate minima: the gradient map is locally invertible when the Hessian is non-singular, ensuring that small perturbations from the optimum produce proportional gradient signals."
  - topic: "smooth-manifolds"
    site: "formalml"
    relationship: "The Implicit Function Theorem is the foundational tool for proving that level sets are smooth manifolds. The regular value theorem — that F⁻¹(c) is a manifold when J_F has full rank on the level set — is a direct consequence of the ImFT."
  - topic: "information-geometry"
    site: "formalml"
    relationship: "The statistical manifold of a parametric family is locally diffeomorphic to ℝⁿ via the IFT when the Fisher information matrix is non-singular. Reparametrization invariance relies on the IFT to guarantee that coordinate changes on the parameter space are locally invertible."
connections:
  - topic: "hessian"
    relationship: "The Hessian H_f(a) = J(∇f)(a) is the Jacobian of the gradient map. Non-singularity of the Hessian at a critical point — the condition that makes the second derivative test conclusive — is exactly the IFT condition applied to ∇f: the gradient map is locally invertible, so the critical point is isolated."
  - topic: "jacobian"
    relationship: "The Jacobian matrix J_f(a) is the central object of both theorems. The IFT hypothesis det J_f(a) ≠ 0 says the linear approximation is invertible; the conclusion is that the nonlinear function itself is locally invertible. The chain rule J_{f⁻¹}(f(a)) · J_f(a) = I gives the derivative of the inverse."
  - topic: "gradient"
    relationship: "For scalar-valued functions f: ℝⁿ → ℝ, the gradient ∇f is the constraint surface normal. The Implicit Function Theorem applied to the level set f(x) = c recovers the geometry of gradient orthogonality to contours developed in Topic 9."
  - topic: "completeness-compactness"
    relationship: "The contraction mapping proof of the IFT uses completeness of ℝⁿ as a metric space: Cauchy sequences converge, so the iterative scheme converges to a fixed point. This is the first time completeness is used in a multivariable context — connecting Track 1 foundations to Track 3 existence theorems."
  - topic: "epsilon-delta"
    relationship: "The IFT is an existence theorem — its proof requires careful ε-δ arguments to control the size of neighborhoods where invertibility holds. The continuity of J_f (the C¹ hypothesis) is essential: it ensures that the Jacobian stays invertible in a neighborhood, not just at a single point."
references:
  - type: "book"
    title: "Analysis on Manifolds"
    authors: "Munkres"
    year: 1991
    note: "Chapter 7 develops the Inverse Function Theorem and the Implicit Function Theorem with careful attention to the neighborhoods where invertibility holds — the primary reference for our treatment"
  - type: "book"
    title: "Calculus on Manifolds"
    authors: "Spivak"
    year: 1965
    note: "Chapter 2 proves the IFT via contraction mapping and derives the ImFT as a corollary — the cleanest modern treatment and our model for the proof structure"
  - type: "book"
    title: "Principles of Mathematical Analysis"
    authors: "Rudin"
    year: 1976
    note: "Chapter 9, Theorems 9.24 and 9.28 — the IFT and ImFT in Rudin's characteristically concise style. Useful for the contraction mapping setup"
  - type: "book"
    title: "Introduction to Smooth Manifolds"
    authors: "Lee"
    year: 2013
    note: "Chapter 4 uses the IFT/ImFT to define submersions, immersions, and the regular value theorem — the direct bridge to the smooth manifolds topic on formalml.com"
  - type: "book"
    title: "Numerical Optimization"
    authors: "Nocedal & Wright"
    year: 2006
    note: "Chapter 12 on constrained optimization via Lagrange multipliers — the practical application of the ImFT in optimization"
  - type: "paper"
    title: "Neural Ordinary Differential Equations"
    authors: "Chen, Rubanova, Bettencourt & Duvenaud"
    year: 2018
    url: "https://arxiv.org/abs/1806.07366"
    note: "Neural ODEs use the IFT implicitly: the flow map of an ODE is locally invertible when the vector field is smooth, and the adjoint method computes gradients through this inverse"
  - type: "paper"
    title: "Density Estimation using Real-NVP"
    authors: "Dinh, Sohl-Dickstein & Bengio"
    year: 2017
    url: "https://arxiv.org/abs/1605.08803"
    note: "Normalizing flows construct diffeomorphisms with tractable Jacobian determinants — the IFT guarantees invertibility at every point in the flow"
  - type: "paper"
    title: "Deep Equilibrium Models"
    authors: "Bai, Kolter & Koltun"
    year: 2019
    url: "https://arxiv.org/abs/1909.01377"
    note: "DEQs find fixed points of implicit layers and differentiate through them via the ImFT — the canonical ML application of implicit differentiation"
---
```

---

## 3. Content Outline

### Section 1: Overview & Motivation

**Opening example:** You've trained a normalizing flow — a neural network that maps a simple distribution (Gaussian) to a complex one (your data distribution) through a chain of invertible transformations. Each layer $f_k$ must be invertible, and the density formula requires computing $|\det J_{f_k}|$. But how do you *know* the layers are invertible? The Inverse Function Theorem answers this: if $\det J_{f_k}(x) \neq 0$ everywhere, each layer is a local diffeomorphism. And when your model implicitly defines a function — "find $y$ such that $F(x, y) = 0$" — the Implicit Function Theorem tells you when $y$ depends smoothly on $x$, and how to differentiate through the implicit equation.

These are *existence* theorems. They don't compute the inverse or the implicit function — they guarantee that one exists, is smooth, and can be differentiated. The machinery for computing was built in Topics 9–11. This topic provides the theoretical guarantees that legitimize that machinery.

**Tone:** This is the capstone of the multivariable differential track. The reader has all the tools; now we show them the deep structure. Emphasize the shift from computation to existence.

No TheoremBlocks. No viz. 2–3 paragraphs.

### Section 2: Local Invertibility — The Geometric Picture

**Geometric intuition before formalism.** A $C^1$ function $f: \mathbb{R}^2 \to \mathbb{R}^2$ transforms the plane — stretching, rotating, warping. Near a point $a$, the Jacobian $J_f(a)$ is the best linear approximation. If $J_f(a)$ is invertible (det $\neq 0$), the linear approximation doesn't collapse any direction — it maps small disks to small (possibly stretched) ellipses. The IFT says the nonlinear function inherits this behavior *locally*.

**Counterexample:** The polar coordinate map $(r, \theta) \mapsto (r\cos\theta, r\sin\theta)$ has $\det J = r$. At $r = 0$, the Jacobian is singular, and the map is not locally invertible (every angle maps to the origin). At any $r > 0$, the IFT guarantees a local inverse — but no *global* inverse exists because the map is $2\pi$-periodic in $\theta$.

**Static image:** `local-invertibility-geometry.png` from the notebook.

**TheoremBlocks:**

- **Definition 1: Local Diffeomorphism** — A $C^1$ function $f: U \to \mathbb{R}^n$ (where $U \subseteq \mathbb{R}^n$ is open) is a *local diffeomorphism at $a \in U$* if there exist open neighborhoods $V \ni a$ and $W \ni f(a)$ such that $f|_V: V \to W$ is a bijection and $(f|_V)^{-1}: W \to V$ is also $C^1$.
- **Example 1: Polar coordinates as a local diffeomorphism** — The map $\Phi(r,\theta) = (r\cos\theta, r\sin\theta)$ with $J_\Phi = \begin{pmatrix} \cos\theta & -r\sin\theta \\ \sin\theta & r\cos\theta \end{pmatrix}$ and $\det J_\Phi = r$. Local diffeomorphism for $r > 0$; singular at $r = 0$.
- **Example 2: The exponential map in $\mathbb{R}^2$** — $f(x,y) = (e^x\cos y, e^x\sin y)$. Jacobian determinant $e^{2x} > 0$ everywhere, so locally invertible at every point. Not globally injective: $f(x, y) = f(x, y + 2\pi)$.
- **Remark 1: Local vs. global invertibility** — The IFT provides only *local* guarantees. Global invertibility requires additional structure (e.g., properness, simple connectedness of the domain). In ML, normalizing flow architectures are specifically designed to be *globally* invertible — the IFT alone is not sufficient; architectural constraints (e.g., coupling layers, autoregressive structure) ensure global bijectivity.

### Section 3: The Inverse Function Theorem

**The statement, then the proof.** This is the centerpiece of the topic.

**TheoremBlocks:**

- **Theorem 1: The Inverse Function Theorem** — Let $f: U \to \mathbb{R}^n$ be $C^1$ on an open set $U \subseteq \mathbb{R}^n$, and let $a \in U$ with $\det J_f(a) \neq 0$. Then:
  1. There exist open neighborhoods $V \ni a$ and $W \ni f(a)$ such that $f: V \to W$ is a bijection.
  2. The inverse $f^{-1}: W \to V$ is $C^1$.
  3. For every $y \in W$, $J_{f^{-1}}(y) = [J_f(f^{-1}(y))]^{-1}$.
- **Proof of Theorem 1** — Full proof via the contraction mapping principle. We need to construct the inverse. Fix $y \in \mathbb{R}^n$ near $b = f(a)$ and solve $f(x) = y$ for $x$. Define $T_y(x) = x + J_f(a)^{-1}(y - f(x))$. This is a fixed-point equation: $T_y(x) = x$ iff $f(x) = y$. 
  
  *Step 1:* Show $T_y$ is a contraction near $a$. Since $J_f$ is continuous and $J_f(a)$ is invertible, for $x$ close enough to $a$, $\|J_{T_y}(x)\| = \|I - J_f(a)^{-1} J_f(x)\| \leq \frac{1}{2}$. By the Mean Value Inequality, $\|T_y(x_1) - T_y(x_2)\| \leq \frac{1}{2}\|x_1 - x_2\|$.

  *Step 2:* Show $T_y$ maps a closed ball $\overline{B}(a, r)$ to itself for $y$ close enough to $b$.

  *Step 3:* By the Contraction Mapping Theorem (Theorem 2 below), $T_y$ has a unique fixed point $x = g(y)$. This defines $g = f^{-1}$.

  *Step 4:* Show $g$ is $C^1$. Differentiate $f(g(y)) = y$ using the chain rule: $J_f(g(y)) \cdot J_g(y) = I$, so $J_g(y) = [J_f(g(y))]^{-1}$. The right side is continuous (composition of $C^1$ functions with matrix inversion, which is continuous on the set of invertible matrices), so $g$ is $C^1$.

  Expand every step. This is the most important piece of evidence on the track. No hand-waving on the contraction constant, the ball radius, or the $C^1$ regularity argument.
- **Theorem 2: Contraction Mapping Theorem (Banach Fixed-Point Theorem)** — Let $(X, d)$ be a complete metric space and $T: X \to X$ a contraction: $d(T(x_1), T(x_2)) \leq \lambda \, d(x_1, x_2)$ for some $\lambda \in [0,1)$ and all $x_1, x_2 \in X$. Then $T$ has a unique fixed point $x^*$, and for any $x_0 \in X$, the sequence $x_{k+1} = T(x_k)$ converges to $x^*$ with $d(x_k, x^*) \leq \frac{\lambda^k}{1 - \lambda} d(x_0, T(x_0))$.
- **Proof of Theorem 2** — Full proof. Show the iterates form a Cauchy sequence using the geometric series bound. The limit exists by completeness. Uniqueness by the contraction inequality. Include the convergence rate bound — this is practical, not just theoretical. This is the first time completeness is used in a multivariable context, connecting directly to Topic 3 (completeness of $\mathbb{R}$). Remark that $\overline{B}(a,r) \subset \mathbb{R}^n$ with the Euclidean metric is a complete metric space.
- **Example 3: Computing the inverse Jacobian** — For the map $f(x,y) = (x^2 - y^2, 2xy)$ (complex squaring), compute $J_f$, verify $\det J_f = 4(x^2 + y^2) \neq 0$ away from the origin, and compute $J_{f^{-1}}(f(a)) = [J_f(a)]^{-1}$ explicitly at $a = (1, 1)$.
- **Remark 2: The $C^k$ version** — If $f$ is $C^k$ (not just $C^1$), then the local inverse $f^{-1}$ is also $C^k$. In particular, if $f$ is smooth ($C^\infty$), the inverse is smooth. This is important for differential geometry and for normalizing flows, where smoothness of the inverse is needed for the density formula.

**Interactive visualization:** `<InverseMapExplorer client:visible />` — see §4.

### Section 4: The Derivative of the Inverse

**Computing $J_{f^{-1}}$ in practice.** The IFT gives the formula $J_{f^{-1}}(y) = [J_f(f^{-1}(y))]^{-1}$, but we need to unpack what this means computationally.

**TheoremBlocks:**

- **Proposition 1: The Inverse Derivative Formula** — If $f: V \to W$ is a $C^1$ diffeomorphism, then for all $y \in W$: $$J_{f^{-1}}(y) = [J_f(f^{-1}(y))]^{-1}.$$ In components: if $f = (f_1, \ldots, f_n)$ and $f^{-1} = (g_1, \ldots, g_n)$, then $\frac{\partial g_i}{\partial y_j}(y) = \left([J_f(g(y))]^{-1}\right)_{ij}$.
- **Proof of Proposition 1** — Differentiate $f(f^{-1}(y)) = y$ via the chain rule (Topic 10). Both sides differentiate to give $J_f(f^{-1}(y)) \cdot J_{f^{-1}}(y) = I_n$. Since $\det J_f(f^{-1}(y)) \neq 0$ (by the IFT), $J_f(f^{-1}(y))$ is invertible, and we solve for $J_{f^{-1}}(y)$.
- **Example 4: Inverse derivative for polar coordinates** — Given $\Phi(r, \theta) = (r\cos\theta, r\sin\theta)$, compute $J_{\Phi^{-1}}$ at a point using the formula. Verify against the direct computation from $\Phi^{-1}(x,y) = (\sqrt{x^2+y^2}, \arctan(y/x))$.
- **Example 5: Inverse derivative in a normalizing flow layer** — For an affine coupling layer $f(x_1, x_2) = (x_1, x_2 \cdot \exp(s(x_1)) + t(x_1))$, the Jacobian is lower-triangular with $\det J = \exp(s(x_1))$. The inverse $f^{-1}(y_1, y_2) = (y_1, (y_2 - t(y_1)) \cdot \exp(-s(y_1)))$ has $J_{f^{-1}} = [J_f]^{-1}$. The triangular structure makes both the forward and inverse Jacobians cheap to compute — this is by design, not by accident.

**Static image:** `local-inverse-computation.png` from the notebook.

### Section 5: The Implicit Function Theorem — From Equations to Graphs

**The second great theorem.** The ImFT answers: given $F(x, y) = 0$, when can you solve for $y = g(x)$?

**Geometric intuition first:** The equation $F(x,y) = 0$ defines a curve in $\mathbb{R}^2$ (or a surface in higher dimensions). At a point $(a, b)$ on this curve, the gradient $\nabla F(a,b)$ is normal to the curve. If $\frac{\partial F}{\partial y}(a,b) \neq 0$, the curve is not vertical at $(a,b)$, so locally it can be described as $y = g(x)$.

**TheoremBlocks:**

- **Definition 2: Implicit Equation / Level Set** — Given $F: \mathbb{R}^{n+m} \to \mathbb{R}^m$, the *level set* $F^{-1}(0) = \{(x,y) \in \mathbb{R}^n \times \mathbb{R}^m : F(x,y) = 0\}$ is the set of solutions to the *implicit equation* $F(x,y) = 0$. We write $x = (x_1, \ldots, x_n) \in \mathbb{R}^n$ for the "free" variables and $y = (y_1, \ldots, y_m) \in \mathbb{R}^m$ for the "dependent" variables.
- **Definition 3: Partial Jacobians** — For $F: \mathbb{R}^n \times \mathbb{R}^m \to \mathbb{R}^m$, define the *partial Jacobian with respect to $x$* as the $m \times n$ matrix $D_x F(a,b)_{ij} = \frac{\partial F_i}{\partial x_j}(a,b)$ and the *partial Jacobian with respect to $y$* as the $m \times m$ matrix $D_y F(a,b)_{ij} = \frac{\partial F_i}{\partial y_j}(a,b)$. The full Jacobian is $J_F = \begin{pmatrix} D_x F & D_y F \end{pmatrix}$.
- **Theorem 3: The Implicit Function Theorem** — Let $F: U \to \mathbb{R}^m$ be $C^1$ on an open set $U \subseteq \mathbb{R}^n \times \mathbb{R}^m$. Let $(a,b) \in U$ with $F(a,b) = 0$ and $\det D_y F(a,b) \neq 0$. Then:
  1. There exist open neighborhoods $V_x \ni a$ (in $\mathbb{R}^n$) and $V_y \ni b$ (in $\mathbb{R}^m$) such that for each $x \in V_x$, there is a unique $y = g(x) \in V_y$ with $F(x, g(x)) = 0$.
  2. The function $g: V_x \to V_y$ is $C^1$.
  3. The derivative of $g$ is given by: $J_g(x) = -[D_y F(x, g(x))]^{-1} \cdot D_x F(x, g(x))$.
- **Proof of Theorem 3 (from the IFT)** — Define $\Phi: \mathbb{R}^n \times \mathbb{R}^m \to \mathbb{R}^n \times \mathbb{R}^m$ by $\Phi(x,y) = (x, F(x,y))$. Compute $J_\Phi(a,b) = \begin{pmatrix} I_n & 0 \\ D_x F & D_y F \end{pmatrix}$, so $\det J_\Phi(a,b) = \det D_y F(a,b) \neq 0$. By the IFT (Theorem 1), $\Phi$ is locally invertible. Since $\Phi^{-1}(x, 0)$ gives the unique $y$ with $F(x,y) = 0$, we set $g(x) = \pi_y(\Phi^{-1}(x, 0))$. Regularity and the derivative formula follow from differentiating $F(x, g(x)) = 0$ via the chain rule: $D_x F + D_y F \cdot J_g = 0$.
- **Example 6: The unit circle** — $F(x,y) = x^2 + y^2 - 1 = 0$. We have $\frac{\partial F}{\partial y} = 2y$. The ImFT applies wherever $y \neq 0$: near $(a, b)$ with $b > 0$, $g(x) = \sqrt{1 - x^2}$; near $(a, b)$ with $b < 0$, $g(x) = -\sqrt{1 - x^2}$. At $(1, 0)$ and $(-1, 0)$, $\frac{\partial F}{\partial y} = 0$ — the circle has vertical tangents, and no function $y = g(x)$ exists locally.
- **Example 7: A 2D system** — $F_1(x, y_1, y_2) = xy_1 + e^{y_2} - 1$, $F_2(x, y_1, y_2) = y_1^2 + xy_2 - 1$. Show the computation of $D_y F$, verify its determinant is nonzero at a specific point, and compute $J_g(x)$.
- **Remark 3: The ImFT as a corollary of the IFT** — The derivation in the proof shows that the ImFT is logically subordinate to the IFT: it follows by applying the IFT to the augmented map $\Phi$. This is typical in analysis — a seemingly different theorem is often a consequence of the same underlying principle.

**Interactive visualization:** `<ImplicitCurveExplorer client:visible />` — see §4.
**Static image:** `implicit-curves.png` from the notebook.

### Section 6: Implicit Differentiation — The Formula in Action

**Computing $g'(x)$ without knowing $g$.** The power of implicit differentiation: you differentiate the constraint $F(x, g(x)) = 0$ without solving for $g$ explicitly. This is the theoretical foundation of implicit differentiation in ML (DEQs, implicit layers).

**TheoremBlocks:**

- **Proposition 2: Implicit Differentiation Formula** — Under the hypotheses of Theorem 3, $$g'(x) = -\left[\frac{\partial F}{\partial y}(x, g(x))\right]^{-1} \cdot \frac{\partial F}{\partial x}(x, g(x)).$$ In the scalar case ($n = m = 1$): $g'(x) = -\frac{F_x(x, g(x))}{F_y(x, g(x))}$.
- **Example 8: Implicit differentiation on the circle** — $F(x,y) = x^2 + y^2 - 1$. Then $g'(x) = -F_x/F_y = -2x/(2y) = -x/y$. Verify: $g(x) = \sqrt{1-x^2}$ gives $g'(x) = -x/\sqrt{1-x^2} = -x/y$. ✓
- **Example 9: Tangent to an elliptic curve** — $F(x,y) = y^2 - x^3 + x = 0$. Compute $g'(x) = (3x^2 - 1)/(2y)$. Find the tangent line at $(0, 0)$ — but $F_y(0,0) = 0$, so the ImFT does not apply! The curve has a singular point (node) at the origin. This illustrates the boundary of the theorem's applicability.
- **Remark 4: Second-order implicit differentiation** — Differentiating $g'(x) = -F_x/F_y$ again gives $g''(x)$ in terms of second-order partials of $F$ — connecting to the Hessian from Topic 11. The second-order structure of the constraint surface near a point is determined by the Hessian of $F$ restricted to the tangent space of the level set.

**Static image:** `implicit-differentiation-higher-dim.png` from the notebook.

### Section 7: Constraint Optimization & Lagrange Multipliers

**The ImFT justifies the method of Lagrange multipliers.** This is the most directly applicable section for ML practitioners: constrained optimization appears in regularized learning, maximum entropy models, and optimization on manifolds.

**TheoremBlocks:**

- **Definition 4: Constrained Optimization Problem** — Minimize $f(x)$ subject to $g(x) = c$, where $f: \mathbb{R}^n \to \mathbb{R}$ is the objective and $g: \mathbb{R}^n \to \mathbb{R}^m$ is the constraint function, with $m < n$.
- **Theorem 4: Lagrange Multiplier Necessary Condition** — Let $f, g_1, \ldots, g_m: \mathbb{R}^n \to \mathbb{R}$ be $C^1$. If $x^*$ is a local minimizer of $f$ subject to $g_i(x^*) = c_i$ for $i = 1, \ldots, m$, and if the gradients $\nabla g_1(x^*), \ldots, \nabla g_m(x^*)$ are linearly independent (the *constraint qualification*), then there exist scalars $\lambda_1, \ldots, \lambda_m$ (the *Lagrange multipliers*) such that $\nabla f(x^*) = \lambda_1 \nabla g_1(x^*) + \cdots + \lambda_m \nabla g_m(x^*)$.
- **Proof of Theorem 4** — The constraint qualification $\nabla g_i$ linearly independent means $J_g(x^*)$ has rank $m$, so the ImFT applies. By the ImFT, locally we can express $m$ of the variables as functions of the remaining $n - m$: the constraint surface is an $(n-m)$-dimensional manifold. Restricting $f$ to this manifold and setting its gradient to zero gives the Lagrange condition. Expand the proof with the elimination of variables and the chain rule.
- **Example 10: Maximum entropy on the probability simplex** — Maximize $H(p) = -\sum_{i=1}^k p_i \log p_i$ subject to $\sum_{i=1}^k p_i = 1$. One constraint ($m=1$), $n = k$ variables. The Lagrange condition gives $-\log p_i - 1 = \lambda$ for all $i$, so $p_i = e^{-(1+\lambda)}$ — the uniform distribution maximizes entropy. Connect to maximum entropy models in ML.
- **Example 11: Nearest point on a constraint surface** — Minimize $\|x - x_0\|^2$ subject to $g(x) = 0$. The Lagrange condition $2(x - x_0) = \lambda \nabla g(x)$ says the line from $x_0$ to $x^*$ is normal to the constraint surface — geometrically obvious, rigorously justified by the ImFT.

**Interactive visualization:** `<LagrangeMultiplierExplorer client:visible />` — see §4.
**Static image:** `lagrange-multipliers.png` from the notebook.

### Section 8: The Contraction Mapping Principle — The Engine Behind the IFT

**The proof technique deserves its own section.** The contraction mapping principle is the unifying thread connecting the IFT, the Picard-Lindelöf ODE existence theorem, and Newton's method convergence. This section develops the principle as a standalone tool, building on the completeness foundations from Topic 3.

**TheoremBlocks:**

- **Definition 5: Contraction Mapping** — A function $T: X \to X$ on a metric space $(X, d)$ is a *contraction* (or *contraction mapping*) if there exists a constant $\lambda \in [0, 1)$ such that $d(T(x_1), T(x_2)) \leq \lambda \, d(x_1, x_2)$ for all $x_1, x_2 \in X$. The constant $\lambda$ is the *contraction factor*.
- **Remark 5: Newton's method as an approximate contraction** — Newton's method for $F(x) = 0$ defines $T(x) = x - J_F(x)^{-1} F(x)$. Near a simple root (where $J_F$ is invertible), $T$ is approximately a contraction with $\lambda \sim \|I - J_F(x^*)^{-1} J_F(x)\|$. The quadratic convergence of Newton's method (Topic 11, Example 9) is a consequence of $T$ being a contraction with $\lambda \sim \|x - x^*\|$ — the contraction factor itself shrinks as you approach the root.
- **Example 12: Fixed-point iteration** — Solve $x = \cos(x)$ by iterating $x_{k+1} = \cos(x_k)$. Since $|\cos'(x)| = |\sin(x)| \leq \sin(1) \approx 0.84 < 1$ on $[0, 1]$, the map is a contraction. Starting from $x_0 = 0.5$, the iterates converge to $x^* \approx 0.7391$.

**Interactive visualization:** `<ContractionMappingExplorer client:visible />` — see §4.
**Static image:** `contraction-mapping.png` from the notebook.

### Section 9: Connections to ML

**Three major connections:**

1. **Normalizing Flows & Invertible Neural Networks.** A normalizing flow is a composition $f = f_K \circ \cdots \circ f_1$ of invertible maps, each with a tractable Jacobian determinant. The density formula is $\log p_X(x) = \log p_Z(f(x)) + \sum_{k=1}^K \log |\det J_{f_k}(h_{k-1})|$. The IFT guarantees that each $f_k$ is locally invertible whenever $\det J_{f_k} \neq 0$ — but flow architectures go further, ensuring *global* invertibility by construction. The key architectural choices (coupling layers, autoregressive transforms, residual flows) are all designed to satisfy the IFT hypothesis *and* maintain computational tractability. Connect to Real-NVP (Dinh et al., 2017).

2. **Deep Equilibrium Models (DEQs) & Implicit Layers.** A DEQ finds $z^* = f_\theta(z^*, x)$ — a fixed point of an implicit equation. The ImFT guarantees: (a) the fixed point $z^*$ depends smoothly on parameters $\theta$ when $I - J_z f_\theta(z^*, x)$ is invertible, and (b) the derivative $\frac{\partial z^*}{\partial \theta}$ can be computed via implicit differentiation: differentiate $z^* - f_\theta(z^*, x) = 0$ to get $\frac{\partial z^*}{\partial \theta} = (I - J_z f)^{-1} \frac{\partial f}{\partial \theta}$. This is how DEQs backpropagate through infinite-depth networks without storing intermediate activations. Connect to Bai, Kolter & Koltun (2019).

3. **Constrained ML: Optimization on Manifolds.** Many ML objectives involve constraints: orthogonality constraints in recurrent networks ($W^T W = I$, optimization on the Stiefel manifold), probability simplex constraints in mixture models ($\sum p_i = 1$), and norm constraints in spectral normalization. The ImFT guarantees that these constraint sets are smooth manifolds (via the regular value theorem), and Lagrange multipliers provide the first-order optimality conditions. Projected gradient descent and Riemannian optimization methods are the practical tools; the ImFT is the theoretical justification.

**formalml.com forward links:**
- [Gradient Descent](https://formalml.com/topics/gradient-descent) → formalML — local convergence guarantees via the IFT.
- [Smooth Manifolds](https://formalml.com/topics/smooth-manifolds) → formalML — constraint surfaces are manifolds via the regular value theorem (ImFT).
- [Information Geometry](https://formalml.com/topics/information-geometry) → formalML — reparametrization invariance of the statistical manifold via the IFT.

### Section 10: Degenerate Cases — When the Jacobian Is Singular

**What happens at the boundary of the theorem?** When $\det J_f(a) = 0$, the IFT does not apply. Interesting phenomena occur: folds, cusps, and bifurcations. This section is a brief taste of singularity theory and bifurcation theory — both of which appear in the study of loss landscape geometry.

**TheoremBlocks:**

- **Definition 6: Critical Point of a Map** — A point $a$ is a *critical point* of $f: \mathbb{R}^n \to \mathbb{R}^n$ if $\det J_f(a) = 0$. The image $f(a)$ is a *critical value*. Points that are not critical are *regular points*, and their images are *regular values*.
- **Theorem 5: Regular Value Theorem (Preimage Theorem)** — Let $F: \mathbb{R}^{n+m} \to \mathbb{R}^m$ be $C^1$, and let $c \in \mathbb{R}^m$ be a *regular value*: for every $(x,y) \in F^{-1}(c)$, $J_F(x,y)$ has rank $m$. Then $F^{-1}(c)$ is a smooth $n$-dimensional manifold — locally the graph of a $C^1$ function by the ImFT.
- **Example 13: Fold catastrophe** — $f(x) = x^3 - tx$ for varying parameter $t$. The equation $f'(x) = 3x^2 - t = 0$ defines the fold curve where local extrema are created/destroyed. At $(x, t) = (0, 0)$, the function has a degenerate critical point ($f'(0) = 0$, $f''(0) = 0$). The ImFT applied to the gradient equation $\nabla_x L = 0$ fails precisely at bifurcation points — where the Hessian becomes singular.
- **Example 14: Loss landscape bifurcations in neural networks** — As network width or depth changes, the number and nature of critical points of the loss function can change — a phenomenon related to bifurcation theory. When eigenvalues of the Hessian cross zero, minima merge with saddle points (or split). This connects to the "loss of plasticity" phenomenon in continual learning and to the phase transitions observed during training.
- **Remark 6: The rank theorem and regular values** — The Regular Value Theorem is the doorway to differential topology. It says: if the Jacobian has full rank everywhere on a level set, that level set is a manifold. This is how smooth manifolds are *defined* in practice — via the ImFT. The leap from formalCalculus to formalML.com's [Smooth Manifolds](https://formalml.com/topics/smooth-manifolds) → formalML topic passes through this theorem.

**Static image:** `degenerate-bifurcation.png` from the notebook.

### Section 11: Computational Notes

**NumPy/SciPy implementations.** Brief code snippets (3–4 blocks):

1. `scipy.optimize.fsolve` for solving $F(x) = 0$ (uses a modified Newton method, which is the IFT's constructive content).
2. Computing the inverse Jacobian numerically: `np.linalg.inv(jacobian(f, x))` vs. solving the linear system `np.linalg.solve(J, I)`.
3. Implicit differentiation via `jax.custom_vjp` or `torch.autograd.Function` — the practical ML implementation of ImFT-based differentiation.
4. Numerical Lagrange multipliers via `scipy.optimize.minimize` with constraint dictionaries.

**Remark 7: Numerical invertibility vs. mathematical invertibility** — A matrix with $\det J \neq 0$ is mathematically invertible, but if $\det J$ is very small (the matrix is *nearly* singular), numerical inversion is ill-conditioned. The condition number $\kappa(J_f)$ (from Topic 11) quantifies this: large $\kappa$ means the local inverse is numerically unstable. In normalizing flows, this is why architectures are designed to keep $|\det J|$ bounded away from zero.

### Section 12: Connections & Further Reading

**Cross-reference table** summarizing where IFT/ImFT appear in the formalCalculus curriculum and forward into formalml.com. **Prerequisite DAG** showing this topic's position. Both follow the established pattern from Topics 5–11.

---

## 4. Visualizations

### 4.1 `InverseMapExplorer.tsx` — Flagship

- **What it visualizes:** Side-by-side panels: domain (left) and codomain (right) for a map $f: \mathbb{R}^2 \to \mathbb{R}^2$. A grid in the domain is drawn, along with its image under $f$ in the codomain. The user drags a point in the domain; the corresponding image point is shown in the codomain, along with the Jacobian matrix, its determinant, and the local inverse Jacobian.
- **User interactions:**
  - Click/drag a point in the domain panel to move it. The codomain panel updates in real time.
  - Dropdown to select function preset (polar, complex squaring, conformal exponential, shear).
  - Toggle: "Show grid lines" — draws a grid in the domain and its deformed image in the codomain (reusing the pattern from `JacobianGridExplorer`).
  - Toggle: "Show invertibility" — colors the domain by $|\det J_f|$: green where invertible, red at/near singular points.
  - "Zoom to singularity" button (for presets that have one) — zooms both panels to the neighborhood of a point where $\det J_f = 0$, showing the breakdown of local invertibility.
- **Data source:** `inverse-implicit-data.ts` presets + `multivariate.ts` shared module.
- **Panel layout:** Two equal panels side-by-side. Matrix display below showing $J_f$, $\det J_f$, and $[J_f]^{-1}$ (or "SINGULAR" when $\det = 0$).
- **Calculus-specific viz pattern:** Grid deformation (from Topic 10), extended with invertibility coloring.

### 4.2 `ImplicitCurveExplorer.tsx`

- **What it visualizes:** An implicit curve $F(x,y) = 0$ in the plane with a movable point on the curve. At this point, the tangent line (computed via the ImFT formula $g'(x) = -F_x/F_y$) is drawn, along with the gradient $\nabla F$ (normal to the curve) and the local graph $y = g(x)$.
- **User interactions:**
  - Click/drag along the curve to move the evaluation point.
  - Dropdown to select implicit curve preset: circle ($x^2 + y^2 - 1$), ellipse ($x^2/4 + y^2 - 1$), lemniscate ($((x^2+y^2)^2 - (x^2-y^2))$), folium of Descartes ($x^3 + y^3 - 3xy$).
  - Toggle: "Show local graph" — highlights the portion of the curve that can be described as $y = g(x)$ near the selected point.
  - Toggle: "Show $\nabla F$" — draws the gradient vector (normal to the curve) at the selected point.
  - Highlight singular points (where $F_y = 0$) with red markers — these are where the ImFT fails for $y = g(x)$.
- **Data source:** `inverse-implicit-data.ts` presets.
- **Panel layout:** Single panel. Info panel on the right or below showing $F_x$, $F_y$, $g'(x) = -F_x/F_y$, and tangent line equation.
- **Calculus-specific viz pattern:** Contour-level interaction, building on the contour + gradient pattern from Topic 9.

### 4.3 `LagrangeMultiplierExplorer.tsx`

- **What it visualizes:** Contour plot of an objective function $f(x,y)$ overlaid with a constraint curve $g(x,y) = c$. At the constrained optimum, the gradient $\nabla f$ is parallel to $\nabla g$ — the Lagrange condition. The user adjusts the constraint value $c$ and watches the optimum move along the constraint curve.
- **User interactions:**
  - Slider: constraint value $c$ — moves the constraint curve and the constrained optimum.
  - Dropdown: select objective/constraint preset: (1) minimize $x^2 + y^2$ on $x + y = 1$; (2) maximize $xy$ on $x^2 + y^2 = 1$; (3) maximize entropy $-(p \log p + (1-p) \log(1-p))$ on $p \in [0,1]$ (reduced to 1D but visualized in 2D for geometric clarity).
  - Toggle: "Show gradients" — draws $\nabla f$ (blue) and $\nabla g$ (red) at the constrained optimum, demonstrating parallelism.
  - Toggle: "Show $\lambda$ value" — displays the Lagrange multiplier $\lambda = \nabla f \cdot \hat{n} / \nabla g \cdot \hat{n}$.
- **Data source:** `inverse-implicit-data.ts` presets.
- **Panel layout:** Single panel with contours and constraint curve. Side info panel showing $\nabla f$, $\nabla g$, $\lambda$, and optimum coordinates.

### 4.4 `ContractionMappingExplorer.tsx`

- **What it visualizes:** A 1D contraction mapping $T: [a,b] \to [a,b]$ with the iteration $x_{k+1} = T(x_k)$ shown as a cobweb diagram. The user watches the iterates spiral (or staircase) toward the fixed point $x^*$.
- **User interactions:**
  - Click on the function graph to set the starting point $x_0$.
  - "Step" button: advance one iteration, drawing the cobweb step.
  - "Run" button: animate all iterations to convergence.
  - Slider: contraction factor $\lambda$ — morphs $T$ between a weak contraction ($\lambda \approx 0.9$, slow convergence) and a strong contraction ($\lambda \approx 0.1$, fast convergence).
  - Dropdown: preset maps: $T(x) = \cos(x)$, $T(x) = (x + 2/x)/2$ (square root iteration), $T(x) = \frac{1}{2}(x + e^{-x})$.
  - Display: iteration count $k$, current value $x_k$, error bound $\frac{\lambda^k}{1-\lambda}|x_1 - x_0|$.
- **Data source:** Inline generation (functions are simple enough to define directly).
- **Panel layout:** Single panel with $y = x$ line, $y = T(x)$ curve, and cobweb diagram. Iteration counter and convergence info below.

---

## 5. Data Modules

### 5.1 `inverse-implicit-data.ts`

- **Filename:** `src/data/inverse-implicit-data.ts`
- **Exported interfaces:**

```typescript
interface InverseMapPreset {
  name: string;
  label: string;
  f: (x: number, y: number) => [number, number];
  J: (x: number, y: number) => [[number, number], [number, number]];
  detJ: (x: number, y: number) => number;
  xDomain: [number, number];
  yDomain: [number, number];
  defaultPoint: [number, number];
  singularPoints?: Array<[number, number]>;   // Points where det J = 0
  description?: string;
}

interface ImplicitCurvePreset {
  name: string;
  label: string;
  F: (x: number, y: number) => number;
  Fx: (x: number, y: number) => number;       // ∂F/∂x
  Fy: (x: number, y: number) => number;       // ∂F/∂y
  xDomain: [number, number];
  yDomain: [number, number];
  defaultPoint: [number, number];              // A point on the curve
  singularPoints?: Array<[number, number]>;    // Where F_y = 0 on the curve
  description?: string;
}

interface LagrangePreset {
  name: string;
  label: string;
  f: (x: number, y: number) => number;         // Objective
  gradf: (x: number, y: number) => [number, number];
  g: (x: number, y: number) => number;          // Constraint g(x,y) = c
  gradg: (x: number, y: number) => [number, number];
  cDefault: number;                             // Default constraint value
  cDomain: [number, number];                    // Range for constraint slider
  xDomain: [number, number];
  yDomain: [number, number];
  optimum: (c: number) => [number, number];     // Analytical optimum as f(c)
  lambda: (c: number) => number;                // Lagrange multiplier as f(c)
  description?: string;
}

interface ContractionPreset {
  name: string;
  label: string;
  T: (x: number) => number;
  Tprime: (x: number) => number;
  domain: [number, number];
  fixedPoint: number;
  contractionFactor: number;                    // Approximate λ
  description?: string;
}
```

- **Exported constants:**
  - `INVERSE_MAP_PRESETS: InverseMapPreset[]` — 4 presets for InverseMapExplorer: polar coordinates $(r\cos\theta, r\sin\theta)$, complex squaring $(x^2 - y^2, 2xy)$, conformal exponential $(e^x\cos y, e^x\sin y)$, shear-with-rotation $(x + y\sin x, y\cos x)$.
  - `IMPLICIT_CURVE_PRESETS: ImplicitCurvePreset[]` — 4 presets for ImplicitCurveExplorer: circle $x^2 + y^2 - 1$, ellipse $x^2/4 + y^2 - 1$, folium of Descartes $x^3 + y^3 - 3xy$, lemniscate $(x^2+y^2)^2 - (x^2-y^2)$.
  - `LAGRANGE_PRESETS: LagrangePreset[]` — 3 presets for LagrangeMultiplierExplorer: minimize distance on a line, maximize product on a circle, minimize Rosenbrock on an ellipse.
  - `CONTRACTION_PRESETS: ContractionPreset[]` — 3 presets for ContractionMappingExplorer: $\cos(x)$, $(x + 2/x)/2$, $(x + e^{-x})/2$.

- **Computation:** All eager (function references are cheap; no heavy computation at import time).

---

## 6. Shared Utility Module Updates: `multivariate.ts`

### Location

```
src/components/viz/shared/multivariate.ts
```

### New Interfaces (add to existing module)

```typescript
/** Result of computing an approximate inverse Jacobian */
export interface InverseJacobianResult {
  point: number[];               // evaluation point
  jacobian: number[][];          // J_f(point)
  inverseJacobian: number[][];   // [J_f(point)]^{-1}
  determinant: number;
  conditionNumber: number;
  isInvertible: boolean;         // |det| > threshold
}

/** Result of computing a local implicit function slice */
export interface ImplicitSliceResult {
  xValues: number[];             // x grid
  yValues: number[];             // y = g(x) values
  derivatives: number[];         // g'(x) = -F_x / F_y
  basePoint: [number, number];   // (a, b) where F(a,b) = 0
  valid: boolean[];              // whether the ImFT applies at each x
}

/** Newton method step for systems F(x) = 0 */
export interface NewtonSystemStep {
  iteration: number;
  point: number[];
  functionValue: number[];       // F(x_k)
  jacobian: number[][];
  newtonDirection: number[];     // -J^{-1} F
  nextPoint: number[];
  residualNorm: number;          // ‖F(x_k)‖
}

/** Newton method trajectory for systems */
export interface NewtonSystemResult {
  steps: NewtonSystemStep[];
  converged: boolean;
  root: number[];                // final point
  iterations: number;
}

/** Contraction mapping iteration result */
export interface ContractionResult {
  iterates: number[];            // x_0, x_1, ..., x_k
  fixedPoint: number;            // x_k (final iterate)
  converged: boolean;
  errorBounds: number[];         // λ^k / (1-λ) · |x_1 - x_0|
  contractionFactor: number;     // estimated λ from consecutive iterates
}

/** Lagrange multiplier result */
export interface LagrangeResult {
  optimum: number[];             // constrained optimum x*
  lambda: number[];              // Lagrange multiplier(s)
  gradF: number[];               // ∇f at x*
  gradG: number[][];             // ∇g_i at x* (one per constraint)
  objectiveValue: number;        // f(x*)
}
```

### New Functions (add to existing module)

```typescript
/** Compute the inverse of the Jacobian matrix at a point.
 *  f: ℝⁿ → ℝⁿ (must be square). Returns the inverse if non-singular.
 *  Uses Gaussian elimination for n ≤ 5, with numerical stability checks. */
export function inverseJacobianApprox(
  f: (...args: number[]) => number[],
  point: number[],
  h?: number,                     // step size for numerical Jacobian, default 1e-7
  threshold?: number              // singularity threshold, default 1e-10
): InverseJacobianResult;

/** Compute a local implicit function slice near a point (a, b) where F(a, b) = 0.
 *  F: ℝ² → ℝ (scalar case). Returns y = g(x) values near x = a.
 *  Uses Newton's method on F(x, ·) = 0 for each x value. */
export function implicitFunctionSlice(
  F: (x: number, y: number) => number,
  Fy: (x: number, y: number) => number,
  basePoint: [number, number],     // (a, b) with F(a, b) ≈ 0
  xRange: [number, number],        // range of x values
  nPoints?: number,                // default 100
  maxNewtonIter?: number           // default 20
): ImplicitSliceResult;

/** Newton's method for systems F(x) = 0.
 *  F: ℝⁿ → ℝⁿ. Iterates x_{k+1} = x_k - J_F(x_k)^{-1} F(x_k).
 *  Returns all intermediate steps for visualization. */
export function newtonMethodMultivariate(
  F: (...args: number[]) => number[],
  x0: number[],
  maxIter?: number,                // default 50
  tol?: number,                    // default 1e-10
  h?: number                      // step size for numerical Jacobian
): NewtonSystemResult;

/** Iterate a contraction mapping T: ℝ → ℝ from x_0.
 *  Returns all iterates and convergence diagnostics. */
export function contractionIteration(
  T: (x: number) => number,
  x0: number,
  maxIter?: number,                // default 100
  tol?: number                     // default 1e-12
): ContractionResult;

/** Solve a constrained optimization problem via the Lagrange condition.
 *  For f: ℝ² → ℝ with constraint g(x,y) = c (single constraint, 2D).
 *  Uses numerical search along the constraint curve. */
export function lagrangeMultiplier(
  f: (x: number, y: number) => number,
  gradf: (x: number, y: number) => [number, number],
  g: (x: number, y: number) => number,
  gradg: (x: number, y: number) => [number, number],
  c: number,                       // constraint value
  searchRange?: [number, number],  // range of parameter for constraint curve
  nPoints?: number                 // default 200
): LagrangeResult;

/** Invert a 2×2 matrix. Returns null if singular. */
export function invert2x2(
  M: [[number, number], [number, number]],
  threshold?: number               // default 1e-10
): [[number, number], [number, number]] | null;

/** Solve a 2×2 linear system Ax = b via Cramer's rule.
 *  Returns null if A is singular. */
export function solve2x2(
  A: [[number, number], [number, number]],
  b: [number, number],
  threshold?: number
): [number, number] | null;
```

### Backward Compatibility

All existing functions in `multivariate.ts` remain unchanged:
- From Topic 9: `numericalGradient`, `analyticalGradient`, `directionalDerivative`, `generateContours`, `generateWireframe`, `project3D`, `gradientDescent`, `gradientFlow`, `checkDifferentiability` — unchanged.
- From Topic 10: `jacobianMatrix`, `jacobianDeterminant`, `multivariateChainRule`, `linearMapComposition`, `areaDistortion`, `coordinateTransform`, `determinant` (internal helper) — unchanged.
- From Topic 11: `hessianMatrix`, `eigenvalues2x2`, `eigenvaluesSymmetric`, `classifyCriticalPoint`, `quadraticForm`, `newtonStep`, `conditionNumber` — unchanged.

The new functions extend the module with IFT/ImFT-specific computation. `inverseJacobianApprox` internally uses the existing `jacobianMatrix` function and the internal `determinant` helper. `implicitFunctionSlice` uses Newton iteration internally. `newtonMethodMultivariate` generalizes the scalar `newtonStep` from Topic 11 to systems $F: \mathbb{R}^n \to \mathbb{R}^n$.

**This is the final extension of `multivariate.ts` for Track 3.** No further topics will modify this module until Track 4 (Multivariable Integral Calculus) introduces `multipleIntegral` and `changeOfVariables` utilities.

---

## 7. Curriculum Graph Updates

### `src/data/curriculum-graph.json`

**Change node status:**
```json
{ "id": "inverse-implicit", "label": "Inverse & Implicit Function Theorems", "domain": "multivar-differential", "status": "published", "url": "/topics/inverse-implicit" }
```
Change `"status"` from `"planned"` to `"published"`.

**Edges** (should already exist — verify):
```json
{ "source": "hessian", "target": "inverse-implicit" }
{ "source": "jacobian", "target": "inverse-implicit" }
```

Verify both edges exist. The `hessian → inverse-implicit` edge should be present from Topic 11. The `jacobian → inverse-implicit` edge should be present from Topic 10 (it was specified in both briefs). If either is missing, add it.

**New downstream edges** (add these — they connect to Track 4 and Track 6):
```json
{ "source": "inverse-implicit", "target": "change-of-variables" }
{ "source": "inverse-implicit", "target": "first-order-odes" }
```

### `src/data/curriculum.ts`

In the `multivar-differential` track definition, move `"Inverse & Implicit Function Theorems"` from `planned` to `published`. The `planned` array for this track should now be **empty** — all four topics are published. **Mark the Multivariable Differential Calculus track as complete.**

---

## 8. Cross-References

### Existing topics that should link TO this topic

- **`hessian.mdx`** — Section 4 mentions "**Inverse & Implicit Function Theorems** *(coming soon)* — local invertibility near non-degenerate critical points." Update to a live link: `[Inverse & Implicit Function Theorems](/topics/inverse-implicit)`. Also check Section 6 (constraint surfaces) for similar forward references.
- **`jacobian.mdx`** — Section 1 or Section 8 may mention the IFT as a downstream topic. If any forward references say "coming soon," update them to live links. Specifically check any mention of "$\det J_f(a) \neq 0$ implies local invertibility."
- **`gradient.mdx`** — Section 6 (constraint surfaces) may briefly reference the ImFT. If present as "coming soon," update to a live link.

### Topics this topic links FROM

- `hessian` — prerequisite (live link). Second-order analysis of constraint surfaces.
- `jacobian` — $J_f(a)$ and $\det J_f(a)$ are the central objects (live link).
- `gradient` — gradient of constraint functions, normal to level sets (live link).
- `completeness-compactness` — completeness of $\mathbb{R}^n$ as a metric space (live link, cross-track).
- `epsilon-delta` — continuity of $J_f$ in the $C^1$ hypothesis (live link, cross-track).
- `derivative` — single-variable inverse function theorem as special case (live link, cross-track).

### Forward references to planned topics (plain text + "(coming soon)")

- **Change of Variables** *(coming soon)* — referenced in Section 4 (the IFT guarantees local diffeomorphisms needed for the change of variables formula) and Section 9 (normalizing flows).
- **First-Order ODEs & Existence Theorems** *(coming soon)* — referenced in Section 8 (contraction mapping ↔ Picard-Lindelöf) and Section 9 (neural ODEs).
- **Metric Spaces & Topology** *(coming soon)* — referenced in Section 8 (contraction mapping theorem in general metric spaces).
- **Series Convergence & Tests** *(coming soon)* — referenced indirectly via the geometric series bound in the contraction mapping proof.

### formalml.com forward links (informational, external, new tab)

- `gradient-descent` — Sections 1, 9.1
- `smooth-manifolds` — Sections 5, 9.3, 10
- `information-geometry` — Section 9.3

---

## 9. Images

Copy the following images from the notebook export to `public/images/topics/inverse-implicit/`:

| # | Filename | Description |
|---|----------|-------------|
| 1 | `local-invertibility-geometry.png` | Six-panel: three maps (polar, complex squaring, exponential) with input grids and deformed output grids; panels colored by $|\det J|$, with singular points marked in red |
| 2 | `inverse-function-theorem.png` | Four-panel: the IFT schematically — input neighborhood $V$, output neighborhood $W$, the map $f: V \to W$ as a bijection, and the inverse map $f^{-1}: W \to V$; numerical verification of $J_{f^{-1}} = [J_f]^{-1}$ |
| 3 | `local-inverse-computation.png` | Four-panel: for complex squaring at three points, comparison of numerical $J_{f^{-1}}$ (finite differences on the computed inverse) vs. analytical $[J_f]^{-1}$ (matrix inversion formula); error quantification |
| 4 | `implicit-curves.png` | Six-panel: four implicit curves (circle, ellipse, folium, lemniscate) with gradient arrows, tangent lines from ImFT formula, and singular points (where $F_y = 0$) highlighted |
| 5 | `implicit-differentiation-higher-dim.png` | Four-panel: a 2D constraint system $F: \mathbb{R}^3 \to \mathbb{R}$ with level surface, tangent plane from ImFT, $\partial y/\partial x$ and $\partial y/\partial z$ computed via ImFT formula, and numerical verification |
| 6 | `lagrange-multipliers.png` | Six-panel: three constrained optimization problems with contours of $f$, constraint curve $g = c$, gradient arrows $\nabla f$ and $\nabla g$ at the optimum showing parallelism, and $\lambda$ values |
| 7 | `contraction-mapping.png` | Six-panel: three contraction maps with cobweb diagrams showing convergence from different starting points; convergence rate comparison ($\lambda = 0.2$ vs. $0.5$ vs. $0.8$); error bound vs. actual error |
| 8 | `normalizing-flows-deq.png` | Six-panel: coupling layer architecture with Jacobian structure, density transformation formula, DEQ fixed-point iteration, implicit differentiation through the fixed point, training loss comparison |
| 9 | `degenerate-bifurcation.png` | Six-panel: fold catastrophe ($x^3 - tx$) for varying $t$, cusp point, pitchfork bifurcation, $\det J$ heatmap crossing zero, eigenvalue trajectories through zero, Hessian spectrum at bifurcation point |

---

## 10. Testing Checklist

### Build & rendering

- [ ] `pnpm build` completes with zero errors
- [ ] Page renders at `/topics/inverse-implicit`
- [ ] All 21+ TheoremBlocks render LaTeX correctly (6 definitions, 5 theorems, 2 propositions, 14 examples, 7 remarks, 4 proofs)
- [ ] Static images load from `/images/topics/inverse-implicit/`
- [ ] Pagefind indexes "Inverse & Implicit Function Theorems"

### Visualizations

- [ ] `InverseMapExplorer` drag interaction updates codomain in real time
- [ ] `InverseMapExplorer` grid deformation draws correctly for all 4 presets
- [ ] `InverseMapExplorer` invertibility coloring shows green/red by $|\det J|$
- [ ] `InverseMapExplorer` matrix display shows $J_f$, $\det J_f$, and $[J_f]^{-1}$ (or "SINGULAR")
- [ ] `InverseMapExplorer` "Zoom to singularity" navigates to correct region
- [ ] `ImplicitCurveExplorer` curve renders correctly for all 4 presets
- [ ] `ImplicitCurveExplorer` drag along curve updates tangent line and $g'(x)$
- [ ] `ImplicitCurveExplorer` singular points ($F_y = 0$) highlighted in red
- [ ] `ImplicitCurveExplorer` "Show local graph" highlights the graph portion
- [ ] `ImplicitCurveExplorer` gradient arrow perpendicular to curve
- [ ] `LagrangeMultiplierExplorer` constraint slider moves constraint curve
- [ ] `LagrangeMultiplierExplorer` optimum moves along constraint as $c$ changes
- [ ] `LagrangeMultiplierExplorer` gradients $\nabla f$ and $\nabla g$ shown parallel at optimum
- [ ] `LagrangeMultiplierExplorer` $\lambda$ value updates correctly
- [ ] `ContractionMappingExplorer` click sets starting point
- [ ] `ContractionMappingExplorer` "Step" and "Run" buttons work
- [ ] `ContractionMappingExplorer` cobweb diagram draws correctly
- [ ] `ContractionMappingExplorer` contraction factor slider adjusts convergence speed
- [ ] `ContractionMappingExplorer` error bound vs. actual error displayed

### Cross-references

- [ ] Links to `hessian`, `jacobian`, `gradient`, `completeness-compactness`, `epsilon-delta`, `derivative` work (resolve to published pages)
- [ ] `hessian.mdx` updated: IFT forward references are now live links
- [ ] `jacobian.mdx` updated: IFT forward references are now live links
- [ ] `gradient.mdx` updated: ImFT forward references are now live links (if applicable)
- [ ] All other forward references use plain text + "(coming soon)"
- [ ] All formalml.com links open in a new tab with `target="_blank" rel="noopener"`

### Infrastructure

- [ ] `multivariate.ts` shared module compiles with no TypeScript errors
- [ ] `inverse-implicit-data.ts` data module compiles
- [ ] No modifications to any existing functions in `multivariate.ts` (backward compatibility preserved)
- [ ] No modifications to `limits.ts`, `differentiation.ts`, or `integration.ts`
- [ ] Page is responsive (viz components stack vertically on mobile)
- [ ] Curriculum graph shows `inverse-implicit` as "published" (not "coming soon")
- [ ] `hessian → inverse-implicit` and `jacobian → inverse-implicit` edges render in the prerequisite graph
- [ ] `multivar-differential` track marked as complete (all four topics published)

---

## 11. Build Order

1. **Extend `src/components/viz/shared/multivariate.ts`** — Add the new interfaces (`InverseJacobianResult`, `ImplicitSliceResult`, `NewtonSystemStep`, `NewtonSystemResult`, `ContractionResult`, `LagrangeResult`) and functions (`inverseJacobianApprox`, `implicitFunctionSlice`, `newtonMethodMultivariate`, `contractionIteration`, `lagrangeMultiplier`, `invert2x2`, `solve2x2`). Write console log tests to verify. Do not modify any existing functions or interfaces.
2. **Create `src/data/inverse-implicit-data.ts`** — Inverse map presets, implicit curve presets, Lagrange presets, contraction presets. Verify exports compile.
3. **Create `inverse-implicit.mdx`** with full frontmatter and all markdown/LaTeX content. Use `TheoremBlock` for all formal elements (6 definitions, 5 theorems, 2 propositions, 14 examples, 7 remarks, 4 proofs). No interactive components yet — just the prose and static images.
4. Copy notebook figures to `public/images/topics/inverse-implicit/` and verify they load in the MDX.
5. **Build `InverseMapExplorer.tsx`** — the flagship component. Start with the domain grid rendering, then add the function mapping and deformed output grid, then add the Jacobian matrix display and invertibility coloring. Uses `jacobianMatrix`, `jacobianDeterminant`, `coordinateTransform`, and `inverseJacobianApprox` from the shared module.
6. **Build `ImplicitCurveExplorer.tsx`** — Implicit curve with tangent line and gradient. Uses `implicitFunctionSlice` and `generateContours`.
7. **Build `LagrangeMultiplierExplorer.tsx`** — Contour plot with constraint curve and gradient alignment. Uses `generateContours`, `analyticalGradient`, and `lagrangeMultiplier`.
8. **Build `ContractionMappingExplorer.tsx`** — Cobweb diagram with iteration animation. Uses `contractionIteration`.
9. Embed all four components in the MDX at their appropriate section positions with `client:visible`.
10. **Update `hessian.mdx`** — Change forward references to "**Inverse & Implicit Function Theorems** *(coming soon)*" to live links: `[Inverse & Implicit Function Theorems](/topics/inverse-implicit)`. Check Section 4 and Section 6 specifically.
11. **Update `jacobian.mdx`** — Change any forward references to the IFT from "(coming soon)" to live links. Check Section 1, Section 4 (Jacobian determinant and invertibility), and Section 8 (downstream topics).
12. **Update `gradient.mdx`** — Change any forward references to the IFT/ImFT from "(coming soon)" to live links (Section 6 specifically — constraint surfaces).
13. **Update curriculum graph data** — Change `inverse-implicit` status from `"planned"` to `"published"` in `curriculum-graph.json`. Verify `hessian → inverse-implicit` and `jacobian → inverse-implicit` edges exist. Add `inverse-implicit → change-of-variables` and `inverse-implicit → first-order-odes` edges.
14. **Update `curriculum.ts`** — Move `"Inverse & Implicit Function Theorems"` from `planned` to `published` in the `multivar-differential` track. Mark the Multivariable Differential Calculus track as complete (empty `planned` array).
15. Run topic content and viz checklist (§10).
16. `pnpm build` — verify zero errors.
17. Commit and deploy.

---

## Appendix A: Key Differences from the Hessian Brief (Topic 11)

1. **Completes the track.** This is the fourth and final topic in the Multivariable Differential Calculus track. After deployment, the track status changes from "in progress" to "complete" — the second track completion after Track 1 (Limits & Continuity) and Track 2 (Single-Variable Calculus).
2. **Advanced difficulty, the first in the curriculum.** Topics 1–8 were foundational or intermediate. Topics 9–11 were intermediate. This is the first *advanced* topic. The proofs — particularly the IFT via contraction mapping — are substantially more sophisticated than anything the reader has encountered so far. The exposition must be patient but not condescending: the reader has earned the right to see a real proof, and we deliver one.
3. **Existence theorems, not computation.** Topics 9–11 built a computational toolkit for computing gradients, Jacobians, Hessians, eigenvalues, and Newton steps. This topic asks a different question: *when* do these computations make sense? The IFT says "when the Jacobian is invertible," and the ImFT says "when the partial Jacobian is invertible." The shift from computation to existence is the conceptual core.
4. **The contraction mapping principle is the proof technique and a standalone tool.** Unlike Topics 9–11, where the proofs used standard analysis arguments (limits, Taylor expansion, MVT), the IFT proof introduces a genuinely new technique — iterative fixed-point convergence. This technique reappears in ODE existence (Picard-Lindelöf), in iterative solvers (Newton, GMRES), and in DEQs (finding fixed points of implicit layers). The section on contraction mapping (§8) treats it as a first-class concept rather than just a proof ingredient.
5. **Cross-track prerequisites are used for the first time in a proof.** The completeness of $\mathbb{R}^n$ (from Topic 3, Track 1) is used in the contraction mapping proof. This is the first time a Track 1 concept directly appears in a Track 3 proof — not just as background, but as a critical ingredient. The brief makes this cross-track dependency explicit.
6. **The ML connections shift from "computation" to "architecture."** In Topics 9–11, ML connections were about *how to compute* things (gradients, backpropagation, Newton's method, condition numbers). In this topic, ML connections are about *why architectures work*: normalizing flows work because the IFT guarantees invertibility, DEQs work because the ImFT guarantees smooth dependence on parameters, and Lagrange multipliers work because the ImFT provides the manifold structure. The connection is structural, not computational.
7. **Two downstream track connections.** This topic connects forward to Track 4 (change of variables needs local diffeomorphisms) and Track 6 (Picard-Lindelöf uses contraction mapping). These edges are added to the curriculum graph, establishing the inter-track dependencies that the reader will encounter next.

---

## Appendix B: Formal Element Inventory

| Type | # | Title |
|------|---|-------|
| Definition | 1 | Local Diffeomorphism |
| Definition | 2 | Implicit Equation / Level Set |
| Definition | 3 | Partial Jacobians ($D_x F$, $D_y F$) |
| Definition | 4 | Constrained Optimization Problem |
| Definition | 5 | Contraction Mapping |
| Definition | 6 | Critical Point of a Map |
| Theorem | 1 | The Inverse Function Theorem |
| Theorem | 2 | Contraction Mapping Theorem (Banach Fixed-Point Theorem) |
| Theorem | 3 | The Implicit Function Theorem |
| Theorem | 4 | Lagrange Multiplier Necessary Condition |
| Theorem | 5 | Regular Value Theorem (Preimage Theorem) |
| Proposition | 1 | The Inverse Derivative Formula |
| Proposition | 2 | Implicit Differentiation Formula |
| Example | 1 | Polar coordinates as a local diffeomorphism |
| Example | 2 | The exponential map in $\mathbb{R}^2$ |
| Example | 3 | Computing the inverse Jacobian (complex squaring) |
| Example | 4 | Inverse derivative for polar coordinates |
| Example | 5 | Inverse derivative in a normalizing flow layer |
| Example | 6 | The unit circle |
| Example | 7 | A 2D system (two constraints) |
| Example | 8 | Implicit differentiation on the circle |
| Example | 9 | Tangent to an elliptic curve (singular point) |
| Example | 10 | Maximum entropy on the probability simplex |
| Example | 11 | Nearest point on a constraint surface |
| Example | 12 | Fixed-point iteration: $x = \cos(x)$ |
| Example | 13 | Fold catastrophe |
| Example | 14 | Loss landscape bifurcations in neural networks |
| Remark | 1 | Local vs. global invertibility |
| Remark | 2 | The $C^k$ version |
| Remark | 3 | The ImFT as a corollary of the IFT |
| Remark | 4 | Second-order implicit differentiation |
| Remark | 5 | Newton's method as an approximate contraction |
| Remark | 6 | The rank theorem and regular values |
| Remark | 7 | Numerical invertibility vs. mathematical invertibility |
| Proof | — | 4 proofs total (Theorem 1 — IFT via contraction mapping, Theorem 2 — Contraction Mapping Theorem, Theorem 3 — ImFT from the IFT, Proposition 1 — inverse derivative formula) |

---

*Brief version: v1 | Created: 2026-04-02 | Author: Jonathan Rocha*  
*Reference notebook: `notebooks/inverse-implicit/12_inverse_implicit.ipynb`*  
*Reference doc: `docs/plans/formalcalculus-handoff-reference.md`*
