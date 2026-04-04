# Claude Code Handoff Brief: Surface Integrals & the Divergence Theorem

**Project:** formalCalculus — [formalcalculus.com](https://www.formalcalculus.com)  
**Repo:** `github.com/jonx0037/formalCalculus`  
**Stack:** Astro 6 · React 19 · MDX · Tailwind CSS 4 · D3.js 7 · KaTeX · Vercel  
**Package Manager:** pnpm  
**Status:** Ready for implementation  
**Reference Notebook:** `notebooks/surface-integrals/16_surface_integrals.ipynb`  
**Reference Doc:** `docs/plans/formalcalculus-handoff-reference.md`

---

## 1. Objective

Add a new topic page **"Surface Integrals & the Divergence Theorem"** as the **fourth and final topic in the Multivariable Integral Calculus track** on formalcalculus.com.

1. This is **topic 16 of 32** and the **sixteenth topic published** on formalcalculus.com. All four topics in the Limits & Continuity track (`sequences-limits`, `epsilon-delta`, `completeness-compactness`, `uniform-convergence`), all four topics in the Single-Variable Calculus track (`derivative`, `mean-value-taylor`, `riemann-integral`, `improper-integrals`), all four topics in the Multivariable Differential Calculus track (`gradient`, `jacobian`, `hessian`, `inverse-implicit`), and the first three topics in the Multivariable Integral Calculus track (`multiple-integrals`, `change-of-variables`, `line-integrals`) are deployed and live.
2. **Prerequisites:** `multiple-integrals`, `change-of-variables`, and `line-integrals`. This is the **only topic with three inbound prerequisite edges** in the entire curriculum graph. Each predecessor contributes specific machinery:
   - **Multiple Integrals (Topic 13)** — Double and triple integrals via Fubini's theorem. Surface integrals reduce to double integrals over the parameter domain $D^* \subseteq \mathbb{R}^2$. The divergence theorem converts surface integrals to triple integrals over the enclosed volume. The Type I/II/III decomposition strategy from the Green's theorem proof (Topic 15) extends to the 3D divergence theorem proof.
   - **Change of Variables (Topic 14)** — The Jacobian determinant as a volume/area scaling factor. The surface area element $dS = \|\mathbf{r}_u \times \mathbf{r}_v\|\,du\,dv$ is precisely the area scaling factor of the parameterization map $\mathbf{r}: D^* \to S$. Cylindrical and spherical coordinates (from Topic 14) are needed for computing volume integrals in the divergence theorem.
   - **Line Integrals (Topic 15)** — Green's theorem ($\oint_C \mathbf{F} \cdot d\mathbf{r} = \iint_D \text{curl}\,\mathbf{F}\,dA$) is the 2D instance of Stokes' theorem. The 2D curl ($\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}$) generalizes to the full 3D curl $\nabla \times \mathbf{F}$. Conservative fields, circulation, and the relationship between boundary integrals and interior integrals all extend from curves to surfaces.
3. **Difficulty: advanced.** This is the most structurally demanding topic in Track 4. The reader must synthesize machinery from three predecessors — double integrals, coordinate transformations, and line integrals — and extend it to surfaces in $\mathbb{R}^3$. Parameterized surfaces require the cross product $\mathbf{r}_u \times \mathbf{r}_v$ for the area element, which is new algebraic machinery. The divergence theorem and Stokes' theorem are the deepest results in the standard multivariable calculus curriculum, and both receive full proofs.
4. **Fourth and final topic in Track 4.** Completing this topic makes the Multivariable Integral Calculus track **fully published** (4/4). This is a milestone — it is the third track completed after Limits & Continuity and Single-Variable Calculus. The `planned` array for `multivar-integral` in `curriculum.ts` will become empty.
5. **Downstream within formalCalculus:**
   - `fourier-series` (indirect) — Fourier coefficients are computed via inner products, which are integrals over curves and surfaces. Stokes' theorem and the divergence theorem appear in the theory of Fourier series on domains in $\mathbb{R}^n$.
   - `stability-dynamics` (indirect) — Lyapunov stability analysis uses the divergence theorem to establish conservation and dissipation of energy functionals: $\frac{d}{dt}\iiint_E V\,dV = -\oiint_S \mathbf{J} \cdot d\mathbf{S} + \iiint_E \sigma\,dV$, where the surface flux term uses the divergence theorem.
   - `sigma-algebras` (indirect) — Surface measures and the co-area formula generalize the surface integral to the measure-theoretic setting.
   - `hilbert-spaces` (indirect) — Integration by parts on domains in $\mathbb{R}^n$ uses the divergence theorem: $\int_\Omega u\,\nabla \cdot \mathbf{F}\,dV = -\int_\Omega \nabla u \cdot \mathbf{F}\,dV + \int_{\partial\Omega} u\,\mathbf{F} \cdot \hat{\mathbf{n}}\,dS$. This is the foundation of weak derivatives and Sobolev spaces.
   - `calculus-of-variations` (indirect) — The Euler-Lagrange equation on domains uses the divergence theorem to move derivatives off the test function.
6. **Forward links to formalml.com:**
   - `gradient-descent` — The divergence theorem connects to conservation laws in optimization. For gradient flow $\dot{\theta} = -\nabla L(\theta)$, the divergence $\nabla \cdot (-\nabla L) = -\Delta L$ (the negative Laplacian of the loss) measures how the "density of trajectories" evolves — regions where $\Delta L > 0$ (the loss is subharmonic) see trajectories converge. The divergence theorem quantifies the net flux of gradient flow trajectories through any surface in parameter space.
   - `measure-theoretic-probability` — The divergence theorem gives the integration-by-parts formula for probability densities: $\mathbb{E}[\nabla \cdot \mathbf{F}(X)] = \int_{\partial\Omega} \mathbf{F} \cdot \hat{\mathbf{n}}\,p\,dS + \mathbb{E}[\mathbf{F}(X) \cdot \nabla \log p(X)]$. This is Stein's identity, the foundation of Stein variational gradient descent.
   - `smooth-manifolds` — Stokes' theorem on manifolds $\int_M d\omega = \int_{\partial M} \omega$ subsumes Green's theorem, the classical Stokes' theorem, and the divergence theorem as special cases. The language of differential forms unifies all three.
   - `information-geometry` — The Fisher-Rao metric induces a natural volume form on the statistical manifold. Surface integrals in this metric compute the "statistical area" of regions in parameter space. The divergence theorem on the statistical manifold connects to conservation laws for natural gradient flow.
7. This topic **extends** the shared utility module `multivariate.ts` (created by Topic 9, extended by Topics 10–15) with `curl3D`, `divergence3D`, `crossProduct3D`, `surfaceNormal`, `surfaceIntegralScalar`, and `surfaceIntegralFlux`. It also **extends** `integration.ts` (created by Topic 7, extended by Topics 8, 13, 14, 15) with `surfaceAreaElement` and `volumeIntegralDivergence`. All existing functions in both modules remain unchanged.
8. **Resolves four forward references from Topics 13, 14, and 15.**
   - Topic 13 (`multiple-integrals`) line ~550: "triple integrals and the divergence theorem" — update to live link.
   - Topic 15 (`line-integrals`) line ~423: Remark 6 about Green's as 2D Stokes' — update forward ref to live link.
   - Topic 15 (`line-integrals`) line ~589: Connections section, Stokes' + divergence theorem — update to live link.
   - Topic 14 (`change-of-variables`) line ~427: "Surface area element involves the Jacobian" — update to live link.

**Content scope:**

- Parameterized surfaces in $\mathbb{R}^3$: $\mathbf{r}(u, v) = (x(u,v), y(u,v), z(u,v))$ for $(u,v) \in D^*$
- Tangent vectors $\mathbf{r}_u$, $\mathbf{r}_v$ and the normal vector $\mathbf{r}_u \times \mathbf{r}_v$
- The surface area element: $dS = \|\mathbf{r}_u \times \mathbf{r}_v\|\,du\,dv$
- Surface area: $\text{Area}(S) = \iint_{D^*} \|\mathbf{r}_u \times \mathbf{r}_v\|\,du\,dv$
- Scalar surface integrals: $\iint_S f\,dS = \iint_{D^*} f(\mathbf{r}(u,v))\,\|\mathbf{r}_u \times \mathbf{r}_v\|\,du\,dv$
- Oriented surfaces and the unit outward normal $\hat{\mathbf{n}} = \frac{\mathbf{r}_u \times \mathbf{r}_v}{\|\mathbf{r}_u \times \mathbf{r}_v\|}$
- Flux integrals: $\iint_S \mathbf{F} \cdot d\mathbf{S} = \iint_{D^*} \mathbf{F}(\mathbf{r}(u,v)) \cdot (\mathbf{r}_u \times \mathbf{r}_v)\,du\,dv$
- 3D curl: $\nabla \times \mathbf{F} = \left(\frac{\partial R}{\partial y} - \frac{\partial Q}{\partial z}\right)\hat{\mathbf{i}} + \left(\frac{\partial P}{\partial z} - \frac{\partial R}{\partial x}\right)\hat{\mathbf{j}} + \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)\hat{\mathbf{k}}$
- 3D divergence: $\nabla \cdot \mathbf{F} = \frac{\partial P}{\partial x} + \frac{\partial Q}{\partial y} + \frac{\partial R}{\partial z}$
- Stokes' theorem: $\oint_C \mathbf{F} \cdot d\mathbf{r} = \iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S}$
- The divergence theorem (Gauss's theorem): $\oiint_S \mathbf{F} \cdot d\mathbf{S} = \iiint_E \nabla \cdot \mathbf{F}\,dV$
- Full proofs of both theorems
- Surface integrals of graphs: $z = g(x,y)$ gives $dS = \sqrt{1 + g_x^2 + g_y^2}\,dA$
- ML connections: Stein's identity and SVGD, physics-informed neural networks, conservation laws in optimization, flow-matching models

---

## 2. MDX File

### Location

```
src/content/topics/surface-integrals.mdx
```

The entry `id` will be `surface-integrals`. The dynamic route resolves to `/topics/surface-integrals`.

### Frontmatter

```yaml
---
title: "Surface Integrals & the Divergence Theorem"
subtitle: "Integrating functions and vector fields over surfaces in ℝ³ — flux through oriented surfaces, the 3D curl and divergence, Stokes' theorem generalizing Green's from 2D to 3D, and the divergence theorem relating boundary flux to interior divergence."
status: "published"
difficulty: "advanced"
prerequisites:
  - "multiple-integrals"
  - "change-of-variables"
  - "line-integrals"
tags:
  - "calculus"
  - "surface-integral"
  - "flux"
  - "divergence-theorem"
  - "stokes-theorem"
  - "curl"
  - "divergence"
  - "oriented-surface"
  - "differential-forms"
  - "conservation-law"
domain: "multivar-integral"
videoId: null
notebookPath: "notebooks/surface-integrals/16_surface_integrals.ipynb"
githubUrl: "https://github.com/jonx0037/formalCalculus/blob/main/src/content/topics/surface-integrals.mdx"
datePublished: 2026-05-01
estimatedReadTime: 55
abstract: "Surface integrals extend integration from curves to two-dimensional surfaces embedded in ℝ³. Given a parameterized surface S defined by r(u,v) for (u,v) in a parameter domain D*, the tangent vectors r_u and r_v span the tangent plane at each point, and their cross product r_u × r_v yields the normal vector whose magnitude is the surface area element dS = ‖r_u × r_v‖ du dv. For a scalar function f, the scalar surface integral ∬_S f dS = ∬_{D*} f(r(u,v)) ‖r_u × r_v‖ du dv sums f over S weighted by area. For a vector field F, the flux integral ∬_S F · dS = ∬_{D*} F(r(u,v)) · (r_u × r_v) du dv measures the net flow of F through the oriented surface. These constructions culminate in two fundamental theorems. Stokes' theorem ∮_C F · dr = ∬_S (∇ × F) · dS generalizes Green's theorem from 2D to 3D: the circulation of F around the boundary curve C of a surface S equals the flux of the curl ∇ × F through S. The divergence theorem (Gauss's theorem) ∬_S F · dS = ∭_E ∇ · F dV relates the net outward flux of F through a closed surface S to the total divergence of F in the enclosed volume E. Together, these theorems unify Green's theorem, the Gradient Theorem, and the Fundamental Theorem of Calculus under a single framework — the generalized Stokes' theorem ∫_M dω = ∫_{∂M} ω — connecting boundary integrals to interior derivatives at every dimension. In machine learning, the divergence theorem appears in conservation laws for gradient flow trajectories, in Stein's identity (the foundation of Stein variational gradient descent), in physics-informed neural networks enforcing PDE constraints, and in the flow-matching framework for generative models where the continuity equation ∂_t p + ∇ · (p v) = 0 governs density evolution under a learned velocity field."
formalmlConnections:
  - topic: "gradient-descent"
    site: "formalml"
    relationship: "The divergence theorem quantifies how gradient flow trajectories converge or diverge through surfaces in parameter space. The divergence ∇ · (−∇L) = −ΔL determines whether trajectories focus into or spread from a region — connecting the Laplacian of the loss to the convergence geometry of optimization."
  - topic: "measure-theoretic-probability"
    site: "formalml"
    relationship: "The divergence theorem yields Stein's identity: E[∇ · F(X)] = −E[F(X) · ∇ log p(X)] for a smooth density p with suitable boundary conditions. This is the foundation of Stein variational gradient descent (SVGD) and kernel Stein discrepancy."
  - topic: "smooth-manifolds"
    site: "formalml"
    relationship: "Stokes' theorem on manifolds ∫_M dω = ∫_{∂M} ω subsumes Green's theorem, the classical Stokes' theorem, and the divergence theorem as dimension-specific instances. Surface integrals are integrals of 2-forms, and the surface area element dS is the pullback of the area 2-form."
  - topic: "information-geometry"
    site: "formalml"
    relationship: "The Fisher-Rao volume form on the statistical manifold induces surface integrals that measure 'statistical area.' The divergence theorem on the statistical manifold connects natural gradient flow conservation to boundary flux in parameter space."
connections:
  - topic: "multiple-integrals"
    relationship: "Surface integrals reduce to double integrals over the parameter domain via Fubini. The divergence theorem converts surface integrals to triple integrals. The Type I/II decomposition strategy from Topic 13 extends to the divergence theorem proof."
  - topic: "change-of-variables"
    relationship: "The surface area element dS = ‖r_u × r_v‖ du dv is the area scaling factor of the parameterization map — the 2D analog of the Jacobian determinant |det J_φ| from Topic 14. Cylindrical and spherical coordinates from Topic 14 are used in divergence theorem volume integrals."
  - topic: "line-integrals"
    relationship: "Green's theorem (Topic 15, Theorem 5) is the 2D special case of Stokes' theorem. The 2D curl from Topic 15 generalizes to the full 3D curl. Stokes' theorem relates a line integral around the boundary of a surface to a surface integral of the curl — extending the boundary-interior relationship from curves to surfaces."
  - topic: "gradient"
    relationship: "The gradient ∇f is a 1-form (dual to a vector field). The curl ∇ × F and divergence ∇ · F are differential operators built from the same gradient machinery — curl is the 'gradient of a vector field' (via the cross product), divergence is the 'scalar product of ∇ with F.'"
  - topic: "jacobian"
    relationship: "The cross product r_u × r_v is the row-space normal of the Jacobian matrix J_r = [r_u | r_v] of the parameterization. The surface area element ‖r_u × r_v‖ equals √(det(J_r^T J_r)) — the Gram determinant, which is the natural 2D generalization of the Jacobian determinant."
  - topic: "inverse-implicit"
    relationship: "For surfaces defined implicitly by F(x,y,z) = 0, the normal vector is ∇F/‖∇F‖ (Topic 12, implicit function theorem). This provides an alternative to parameterization for computing surface integrals on level sets."
  - topic: "riemann-integral"
    relationship: "After parameterization, every surface integral reduces to a double Riemann integral over the parameter domain. The existence of the surface integral follows from the integrability theory in Topic 7 applied to the composite function."
references:
  - type: "book"
    title: "Calculus on Manifolds"
    authors: "Spivak"
    year: 1965
    note: "Chapter 5 — the generalized Stokes' theorem in the language of differential forms, unifying all classical integral theorems"
  - type: "book"
    title: "Vector Calculus, Linear Algebra, and Differential Forms"
    authors: "Hubbard & Hubbard"
    year: 2015
    note: "Chapter 6 — surface integrals, flux, and the divergence theorem with geometric exposition and careful orientation treatment"
  - type: "book"
    title: "Div, Grad, Curl, and All That"
    authors: "Schey"
    year: 2005
    note: "Chapters 3-4 — physical motivation for surface integrals via flux, the divergence theorem as a conservation law"
  - type: "book"
    title: "Analysis on Manifolds"
    authors: "Munkres"
    year: 1991
    note: "Chapters 6-7 — rigorous treatment of surface integrals, the classical Stokes' and divergence theorems"
  - type: "book"
    title: "Principles of Mathematical Analysis"
    authors: "Rudin"
    year: 1976
    note: "Chapter 10 — integration of differential forms, Stokes' theorem in ℝⁿ"
  - type: "paper"
    title: "A Kernelized Stein Discrepancy for Goodness-of-fit Tests"
    authors: "Liu, Lee & Jordan"
    year: 2016
    url: "https://arxiv.org/abs/1602.03253"
    note: "Stein's identity via the divergence theorem — the foundation of kernel Stein discrepancy and SVGD"
  - type: "paper"
    title: "Flow Matching for Generative Modeling"
    authors: "Lipman, Chen, Ben-Hamu, Nickel"
    year: 2023
    url: "https://arxiv.org/abs/2210.02747"
    note: "The continuity equation ∂_t p + ∇ · (pv) = 0 governs density evolution — a direct application of the divergence theorem"
  - type: "paper"
    title: "Physics-Informed Neural Networks"
    authors: "Raissi, Perdikaris & Karniadakis"
    year: 2019
    url: "https://doi.org/10.1016/j.jcp.2018.10.045"
    note: "PDE constraints enforced via the divergence theorem — conservation laws as loss terms"
---
```

---

## 3. Content Outline

### Section 1: Overview & Motivation

**Opening example:** A machine learning model generates a velocity field $\mathbf{v}(\mathbf{x}, t)$ that pushes a simple distribution (Gaussian) into a complex target (multimodal data). The density $p(\mathbf{x}, t)$ evolves according to the continuity equation $\frac{\partial p}{\partial t} + \nabla \cdot (p\mathbf{v}) = 0$ — mass is conserved. How do we verify conservation? Pick any closed surface $S$ in data space. The divergence theorem says the net flux of mass through $S$ equals the total divergence inside — if $\nabla \cdot (p\mathbf{v}) = -\frac{\partial p}{\partial t}$ everywhere inside, then the total mass leaving through $S$ equals the rate of mass decrease inside. This is the divergence theorem applied to flow-matching generative models.

But to make sense of "flux through a surface," we need to define surface integrals. That is this topic: integrating functions and vector fields over two-dimensional surfaces in $\mathbb{R}^3$, culminating in the two great integral theorems — Stokes' and the divergence theorem — that relate boundary integrals to interior derivatives.

No TheoremBlocks. No viz. 2–3 paragraphs.

### Section 2: Parameterized Surfaces & the Area Element

**Setting the stage.** Before we can integrate over surfaces, we need to precisely describe them and measure area on them.

**Geometric-first:** A surface in $\mathbb{R}^3$ is the 2D analog of a curve. Where a curve is traced by one parameter ($t$), a surface is traced by two parameters ($u, v$). The parameterization $\mathbf{r}(u, v) = (x(u,v), y(u,v), z(u,v))$ maps a flat region $D^* \subseteq \mathbb{R}^2$ into a curved surface $S \subset \mathbb{R}^3$. At each point, the partial derivatives $\mathbf{r}_u$ and $\mathbf{r}_v$ are tangent vectors that span the tangent plane. Their cross product $\mathbf{r}_u \times \mathbf{r}_v$ is normal to the surface, and its magnitude $\|\mathbf{r}_u \times \mathbf{r}_v\|$ gives the local area scaling factor — how much a small rectangle $du \times dv$ in parameter space gets stretched into a parallelogram on the surface.

This is exactly the role the Jacobian determinant $|\det J_\varphi|$ played in the [Change of Variables](/topics/change-of-variables) (Topic 14). There, $|\det J_\varphi|$ measured how a 2D map $\varphi: \mathbb{R}^2 \to \mathbb{R}^2$ scales area. Here, the parameterization $\mathbf{r}: \mathbb{R}^2 \to \mathbb{R}^3$ maps into a higher-dimensional space, so the "Jacobian" is a $3 \times 2$ matrix $J_\mathbf{r} = [\mathbf{r}_u \mid \mathbf{r}_v]$, and the area scaling factor is $\sqrt{\det(J_\mathbf{r}^T J_\mathbf{r})} = \|\mathbf{r}_u \times \mathbf{r}_v\|$ — the Gram determinant.

**TheoremBlocks:**

- **Definition 1: Parameterized Surface** — A *parameterized surface* in $\mathbb{R}^3$ is a $C^1$ function $\mathbf{r}: D^* \to \mathbb{R}^3$ where $D^* \subseteq \mathbb{R}^2$ is a bounded, connected region. The surface is *regular* (or *smooth*) if the partial derivatives $\mathbf{r}_u(u,v)$ and $\mathbf{r}_v(u,v)$ are linearly independent at every point $(u,v) \in D^*$ — equivalently, $\mathbf{r}_u \times \mathbf{r}_v \neq \mathbf{0}$ everywhere in $D^*$. The image $S = \mathbf{r}(D^*)$ is the *surface*.
- **Definition 2: Cross Product** — For $\mathbf{a} = (a_1, a_2, a_3)$ and $\mathbf{b} = (b_1, b_2, b_3)$ in $\mathbb{R}^3$, the *cross product* is:
$$\mathbf{a} \times \mathbf{b} = (a_2 b_3 - a_3 b_2,\; a_3 b_1 - a_1 b_3,\; a_1 b_2 - a_2 b_1).$$
  Key properties: $\mathbf{a} \times \mathbf{b}$ is orthogonal to both $\mathbf{a}$ and $\mathbf{b}$; $\|\mathbf{a} \times \mathbf{b}\|$ equals the area of the parallelogram spanned by $\mathbf{a}$ and $\mathbf{b}$; $\mathbf{a} \times \mathbf{b} = -\mathbf{b} \times \mathbf{a}$ (anti-commutativity).
- **Definition 3: Surface Area Element** — For a regular parameterized surface $\mathbf{r}: D^* \to \mathbb{R}^3$, the *surface area element* is:
$$dS = \|\mathbf{r}_u \times \mathbf{r}_v\|\,du\,dv.$$
  The *surface area* of $S$ is:
$$\text{Area}(S) = \iint_{D^*} \|\mathbf{r}_u \times \mathbf{r}_v\|\,du\,dv.$$
- **Remark 1: Connection to the Jacobian** — The matrix $J_\mathbf{r} = [\mathbf{r}_u \mid \mathbf{r}_v]$ is $3 \times 2$. The Gram matrix is $J_\mathbf{r}^T J_\mathbf{r} = \begin{pmatrix} \mathbf{r}_u \cdot \mathbf{r}_u & \mathbf{r}_u \cdot \mathbf{r}_v \\ \mathbf{r}_v \cdot \mathbf{r}_u & \mathbf{r}_v \cdot \mathbf{r}_v \end{pmatrix}$, and $\|\mathbf{r}_u \times \mathbf{r}_v\|^2 = \det(J_\mathbf{r}^T J_\mathbf{r})$. This recovers the Lagrange identity: $\|\mathbf{a} \times \mathbf{b}\|^2 = \|\mathbf{a}\|^2 \|\mathbf{b}\|^2 - (\mathbf{a} \cdot \mathbf{b})^2$. When the parameterization is a map $\mathbb{R}^2 \to \mathbb{R}^2$ (as in Topic 14), the Gram determinant reduces to $|\det J_\varphi|^2$, recovering the change-of-variables area element.
- **Example 1: Sphere of radius $R$** — $\mathbf{r}(\theta, \phi) = (R\sin\phi\cos\theta, R\sin\phi\sin\theta, R\cos\phi)$ for $(\theta, \phi) \in [0, 2\pi] \times [0, \pi]$. Compute: $\mathbf{r}_\theta = (-R\sin\phi\sin\theta, R\sin\phi\cos\theta, 0)$, $\mathbf{r}_\phi = (R\cos\phi\cos\theta, R\cos\phi\sin\theta, -R\sin\phi)$. Cross product: $\mathbf{r}_\theta \times \mathbf{r}_\phi = (-R^2\sin^2\phi\cos\theta, -R^2\sin^2\phi\sin\theta, -R^2\sin\phi\cos\phi)$. Magnitude: $\|\mathbf{r}_\theta \times \mathbf{r}_\phi\| = R^2\sin\phi$ (for $\phi \in (0, \pi)$). Area: $\int_0^{2\pi}\int_0^\pi R^2\sin\phi\,d\phi\,d\theta = 4\pi R^2$.
- **Example 2: Cylinder $x^2 + y^2 = R^2$, $0 \le z \le h$** — $\mathbf{r}(\theta, z) = (R\cos\theta, R\sin\theta, z)$ for $(\theta, z) \in [0, 2\pi] \times [0, h]$. $\|\mathbf{r}_\theta \times \mathbf{r}_z\| = R$. Area: $2\pi R h$.
- **Example 3: Graph surface $z = g(x,y)$** — $\mathbf{r}(x, y) = (x, y, g(x,y))$. Then $\mathbf{r}_x = (1, 0, g_x)$, $\mathbf{r}_y = (0, 1, g_y)$, $\mathbf{r}_x \times \mathbf{r}_y = (-g_x, -g_y, 1)$, and $dS = \sqrt{1 + g_x^2 + g_y^2}\,dA$. This is the most common special case — every surface locally looks like a graph (by the IFT, Topic 12).
- **Proposition 1: Parameterization Independence of Surface Area** — The surface area $\text{Area}(S)$ is independent of the parameterization. If $\tilde{\mathbf{r}} = \mathbf{r} \circ \varphi$ where $\varphi: \tilde{D}^* \to D^*$ is a $C^1$ diffeomorphism with $\det J_\varphi > 0$, then $\iint_{\tilde{D}^*} \|\tilde{\mathbf{r}}_s \times \tilde{\mathbf{r}}_t\|\,ds\,dt = \iint_{D^*} \|\mathbf{r}_u \times \mathbf{r}_v\|\,du\,dv$.
- **Proof sketch of Proposition 1** — By the chain rule, $\tilde{\mathbf{r}}_s = \mathbf{r}_u \frac{\partial u}{\partial s} + \mathbf{r}_v \frac{\partial v}{\partial s}$ and similarly for $\tilde{\mathbf{r}}_t$. Then $\tilde{\mathbf{r}}_s \times \tilde{\mathbf{r}}_t = (\mathbf{r}_u \times \mathbf{r}_v) \det J_\varphi$. Taking magnitudes and applying the change of variables formula (Topic 14, Theorem 1): $\iint_{\tilde{D}^*} |\det J_\varphi|\,\|\mathbf{r}_u \times \mathbf{r}_v\|\,ds\,dt = \iint_{D^*} \|\mathbf{r}_u \times \mathbf{r}_v\|\,du\,dv$.

**Static image:** `parameterized-surfaces.png` from the notebook.

### Section 3: Scalar Surface Integrals

**Integrating a function over a surface.** The scalar surface integral $\iint_S f\,dS$ sums the values of $f$ over $S$, weighted by area. If $f = 1$, we recover the surface area. If $f$ represents charge density (charge per unit area), the integral gives total charge.

**Geometric-first:** Imagine a thin shell bent into the shape of $S$, with density $f(x, y, z)$ at each point. The total mass is $\iint_S f\,dS$. This extends the wire-density analogy from scalar line integrals (Topic 15, Definition 3) to two dimensions — from wires to shells.

**TheoremBlocks:**

- **Definition 4: Scalar Surface Integral** — Let $S$ be a regular surface parameterized by $\mathbf{r}: D^* \to \mathbb{R}^3$, and let $f: S \to \mathbb{R}$ be continuous. The *scalar surface integral* of $f$ over $S$ is:
$$\iint_S f\,dS = \iint_{D^*} f(\mathbf{r}(u,v))\,\|\mathbf{r}_u \times \mathbf{r}_v\|\,du\,dv.$$
- **Remark 2: Parameterization independence** — By Proposition 1, the scalar surface integral depends only on $S$ and $f$, not on the parameterization. Both orientation-preserving and orientation-reversing reparameterizations give the same value (the absolute value in $|\det J_\varphi|$ absorbs sign changes), just as for scalar line integrals (Topic 15, Proposition 1).
- **Example 4: Mass of a hemispherical shell** — Let $S$ be the upper hemisphere $x^2 + y^2 + z^2 = R^2$, $z \ge 0$, with density $f(x,y,z) = z$. Parameterize with spherical coordinates: $\iint_S z\,dS = \int_0^{2\pi}\int_0^{\pi/2} (R\cos\phi) R^2\sin\phi\,d\phi\,d\theta = 2\pi R^3 \int_0^{\pi/2} \sin\phi\cos\phi\,d\phi = \pi R^3$.
- **Example 5: Average temperature on a surface** — The average value of $f$ over $S$ is $\bar{f} = \frac{1}{\text{Area}(S)} \iint_S f\,dS$, extending the 1D average (Topic 7) and curve average (Topic 15) to surfaces.

**Static image:** `scalar-surface-integral.png` from the notebook.

### Section 4: Oriented Surfaces & Flux Integrals

**The central construction.** The flux integral $\iint_S \mathbf{F} \cdot d\mathbf{S}$ measures the net flow of a vector field $\mathbf{F}$ through an oriented surface $S$. Unlike the scalar surface integral, orientation matters — reversing the normal flips the sign of the integral.

**Geometric-first:** Imagine $\mathbf{F}$ as a fluid velocity field and $S$ as a fishing net. The flux integral measures the total rate at which fluid passes through the net. At each point, only the component of $\mathbf{F}$ normal to $S$ contributes — the tangential component slides along $S$ without passing through it. The dot product $\mathbf{F} \cdot \hat{\mathbf{n}}$ extracts the normal component, and $dS$ weights it by area.

**TheoremBlocks:**

- **Definition 5: Oriented Surface** — An oriented surface $S$ is a surface equipped with a continuous choice of unit normal vector $\hat{\mathbf{n}}$ at each point. For a regular parameterized surface, $\hat{\mathbf{n}} = \frac{\mathbf{r}_u \times \mathbf{r}_v}{\|\mathbf{r}_u \times \mathbf{r}_v\|}$ gives one orientation; $-\hat{\mathbf{n}}$ gives the other. Not every surface is orientable — the Möbius strip is the canonical counterexample.
- **Remark 3: The orientation convention** — For closed surfaces (surfaces enclosing a volume), the convention is to choose the *outward-pointing* normal. This is the orientation used in the divergence theorem. For surfaces bounded by a curve, the orientation follows the right-hand rule: if you curl the fingers of your right hand in the direction of traversal around the boundary curve $C$, your thumb points in the direction of $\hat{\mathbf{n}}$. This convention ensures Stokes' theorem holds without sign errors.
- **Definition 6: Flux Integral (Vector Surface Integral)** — Let $S$ be an oriented, regular surface parameterized by $\mathbf{r}: D^* \to \mathbb{R}^3$ with orientation consistent with $\mathbf{r}_u \times \mathbf{r}_v$, and let $\mathbf{F}: S \to \mathbb{R}^3$ be a continuous vector field. The *flux integral* (or *vector surface integral*) of $\mathbf{F}$ through $S$ is:
$$\iint_S \mathbf{F} \cdot d\mathbf{S} = \iint_{D^*} \mathbf{F}(\mathbf{r}(u,v)) \cdot (\mathbf{r}_u \times \mathbf{r}_v)\,du\,dv.$$
  Equivalently, $\iint_S \mathbf{F} \cdot d\mathbf{S} = \iint_S (\mathbf{F} \cdot \hat{\mathbf{n}})\,dS$, where $\hat{\mathbf{n}}$ is the unit outward normal and $dS$ is the scalar area element.
- **Example 6: Flux through a hemisphere** — Let $\mathbf{F}(x,y,z) = (0, 0, z)$ and $S$ be the upper hemisphere $x^2+y^2+z^2 = 1$, $z \ge 0$, with outward-pointing normal. Using spherical parameterization, $\mathbf{F} \cdot (\mathbf{r}_\theta \times \mathbf{r}_\phi) = (0, 0, \cos\phi) \cdot (-\sin^2\phi\cos\theta, -\sin^2\phi\sin\theta, -\sin\phi\cos\phi) = -\sin\phi\cos^2\phi$. Since the outward normal on the upper hemisphere points away from the origin, but $\mathbf{r}_\theta \times \mathbf{r}_\phi$ points inward, we negate: flux $= \int_0^{2\pi}\int_0^{\pi/2} \sin\phi\cos^2\phi\,d\phi\,d\theta = \frac{2\pi}{3}$.
- **Example 7: Flux of $\mathbf{F} = (x, y, z)$ through a sphere** — $\mathbf{F} \cdot \hat{\mathbf{n}} = \mathbf{r} \cdot \hat{\mathbf{n}} = R$ (the position vector is radially outward, the normal is outward, and the dot product on a sphere of radius $R$ is $R$ everywhere). So $\oiint_S \mathbf{F} \cdot d\mathbf{S} = R \cdot 4\pi R^2 = 4\pi R^3$. This equals $\iiint_E \nabla \cdot \mathbf{F}\,dV = \iiint_E 3\,dV = 3 \cdot \frac{4}{3}\pi R^3 = 4\pi R^3$ — the divergence theorem verified.
- **Remark 4: Orientation reversal** — Reversing the orientation of $S$ negates the flux integral: $\iint_{-S} \mathbf{F} \cdot d\mathbf{S} = -\iint_S \mathbf{F} \cdot d\mathbf{S}$. This parallels the orientation reversal of vector line integrals (Topic 15, Theorem 1, property 3).

**Visualization:** `FluxExplorer` embedded here — the flagship visualization.

**Static image:** `flux-integral.png` from the notebook.

### Section 5: The 3D Curl and Divergence

**Extending the differential operators.** The 2D curl from Topic 15 and the 2D divergence from Topic 15 now generalize to three dimensions. These operators are the ingredients of Stokes' theorem and the divergence theorem.

**Geometric-first:** The 3D curl $\nabla \times \mathbf{F}$ at a point measures the tendency of $\mathbf{F}$ to circulate around that point — it is a vector pointing in the axis of rotation, with magnitude equal to twice the angular velocity. The 3D divergence $\nabla \cdot \mathbf{F}$ at a point measures the net outward flux per unit volume — positive divergence means the field is a "source," negative means it is a "sink."

**TheoremBlocks:**

- **Definition 7: 3D Curl** — For $\mathbf{F} = (P, Q, R): \mathbb{R}^3 \to \mathbb{R}^3$ of class $C^1$, the *curl* (or *rotation*) of $\mathbf{F}$ is:
$$\nabla \times \mathbf{F} = \left(\frac{\partial R}{\partial y} - \frac{\partial Q}{\partial z}\right)\hat{\mathbf{i}} + \left(\frac{\partial P}{\partial z} - \frac{\partial R}{\partial x}\right)\hat{\mathbf{j}} + \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)\hat{\mathbf{k}}.$$
  Formally, $\nabla \times \mathbf{F} = \det\begin{pmatrix} \hat{\mathbf{i}} & \hat{\mathbf{j}} & \hat{\mathbf{k}} \\ \partial_x & \partial_y & \partial_z \\ P & Q & R \end{pmatrix}$ (mnemonic determinant). The $\hat{\mathbf{k}}$-component is $\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}$, recovering the 2D curl from Topic 15 (Definition 9).
- **Definition 8: 3D Divergence** — For $\mathbf{F} = (P, Q, R): \mathbb{R}^3 \to \mathbb{R}^3$ of class $C^1$, the *divergence* of $\mathbf{F}$ is:
$$\nabla \cdot \mathbf{F} = \frac{\partial P}{\partial x} + \frac{\partial Q}{\partial y} + \frac{\partial R}{\partial z}.$$
- **Proposition 2: Divergence as Infinitesimal Flux** — Let $\mathbf{F}$ be $C^1$ at $\mathbf{p}$, and let $B_r$ be the ball of radius $r$ centered at $\mathbf{p}$ with surface $S_r$. Then:
$$\nabla \cdot \mathbf{F}(\mathbf{p}) = \lim_{r \to 0} \frac{1}{\frac{4}{3}\pi r^3} \oiint_{S_r} \mathbf{F} \cdot d\mathbf{S}.$$
  The divergence is the flux per unit volume in the limit of infinitesimally small balls — the 3D analog of curl as infinitesimal circulation (Topic 15, Proposition 2).
- **Proof sketch of Proposition 2** — By the divergence theorem (Theorem 2 below), $\oiint_{S_r} \mathbf{F} \cdot d\mathbf{S} = \iiint_{B_r} \nabla \cdot \mathbf{F}\,dV$. By the Mean Value Theorem for triple integrals, $\iiint_{B_r} \nabla \cdot \mathbf{F}\,dV = \nabla \cdot \mathbf{F}(\mathbf{p}_r) \cdot \frac{4}{3}\pi r^3$ for some $\mathbf{p}_r \in B_r$. As $r \to 0$, $\mathbf{p}_r \to \mathbf{p}$ and continuity gives the limit.
- **Proposition 3: Curl as Infinitesimal Circulation (3D version)** — Let $\mathbf{F}$ be $C^1$ at $\mathbf{p}$, and let $D_r$ be the disk of radius $r$ centered at $\mathbf{p}$ with unit normal $\hat{\mathbf{n}}$ and boundary circle $C_r$. Then:
$$(\nabla \times \mathbf{F})(\mathbf{p}) \cdot \hat{\mathbf{n}} = \lim_{r \to 0} \frac{1}{\pi r^2} \oint_{C_r} \mathbf{F} \cdot d\mathbf{r}.$$
  The component of the curl along $\hat{\mathbf{n}}$ is the circulation per unit area in the plane normal to $\hat{\mathbf{n}}$ — extending Topic 15, Proposition 2 to arbitrary orientations.
- **Theorem 1: Key Vector Identities** — For $C^2$ fields:
  1. $\nabla \times (\nabla f) = \mathbf{0}$ — the curl of a gradient is zero.
  2. $\nabla \cdot (\nabla \times \mathbf{F}) = 0$ — the divergence of a curl is zero.
  3. $\nabla \times (\nabla \times \mathbf{F}) = \nabla(\nabla \cdot \mathbf{F}) - \nabla^2 \mathbf{F}$ — the curl-curl identity.
  
  Identity (1) says conservative fields are irrotational — this is the 3D generalization of the exactness criterion (Topic 15, Theorem 4). Identity (2) says solenoidal fields (fields that are curls) are divergence-free. Together, these encode the exact sequence $\text{grad} \to \text{curl} \to \text{div} \to 0$, a central structure in differential forms and de Rham cohomology.
- **Example 8: Computing curl and divergence** — For $\mathbf{F}(x,y,z) = (yz, xz, xy)$: $\nabla \times \mathbf{F} = (x - x, y - y, z - z) = \mathbf{0}$ — this field is irrotational (it equals $\nabla(xyz)$, so it is a gradient). $\nabla \cdot \mathbf{F} = 0 + 0 + 0 = 0$ — also divergence-free.
- **Example 9: Non-trivial curl** — For $\mathbf{F}(x,y,z) = (-y, x, 0)$ (the rotation field from Topic 15, extended to 3D): $\nabla \times \mathbf{F} = (0, 0, 2)$ — constant curl pointing in the $z$-direction, consistent with the 2D curl value of $2$ from Topic 15.

**Visualization:** `CurlDivergenceExplorer3D` embedded here.

**Static image:** `curl-divergence-3d.png` from the notebook.

### Section 6: Stokes' Theorem

**Green's theorem in 3D.** Stokes' theorem relates the circulation of $\mathbf{F}$ around the boundary curve $C$ of a surface $S$ to the flux of $\nabla \times \mathbf{F}$ through $S$. This is the direct generalization of Green's theorem from planar regions (Topic 15, Theorem 5) to surfaces in $\mathbb{R}^3$.

**Geometric-first:** Green's theorem says the total rotation inside a 2D region equals the total circulation around the boundary. Stokes' theorem says the same thing, but the "inside" is now a 2D surface floating in 3D space, and the "boundary" is the curve along its edge. The circulation $\oint_C \mathbf{F} \cdot d\mathbf{r}$ counts how much $\mathbf{F}$ pushes along the boundary; the surface integral $\iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S}$ sums up the infinitesimal rotation at every point of the surface. These are equal.

**TheoremBlocks:**

- **Theorem 2: Stokes' Theorem** — Let $S$ be an oriented, piecewise-smooth surface in $\mathbb{R}^3$ with piecewise-smooth boundary curve $C = \partial S$, oriented by the right-hand rule relative to $S$'s normal. Let $\mathbf{F} = (P, Q, R)$ be a $C^1$ vector field on an open set containing $S$ and $C$. Then:
$$\oint_C \mathbf{F} \cdot d\mathbf{r} = \iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S}.$$
- **Proof of Theorem 2** — Full proof for the case where $S$ is a graph $z = g(x, y)$ over a domain $D$ with boundary $\partial D$ — the key case from which the general result follows by partition of unity.

  We parameterize $S$ by $\mathbf{r}(x, y) = (x, y, g(x, y))$ for $(x, y) \in D$. With this parameterization, $\mathbf{r}_x \times \mathbf{r}_y = (-g_x, -g_y, 1)$, so:
  $$\iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S} = \iint_D \left[\left(\frac{\partial R}{\partial y} - \frac{\partial Q}{\partial z}\right)(-g_x) + \left(\frac{\partial P}{\partial z} - \frac{\partial R}{\partial x}\right)(-g_y) + \left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)\right]\,dA.$$
  
  We show this equals $\oint_C P\,dx + Q\,dy + R\,dz$ by treating each component separately. For the $P\,dx$ term: on $C$, $z = g(x,y)$, so $dz = g_x\,dx + g_y\,dy$. The boundary curve $C$ projects to $\partial D$ in the $xy$-plane. Consider $\oint_C P(x, y, g(x,y))\,dx$. Define $\tilde{P}(x, y) = P(x, y, g(x, y))$. By Green's theorem (Topic 15, Theorem 5):
  $$\oint_{\partial D} \tilde{P}\,dx = -\iint_D \frac{\partial \tilde{P}}{\partial y}\,dA = -\iint_D \left(\frac{\partial P}{\partial y} + \frac{\partial P}{\partial z}\,g_y\right)\,dA.$$
  The $Q\,dy$ and $R\,dz$ terms are handled analogously. Adding all three and collecting terms yields the right-hand side. The algebra is lengthy, but every step uses only Green's theorem and the chain rule — the same tools as the 2D proof. For general surfaces, decompose into graph patches using a partition of unity.

- **Example 10: Verifying Stokes' on a hemisphere** — $\mathbf{F} = (-y, x, 0)$. Let $S$ be the upper hemisphere $x^2+y^2+z^2=1$, $z \ge 0$, with boundary $C$ being the unit circle in the $xy$-plane. Left side: $\oint_C \mathbf{F} \cdot d\mathbf{r} = \int_0^{2\pi} (\sin^2 t + \cos^2 t)\,dt = 2\pi$. Right side: $\nabla \times \mathbf{F} = (0, 0, 2)$, $\iint_S (0,0,2) \cdot d\mathbf{S} = 2 \cdot \text{Area}(\text{disk}) = 2\pi$ (by the projection of $\hat{\mathbf{n}}$ onto $\hat{\mathbf{k}}$, the integral equals $2$ times the area of the shadow on the $xy$-plane). Both sides give $2\pi$.
- **Example 11: Stokes' theorem as a tool** — Compute $\oint_C (y^2\,dx + xy\,dy + xz\,dz)$ where $C$ is the triangle with vertices $(1,0,0)$, $(0,1,0)$, $(0,0,1)$, oriented counterclockwise when viewed from the first octant. Direct computation requires three line segments. Stokes' theorem: $\nabla \times \mathbf{F} = (z - x, 0 - z, y - 2y) = (z-x, -z, -y)$. The triangle lies on $x+y+z=1$ with outward normal $\hat{\mathbf{n}} = \frac{1}{\sqrt{3}}(1,1,1)$, $dS = \sqrt{3}\,dA$ where $dA$ is the $xy$-projection. $\iint_S (\nabla \times \mathbf{F}) \cdot \hat{\mathbf{n}}\,dS = \iint_D [(z-x)+(-z)+(-y)]\,dA = \iint_D [-(x+y)]\,dA$ (using $z = 1-x-y$). Over the triangle $D$: $0 \le x \le 1$, $0 \le y \le 1-x$, so $\int_0^1 \int_0^{1-x} [-(x+y)]\,dy\,dx = -\frac{1}{3}$.
- **Remark 5: Surface independence** — If $\nabla \times \mathbf{F}$ is known, the flux integral $\iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S}$ depends only on the boundary $\partial S$, not on the surface $S$ itself (as long as the boundary is the same). This is the surface analog of path independence for conservative fields. Two surfaces $S_1$ and $S_2$ with the same boundary give the same Stokes' integral — because $\oint_C \mathbf{F} \cdot d\mathbf{r}$ depends only on $C$.

**Visualization:** `StokesTheoremExplorer` embedded here.

**Static image:** `stokes-theorem.png` from the notebook.

### Section 7: The Divergence Theorem

**Relating surface flux to volume divergence.** The divergence theorem (Gauss's theorem) is the crown jewel of vector calculus. It relates the total outward flux of a vector field through a closed surface to the total divergence inside the enclosed volume.

**Geometric-first:** Imagine chopping the volume $E$ into tiny cubes. In each cube, the divergence $\nabla \cdot \mathbf{F}$ measures the net outward flux through the cube's six faces. When we add up over all cubes, adjacent faces share a common boundary with opposite normals — their flux contributions cancel. The only faces that survive are on the outer boundary $S = \partial E$. So the total divergence inside equals the net flux out through the boundary. This is the same telescoping argument as the FTC ($\int_a^b f'(x)\,dx = f(b) - f(a)$) and Green's theorem — the interior derivatives telescope, leaving only the boundary values.

**TheoremBlocks:**

- **Theorem 3: The Divergence Theorem (Gauss's Theorem)** — Let $E \subseteq \mathbb{R}^3$ be a bounded region with piecewise-smooth boundary surface $S = \partial E$, oriented with the outward-pointing normal. Let $\mathbf{F} = (P, Q, R)$ be a $C^1$ vector field on an open set containing $E$ and $S$. Then:
$$\oiint_S \mathbf{F} \cdot d\mathbf{S} = \iiint_E \nabla \cdot \mathbf{F}\,dV.$$
- **Proof of Theorem 3** — Full proof for "simple" regions (Type I $\cap$ Type II $\cap$ Type III in $\mathbb{R}^3$). We show each component separately.

  *Claim:* $\oiint_S R\,dz\,dx\,dy$-component $= \iiint_E \frac{\partial R}{\partial z}\,dV$ (and analogously for $P$ and $Q$).

  Let $E$ be a Type III region: $D$ is a region in the $xy$-plane, and for each $(x, y) \in D$, $z$ ranges from $z = g_1(x, y)$ (bottom) to $z = g_2(x, y)$ (top). Then:
  $$\iiint_E \frac{\partial R}{\partial z}\,dV = \iint_D \int_{g_1(x,y)}^{g_2(x,y)} \frac{\partial R}{\partial z}\,dz\,dA = \iint_D [R(x, y, g_2(x,y)) - R(x, y, g_1(x,y))]\,dA.$$

  The boundary $S = \partial E$ consists of: the top surface $S_2: z = g_2(x,y)$ with outward normal pointing upward, the bottom surface $S_1: z = g_1(x,y)$ with outward normal pointing downward, and possibly lateral surfaces.

  On $S_2$ (parameterized by $(x,y)$, upward normal): $\iint_{S_2} \mathbf{F} \cdot d\mathbf{S}$ has $R$-contribution $\iint_D R(x,y,g_2)\,dA$ (since the $z$-component of $\mathbf{r}_x \times \mathbf{r}_y = (-g_{2,x}, -g_{2,y}, 1)$ is $+1$).
  
  On $S_1$ (parameterized by $(x,y)$, downward normal — outward for the bottom): the $z$-component of the outward normal is $-1$, giving $R$-contribution $-\iint_D R(x,y,g_1)\,dA$.
  
  On lateral surfaces, $dA_{xy} = 0$, so the $R$-contribution vanishes.
  
  Adding: $\oiint_S [\text{R-component}] = \iint_D [R(x,y,g_2) - R(x,y,g_1)]\,dA$, matching the volume integral.

  The $P$- and $Q$-components use Type I and Type II decompositions analogously. For general regions, decompose into simple subregions; interior boundary contributions cancel in pairs (each internal face is shared by two subregions with opposite normals).

- **Example 12: Verification on a cube** — $\mathbf{F} = (x^2, y^2, z^2)$, $E = [0,1]^3$. Divergence: $\nabla \cdot \mathbf{F} = 2x + 2y + 2z$. Volume integral: $\iiint_E (2x+2y+2z)\,dV = 3 \cdot 2\int_0^1 t\,dt = 3$. Surface flux: sum over six faces. For example, on $x = 1$: $\iint (1, y^2, z^2) \cdot (1,0,0)\,dA = 1$. On $x = 0$: $\iint (0, y^2, z^2) \cdot (-1,0,0)\,dA = 0$. By symmetry, total flux = $1 + 0 + 1 + 0 + 1 + 0 = 3$. Both sides match.
- **Example 13: Inverse-square field** — $\mathbf{F} = \frac{\mathbf{r}}{r^3}$ where $r = \|\mathbf{r}\|$. Away from the origin, $\nabla \cdot \mathbf{F} = 0$ — the gravitational/electrostatic field is divergence-free in empty space. For a surface $S$ not enclosing the origin: $\oiint_S \mathbf{F} \cdot d\mathbf{S} = 0$ (divergence theorem). For a sphere of radius $R$ centered at the origin: direct computation gives $\oiint_S \mathbf{F} \cdot d\mathbf{S} = 4\pi$. The divergence theorem "fails" because $\mathbf{F}$ is singular at the origin — $\nabla \cdot \mathbf{F}$ is actually $4\pi\delta(\mathbf{r})$ in the distributional sense. This is the 3D analog of the vortex field (Topic 15, Example 12): a "point source" that the smooth divergence misses.
- **Remark 6: The divergence theorem as a conservation law** — For a fluid with velocity $\mathbf{v}$ and density $\rho$, the continuity equation $\frac{\partial \rho}{\partial t} + \nabla \cdot (\rho\mathbf{v}) = 0$ expresses mass conservation. Integrating over a region $E$ and applying the divergence theorem: $\frac{d}{dt}\iiint_E \rho\,dV = -\oiint_S \rho\mathbf{v} \cdot d\mathbf{S}$ — the rate of mass change inside $E$ equals the negative of the mass flux out through $\partial E$. This is the prototype of every conservation law in physics.
- **Remark 7: The generalized Stokes' theorem** — Green's theorem, the classical Stokes' theorem, the divergence theorem, and the Gradient Theorem are all instances of a single result: $\int_M d\omega = \int_{\partial M} \omega$, where $M$ is an oriented manifold with boundary $\partial M$, $\omega$ is a differential form, and $d\omega$ is its exterior derivative. The dimension of $M$ determines which classical theorem appears:
  - $M$ is a curve, $\omega$ is a 0-form (function) → **Gradient Theorem** (Topic 15, Theorem 2)
  - $M$ is a region in $\mathbb{R}^2$, $\omega$ is a 1-form → **Green's theorem** (Topic 15, Theorem 5)
  - $M$ is a surface in $\mathbb{R}^3$, $\omega$ is a 1-form → **Stokes' theorem** (Theorem 2 above)
  - $M$ is a region in $\mathbb{R}^3$, $\omega$ is a 2-form → **Divergence theorem** (Theorem 3 above)
  
  This unification is the subject of [Smooth Manifolds](https://formalml.com/topics/smooth-manifolds) → formalML, where all four theorems are derived as corollaries of the generalized Stokes' theorem for differential forms.

**Visualization:** `DivergenceTheoremExplorer` embedded here.

**Static image:** `divergence-theorem.png` from the notebook.

### Section 8: Graphs, Applications & Computation

**Special cases and practical computation.** Most surfaces encountered in applications are graphs $z = g(x, y)$, or surfaces of revolution, or level sets $F(x,y,z) = 0$. Each has a simplified formula for $dS$.

**TheoremBlocks:**

- **Proposition 4: Surface integral over a graph** — For the graph $z = g(x, y)$ over a region $D$ in the $xy$-plane:
$$\iint_S f\,dS = \iint_D f(x, y, g(x,y))\,\sqrt{1 + g_x^2 + g_y^2}\,dA.$$
  For the flux integral with upward-pointing normal:
$$\iint_S \mathbf{F} \cdot d\mathbf{S} = \iint_D \mathbf{F}(x, y, g(x,y)) \cdot (-g_x, -g_y, 1)\,dA.$$
- **Example 14: Area of a saddle surface** — $z = x^2 - y^2$ over the unit disk. $dS = \sqrt{1 + 4x^2 + 4y^2}\,dA$. In polar: $\int_0^{2\pi}\int_0^1 \sqrt{1+4r^2}\,r\,dr\,d\theta = 2\pi \cdot \frac{1}{12}(5\sqrt{5}-1) \approx 7.62$.
- **Example 15: Flux computation via the divergence theorem** — Compute $\oiint_S \mathbf{F} \cdot d\mathbf{S}$ where $\mathbf{F} = (x^3, y^3, z^3)$ and $S$ is the unit sphere. Direct computation would require parameterizing the sphere. The divergence theorem: $\nabla \cdot \mathbf{F} = 3(x^2+y^2+z^2) = 3r^2$. In spherical coordinates: $\iiint_E 3r^2 \cdot r^2\sin\phi\,dr\,d\theta\,d\phi = 3\int_0^{2\pi}\int_0^\pi\int_0^1 r^4\sin\phi\,dr\,d\phi\,d\theta = 3 \cdot 2\pi \cdot 2 \cdot \frac{1}{5} = \frac{12\pi}{5}$.

**Static image:** `graph-surfaces.png` from the notebook.

### Section 9: Computational Notes

**NumPy/SciPy implementation.** Practical code for computing surface integrals numerically.

- `scipy.integrate.dblquad` for parameterized surface integrals.
- Numerical curl and divergence via finite differences.
- Mesh-based approximation: triangulate the surface and sum contributions.
- Verifying theorems numerically: compute both sides and compare.

Code snippets for:
1. Computing $\iint_S f\,dS$ given $\mathbf{r}(u, v)$ and $f$.
2. Computing $\iint_S \mathbf{F} \cdot d\mathbf{S}$ given $\mathbf{r}(u, v)$ and $\mathbf{F}$.
3. Computing $\nabla \times \mathbf{F}$ and $\nabla \cdot \mathbf{F}$ numerically.
4. Verifying Stokes' theorem: line integral vs. curl surface integral.
5. Verifying divergence theorem: surface flux vs. volume divergence integral.

### Section 10: Connections to ML

This section is substantial — surface integrals and the divergence theorem appear in ML in four distinct ways.

**10.1 Stein's Identity and Stein Variational Gradient Descent (SVGD)**

The divergence theorem gives Stein's identity: for a smooth density $p$ on $\mathbb{R}^d$ with $p(\mathbf{x}) \to 0$ as $\|\mathbf{x}\| \to \infty$, and a smooth vector field $\phi$:
$$\mathbb{E}_{p}[\nabla \cdot \phi(\mathbf{x}) + \phi(\mathbf{x}) \cdot \nabla \log p(\mathbf{x})] = 0.$$
This is derived by applying the divergence theorem to $\iiint (p\phi) \cdot \hat{\mathbf{n}}\,dS$ and noting the boundary term vanishes. The identity means $\mathbb{E}_p[\mathcal{A}_p \phi] = 0$ where $\mathcal{A}_p \phi = \nabla \cdot \phi + \phi \cdot \nabla \log p$ is the *Stein operator*. SVGD exploits this: it transports particles along the direction $\phi^*$ that maximizes $\mathbb{E}_q[\mathcal{A}_p \phi]$, driving $q$ toward $p$. The divergence theorem makes the entire framework possible.

→ [Measure-Theoretic Probability](https://formalml.com/topics/measure-theoretic-probability) → formalML

**10.2 Physics-Informed Neural Networks (PINNs)**

Conservation laws in physics — conservation of mass ($\nabla \cdot (\rho\mathbf{v}) = -\partial_t \rho$), energy, momentum — are all statements that can be derived from or verified via the divergence theorem. PINNs enforce these PDE constraints as soft penalties in the loss function. The divergence theorem ensures that enforcing the local PDE $\nabla \cdot \mathbf{F} = s$ is equivalent to enforcing the integral constraint $\oiint_S \mathbf{F} \cdot d\mathbf{S} = \iiint_E s\,dV$ for every region $E$. This integral form is sometimes more stable numerically and motivates the "variational PINN" approach.

**10.3 Flow-Matching Generative Models**

In flow-matching, a neural network learns a velocity field $\mathbf{v}(\mathbf{x}, t)$ that transforms a simple distribution $p_0$ (Gaussian) into a complex target $p_1$ (data). The density $p(\mathbf{x}, t)$ satisfies the continuity equation:
$$\frac{\partial p}{\partial t} + \nabla \cdot (p\mathbf{v}) = 0.$$
Integrating over any region $E$ and applying the divergence theorem: $\frac{d}{dt}\int_E p\,dV = -\oint_{\partial E} p\mathbf{v} \cdot d\mathbf{S}$ — the mass inside $E$ changes only through the boundary flux. This is the probabilistic form of mass conservation (Remark 6). The training objective ensures the learned $\mathbf{v}$ satisfies this equation, and the divergence theorem guarantees probability is conserved.

→ [Gradient Descent](https://formalml.com/topics/gradient-descent) → formalML (flow-matching uses ODE integration, connecting to continuous-time optimization)

**10.4 Conservation Laws in Gradient Flow**

For gradient flow $\dot{\theta} = -\nabla L(\theta)$, the divergence $\nabla \cdot (-\nabla L) = -\Delta L$ (the negative Laplacian of the loss) determines the "convergence geometry" of optimization. In regions where $\Delta L > 0$ (subharmonic), trajectories converge — the divergence theorem says the net flux of trajectories out of any closed surface is negative, meaning trajectories accumulate. Near saddle points where $\Delta L < 0$ (superharmonic), trajectories diverge. The Laplacian $\Delta L = \text{tr}(H_L)$ — the trace of the Hessian (Topic 11) — directly controls this behavior.

**Static image:** `ml-connections.png` from the notebook.

### Section 11: Connections & Further Reading

Cross-reference table linking to all prerequisite topics (live links), downstream topics (all as "(coming soon)"), and forward references to formalml.com.

Prerequisite DAG diagram showing this topic's position — the unique three-inbound-edge structure:
```
multiple-integrals ──→ surface-integrals
change-of-variables ──→ surface-integrals
line-integrals ──────→ surface-integrals
```

**This topic completes the Multivariable Integral Calculus track (4/4).**

**Forward references to planned topics (plain text + "(coming soon)"):**

- **Series Convergence & Tests** *(coming soon)* — Fourier coefficients use integration formulas; the divergence theorem appears in Fourier analysis on domains.
- **Stability & Dynamical Systems** *(coming soon)* — Lyapunov functions and the divergence theorem yield energy dissipation estimates for dynamical systems.
- **Sigma-Algebras & Measures** *(coming soon)* — Surface measures generalize the surface area element to the measure-theoretic framework. The co-area formula connects level-set integrals to surface integrals.
- **Hilbert Spaces** *(coming soon)* — Integration by parts on domains in $\mathbb{R}^n$ uses the divergence theorem, foundational for weak derivatives and Sobolev spaces.
- **Calculus of Variations** *(coming soon)* — The Euler-Lagrange equation on domains requires the divergence theorem to transfer derivatives from the variation to the Lagrangian.

---

## 4. Visualizations

### 4.1 FluxExplorer (Flagship)

- **Component name:** `FluxExplorer`
- **Filename:** `src/components/viz/FluxExplorer.tsx`
- **What it visualizes:** A 3D vector field with a parameterized surface. Flux arrows pass through the surface, and their contributions (positive when aligned with the outward normal, negative when opposed) are accumulated into the total flux integral. The reader sees the dot product $\mathbf{F} \cdot \hat{\mathbf{n}}$ at each point on the surface. **This is the flagship component** — making the abstract concept of "flow through a surface" tangible.
- **Interactions:**
  - Surface presets: hemisphere (open, has boundary), sphere (closed, no boundary), paraboloid cap, cylinder side, graph $z = g(x,y)$.
  - Vector field presets: radial $(x,y,z)$, vertical $(0,0,1)$, rotational $(-y,x,0)$, source $(x,y,z)/r^3$, uniform $(1,0,0)$.
  - Toggle: show/hide vector field arrows (on a 5×5×5 sparse 3D grid for performance).
  - Toggle: show/hide normal vectors on the surface (rendered as short arrows at mesh nodes).
  - Toggle: show/hide flux heatmap on the surface (color each mesh face by $\mathbf{F} \cdot \hat{\mathbf{n}}$: green for positive flux, red for negative flux).
  - 3D rotation (drag to orbit the scene). Use `project3D()` from `multivariate.ts`.
- **Readout:** Total flux $\iint_S \mathbf{F} \cdot d\mathbf{S}$, divergence theorem prediction $\iiint_E \nabla \cdot \mathbf{F}\,dV$ (for closed surfaces), max/min $\mathbf{F} \cdot \hat{\mathbf{n}}$.
- **Layout:** Single 3D panel (D3 isometric projection using `project3D()` and `generateWireframe()`). Readout table below.
- **Performance:** Surface mesh rendered as a wireframe (20×20 grid) with face coloring for the flux heatmap. Vector field arrows on a sparse grid to avoid clutter. Use depth sorting for correct occlusion (painter's algorithm on mesh faces).
- **Color scale:** Use `vizColors.diverging` for the flux heatmap (green = positive flux, red = negative flux, white = zero).

### 4.2 StokesTheoremExplorer

- **Component name:** `StokesTheoremExplorer`
- **Filename:** `src/components/viz/StokesTheoremExplorer.tsx`
- **What it visualizes:** Simultaneous computation of both sides of Stokes' theorem. Left: a surface $S$ with its boundary curve $C$, showing the circulation $\oint_C \mathbf{F} \cdot d\mathbf{r}$ (animated particle from Topic 15's pattern). Right: the same surface with a heatmap of $(\nabla \times \mathbf{F}) \cdot \hat{\mathbf{n}}$, showing the curl flux $\iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S}$. Both values converge to the same number.
- **Interactions:**
  - Surface presets: upper hemisphere (boundary = unit circle), disk at $z=0$ (reduces to Green's theorem), tilted disk, paraboloid cap.
  - Vector field presets: rotation $(-y, x, 0)$, linear $(y, z, x)$, quadratic $(yz, xz, xy)$.
  - "Animate" button: simultaneously runs boundary traversal and curl accumulation.
  - Toggle: show surface as wireframe or shaded.
  - Toggle: show/hide curl heatmap.
- **Readout:** Line integral value $\oint_C \mathbf{F} \cdot d\mathbf{r}$, curl flux $\iint_S (\nabla \times \mathbf{F}) \cdot d\mathbf{S}$, difference.
- **Layout:** Two-panel side-by-side (3D left, 3D right), both using the same viewing angle. Numerical comparison below.

### 4.3 DivergenceTheoremExplorer

- **Component name:** `DivergenceTheoremExplorer`
- **Filename:** `src/components/viz/DivergenceTheoremExplorer.tsx`
- **What it visualizes:** A closed surface $S$ enclosing a volume $E$. Left panel: the surface with flux arrows showing the net outward flux $\oiint_S \mathbf{F} \cdot d\mathbf{S}$. Right panel: the interior volume with a divergence heatmap showing $\nabla \cdot \mathbf{F}$ at each point, with the volume integral $\iiint_E \nabla \cdot \mathbf{F}\,dV$ computed. Both values match.
- **Interactions:**
  - Volume presets: unit cube, unit sphere, cylinder $r \le 1$, $0 \le z \le 1$.
  - Vector field presets: linear $(x,y,z)$ ($\nabla \cdot \mathbf{F} = 3$), quadratic $(x^2, y^2, z^2)$, rotational $(-y,x,0)$ ($\nabla \cdot \mathbf{F} = 0$), source $(x,y,z)/r^3$ (divergence-free away from origin).
  - Mesh resolution slider (n = 4–20): controls surface and volume mesh density.
  - Toggle: show/hide surface with transparent fill.
  - Toggle: show/hide cross-section (cutaway to show interior divergence).
- **Readout:** Surface flux value, volume divergence integral, difference, divergence formula for selected field.
- **Layout:** Two-panel side-by-side. Left: surface with flux arrows. Right: interior cross-section with divergence heatmap. Below: numerical comparison.

### 4.4 SurfaceParameterizationExplorer

- **Component name:** `SurfaceParameterizationExplorer`
- **Filename:** `src/components/viz/SurfaceParameterizationExplorer.tsx`
- **What it visualizes:** The mapping from a flat parameter domain $D^*$ (a rectangle in $(u,v)$-space) to a curved surface $S$ in 3D. A uniform grid in parameter space deforms into the surface mesh, with each face colored by $\|\mathbf{r}_u \times \mathbf{r}_v\|$ (the area scaling factor). Tangent vectors $\mathbf{r}_u$, $\mathbf{r}_v$, and the normal $\mathbf{r}_u \times \mathbf{r}_v$ are drawn at a user-selected point.
- **Interactions:**
  - Surface presets: sphere, cylinder, torus, saddle graph, cone.
  - Click on the parameter domain to select a point; see the corresponding tangent frame in 3D.
  - Toggle: show/hide area element coloring (heatmap by $\|\mathbf{r}_u \times \mathbf{r}_v\|$).
  - Toggle: show/hide normal vectors at mesh nodes.
  - 3D rotation (drag to orbit).
- **Readout:** Selected $(u, v)$, position $\mathbf{r}(u,v)$, $\mathbf{r}_u$, $\mathbf{r}_v$, $\mathbf{r}_u \times \mathbf{r}_v$, $\|\mathbf{r}_u \times \mathbf{r}_v\|$.
- **Layout:** Two-panel. Left: parameter domain $D^*$ with grid. Right: 3D surface $S$ with corresponding grid. Below: tangent frame readout.

---

## 5. Data Modules

### 5.1 `surface-integrals-data.ts`

**Filename:** `src/data/surface-integrals-data.ts`

**Exported interfaces:**

```typescript
export interface SurfacePreset {
  name: string;
  label: string;
  r: (u: number, v: number) => [number, number, number]; // parameterization
  r_u: (u: number, v: number) => [number, number, number]; // ∂r/∂u
  r_v: (u: number, v: number) => [number, number, number]; // ∂r/∂v
  paramDomain: { u: [number, number]; v: [number, number] };
  isClosed: boolean;
  description: string;
}

export interface VectorField3DPreset {
  name: string;
  label: string;
  F: (x: number, y: number, z: number) => [number, number, number];
  divergence: (x: number, y: number, z: number) => number;
  curl: (x: number, y: number, z: number) => [number, number, number];
  divergenceFormula: string; // LaTeX for display
  curlFormula: string; // LaTeX for display
  description: string;
}

export interface VolumePreset {
  name: string;
  label: string;
  boundary: SurfacePreset;
  volumeIntegral: (f: (x: number, y: number, z: number) => number) => number;
  exactVolume: number;
  description: string;
}
```

**Exported constants:**

```typescript
export const surfacePresets: SurfacePreset[];         // 6: sphere, hemisphere, cylinder, torus, paraboloid cap, saddle graph
export const vectorField3DPresets: VectorField3DPreset[];  // 6: radial, vertical, rotational, source, uniform, quadratic
export const volumePresets: VolumePreset[];             // 4: cube, sphere, cylinder, cone
export const closedSurfacePresets: SurfacePreset[];     // 3: sphere, cube boundary, cylinder (closed)
export const openSurfacePresets: SurfacePreset[];       // 3: hemisphere, paraboloid cap, disk
```

**Lazy initialization:** Use the lazy `getPresets()` pattern for any presets that involve expensive setup.

---

## 6. Shared Utility Module Extensions

### 6.1 `multivariate.ts` (Extension)

**New functions:**

```typescript
/** Compute 3D cross product a × b */
export function crossProduct3D(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number];

/** Compute 3D curl: ∇ × F via finite differences */
export function curl3D(
  F: (x: number, y: number, z: number) => [number, number, number],
  x: number,
  y: number,
  z: number,
  h?: number
): [number, number, number];

/** Compute 3D divergence: ∇ · F via finite differences */
export function divergence3D(
  F: (x: number, y: number, z: number) => [number, number, number],
  x: number,
  y: number,
  z: number,
  h?: number
): number;

/** Compute the outward normal vector at a point on a parameterized surface */
export function surfaceNormal(
  r_u: [number, number, number],
  r_v: [number, number, number]
): { normal: [number, number, number]; magnitude: number; unitNormal: [number, number, number] };

/** Compute scalar surface integral ∬_S f dS via parameterization */
export function surfaceIntegralScalar(
  f: (x: number, y: number, z: number) => number,
  r: (u: number, v: number) => [number, number, number],
  r_u: (u: number, v: number) => [number, number, number],
  r_v: (u: number, v: number) => [number, number, number],
  uRange: [number, number],
  vRange: [number, number] | ((u: number) => [number, number]),
  nu?: number,
  nv?: number
): number;

/** Compute flux integral ∬_S F · dS via parameterization */
export function surfaceIntegralFlux(
  F: (x: number, y: number, z: number) => [number, number, number],
  r: (u: number, v: number) => [number, number, number],
  r_u: (u: number, v: number) => [number, number, number],
  r_v: (u: number, v: number) => [number, number, number],
  uRange: [number, number],
  vRange: [number, number] | ((u: number) => [number, number]),
  nu?: number,
  nv?: number
): number;
```

**Backward compatibility:** Extension only. All existing functions from Topics 9–15 are unchanged.

### 6.2 `integration.ts` (Extension)

**New functions:**

```typescript
/** Compute the surface area element ‖r_u × r_v‖ at a point */
export function surfaceAreaElement(
  r_u: [number, number, number],
  r_v: [number, number, number]
): number;

/** Verify the divergence theorem: compute both ∬_S F · dS and ∭_E ∇·F dV */
export function volumeIntegralDivergence(
  divF: (x: number, y: number, z: number) => number,
  bounds: {
    xRange: [number, number];
    yRange: [number, number] | ((x: number) => [number, number]);
    zRange: [number, number] | ((x: number, y: number) => [number, number]);
  },
  nx?: number,
  ny?: number,
  nz?: number
): number;
```

**Backward compatibility:** Extension only. All existing functions from Topics 7, 8, 13, 14, and 15 are unchanged.

---

## 7. Curriculum Graph Updates

**Add node:**
```json
{ "id": "surface-integrals", "label": "Surface Integrals & the Divergence Theorem", "domain": "multivar-integral", "status": "published", "url": "/topics/surface-integrals" }
```

**Add edges:**
```json
{ "source": "multiple-integrals", "target": "surface-integrals" }
{ "source": "change-of-variables", "target": "surface-integrals" }
{ "source": "line-integrals", "target": "surface-integrals" }
```

**Verify existing planned node.** If `surface-integrals` already exists with `"status": "planned"` from a previous brief, update its status to `"published"` and verify the label and URL match.

**Verify all three inbound edges exist.** Topics 13, 14, and 15 all specified forward edges to `surface-integrals`. Verify they are present; if any are missing, add them.

### `src/data/curriculum.ts`

In the `multivar-integral` track definition, move `"Surface Integrals & the Divergence Theorem"` from `planned` to `published`. The `planned` array should now be **empty** — Track 4 is complete.

---

## 8. Cross-References

### Existing topics that should link TO this topic

Four forward references need updating from "(coming soon)" to live links:

1. **`multiple-integrals.mdx`** — Line ~550: "triple integrals and the divergence theorem." Update to: `[Surface Integrals & the Divergence Theorem](/topics/surface-integrals)`.
2. **`line-integrals.mdx`** — Line ~423: Remark 6 about Green's as 2D Stokes'. Update forward ref to live link.
3. **`line-integrals.mdx`** — Line ~589: Connections section, Stokes' + divergence theorem. Update to live link.
4. **`change-of-variables.mdx`** — Line ~427: "Surface area element involves the Jacobian." Update to live link.

Additionally, check and update any other "(coming soon)" references to surface integrals in:
- **`jacobian.mdx`** — May reference the Gram determinant or the surface Jacobian.
- **`hessian.mdx`** — May reference second-order surface analysis.

### Topics this topic links FROM

- `multiple-integrals` — prerequisite (live link). Fubini for parameter-domain integrals, triple integrals for the divergence theorem.
- `change-of-variables` — prerequisite (live link). Jacobian determinant, cylindrical/spherical coordinates.
- `line-integrals` — prerequisite (live link). Green's theorem is 2D Stokes', 2D curl, and circulation.
- `gradient` — gradient as the engine of the curl and divergence operators (live link, cross-track).
- `jacobian` — Jacobian matrix, Gram determinant (live link, cross-track).
- `inverse-implicit` — implicit surfaces, level sets, normal vectors from $\nabla F$ (live link, cross-track).
- `riemann-integral` — every surface integral reduces to a Riemann integral after parameterization (live link, cross-track).
- `hessian` — the Laplacian $\Delta L = \text{tr}(H_L)$ appears in ML connections (live link, cross-track).

### Forward references to planned topics (plain text + "(coming soon)")

- **Series Convergence & Tests** *(coming soon)* — referenced in Section 11.
- **Stability & Dynamical Systems** *(coming soon)* — referenced in Section 11.
- **Sigma-Algebras & Measures** *(coming soon)* — referenced in Section 11.
- **Hilbert Spaces** *(coming soon)* — referenced in Section 11.
- **Calculus of Variations** *(coming soon)* — referenced in Section 11.

### formalml.com forward links (informational, external, new tab)

- `gradient-descent` — Sections 1, 10.3, 10.4
- `measure-theoretic-probability` — Section 10.1 (Stein's identity)
- `smooth-manifolds` — Sections 6, 7 (generalized Stokes' theorem)
- `information-geometry` — Section 10.4 (Fisher-Rao volume form)

---

## 9. Images

| # | Filename | Description |
|---|----------|-------------|
| 1 | `parameterized-surfaces.png` | Three surfaces: sphere, cylinder, saddle graph with tangent vectors and normal vectors at sample points |
| 2 | `scalar-surface-integral.png` | Hemispherical shell with density coloring $f = z$, showing $dS$ elements |
| 3 | `flux-integral.png` | Vector field passing through an oriented surface: flux arrows decomposed into normal and tangential components |
| 4 | `curl-divergence-3d.png` | Four-panel: 3D curl of rotation field, 3D curl of gradient field (zero), positive divergence (source), zero divergence (rotation) |
| 5 | `stokes-theorem.png` | Stokes' theorem verified: hemisphere with boundary circle, line integral = curl flux, side-by-side comparison |
| 6 | `divergence-theorem.png` | Divergence theorem verified: closed surface with outward flux arrows, interior divergence heatmap (cross-section), both sides computed |
| 7 | `inverse-square.png` | Inverse-square field $\mathbf{r}/r^3$: zero divergence away from origin, flux through concentric spheres, distributional divergence at origin |
| 8 | `graph-surfaces.png` | Graph surface $z = g(x,y)$ with area element $\sqrt{1+g_x^2+g_y^2}\,dA$ visualized as stretched grid cells |
| 9 | `ml-connections.png` | Four-panel: Stein's identity via divergence theorem, PINN conservation law, flow-matching continuity equation, gradient flow divergence |

---

## 10. Testing Checklist

- [ ] MDX renders at `/topics/surface-integrals`
- [ ] All TheoremBlocks render LaTeX correctly (8 definitions, 3 theorems, 4 propositions, 15 examples, 7 remarks, 2 full proofs + 2 proof sketches)
- [ ] All 4 viz components load on scroll and function correctly
- [ ] 3D rendering works correctly (depth sorting, wireframe, face coloring)
- [ ] All cross-references resolve (no 404s)
- [ ] Forward references use plain text + "(coming soon)"
- [ ] Four "(coming soon)" references in Topics 13, 14, 15 updated to live links
- [ ] Curriculum graph and curriculum.ts updated (Track 4 complete, planned array empty)
- [ ] Static images load from `public/images/topics/surface-integrals/`
- [ ] Responsive layout on mobile
- [ ] Pagefind indexes the new topic
- [ ] `pnpm build` succeeds with zero errors

---

## 11. Build Order

1. Extend `multivariate.ts` — add `crossProduct3D`, `curl3D`, `divergence3D`, `surfaceNormal`, `surfaceIntegralScalar`, `surfaceIntegralFlux`. Test `crossProduct3D` on standard basis vectors: $\hat{\mathbf{i}} \times \hat{\mathbf{j}} = \hat{\mathbf{k}}$. Test `curl3D` on rotation field $(-y,x,0)$ = $(0,0,2)$ and on gradient field $(2x, 2y, 2z) = \nabla(x^2+y^2+z^2)$ gives $(0,0,0)$. Test `divergence3D` on $(x,y,z)$ = 3.
2. Extend `integration.ts` — add `surfaceAreaElement`, `volumeIntegralDivergence`. Test `surfaceAreaElement` on sphere parameterization gives $R^2\sin\phi$. Test `volumeIntegralDivergence` on constant divergence $3$ over the unit sphere gives $4\pi$.
3. Create `surface-integrals-data.ts` — all presets for surfaces, vector fields, and volumes.
4. Create `surface-integrals.mdx` — full frontmatter and content. No viz yet.
5. Copy notebook figures to `public/images/topics/surface-integrals/`.
6. Build `FluxExplorer.tsx` (flagship).
7. Build `StokesTheoremExplorer.tsx`.
8. Build `DivergenceTheoremExplorer.tsx`.
9. Build `SurfaceParameterizationExplorer.tsx`.
10. Embed all components with `client:visible`.
11. Update `multiple-integrals.mdx` forward ref (line ~550) to live link.
12. Update `line-integrals.mdx` forward refs (lines ~423, ~589) to live links.
13. Update `change-of-variables.mdx` forward ref (line ~427) to live link.
14. Check `jacobian.mdx` and `hessian.mdx` for any surface-integrals forward refs.
15. Update curriculum graph — add node, verify three inbound edges, update status.
16. Update `curriculum.ts` — mark topic published, verify `planned` array is empty.
17. Run testing checklist.
18. `pnpm build` — zero errors.
19. Commit and deploy.

---

## Appendix A: Key Differences from the Line Integrals Brief (Topic 15)

1. **Three prerequisites instead of two.** Topic 15 required `multiple-integrals` and `gradient` — a straightforward two-edge dependency. Topic 16 requires all three predecessors in Track 4 plus the gradient/Jacobian machinery from Track 3. This is the heaviest dependency structure in the entire curriculum.
2. **Full 3D visualization.** Topic 15's visualizations were primarily 2D (vector fields in the plane) with one 3D potential surface. Topic 16 requires four components that are all fundamentally 3D — parameterized surfaces, flux arrows, and volume cross-sections. The `project3D()` and `generateWireframe()` utilities from `multivariate.ts` are essential, and depth sorting becomes critical.
3. **Two major theorems with full proofs.** Topic 15 had three full proofs (Gradient Theorem, equivalence theorem, Green's theorem). Topic 16 has two major proofs (Stokes' and divergence theorem), but the Stokes' proof is longer (it requires reducing to Green's theorem via the graph parameterization). Both proofs use the Type I/II/III decomposition strategy from Topic 13 — now in 3D.
4. **The cross product is new.** Topic 15 did not need the cross product — all its machinery was 2D. Topic 16 introduces the cross product $\mathbf{r}_u \times \mathbf{r}_v$ as the key tool for computing normals and area elements. This is new algebraic machinery that must be defined carefully (Definition 2).
5. **Orientation is more complex.** In 2D (Topic 15), orientation is simply "counterclockwise vs. clockwise." In 3D, choosing an orientation means choosing a continuous unit normal field $\hat{\mathbf{n}}$ on the surface — and not every surface is orientable (Möbius strip). The right-hand rule connects boundary orientation to surface orientation for Stokes' theorem.
6. **The ML connections are different.** Topic 15's ML connections centered on gradient flow and energy-based models. Topic 16's connections center on Stein's identity (SVGD), PINNs, flow-matching, and conservation laws — topics that require the divergence theorem rather than just line integrals.
7. **This completes Track 4.** Topic 15 was the third of four topics. Topic 16 is the final topic — publishing it makes the `planned` array empty for the `multivar-integral` track. This is a curriculum milestone.
8. **Difficulty upgrade.** Topic 15 was intermediate. Topic 16 is advanced — it synthesizes more prerequisite machinery, introduces more new concepts (cross product, 3D curl, 3D divergence, oriented surfaces, flux), and contains deeper proofs.

---

## Appendix B: Formal Element Inventory

| Type | # | Title |
|------|---|-------|
| Definition | 1 | Parameterized Surface |
| Definition | 2 | Cross Product |
| Definition | 3 | Surface Area Element |
| Definition | 4 | Scalar Surface Integral |
| Definition | 5 | Oriented Surface |
| Definition | 6 | Flux Integral (Vector Surface Integral) |
| Definition | 7 | 3D Curl |
| Definition | 8 | 3D Divergence |
| Theorem | 1 | Key Vector Identities |
| Theorem | 2 | Stokes' Theorem |
| Theorem | 3 | The Divergence Theorem (Gauss's Theorem) |
| Proposition | 1 | Parameterization Independence of Surface Area |
| Proposition | 2 | Divergence as Infinitesimal Flux |
| Proposition | 3 | Curl as Infinitesimal Circulation (3D) |
| Proposition | 4 | Surface Integral over a Graph |
| Example | 1 | Sphere of radius $R$ |
| Example | 2 | Cylinder |
| Example | 3 | Graph surface $z = g(x,y)$ |
| Example | 4 | Mass of a hemispherical shell |
| Example | 5 | Average temperature on a surface |
| Example | 6 | Flux through a hemisphere |
| Example | 7 | Flux of $(x,y,z)$ through a sphere |
| Example | 8 | Computing curl and divergence |
| Example | 9 | Non-trivial curl (rotation field in 3D) |
| Example | 10 | Verifying Stokes' on a hemisphere |
| Example | 11 | Stokes' theorem as a computation tool |
| Example | 12 | Verification on a cube |
| Example | 13 | Inverse-square field |
| Example | 14 | Area of a saddle surface |
| Example | 15 | Flux via the divergence theorem |
| Remark | 1 | Connection to the Jacobian |
| Remark | 2 | Parameterization independence (scalar) |
| Remark | 3 | The orientation convention |
| Remark | 4 | Orientation reversal |
| Remark | 5 | Surface independence |
| Remark | 6 | The divergence theorem as a conservation law |
| Remark | 7 | The generalized Stokes' theorem |
| Proof | — | Proposition 1 (parameterization independence, sketch), Proposition 2 (divergence as flux, sketch), Theorem 2 (Stokes', full), Theorem 3 (divergence theorem, full). 4 proofs total. |

---

*Brief version: v1 | Created: 2026-04-04 | Author: Jonathan Rocha*  
*Reference notebook: `notebooks/surface-integrals/16_surface_integrals.ipynb`*  
*Reference doc: `docs/plans/formalcalculus-handoff-reference.md`*
