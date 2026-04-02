# Claude Code Handoff Brief: The Jacobian & Multivariate Chain Rule

**Project:** formalCalculus — [formalcalculus.com](https://www.formalcalculus.com)  
**Repo:** `github.com/jonx0037/formalCalculus`  
**Stack:** Astro 6 · React 19 · MDX · Tailwind CSS 4 · D3.js 7 · KaTeX · Vercel  
**Package Manager:** pnpm  
**Status:** Ready for implementation  
**Reference Notebook:** `notebooks/jacobian/10_jacobian_chain_rule.ipynb`  
**Reference Doc:** `docs/plans/formalcalculus-handoff-reference.md`

---

## 1. Objective

Add a new topic page **"The Jacobian & Multivariate Chain Rule"** as the **second topic in the Multivariable Differential Calculus track** on formalcalculus.com.

1. This is **topic 10 of 32** and the **tenth topic published** on formalcalculus.com. All four topics in the Limits & Continuity track (`sequences-limits`, `epsilon-delta`, `completeness-compactness`, `uniform-convergence`), all four topics in the Single-Variable Calculus track (`derivative`, `mean-value-taylor`, `riemann-integral`, `improper-integrals`), and the first topic in the Multivariable Differential Calculus track (`gradient`) are deployed and live.
2. **Prerequisites:** `gradient`. The Jacobian matrix is the natural generalization of the gradient from $f: \mathbb{R}^n \to \mathbb{R}$ (scalar-valued) to $f: \mathbb{R}^n \to \mathbb{R}^m$ (vector-valued). The reader must understand partial derivatives, the gradient as a vector of partial derivatives, the total derivative as a linear map, and the $C^1$ criterion — all developed in Topic 9. The single-variable chain rule (Topic 5) and the single-variable derivative-as-linear-map viewpoint are implicitly required through the `gradient`'s prerequisite chain, but the only *direct* prerequisite is `gradient`.
3. **Difficulty: intermediate.** The reader has now seen partial derivatives and the gradient (foundational, Topic 9) and is ready for the conceptual leap to vector-valued functions and the derivative-as-matrix viewpoint. The key abstraction — that the derivative of a composition is the *product* of the derivative matrices — is conceptually simple once stated, but the proof requires careful handling of the error term in the total derivative definition. The Jacobian determinant introduces a geometric idea (area/volume distortion) that requires some linear algebra (determinants, eigenvalues) but nothing beyond what a typical undergraduate encounters. The multivariate chain rule proof is the hardest proof in this topic.
4. **Downstream within formalCalculus:**
   - `hessian` (direct) — The Hessian is the Jacobian of the gradient: $H_f = J(\nabla f)$. The second-order chain rule for Hessians builds on the first-order chain rule developed here.
   - `inverse-implicit` (direct) — The Inverse Function Theorem requires the Jacobian $J_f(a)$ to be invertible (i.e., $\det J_f(a) \neq 0$). The Implicit Function Theorem expresses part of the Jacobian as a function of the rest. Both theorems rely on the total derivative framework and the chain rule from this topic.
   - `change-of-variables` (indirect) — The Jacobian determinant $|\det J_\phi|$ is the volume scaling factor in the change-of-variables formula for multiple integrals: $\int_{\phi(U)} f(x)\,dx = \int_U f(\phi(u)) \cdot |\det J_\phi(u)|\,du$. This topic provides the differential foundation; Topic 14 provides the integral application.
   - `multiple-integrals` (indirect) — The Fubini's theorem topic uses the Jacobian when discussing when iterated partial differentiation and integration commute.
   - `linear-systems` (indirect) — The Jacobian at a fixed point of a dynamical system determines its local stability (eigenvalue analysis), connecting this topic to ODE theory.
5. **Forward links to formalml.com:**
   - `gradient-descent` — Backpropagation computes the gradient $\nabla L$ by applying the multivariate chain rule through each layer of the network. The Jacobian of each layer is multiplied in sequence: $J_{L \circ f_K \circ \cdots \circ f_1}(x) = J_L \cdot J_{f_K} \cdots J_{f_1}$. This is the core algorithm of deep learning training, and it is exactly the chain rule theorem proved in this topic.
   - `smooth-manifolds` — The Jacobian of a smooth map $f: M \to N$ between manifolds is the pushforward map $df_p: T_pM \to T_{f(p)}N$ between tangent spaces. The chain rule $d(g \circ f)_p = dg_{f(p)} \circ df_p$ is the functoriality of the tangent functor — the mathematical statement that "derivatives respect composition."
   - `information-geometry` — The Fisher information matrix $I(\theta)_{ij} = \mathbb{E}\left[\frac{\partial \log p}{\partial \theta_i} \cdot \frac{\partial \log p}{\partial \theta_j}\right]$ transforms under reparametrization $\phi$ via $I(\phi(\eta)) = J_\phi^T I(\eta) J_\phi$ — a Jacobian sandwich. This is how the Riemannian metric on the statistical manifold changes under coordinate transforms.
6. This topic **extends** the shared utility module `multivariate.ts` (created by Topic 9) with `jacobianMatrix`, `jacobianDeterminant`, `multivariateChainRule`, `linearMapComposition`, `areaDistortion`, and `coordinateTransform`. All existing functions in `multivariate.ts` remain unchanged.

**Content scope:**

- Vector-valued functions $f: \mathbb{R}^n \to \mathbb{R}^m$: component functions $f = (f_1, \ldots, f_m)$, each $f_i: \mathbb{R}^n \to \mathbb{R}$ — extending from the scalar-valued setting of Topic 9
- The Jacobian matrix: $J_f(a) = \begin{pmatrix} \frac{\partial f_1}{\partial x_1}(a) & \cdots & \frac{\partial f_1}{\partial x_n}(a) \\ \vdots & \ddots & \vdots \\ \frac{\partial f_m}{\partial x_1}(a) & \cdots & \frac{\partial f_m}{\partial x_n}(a) \end{pmatrix}$ — the $m \times n$ matrix of all first-order partial derivatives, row $i$ is the gradient of $f_i$
- Differentiability for vector-valued functions: the total derivative $Df(a): \mathbb{R}^n \to \mathbb{R}^m$ as a linear map satisfying $\lim_{h \to 0} \frac{\|f(a+h) - f(a) - Df(a)(h)\|}{\|h\|} = 0$, represented by the Jacobian matrix
- The multivariate chain rule: if $g: \mathbb{R}^n \to \mathbb{R}^k$ is differentiable at $a$ and $f: \mathbb{R}^k \to \mathbb{R}^m$ is differentiable at $g(a)$, then $f \circ g: \mathbb{R}^n \to \mathbb{R}^m$ is differentiable at $a$ with $J_{f \circ g}(a) = J_f(g(a)) \cdot J_g(a)$ — the Jacobian of the composition is the matrix product of the Jacobians
- The Jacobian determinant: for $f: \mathbb{R}^n \to \mathbb{R}^n$ (square Jacobian), $\det J_f(a)$ measures the local volume scaling factor — if you deform a small region near $a$ through $f$, volumes are scaled by $|\det J_f(a)|$, and the sign indicates whether orientation is preserved or reversed
- Coordinate transformations: polar coordinates $(r, \theta) \mapsto (r\cos\theta, r\sin\theta)$ with $\det J = r$; spherical coordinates; affine transformations — concrete examples of the Jacobian determinant as a volume element
- ML connections: backpropagation as the chain rule applied to computation graphs (full derivation with explicit Jacobian products at each layer), Jacobian-vector products (JVPs) and vector-Jacobian products (VJPs) as forward-mode and reverse-mode AD, the Jacobian in normalizing flows ($\log p(x) = \log p(z) - \log|\det J_f(z)|$), Jacobian regularization for smoothness

---

## 2. MDX File

### Location

```
src/content/topics/jacobian.mdx
```

The entry `id` will be `jacobian`. The dynamic route resolves to `/topics/jacobian`.

### Frontmatter

```yaml
---
title: "The Jacobian & Multivariate Chain Rule"
subtitle: "Derivatives of vector-valued functions as matrices — the Jacobian as the best linear approximation, the chain rule as matrix multiplication, and the determinant as volume scaling"
status: "published"
difficulty: "intermediate"
prerequisites:
  - "gradient"
tags:
  - "calculus"
  - "jacobian"
  - "chain-rule"
  - "multivariate"
  - "linear-map"
  - "determinant"
  - "backpropagation"
  - "coordinate-transformation"
  - "normalizing-flows"
  - "automatic-differentiation"
domain: "multivar-differential"
videoId: null
notebookPath: "notebooks/jacobian/10_jacobian_chain_rule.ipynb"
githubUrl: "https://github.com/jonx0037/formalCalculus/blob/main/src/content/topics/jacobian.mdx"
datePublished: 2026-04-02
estimatedReadTime: 50
abstract: "The Jacobian matrix extends differentiation from scalar-valued functions f: ℝⁿ → ℝ to vector-valued functions f: ℝⁿ → ℝᵐ. Where the gradient is a single row of partial derivatives (the derivative of a function with one output), the Jacobian stacks m such rows — one for each output component. The Jacobian J_f(a) is the matrix representation of the total derivative Df(a): ℝⁿ → ℝᵐ, the best linear approximation to f near a. The central result is the multivariate chain rule: if g: ℝⁿ → ℝᵏ and f: ℝᵏ → ℝᵐ are differentiable, then the Jacobian of the composition f ∘ g is the matrix product J_{f∘g}(a) = J_f(g(a)) · J_g(a). This is the chain rule from single-variable calculus (multiply the derivatives along the chain) generalized to arbitrary dimensions — and it is exactly backpropagation. Every layer in a neural network computes a function fₖ: ℝⁿₖ → ℝⁿₖ₊₁, and the end-to-end Jacobian is the product J_L · J_fₖ · ⋯ · J_f₁. Reverse-mode automatic differentiation (backprop) computes this product right-to-left, one vector-Jacobian product at a time, at a cost independent of the number of parameters, which is why deep learning works at scale. For square Jacobians (n = m), the Jacobian determinant det J_f(a) measures how f distorts local volumes: areas near a are scaled by |det J_f(a)|, and the sign encodes orientation. This appears in the change-of-variables formula for integration (the r in r dr dθ for polar coordinates is the Jacobian determinant) and in normalizing flows, where the density of a transformed variable requires dividing by |det J_f|."
formalmlConnections:
  - topic: "gradient-descent"
    site: "formalml"
    relationship: "Backpropagation computes ∇L by applying the multivariate chain rule through each layer of the network. The Jacobian of each layer is multiplied in sequence: J_{L∘fₖ∘⋯∘f₁} = J_L · J_fₖ ⋯ J_f₁. Reverse-mode AD evaluates this product right-to-left via vector-Jacobian products, computing the full gradient in O(1) backward passes regardless of parameter count."
  - topic: "smooth-manifolds"
    site: "formalml"
    relationship: "The Jacobian of a smooth map f: M → N between manifolds is the pushforward map df_p: T_pM → T_{f(p)}N between tangent spaces. The chain rule d(g∘f)_p = dg_{f(p)} ∘ df_p is the functoriality of the tangent functor."
  - topic: "information-geometry"
    site: "formalml"
    relationship: "The Fisher information matrix transforms under reparametrization φ via I(φ(η)) = J_φᵀ I(η) J_φ — a Jacobian sandwich expressing how the natural Riemannian metric on a statistical manifold changes under coordinate transforms."
connections:
  - topic: "gradient"
    relationship: "The gradient ∇f(a) of a scalar-valued function is a special case of the Jacobian: when m = 1, the Jacobian is a 1 × n row matrix, and its transpose is the gradient vector. Everything from Topic 9 — partial derivatives, the total derivative, the C¹ criterion — extends directly to the vector-valued setting."
  - topic: "derivative"
    relationship: "The single-variable chain rule (f∘g)'(a) = f'(g(a)) · g'(a) from Topic 5 is the 1 × 1 case of the multivariate chain rule J_{f∘g}(a) = J_f(g(a)) · J_g(a). The conceptual insight is the same — the derivative of a composition is the product of the derivatives — but the product becomes matrix multiplication."
  - topic: "epsilon-delta"
    relationship: "The total derivative definition uses a multivariable limit (‖h‖ → 0 in ℝⁿ), and the chain rule proof requires careful ε-δ management of the error terms from two composed total derivatives."
  - topic: "completeness-compactness"
    relationship: "Compactness arguments ensure that continuous functions on compact domains achieve extrema, used implicitly when discussing global properties of differentiable maps."
references:
  - type: "book"
    title: "Analysis on Manifolds"
    authors: "Munkres"
    year: 1991
    note: "Chapters 2–3 develop the total derivative and the chain rule in ℝⁿ with full rigor — the primary reference for this topic's proof of the multivariate chain rule"
  - type: "book"
    title: "Calculus on Manifolds"
    authors: "Spivak"
    year: 1965
    note: "Chapter 2 treats the derivative as a linear map and proves the chain rule in the most general finite-dimensional setting — elegant and minimal"
  - type: "book"
    title: "Principles of Mathematical Analysis"
    authors: "Rudin"
    year: 1976
    note: "Chapter 9 on multivariable differentiation — Theorem 9.15 is the chain rule with a clean proof via the contraction mapping characterization of the derivative"
  - type: "book"
    title: "Linear Algebra Done Right"
    authors: "Axler"
    year: 2024
    note: "Determinants, linear maps, and matrix multiplication — the linear algebra foundation for understanding the Jacobian as a matrix representation of a linear map"
  - type: "book"
    title: "Deep Learning"
    authors: "Goodfellow, Bengio & Courville"
    year: 2016
    note: "Section 6.5 on backpropagation — the chain rule applied to computation graphs, forward-mode vs. reverse-mode AD"
  - type: "paper"
    title: "Variational Inference with Normalizing Flows"
    authors: "Rezende & Mohamed"
    year: 2015
    url: "https://arxiv.org/abs/1505.05770"
    note: "Normalizing flows use the change-of-variables formula with the Jacobian determinant to compute densities of transformed distributions — the probabilistic application of the Jacobian determinant"
  - type: "paper"
    title: "Automatic Differentiation in Machine Learning: a Survey"
    authors: "Baydin, Pearlmutter, Radul & Siskind"
    year: 2018
    url: "https://arxiv.org/abs/1502.05767"
    note: "Comprehensive survey of forward-mode and reverse-mode AD — the computational realization of the chain rule in modern ML frameworks"
---
```

---

## 3. Content Outline

### Section 1: Overview & Motivation

**Opening example:** In Topic 9, we differentiated functions $f: \mathbb{R}^n \to \mathbb{R}$ — one output. The gradient $\nabla f$ told us how the single output changes in every input direction. But a neural network layer is not a scalar-valued function. A layer $f_k: \mathbb{R}^{n_k} \to \mathbb{R}^{n_{k+1}}$ takes a vector of activations and produces a vector of activations — multiple inputs, multiple outputs. To differentiate such a function, we need a partial derivative for *every input-output pair*: how does the $i$-th output change when the $j$-th input is nudged? Arranging all of these into a matrix gives the Jacobian. And the chain rule — the engine that makes backpropagation possible — says that the Jacobian of a composition is the *product* of the Jacobian matrices.

No TheoremBlocks. No viz. 2–3 paragraphs setting up the transition from $\mathbb{R}^n \to \mathbb{R}$ (gradient) to $\mathbb{R}^n \to \mathbb{R}^m$ (Jacobian).

### Section 2: Vector-Valued Functions & the Jacobian Matrix

**Core definition section.** Begin with the geometric picture: a function $f: \mathbb{R}^2 \to \mathbb{R}^2$ maps a region in the plane to another region in the plane. Each output component $f_1, f_2$ is a scalar-valued function with its own gradient. The Jacobian stacks these gradients as rows.

**TheoremBlocks:**

- **Definition 1: Vector-Valued Function** — A *vector-valued function* $f: \mathbb{R}^n \to \mathbb{R}^m$ is defined by $m$ component functions $f = (f_1, f_2, \ldots, f_m)$, where each $f_i: \mathbb{R}^n \to \mathbb{R}$ is a scalar-valued function. The function maps a point $a \in \mathbb{R}^n$ to the vector $f(a) = (f_1(a), f_2(a), \ldots, f_m(a)) \in \mathbb{R}^m$. When $m = 1$, this reduces to the scalar-valued functions of Topic 9.
- **Definition 2: The Jacobian Matrix** — Let $f: \mathbb{R}^n \to \mathbb{R}^m$ and suppose all partial derivatives $\frac{\partial f_i}{\partial x_j}(a)$ exist. The *Jacobian matrix* (or simply *Jacobian*) of $f$ at $a$ is the $m \times n$ matrix $J_f(a) = \begin{pmatrix} \frac{\partial f_1}{\partial x_1}(a) & \cdots & \frac{\partial f_1}{\partial x_n}(a) \\ \vdots & \ddots & \vdots \\ \frac{\partial f_m}{\partial x_1}(a) & \cdots & \frac{\partial f_m}{\partial x_n}(a) \end{pmatrix}.$ Row $i$ of $J_f(a)$ is $\nabla f_i(a)^T$ — the gradient of the $i$-th component. Column $j$ is the vector of all partial derivatives with respect to $x_j$. Notation: $J_f(a)$, $Df(a)$, $\frac{\partial(f_1, \ldots, f_m)}{\partial(x_1, \ldots, x_n)}$.
- **Example 1: Jacobian of a linear function** — Let $f(x) = Ax + b$ where $A$ is a constant $m \times n$ matrix. Then $J_f(a) = A$ for all $a$ — the Jacobian of a linear function is the matrix itself. The derivative of a linear map is the linear map. This is the multivariable analog of "$f(x) = ax + b$ has derivative $a$."
- **Example 2: Jacobian of polar-to-Cartesian** — Let $f(r, \theta) = (r\cos\theta, r\sin\theta)$. Then $J_f(r, \theta) = \begin{pmatrix} \cos\theta & -r\sin\theta \\ \sin\theta & r\cos\theta \end{pmatrix}.$ At $(r, \theta) = (2, \pi/4)$: $J_f = \begin{pmatrix} \frac{1}{\sqrt{2}} & -\sqrt{2} \\ \frac{1}{\sqrt{2}} & \sqrt{2} \end{pmatrix}$.
- **Example 3: Jacobian of a neural network layer** — A fully connected layer $f(x) = \sigma(Wx + b)$ where $\sigma$ is applied component-wise. $J_f(x) = \text{diag}(\sigma'(Wx + b)) \cdot W$. When $\sigma$ is the identity (linear layer), $J_f = W$ — recovering Example 1. When $\sigma = \text{sigmoid}$, the diagonal matrix of $\sigma'$ values modulates each row of $W$.
- **Remark 1: Gradient as a special case** — When $m = 1$, the Jacobian is a $1 \times n$ row matrix: $J_f(a) = \begin{pmatrix} \frac{\partial f}{\partial x_1}(a) & \cdots & \frac{\partial f}{\partial x_n}(a) \end{pmatrix} = \nabla f(a)^T$. The gradient is the transpose of the single-row Jacobian. In the other direction, when $n = 1$, the Jacobian is an $m \times 1$ column matrix — just the vector of ordinary derivatives of each component. When $m = n = 1$, the Jacobian is a $1 \times 1$ matrix containing the single-variable derivative $f'(a)$ from Topic 5. The Jacobian unifies all of these cases.

**Visualization:** `JacobianGridExplorer` embedded here.

**Static image:** `jacobian-matrix-construction.png` from the notebook.

### Section 3: The Jacobian as Linear Approximation

**The total derivative for vector-valued functions.** Just as the gradient was the best linear approximation for $f: \mathbb{R}^n \to \mathbb{R}$ (Topic 9, §7), the Jacobian is the best linear approximation for $f: \mathbb{R}^n \to \mathbb{R}^m$. The total derivative is a linear map $Df(a): \mathbb{R}^n \to \mathbb{R}^m$ — and its matrix representation is the Jacobian.

**TheoremBlocks:**

- **Definition 3: Differentiability (Vector-Valued)** — A function $f: \mathbb{R}^n \to \mathbb{R}^m$ is *differentiable at $a$* if there exists a linear map $Df(a): \mathbb{R}^n \to \mathbb{R}^m$ such that $\lim_{h \to 0} \frac{\|f(a+h) - f(a) - Df(a)(h)\|}{\|h\|} = 0.$ When $Df(a)$ exists, it is unique and represented by the Jacobian matrix: $Df(a)(h) = J_f(a) \cdot h$ for all $h \in \mathbb{R}^n$. This extends Definition 4 of Topic 9 from $m = 1$ to arbitrary $m$.
- **Theorem 1: Differentiability ⟺ Component-wise Differentiability** — $f: \mathbb{R}^n \to \mathbb{R}^m$ is differentiable at $a$ if and only if each component $f_i: \mathbb{R}^n \to \mathbb{R}$ is differentiable at $a$ (in the sense of Definition 4 from Topic 9). When $f$ is differentiable, the rows of the Jacobian are the gradients of the component functions.
- **Proof of Theorem 1** — ($\Rightarrow$) If $\frac{\|f(a+h) - f(a) - J_f(a)h\|}{\|h\|} \to 0$, then each component satisfies $\frac{|f_i(a+h) - f_i(a) - \nabla f_i(a) \cdot h|}{\|h\|} \le \frac{\|f(a+h) - f(a) - J_f(a)h\|}{\|h\|} \to 0$ since the absolute value of each component is bounded by the norm of the vector. ($\Leftarrow$) If each $f_i$ is differentiable at $a$, then $\|f(a+h) - f(a) - J_f(a)h\|^2 = \sum_{i=1}^m |f_i(a+h) - f_i(a) - \nabla f_i(a) \cdot h|^2$, and each summand is $o(\|h\|^2)$ by hypothesis, so the sum is $o(\|h\|^2)$, giving $\|f(a+h) - f(a) - J_f(a)h\| = o(\|h\|)$.
- **Proposition 1: The Jacobian Approximation** — If $f: \mathbb{R}^n \to \mathbb{R}^m$ is differentiable at $a$, then $f(a + h) \approx f(a) + J_f(a) \cdot h$ with error $o(\|h\|)$. This is the multivariable Taylor expansion to first order for vector-valued functions. Geometrically: the affine map $h \mapsto f(a) + J_f(a)h$ is the best linear approximation to $f$ near $a$, just as the tangent plane was the best linear approximation for scalar-valued functions.
- **Example 4: Linear approximation of polar-to-Cartesian** — Near $(r, \theta) = (2, \pi/4)$, the polar-to-Cartesian map $f(r, \theta) = (r\cos\theta, r\sin\theta)$ is approximated by $f\begin{pmatrix} 2 + \Delta r \\ \pi/4 + \Delta\theta \end{pmatrix} \approx \begin{pmatrix} \sqrt{2} \\ \sqrt{2} \end{pmatrix} + \begin{pmatrix} 1/\sqrt{2} & -\sqrt{2} \\ 1/\sqrt{2} & \sqrt{2} \end{pmatrix} \begin{pmatrix} \Delta r \\ \Delta\theta \end{pmatrix}$. A small change in $(r, \theta)$ maps to a change in $(x, y)$ via matrix multiplication — the Jacobian acts on the perturbation.

**Visualization:** `JacobianLinearApproxExplorer` embedded here.

**Static image:** `jacobian-linear-approximation.png` from the notebook.

### Section 4: The Multivariate Chain Rule

**The central theorem of this topic.** The chain rule says: the derivative of a composition is the product of the derivatives. In single-variable calculus (Topic 5), this meant multiplying numbers: $(f \circ g)'(a) = f'(g(a)) \cdot g'(a)$. Now, the "derivatives" are matrices, and the "product" is matrix multiplication.

**TheoremBlocks:**

- **Theorem 2: The Multivariate Chain Rule** — Let $g: \mathbb{R}^n \to \mathbb{R}^k$ be differentiable at $a \in \mathbb{R}^n$, and let $f: \mathbb{R}^k \to \mathbb{R}^m$ be differentiable at $g(a) \in \mathbb{R}^k$. Then the composition $f \circ g: \mathbb{R}^n \to \mathbb{R}^m$ is differentiable at $a$, and $J_{f \circ g}(a) = J_f(g(a)) \cdot J_g(a).$ The Jacobian of the composition is the matrix product of the Jacobians, evaluated at the appropriate points. The dimensions are consistent: $J_f$ is $m \times k$, $J_g$ is $k \times n$, so $J_f \cdot J_g$ is $m \times n$ — matching the expected size for a function from $\mathbb{R}^n$ to $\mathbb{R}^m$.
- **Proof of Theorem 2** — This is the most important proof in the topic. Full expansion. Define the error functions: by differentiability of $g$ at $a$, $g(a + h) = g(a) + J_g(a)h + \varepsilon_g(h)\|h\|$ where $\varepsilon_g(h) \to 0$ as $h \to 0$. By differentiability of $f$ at $b = g(a)$, $f(b + \ell) = f(b) + J_f(b)\ell + \varepsilon_f(\ell)\|\ell\|$ where $\varepsilon_f(\ell) \to 0$ as $\ell \to 0$. Set $\ell = g(a+h) - g(a) = J_g(a)h + \varepsilon_g(h)\|h\|$. Then $(f \circ g)(a+h) = f(g(a) + \ell) = f(b) + J_f(b)\ell + \varepsilon_f(\ell)\|\ell\|$. Substituting $\ell$: $= f(b) + J_f(b)[J_g(a)h + \varepsilon_g(h)\|h\|] + \varepsilon_f(\ell)\|\ell\|$ $= f(b) + J_f(b)J_g(a)h + [J_f(b)\varepsilon_g(h)\|h\| + \varepsilon_f(\ell)\|\ell\|]$. The term in brackets must be shown to be $o(\|h\|)$. The first part: $\|J_f(b)\varepsilon_g(h)\|h\|\| \le \|J_f(b)\| \cdot \|\varepsilon_g(h)\| \cdot \|h\|$, and $\|\varepsilon_g(h)\| \to 0$, so this is $o(\|h\|)$. The second part: $\|\ell\| \le \|J_g(a)\| \cdot \|h\| + \|\varepsilon_g(h)\| \cdot \|h\| \le C\|h\|$ for some constant $C$ (since $\|J_g(a)\|$ is bounded and $\|\varepsilon_g(h)\|$ is small for small $h$). As $h \to 0$, $\ell \to 0$, so $\varepsilon_f(\ell) \to 0$, and $\|\varepsilon_f(\ell)\| \cdot \|\ell\| \le \|\varepsilon_f(\ell)\| \cdot C\|h\| = o(\|h\|)$. Therefore $(f \circ g)(a+h) = (f \circ g)(a) + J_f(g(a)) J_g(a) h + o(\|h\|)$, proving $J_{f \circ g}(a) = J_f(g(a)) \cdot J_g(a)$.
- **Example 5: Chain rule with explicit matrices** — Let $g: \mathbb{R}^2 \to \mathbb{R}^2$ by $g(x, y) = (x^2 + y, xy)$ and $f: \mathbb{R}^2 \to \mathbb{R}$ by $f(u, v) = u^2 + v^2$. Then $J_g(x,y) = \begin{pmatrix} 2x & 1 \\ y & x \end{pmatrix}$ and $J_f(u,v) = \begin{pmatrix} 2u & 2v \end{pmatrix}$. At $(x,y) = (1,1)$: $g(1,1) = (2, 1)$, $J_g(1,1) = \begin{pmatrix} 2 & 1 \\ 1 & 1 \end{pmatrix}$, $J_f(2,1) = \begin{pmatrix} 4 & 2 \end{pmatrix}$. Chain rule: $J_{f \circ g}(1,1) = \begin{pmatrix} 4 & 2 \end{pmatrix} \begin{pmatrix} 2 & 1 \\ 1 & 1 \end{pmatrix} = \begin{pmatrix} 10 & 6 \end{pmatrix}$. Verify by direct computation: $(f \circ g)(x,y) = (x^2+y)^2 + (xy)^2$, so $\frac{\partial}{\partial x}(f \circ g) = 2(x^2+y)(2x) + 2(xy)(y) = 4x(x^2+y) + 2xy^2$. At $(1,1)$: $4(1)(2) + 2(1)(1) = 10$. Confirmed.
- **Example 6: Three-fold composition** — For a three-layer chain $h \circ g \circ f$: $J_{h \circ g \circ f}(a) = J_h(g(f(a))) \cdot J_g(f(a)) \cdot J_f(a)$. The chain rule applies recursively — each Jacobian is evaluated at the appropriate intermediate value. This is the prototype for backpropagation through $K$ layers.
- **Remark 2: Why matrix multiplication?** — The chain rule is matrix multiplication because derivatives are linear maps, and composition of linear maps corresponds to matrix multiplication. The single-variable chain rule $(f \circ g)' = f' \cdot g'$ multiplies $1 \times 1$ matrices — it just looks like scalar multiplication. In $\mathbb{R}^n$, the matrix structure is exposed, and the product $J_f \cdot J_g$ captures how sensitivities propagate through layers of computation.

**Visualization:** `ChainRuleMatrixExplorer` embedded here — the flagship visualization.

**Static image:** `chain-rule-matrix-product.png` from the notebook.

### Section 5: The Jacobian Determinant

**Volume distortion by differentiable maps.** When $f: \mathbb{R}^n \to \mathbb{R}^n$ (square Jacobian), the determinant $\det J_f(a)$ has a geometric meaning: it measures how $f$ scales volumes near $a$.

**TheoremBlocks:**

- **Definition 4: The Jacobian Determinant** — For $f: \mathbb{R}^n \to \mathbb{R}^n$ with all partial derivatives existing at $a$, the *Jacobian determinant* is $\det J_f(a) = \det \begin{pmatrix} \frac{\partial f_1}{\partial x_1} & \cdots & \frac{\partial f_1}{\partial x_n} \\ \vdots & \ddots & \vdots \\ \frac{\partial f_n}{\partial x_1} & \cdots & \frac{\partial f_n}{\partial x_n} \end{pmatrix}(a).$
- **Theorem 3: Volume Distortion** — Let $f: \mathbb{R}^n \to \mathbb{R}^n$ be continuously differentiable near $a$, and let $R$ be a small rectangular region containing $a$. Then the image $f(R)$ has volume approximately $|\det J_f(a)| \cdot \text{vol}(R)$. More precisely: $\text{vol}(f(R)) = |\det J_f(a)| \cdot \text{vol}(R) + o(\text{vol}(R))$ as the diameter of $R$ shrinks to zero. The absolute value handles orientation: $\det J_f(a) > 0$ means $f$ preserves orientation; $\det J_f(a) < 0$ means it reverses orientation.
- **Example 7: Polar coordinates** — For $f(r, \theta) = (r\cos\theta, r\sin\theta)$: $\det J_f = \det \begin{pmatrix} \cos\theta & -r\sin\theta \\ \sin\theta & r\cos\theta \end{pmatrix} = r\cos^2\theta + r\sin^2\theta = r.$ This is the $r$ in "$r\,dr\,d\theta$" for polar integration. The Jacobian determinant tells us that near $(r, \theta)$, a small $dr \times d\theta$ rectangle in polar coordinates maps to a region of area $r\,dr\,d\theta$ in Cartesian coordinates.
- **Example 8: Scaling transformation** — For $f(x, y) = (2x, 3y)$: $J_f = \begin{pmatrix} 2 & 0 \\ 0 & 3 \end{pmatrix}$, $\det J_f = 6$. Every region's area is multiplied by 6 under $f$. The $2 \times 3$ rectangle maps to a region 6 times larger — consistent with stretching by 2 in $x$ and by 3 in $y$.
- **Proposition 2: Jacobian Determinant of a Composition** — For $f, g: \mathbb{R}^n \to \mathbb{R}^n$, $\det J_{f \circ g}(a) = \det J_f(g(a)) \cdot \det J_g(a).$ This follows from the chain rule ($J_{f \circ g} = J_f \cdot J_g$) and the multiplicativity of determinants ($\det(AB) = \det A \cdot \det B$). Geometrically: volume distortions compose multiplicatively.
- **Remark 3: When the Jacobian determinant is zero** — $\det J_f(a) = 0$ means the linear approximation $J_f(a)$ is not invertible — it "collapses" a neighborhood into a lower-dimensional set. This is the boundary between the Inverse Function Theorem applying (nonzero determinant → $f$ is locally invertible) and failing (zero determinant → critical value). → **Inverse & Implicit Function Theorems** *(coming soon)*

**Visualization:** `JacobianDeterminantExplorer` embedded here.

**Static image:** `jacobian-determinant-area.png` from the notebook.

### Section 6: Coordinate Transformations

**The Jacobian in action.** Coordinate transformations are the most concrete application of the Jacobian determinant. The reader has already seen polar coordinates (Example 7). This section systematizes the pattern and introduces spherical coordinates.

- Polar coordinates: $(r, \theta) \mapsto (r\cos\theta, r\sin\theta)$, $\det J = r$, area element $dA = r\,dr\,d\theta$.
- Spherical coordinates: $(r, \theta, \phi) \mapsto (r\sin\phi\cos\theta, r\sin\phi\sin\theta, r\cos\phi)$, $\det J = r^2\sin\phi$, volume element $dV = r^2\sin\phi\,dr\,d\theta\,d\phi$. Full Jacobian computation shown.
- General affine transformation: $f(x) = Ax + b$, $\det J_f = \det A$. Rotation ($\det A = 1$), reflection ($\det A = -1$), dilation ($|\det A| \neq 1$).
- **Remark 4: Preview of the change-of-variables formula** — The pattern $\int_{f(U)} h(x)\,dx = \int_U h(f(u)) \cdot |\det J_f(u)|\,du$ will be formalized as the Change of Variables theorem in Track 4 (**Change of Variables** *(coming soon)*). This topic provides the Jacobian machinery; the integration theory provides the rigorous justification.

**Static image:** `coordinate-transformations.png` from the notebook.

### Section 7: Computational Notes

**NumPy/JAX/PyTorch implementation.** Computing Jacobians numerically and via automatic differentiation.

- **Numerical Jacobian:** Compute $J_f$ by applying central differences to each input: column $j$ of $J_f$ is $\frac{f(a + h\mathbf{e}_j) - f(a - h\mathbf{e}_j)}{2h}$. This costs $2n$ function evaluations for an $m \times n$ Jacobian (vs. $2$ for a gradient).
- **`jax.jacobian`:** Computes the full Jacobian via forward-mode AD. `jax.jacobian(f)(x)` returns the $m \times n$ matrix. Under the hood, this runs $n$ forward passes (one per input dimension) — efficient when $n$ is small relative to $m$.
- **Jacobian-vector products (JVPs) and vector-Jacobian products (VJPs):** Computing the full Jacobian is often unnecessary. Forward-mode AD computes $J_f(a) \cdot v$ (a JVP) in one forward pass. Reverse-mode AD computes $w^T \cdot J_f(a)$ (a VJP) in one backward pass. For backpropagation, we need VJPs — and the cost is $O(1)$ backward passes regardless of the number of inputs.
- Code example: `jax.jvp` vs. `jax.vjp`, `torch.autograd.functional.jvp` vs. `torch.autograd.functional.vjp`.

**Static image:** `jacobian-computation-comparison.png` from the notebook.

### Section 8: Connections to ML — Backpropagation & Normalizing Flows

**Substantial section — the most important ML connection in the entire curriculum.** This section is not an afterthought. Backpropagation *is* the multivariate chain rule, and this is where that identification is made precise.

**Subsection 8.1: Backpropagation is the multivariate chain rule.**

A $K$-layer neural network computes $\hat{y} = f_K \circ f_{K-1} \circ \cdots \circ f_1(x)$, where each $f_k(z) = \sigma_k(W_k z + b_k)$. The loss is $L(\hat{y}, y)$. By the chain rule (Theorem 2), $J_{L \circ f_K \circ \cdots \circ f_1}(x) = J_L \cdot J_{f_K} \cdot J_{f_{K-1}} \cdots J_{f_1}$, where each $J_{f_k}$ is evaluated at the appropriate intermediate activation. For a scalar loss ($L: \mathbb{R}^{n_{K+1}} \to \mathbb{R}$), $J_L$ is $1 \times n_{K+1}$ (a row vector — the gradient of $L$). The gradient with respect to the input $x$ is the row vector obtained by multiplying $J_L$ from the left through the entire chain.

**Subsection 8.2: Forward mode vs. reverse mode.**

The chain rule product $J_L \cdot J_{f_K} \cdots J_{f_1}$ can be evaluated left-to-right (reverse mode, backprop) or right-to-left (forward mode). For a scalar loss and $p$ parameters: reverse mode computes $\nabla_\theta L$ in one backward pass ($O(p)$ work, same order as one forward pass). Forward mode would require $p$ forward passes — one per parameter. This asymmetry is why reverse-mode AD (backprop) dominates deep learning.

**Subsection 8.3: Jacobians in normalizing flows.**

Normalizing flows transform a simple base density $p_z(z)$ through an invertible function $f$ to produce a complex density $p_x(x)$. By the change-of-variables formula: $p_x(x) = p_z(f^{-1}(x)) \cdot |\det J_{f^{-1}}(x)|$, or equivalently $\log p_x(f(z)) = \log p_z(z) - \log|\det J_f(z)|$. The Jacobian determinant is the "volume correction" that accounts for how $f$ stretches or compresses probability mass. Architectures like RealNVP and GLOW use coupling layers with triangular Jacobians so that $\det J_f$ is cheap to compute (product of diagonal entries).

**Subsection 8.4: Jacobian regularization.**

Adding $\|J_f\|_F^2$ (Frobenius norm of the Jacobian) as a regularizer encourages the function to be smooth — a small Jacobian norm means small sensitivity to input perturbations. This is a form of Lipschitz regularization: $\|f(x) - f(x')\| \le \|J_f\| \cdot \|x - x'\|$ (from the linear approximation). Used in adversarial robustness, generative models, and physics-informed neural networks.

Forward references (external links, new tab):
- [Gradient Descent](https://formalml.com/topics/gradient-descent) → formalML
- [Smooth Manifolds](https://formalml.com/topics/smooth-manifolds) → formalML
- [Information Geometry](https://formalml.com/topics/information-geometry) → formalML

Forward references (within formalCalculus, plain text):
- **The Hessian & Second-Order Analysis** *(coming soon)* classifies critical points using the Hessian ($= J(\nabla f)$) and analyzes loss surface curvature.
- **Inverse & Implicit Function Theorems** *(coming soon)* guarantees local invertibility of $f$ when $\det J_f(a) \neq 0$.
- **Change of Variables** *(coming soon)* formalizes the integration formula $\int_{f(U)} h(x)\,dx = \int_U h(f(u)) |\det J_f(u)|\,du$.

**Static image:** `backpropagation-chain-rule.png` from the notebook.

### Section 9: Connections & Further Reading

Standard cross-reference table linking to all referenced formalCalculus topics and formalml.com topics. DAG diagram showing `jacobian`'s position in the prerequisite graph: `derivative → gradient → jacobian → hessian → inverse-implicit`.

---

## 4. Visualizations

### 4.1 JacobianGridExplorer (Flagship)

- **Component name:** `JacobianGridExplorer`
- **Filename:** `src/components/viz/JacobianGridExplorer.tsx`
- **What it visualizes:** A 2D input grid on the left panel is mapped through a function $f: \mathbb{R}^2 \to \mathbb{R}^2$ to produce a deformed output grid on the right panel. The user selects a point $a$ on the input grid, and the Jacobian matrix $J_f(a)$ is displayed. A small colored square near $a$ is shown on the left; its image under $f$ (a parallelogram determined by $J_f(a)$) is shown on the right. This makes the Jacobian concrete: you see how the matrix distorts the local neighborhood. The Jacobian determinant is displayed as the area ratio.
- **User interactions:**
  - Click/drag a point $a$ on the input grid to evaluate the Jacobian at that location.
  - Function preset dropdown: polar-to-Cartesian $(r\cos\theta, r\sin\theta)$, nonlinear map $(x^2 - y^2, 2xy)$ (complex squaring), shear $(x + y, y)$, spiral $(e^x\cos y, e^x\sin y)$ (conformal map).
  - Grid density slider: 5×5 to 20×20 grid lines.
  - Toggle: "Show unit square image" — displays how the unit tangent square at $a$ maps to a parallelogram under $J_f(a)$.
- **Numerical readout panel:** $a$, $f(a)$, $J_f(a)$ (matrix entries), $\det J_f(a)$, $|\det J_f(a)|$ (area scaling factor).
- **Data source:** Inline computation via `multivariate.ts`.
- **Panel layout:** Two-panel side-by-side: left = input domain with grid and selected point, right = output domain with deformed grid and image point. Readout panel below.
- **Reference pattern:** This is the flagship visualization, paralleling `PartialDerivativeSliceExplorer` (Topic 9) and `SecantToTangentExplorer` (Topic 5). The grid deformation immediately makes the Jacobian concrete: you *see* what the matrix does.

### 4.2 JacobianLinearApproxExplorer

- **Component name:** `JacobianLinearApproxExplorer`
- **Filename:** `src/components/viz/JacobianLinearApproxExplorer.tsx`
- **What it visualizes:** Compares $f(a + h)$ (the true output) with $f(a) + J_f(a) \cdot h$ (the linear approximation) as $h$ varies. A circle of radius $\epsilon$ around $a$ in the input space maps to a deformed ellipse-like region under $f$ and to an exact ellipse under the linear approximation $J_f(a)$. As $\epsilon \to 0$, the two images converge — demonstrating that the Jacobian is the best linear approximation.
- **User interactions:**
  - $\epsilon$ slider: radius of the perturbation circle, from 0.05 to 2.0.
  - Click/drag $a$ on the input plane.
  - Function preset dropdown: same as JacobianGridExplorer.
  - Toggle: "Show approximation error" — colors the gap between exact and approximate images.
- **Numerical readout:** Approximation error $\|f(a+h) - f(a) - J_f(a)h\|$ averaged over the circle boundary.
- **Data source:** Inline computation via `multivariate.ts`.
- **Panel layout:** Two-panel: left = input space with point and perturbation circle, right = output space with exact image curve and approximate image ellipse overlaid.

### 4.3 ChainRuleMatrixExplorer

- **Component name:** `ChainRuleMatrixExplorer`
- **Filename:** `src/components/viz/ChainRuleMatrixExplorer.tsx`
- **What it visualizes:** A computation graph with nodes representing functions and edges representing data flow. At each node, the Jacobian matrix is displayed. The product of Jacobians along the chain is computed and displayed at the output. The user can modify input values and watch the Jacobians update. A "forward mode"/"reverse mode" toggle animates the matrix product computation left-to-right vs. right-to-left, visually demonstrating the difference between forward and reverse AD.
- **User interactions:**
  - Computation graph preset: "Two-layer" ($f \circ g$), "Three-layer" ($h \circ g \circ f$), "Neural network" (input → linear → sigmoid → linear → loss).
  - Input slider: adjusts the input values fed through the graph.
  - Toggle: "Forward mode" / "Reverse mode" — animates the order of matrix multiplication.
  - "Step" button: advance one multiplication step. "Run" button: animate full computation.
- **Numerical readout:** Each node's Jacobian, the running product, and the final result.
- **Data source:** Inline computation via `multivariate.ts` chain rule functions.
- **Panel layout:** Single wide panel with computation graph (horizontal flow), Jacobian matrices displayed at each node, and the accumulated product shown below the graph.

### 4.4 JacobianDeterminantExplorer

- **Component name:** `JacobianDeterminantExplorer`
- **Filename:** `src/components/viz/JacobianDeterminantExplorer.tsx`
- **What it visualizes:** A function $f: \mathbb{R}^2 \to \mathbb{R}^2$ maps a small colored square near point $a$ to a parallelogram. The area of the parallelogram divided by the area of the square converges to $|\det J_f(a)|$ as the square shrinks. A heatmap of $|\det J_f(x)|$ over the domain shows where the function compresses (det close to 0), preserves (det close to 1), or expands (det > 1) area.
- **User interactions:**
  - Click/drag $a$ on the input domain.
  - Square size slider: shrink the colored square to demonstrate convergence to $|\det J_f|$.
  - Function preset dropdown: polar-to-Cartesian, scaling $(2x, 3y)$, rotation, nonlinear map.
  - Toggle: "Show $|\det J|$ heatmap" — overlays a color-coded map of the Jacobian determinant magnitude.
- **Numerical readout:** $\det J_f(a)$, area of input square, area of output image, ratio (converging to $|\det J_f|$).
- **Data source:** Inline computation via `multivariate.ts`.
- **Panel layout:** Two-panel: left = input with colored square, right = output with parallelogram image. Heatmap toggle overlays on the left panel.

---

## 5. Data Modules

### 5.1 `jacobian-data.ts`

- **Filename:** `src/data/jacobian-data.ts`
- **Exported interfaces:**

```typescript
interface VectorFieldPreset {
  name: string;
  label: string;                              // Display label
  f: (x: number, y: number) => [number, number];   // f: ℝ² → ℝ²
  J: (x: number, y: number) => [[number, number], [number, number]];  // Analytical Jacobian
  xDomain: [number, number];
  yDomain: [number, number];
  defaultPoint: [number, number];
  description?: string;                       // e.g., "complex squaring"
}

interface ChainRulePreset {
  name: string;
  label: string;
  layers: Array<{
    label: string;                            // e.g., "g", "f", "L"
    f: (...args: number[]) => number[];       // The function
    J: (...args: number[]) => number[][];     // The Jacobian (analytical)
    inputDim: number;
    outputDim: number;
  }>;
  defaultInput: number[];
}

interface CoordinateTransformPreset {
  name: string;
  label: string;
  forward: (u: number, v: number) => [number, number];
  jacobian: (u: number, v: number) => [[number, number], [number, number]];
  detJ: (u: number, v: number) => number;
  uDomain: [number, number];
  vDomain: [number, number];
  areaElement: string;                        // LaTeX string, e.g., "r\\,dr\\,d\\theta"
}
```

- **Exported constants:**
  - `VECTOR_FIELD_PRESETS: VectorFieldPreset[]` — 4 presets for JacobianGridExplorer, JacobianLinearApproxExplorer, and JacobianDeterminantExplorer: polar-to-Cartesian, complex squaring $(x^2 - y^2, 2xy)$, shear $(x + y, y)$, conformal exponential $(e^x\cos y, e^x\sin y)$.
  - `CHAIN_RULE_PRESETS: ChainRulePreset[]` — 3 presets for ChainRuleMatrixExplorer: two-function composition, three-function composition, neural network (linear → sigmoid → linear → squared-error loss).
  - `COORDINATE_TRANSFORM_PRESETS: CoordinateTransformPreset[]` — 3 presets: polar, spherical (projected to 2D slice), and affine scaling.

- **Computation:** All eager (function references are cheap; no heavy computation at import time).

---

## 6. Shared Utility Module Updates: `multivariate.ts`

### Location

```
src/components/viz/shared/multivariate.ts
```

### New Interfaces (add to existing module)

```typescript
/** Jacobian matrix result at a point */
export interface JacobianResult {
  point: number[];           // evaluation point
  matrix: number[][];        // m × n Jacobian matrix
  inputDim: number;          // n
  outputDim: number;         // m
}

/** Jacobian determinant result (only for square Jacobians) */
export interface JacobianDetResult {
  point: number[];
  determinant: number;       // det J_f(a)
  absDeteminant: number;     // |det J_f(a)| (area scaling)
  orientationPreserved: boolean;  // det > 0
}

/** Chain rule computation step */
export interface ChainRuleStep {
  layerIndex: number;
  inputPoint: number[];
  outputPoint: number[];
  jacobian: number[][];
  accumulatedProduct: number[][];  // Product of Jacobians so far
}

/** Complete chain rule result */
export interface ChainRuleResult {
  steps: ChainRuleStep[];
  finalJacobian: number[][];
  inputDim: number;
  outputDim: number;
}

/** Area distortion data for visualization */
export interface AreaDistortionResult {
  inputVertices: Array<[number, number]>;   // Corners of input square
  outputVertices: Array<[number, number]>;  // Corners of output parallelogram
  inputArea: number;
  outputArea: number;
  detJ: number;
  ratio: number;                            // outputArea / inputArea
}
```

### New Functions (add to existing module)

```typescript
/** Compute the Jacobian matrix numerically via central differences.
 *  f: ℝⁿ → ℝᵐ, returns m × n matrix. */
export function jacobianMatrix(
  f: (...args: number[]) => number[],
  point: number[],
  h?: number                  // step size, default 1e-7
): JacobianResult;

/** Compute the Jacobian determinant for f: ℝⁿ → ℝⁿ (square case).
 *  Throws if the Jacobian is not square. */
export function jacobianDeterminant(
  f: (...args: number[]) => number[],
  point: number[],
  h?: number
): JacobianDetResult;

/** Apply the multivariate chain rule to a sequence of differentiable functions.
 *  Computes J_{fₖ ∘ ... ∘ f₁}(x₀) = J_fₖ(...) · ... · J_f₁(x₀).
 *  Returns all intermediate steps for visualization. */
export function multivariateChainRule(
  functions: Array<{
    f: (...args: number[]) => number[];
    J: (...args: number[]) => number[][];  // analytical Jacobian
  }>,
  input: number[]
): ChainRuleResult;

/** Multiply two matrices (for composing Jacobians).
 *  A is m × k, B is k × n, returns m × n. */
export function linearMapComposition(
  A: number[][],
  B: number[][]
): number[][];

/** Compute the area distortion of a small square under f: ℝ² → ℝ².
 *  Maps a square of given size centered at `point` through `f`
 *  and returns both the exact image and the linear approximation image. */
export function areaDistortion(
  f: (x: number, y: number) => [number, number],
  point: [number, number],
  squareSize: number,
  J?: [[number, number], [number, number]]  // optional analytical Jacobian
): AreaDistortionResult;

/** Apply a coordinate transformation to a grid of points.
 *  Returns input and output grids for visualization. */
export function coordinateTransform(
  transform: (u: number, v: number) => [number, number],
  uDomain: [number, number],
  vDomain: [number, number],
  gridSize?: number           // samples per axis, default 20
): {
  inputGrid: Array<[number, number]>;
  outputGrid: Array<[number, number]>;
  inputLines: Array<Array<[number, number]>>;   // grid lines in input space
  outputLines: Array<Array<[number, number]>>;  // grid lines in output space
};
```

### Helper Function (internal, not exported)

```typescript
/** Compute determinant of a square matrix.
 *  Uses cofactor expansion for n ≤ 3, LU decomposition for n > 3. */
function determinant(M: number[][]): number;
```

### Backward Compatibility

All existing functions in `multivariate.ts` remain unchanged:
- `numericalGradient`, `analyticalGradient`, `directionalDerivative` — unchanged
- `generateContours`, `generateWireframe`, `project3D` — unchanged
- `gradientDescent`, `gradientFlow`, `checkDifferentiability` — unchanged

The new functions extend the module with Jacobian-specific computation. `jacobianMatrix` generalizes `numericalGradient` to vector-valued functions (when $m = 1$, the Jacobian is a $1 \times n$ matrix, consistent with the gradient being a row vector). The existing `linearMapComposition` function is new; do not confuse with any existing function.

Designed to be extended by:
- Topic 11 (`hessian`): adds `hessianMatrix`, `eigenvalues2x2`, `classifyCriticalPoint`, `newtonStep`
- Topic 12 (`inverse-implicit`): adds `inverseJacobianApprox`, `implicitFunctionSlice`, `newtonMethod`

---

## 7. Curriculum Graph Updates

### `src/data/curriculum-graph.json`

**Change node status:**
```json
{ "id": "jacobian", "label": "The Jacobian & Multivariate Chain Rule", "domain": "multivar-differential", "status": "published", "url": "/topics/jacobian" }
```
Change `"status"` from `"planned"` to `"published"`.

**Edges** (should already exist — verify):
```json
{ "source": "gradient", "target": "jacobian" }
{ "source": "jacobian", "target": "hessian" }
```

If the `gradient → jacobian` edge does not exist, add it. The `jacobian → hessian` edge should already be in the planned DAG. Also verify that the `jacobian → inverse-implicit` edge exists:
```json
{ "source": "jacobian", "target": "inverse-implicit" }
```

### `src/data/curriculum.ts`

In the `multivar-differential` track definition, move `"The Jacobian & Multivariate Chain Rule"` from `planned` to `published`. The remaining two topics (`hessian`, `inverse-implicit`) stay in `planned`.

---

## 8. Cross-References

### Existing topics that should link TO this topic

- **`gradient.mdx`** — Remark 1 mentions "In the next topic (Jacobian), the derivative of a vector-valued function becomes a matrix." If this contains a forward reference to the Jacobian topic as "coming soon," update it to a live link: `[The Jacobian & Multivariate Chain Rule](/topics/jacobian)`. Also check Section 9 (backpropagation preview) and Definition 4 (which mentions the Jacobian matrix for $f: \mathbb{R}^n \to \mathbb{R}^m$).
- **`derivative.mdx`** — Remark 3 mentions "$(J_{f \circ g})(a) = J_f(g(a)) \cdot J_g(a)$" as a forward reference. If it says "coming soon," update to a live link.

### Topics this topic links FROM

- `gradient` — prerequisite (live link)
- `derivative` — single-variable chain rule as $1 \times 1$ case (live link)
- `epsilon-delta` — multivariable limits in the total derivative definition (live link)
- `completeness-compactness` — compactness in ℝⁿ (live link)

### Forward references to planned topics (plain text + "(coming soon)")

- **The Hessian & Second-Order Analysis** *(coming soon)* — referenced in Section 8 (critical point classification, second derivative test, Hessian as Jacobian of the gradient)
- **Inverse & Implicit Function Theorems** *(coming soon)* — referenced in Section 5 (Remark 3: $\det J_f(a) \neq 0$ implies local invertibility)
- **Change of Variables** *(coming soon)* — referenced in Section 6 (Remark 4: Jacobian determinant in integration)

### formalml.com forward links (informational, external, new tab)

- `gradient-descent` — Sections 8.1, 8.2
- `smooth-manifolds` — Section 8 (pushforward as Jacobian)
- `information-geometry` — Section 8 (Fisher information matrix transformation)

---

## 9. Images

Copy the following images from the notebook export to `public/images/topics/jacobian/`:

| # | Filename | Description |
|---|----------|-------------|
| 1 | `jacobian-matrix-construction.png` | Three-panel: component functions of $f: \mathbb{R}^2 \to \mathbb{R}^2$, their gradients as rows, and the assembled Jacobian matrix |
| 2 | `jacobian-linear-approximation.png` | Two-panel: circle in input space mapped through $f$ (deformed shape) vs. through $J_f$ (ellipse), with error plot as radius → 0 |
| 3 | `chain-rule-matrix-product.png` | Computation graph with explicit Jacobian matrices at each node and the accumulated product shown step by step |
| 4 | `jacobian-determinant-area.png` | Three-panel: unit square under scaling ($\det = 6$), rotation ($\det = 1$), and polar map ($\det = r$), with area ratios annotated |
| 5 | `coordinate-transformations.png` | Two-panel: polar grid lines mapped to Cartesian, with $|\det J| = r$ heatmap showing non-uniform area distortion |
| 6 | `backpropagation-chain-rule.png` | Neural network computation graph with forward pass (top) and backward pass (bottom), Jacobians at each layer, VJP arrows flowing right-to-left |
| 7 | `normalizing-flows-jacobian.png` | Two-panel: base density $p_z$ (Gaussian) transformed through invertible $f$ to complex density $p_x$, with $|\det J_f|$ heatmap showing the volume correction |
| 8 | `forward-vs-reverse-mode.png` | Side-by-side animation frames: forward mode (left-to-right JVPs) vs. reverse mode (right-to-left VJPs) through a computation graph, with complexity annotations |
| 9 | `grid-deformation-gallery.png` | Four-panel: regular grid deformed by polar map, complex squaring, conformal exponential, and shear — each with Jacobian matrix and determinant at a sample point |

---

## 10. Testing Checklist

### Build & route

- [ ] `pnpm build` succeeds with zero errors
- [ ] Page renders at `/topics/jacobian`
- [ ] "Intermediate" difficulty badge is styled correctly (yellow/amber)
- [ ] `jacobian` appears under the Multivariable Differential Calculus track on the curriculum page
- [ ] `gradient` shows as "published," `jacobian` shows as "published," remaining Track 3 topics show as "coming soon"
- [ ] Pagefind indexes the new topic on rebuild

### Content

- [ ] All TheoremBlocks render LaTeX correctly (4 Definitions, 3 Theorems, 8 Examples, 4 Remarks, 2 Propositions, 3 Proofs)
- [ ] All 9 static images load from `public/images/topics/jacobian/`
- [ ] All internal cross-references resolve (links to `gradient`, `derivative`, `epsilon-delta`, `completeness-compactness` work)
- [ ] All formalml.com links open in a new tab with `target="_blank" rel="noopener"`
- [ ] All forward references to unwritten topics use plain text + "(coming soon)"

### Visualizations

- [ ] All 4 viz components load on scroll (`client:visible`)
- [ ] `JacobianGridExplorer` click/drag updates Jacobian matrix at selected point
- [ ] `JacobianGridExplorer` function preset dropdown changes the mapping and deformed grid
- [ ] `JacobianGridExplorer` grid density slider adjusts number of grid lines
- [ ] `JacobianGridExplorer` "Show unit square image" toggle displays parallelogram
- [ ] `JacobianLinearApproxExplorer` epsilon slider shows convergence of approximation
- [ ] `JacobianLinearApproxExplorer` error display updates with epsilon
- [ ] `ChainRuleMatrixExplorer` forward/reverse mode toggle animates multiplication order
- [ ] `ChainRuleMatrixExplorer` computation graph presets render correctly
- [ ] `ChainRuleMatrixExplorer` "Step" and "Run" buttons work
- [ ] `JacobianDeterminantExplorer` square size slider demonstrates area convergence
- [ ] `JacobianDeterminantExplorer` heatmap toggle displays $|\det J|$ over domain

### Cross-references

- [ ] Links to `gradient` work (resolve to published page)
- [ ] `gradient.mdx` updated: Jacobian forward references are now live links (Remark 1, Section 9, Definition 4)
- [ ] `derivative.mdx` updated: Jacobian forward reference is now a live link (Remark 3)
- [ ] All other forward references use plain text + "(coming soon)"
- [ ] All formalml.com links open in a new tab with `target="_blank" rel="noopener"`

### Infrastructure

- [ ] `multivariate.ts` extended with new Jacobian functions — compiles with no TypeScript errors
- [ ] All existing `multivariate.ts` functions unchanged (backward compatibility preserved)
- [ ] `jacobian-data.ts` data module compiles
- [ ] No modifications to `limits.ts`, `differentiation.ts`, or `integration.ts`
- [ ] Page is responsive (viz components stack vertically on mobile)
- [ ] Curriculum graph shows `jacobian` as "published" (not "coming soon")
- [ ] `gradient → jacobian` edge renders in the prerequisite graph

---

## 11. Build Order

1. **Extend `src/components/viz/shared/multivariate.ts`** — Add the new interfaces (`JacobianResult`, `JacobianDetResult`, `ChainRuleStep`, `ChainRuleResult`, `AreaDistortionResult`) and functions (`jacobianMatrix`, `jacobianDeterminant`, `multivariateChainRule`, `linearMapComposition`, `areaDistortion`, `coordinateTransform`, and the internal `determinant` helper). Write console log tests to verify. Do not modify any existing functions or interfaces.
2. **Create `src/data/jacobian-data.ts`** — Vector field presets, chain rule presets, coordinate transform presets. Verify exports compile.
3. **Create `jacobian.mdx`** with full frontmatter and all markdown/LaTeX content. Use `TheoremBlock` for all formal elements (4 definitions, 3 theorems, 2 propositions, 8 examples, 4 remarks, 3 proofs). No interactive components yet — just the prose and static images.
4. Copy notebook figures to `public/images/topics/jacobian/` and verify they load in the MDX.
5. **Build `JacobianGridExplorer.tsx`** — the flagship component. Start with the input grid rendering, then add the function mapping and deformed output grid, then add the Jacobian matrix display and unit square parallelogram. Uses `coordinateTransform` and `jacobianMatrix` from the shared module.
6. **Build `JacobianLinearApproxExplorer.tsx`** — Circle perturbation with exact vs. approximate output. Uses `jacobianMatrix` and `areaDistortion`.
7. **Build `ChainRuleMatrixExplorer.tsx`** — Computation graph with Jacobian matrices and forward/reverse mode animation. Uses `multivariateChainRule` and `linearMapComposition`.
8. **Build `JacobianDeterminantExplorer.tsx`** — Area distortion with shrinking square and $|\det J|$ heatmap. Uses `jacobianDeterminant` and `areaDistortion`.
9. Embed all four components in the MDX at their appropriate section positions with `client:visible`.
10. **Update `gradient.mdx`** — Change forward references to "The Jacobian & Multivariate Chain Rule *(coming soon)*" to live links: `[The Jacobian & Multivariate Chain Rule](/topics/jacobian)`. Check Remark 1, Definition 4, and Section 9 specifically.
11. **Update `derivative.mdx`** — Change any forward references to the Jacobian topic from "(coming soon)" to live links (Remark 3 specifically).
12. **Update curriculum graph data** — Change `jacobian` status from `"planned"` to `"published"` in `curriculum-graph.json`. Verify `gradient → jacobian` and `jacobian → hessian` edges exist.
13. **Update `curriculum.ts`** — Move `"The Jacobian & Multivariate Chain Rule"` from `planned` to `published` in the `multivar-differential` track.
14. Run topic content and viz checklist (§10).
15. `pnpm build` — verify zero errors.
16. Commit and deploy.

---

## Appendix A: Key Differences from the Gradient Brief (Topic 9)

1. **Second topic in the track, not the first.** The shared module `multivariate.ts` already exists from Topic 9. This topic *extends* it with Jacobian-specific functions rather than creating it from scratch. Backward compatibility with all existing functions is mandatory.
2. **Intermediate difficulty, not foundational.** The reader has already made the conceptual leap to multivariable calculus in Topic 9. This topic builds on that foundation by extending from scalar-valued to vector-valued functions. The new concepts (Jacobian matrix, chain rule as matrix product, determinant as volume scaling) are natural generalizations, but the chain rule proof is more demanding than any proof in Topic 9.
3. **The ML connection is the deepest yet.** Backpropagation is not merely *related* to the chain rule — it *is* the chain rule. This identification, made precise in Section 8, is the most substantial ML connection in the entire formalCalculus curriculum. The normalizing flows connection (Jacobian determinant in density transformation) adds a second, distinct application of the Jacobian in modern ML.
4. **Matrix visualization is the core challenge.** Unlike Topic 9 (gradient vectors, contour plots), this topic's visualizations need to communicate *matrix operations* — how a $2 \times 2$ matrix distorts a grid, how matrix multiplication composes linear maps. The flagship `JacobianGridExplorer` must make the matrix concrete through the grid deformation metaphor.
5. **The proof of the chain rule is the longest proof in this topic.** It requires tracking error terms through two layers of the total derivative approximation. The proof should be fully expanded with every inequality, every norm estimate, every appeal to the definition — this is a proof the reader needs to work through, not skim.
6. **The Jacobian determinant bridges to Track 4.** The change-of-variables formula $\int_{f(U)} h(x)\,dx = \int_U h(f(u)) |\det J_f(u)|\,du$ will be formalized in Track 4 (Multivariable Integral Calculus). This topic provides the differential foundation ($|\det J_f|$ as a volume scaling factor) and the reader should leave knowing *why* the Jacobian determinant appears in integration, even though the integral theory comes later.

---

## Appendix B: Formal Element Inventory

| Type | # | Title |
|------|---|-------|
| Definition | 1 | Vector-Valued Function |
| Definition | 2 | The Jacobian Matrix |
| Definition | 3 | Differentiability (Vector-Valued) |
| Definition | 4 | The Jacobian Determinant |
| Theorem | 1 | Differentiability ⟺ Component-wise Differentiability |
| Theorem | 2 | The Multivariate Chain Rule |
| Theorem | 3 | Volume Distortion |
| Proposition | 1 | The Jacobian Approximation |
| Proposition | 2 | Jacobian Determinant of a Composition |
| Example | 1 | Jacobian of a linear function |
| Example | 2 | Jacobian of polar-to-Cartesian |
| Example | 3 | Jacobian of a neural network layer |
| Example | 4 | Linear approximation of polar-to-Cartesian |
| Example | 5 | Chain rule with explicit matrices |
| Example | 6 | Three-fold composition |
| Example | 7 | Polar coordinates (Jacobian determinant) |
| Example | 8 | Scaling transformation (Jacobian determinant) |
| Remark | 1 | Gradient as a special case |
| Remark | 2 | Why matrix multiplication? |
| Remark | 3 | When the Jacobian determinant is zero |
| Remark | 4 | Preview of the change-of-variables formula |
| Proof | — | 3 proofs total (Theorem 1, Theorem 2, Proposition 2) |

---

*Brief version: v1 | Created: 2026-04-02 | Author: Jonathan Rocha*  
*Reference notebook: `notebooks/jacobian/10_jacobian_chain_rule.ipynb`*  
*Reference doc: `docs/plans/formalcalculus-handoff-reference.md`*
