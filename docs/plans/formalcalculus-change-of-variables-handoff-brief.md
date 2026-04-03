# Claude Code Handoff Brief: Change of Variables & the Jacobian Determinant

**Project:** formalCalculus — [formalcalculus.com](https://www.formalcalculus.com)  
**Repo:** `github.com/jonx0037/formalCalculus`  
**Stack:** Astro 6 · React 19 · MDX · Tailwind CSS 4 · D3.js 7 · KaTeX · Vercel  
**Package Manager:** pnpm  
**Status:** Ready for implementation  
**Reference Notebook:** `notebooks/change-of-variables/14_change_of_variables.ipynb`  
**Reference Doc:** `docs/plans/formalcalculus-handoff-reference.md`

---

## 1. Objective

Add a new topic page **"Change of Variables & the Jacobian Determinant"** as the **second topic in the Multivariable Integral Calculus track** on formalcalculus.com.

1. This is **topic 14 of 32** and the **fourteenth topic published** on formalcalculus.com. All four topics in the Limits & Continuity track (`sequences-limits`, `epsilon-delta`, `completeness-compactness`, `uniform-convergence`), all four topics in the Single-Variable Calculus track (`derivative`, `mean-value-taylor`, `riemann-integral`, `improper-integrals`), all four topics in the Multivariable Differential Calculus track (`gradient`, `jacobian`, `hessian`, `inverse-implicit`), and the first topic in the Multivariable Integral Calculus track (`multiple-integrals`) are deployed and live.
2. **Prerequisites:** `multiple-integrals` and `inverse-implicit`. Multiple Integrals (Topic 13) provides the machinery for double and triple integrals that transform under coordinate substitution — every integral in this topic is a multiple integral evaluated via Fubini. The Inverse & Implicit Function Theorems (Topic 12) provide the local diffeomorphism framework: the change of variables formula requires $\varphi$ to be a $C^1$ diffeomorphism (locally invertible with $C^1$ inverse), which is guaranteed by the IFT when $\det J_\varphi \neq 0$. The Jacobian (Topic 10) is an indirect prerequisite — the Jacobian determinant $|\det J_\varphi|$ as a volume scaling factor was introduced there, and this topic gives it its starring role in integration.
3. **Difficulty: intermediate.** The reader already knows multiple integrals and Fubini (Topic 13, intermediate). The conceptual core — "substitute, adjust by the Jacobian determinant" — parallels 1D $u$-substitution, which the reader knows from Topic 7. The new ingredient is that the "adjustment factor" is a determinant rather than a single derivative.
4. **Second topic in Track 4.** Continues the Multivariable Integral Calculus track. This topic resolves forward references planted in Topics 7, 10, and 13.
5. **Downstream within formalCalculus:**
   - `line-integrals` (indirect) — Path parameterization is a change of variables from the parameter domain to the curve.
   - `surface-integrals` (direct) — Surface parameterization requires the Jacobian of the parameterization map; the surface area element involves the cross product of tangent vectors, which is the 2D analog of the Jacobian determinant. The divergence theorem uses the change of variables formula in its proof.
   - `lebesgue-integral` (indirect) — The Lebesgue change of variables theorem generalizes the Riemann version, relaxing the diffeomorphism requirement to almost-everywhere injectivity.
   - `sigma-algebras` (indirect) — Pushforward measures and the change-of-variables formula for Lebesgue integrals depend on the Jacobian determinant.
6. **Forward links to formalml.com:**
   - `gradient-descent` — The reparameterization trick in variational inference (VAEs) is a change of variables: if $z = \mu + \sigma \epsilon$ with $\epsilon \sim \mathcal{N}(0,1)$, the gradient $\nabla_{\mu, \sigma} \mathbb{E}_{q_\phi(z)}[f(z)]$ is computed by changing variables from $z$ to $\epsilon$, moving the parameters outside the expectation. This is a change of variables applied to make gradients tractable.
   - `measure-theoretic-probability` — The density transformation formula $p_X(x) = p_Z(\varphi^{-1}(x)) \cdot |\det J_{\varphi^{-1}}(x)|$ is the probabilistic form of the change of variables theorem. Every density computation for a transformed random variable uses this formula.
   - `smooth-manifolds` — Integration on manifolds requires coordinate charts, and the change of variables formula ensures that integrals are well-defined independent of chart choice. The partition-of-unity argument in the proof connects to the manifold-integration machinery.
   - `information-geometry` — The Fisher information matrix transforms under reparameterization via $\tilde{I}(\tilde{\theta}) = J^T I(\theta) J$, where $J$ is the Jacobian of the parameter change. This is the change-of-variables formula applied to the statistical manifold.
7. This topic **extends** the shared utility module `integration.ts` (created by Topic 7, extended by Topics 8 and 13) with `changeOfVariables2D`, `polarIntegral`, `cylindricalIntegral`, `sphericalIntegral`, `jacobianAreaElement`, and `coordinateTransformGrid`. All existing functions in `integration.ts` remain unchanged. It also **extends** `multivariate.ts` with `densityTransform` and `normalizingFlowStep`. All existing functions in `multivariate.ts` remain unchanged.
8. **Resolves forward references from Topics 7, 10, and 13.**
   - Topic 7 (`riemann-integral`) Remark on $u$-substitution: "The substitution rule generalizes to multiple integrals via the Jacobian determinant — see Change of Variables."
   - Topic 10 (`jacobian`) Example 7 (polar coordinates): "This is the $r$ in '$r\,dr\,d\theta$' for polar integration." Remark 4: "Preview of the change-of-variables formula."
   - Topic 13 (`multiple-integrals`) Example 7 (disk integral): "Painful in Cartesian; trivial in polar. Motivates Topic 14." Section 10 ML connections: "Preview: change of variables" and the Gaussian integral via polar coordinates.

**Content scope:**

- 1D substitution review: $\int_a^b f(g(x)) g'(x)\,dx = \int_{g(a)}^{g(b)} f(u)\,du$ — the chain rule in reverse
- The change of variables formula in 2D: $\iint_{D} f(x,y)\,dA = \iint_{D^*} f(\varphi(u,v)) \,|\det J_\varphi(u,v)|\,du\,dv$
- Geometric interpretation: the Jacobian determinant as the local area/volume scaling factor
- Polar coordinates: $(r, \theta) \mapsto (r\cos\theta, r\sin\theta)$, $|\det J| = r$, $dA = r\,dr\,d\theta$
- The Gaussian integral: $\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}$ via polar coordinates — the classic proof in full multivariable rigor
- Cylindrical coordinates: $(r, \theta, z)$, $dV = r\,dr\,d\theta\,dz$
- Spherical coordinates: $(r, \theta, \phi)$, $|\det J| = r^2 \sin\phi$, $dV = r^2 \sin\phi\,dr\,d\theta\,d\phi$
- General change of variables theorem: statement and proof for $C^1$ diffeomorphisms
- ML connections: normalizing flows ($\log p_x = \log p_z - \log|\det J_f|$), the reparameterization trick in VAEs, density estimation via coordinate transforms

---

## 2. MDX File

### Location

```
src/content/topics/change-of-variables.mdx
```

The entry `id` will be `change-of-variables`. The dynamic route resolves to `/topics/change-of-variables`.

### Frontmatter

```yaml
---
title: "Change of Variables & the Jacobian Determinant"
subtitle: "Transforming integrals under coordinate substitution — the Jacobian determinant as the volume scaling factor, polar, cylindrical, and spherical coordinates, the Gaussian integral, and density transformations in normalizing flows"
status: "published"
difficulty: "intermediate"
prerequisites:
  - "multiple-integrals"
  - "inverse-implicit"
tags:
  - "calculus"
  - "change-of-variables"
  - "jacobian-determinant"
  - "polar-coordinates"
  - "spherical-coordinates"
  - "gaussian-integral"
  - "normalizing-flows"
  - "reparameterization-trick"
  - "density-transformation"
  - "coordinate-transformation"
domain: "multivar-integral"
videoId: null
notebookPath: "notebooks/change-of-variables/14_change_of_variables.ipynb"
githubUrl: "https://github.com/jonx0037/formalCalculus/blob/main/src/content/topics/change-of-variables.mdx"
datePublished: 2026-04-20
estimatedReadTime: 50
abstract: "The change of variables formula transforms a multiple integral from one coordinate system to another: if φ: D* → D is a C¹ diffeomorphism, then ∫∫_D f(x,y) dA = ∫∫_{D*} f(φ(u,v)) |det J_φ(u,v)| du dv. The Jacobian determinant |det J_φ| measures how φ distorts area elements — it is the volume scaling factor that was introduced abstractly in the Jacobian topic and now does real computational work. Polar coordinates are the canonical example: the map (r,θ) → (r cos θ, r sin θ) has Jacobian determinant r, producing the area element r dr dθ. This immediately resolves the painful disk integral from Topic 13 and enables the classic proof that the Gaussian integral equals √π — a result that propagates throughout probability and statistical mechanics. Cylindrical and spherical coordinates extend the framework to three dimensions. The general theorem, proved via the Inverse Function Theorem and a partition of unity argument, guarantees that integration is coordinate-independent for any C¹ diffeomorphism. In machine learning, the change of variables formula is the mathematical engine of normalizing flows: the density of a transformed variable X = f(Z) satisfies p_X(x) = p_Z(f⁻¹(x)) · |det J_{f⁻¹}(x)|, and the entire architecture of flow-based generative models is designed to make this Jacobian determinant tractable. The reparameterization trick in variational autoencoders is the same formula applied to move gradient computation outside the expectation."
formalmlConnections:
  - topic: "gradient-descent"
    site: "formalml"
    relationship: "The reparameterization trick in variational inference — writing z = μ + σε with ε ~ N(0,1) — is a change of variables that moves parameters outside the expectation, enabling gradient computation through sampling. This is the change of variables formula applied to make stochastic gradients tractable."
  - topic: "measure-theoretic-probability"
    site: "formalml"
    relationship: "The density transformation formula p_X(x) = p_Z(φ⁻¹(x)) · |det J_{φ⁻¹}(x)| is the probabilistic form of the change of variables theorem. Every computation of the density of a transformed random variable uses this formula."
  - topic: "smooth-manifolds"
    site: "formalml"
    relationship: "Integration on manifolds requires coordinate charts, and the change of variables formula ensures that integrals are well-defined independent of chart choice. The partition of unity argument in the general proof connects directly to manifold integration."
  - topic: "information-geometry"
    site: "formalml"
    relationship: "The Fisher information matrix transforms under reparameterization via Ĩ(θ̃) = JᵀI(θ)J, where J is the Jacobian of the parameter change. Reparameterization invariance of the Fisher-Rao metric is the change of variables formula on the statistical manifold."
connections:
  - topic: "multiple-integrals"
    relationship: "Every integral in this topic is a multiple integral evaluated via Fubini. The disk integral (Example 7 from Topic 13) is resolved here in polar coordinates."
  - topic: "inverse-implicit"
    relationship: "The change of variables formula requires φ to be a C¹ diffeomorphism — locally invertible with C¹ inverse. The IFT guarantees this when det J_φ ≠ 0."
  - topic: "jacobian"
    relationship: "The Jacobian determinant |det J_φ| as a volume scaling factor was introduced in Topic 10. This topic gives it its computational starring role."
  - topic: "riemann-integral"
    relationship: "The 1D substitution rule is the single-variable ancestor. This topic generalizes it from |g'(x)| to |det J_φ|."
  - topic: "improper-integrals"
    relationship: "The Gaussian integral ∫e^{-x²}dx = √π, previewed in Topic 8, is proved here via polar coordinates."
  - topic: "completeness-compactness"
    relationship: "Compactness of the integration domain ensures the partition of unity is finite in the general proof."
references:
  - type: "book"
    title: "Calculus on Manifolds"
    authors: "Spivak"
    year: 1965
    note: "Chapter 3, Theorem 3-13 — the change of variables theorem with full proof via partition of unity"
  - type: "book"
    title: "Principles of Mathematical Analysis"
    authors: "Rudin"
    year: 1976
    note: "Theorem 10.9 — change of variables for Riemann integrals in Rⁿ"
  - type: "book"
    title: "Analysis on Manifolds"
    authors: "Munkres"
    year: 1991
    note: "Chapter 3 — change of variables with extended Jacobian and boundary conditions"
  - type: "book"
    title: "Vector Calculus, Linear Algebra, and Differential Forms"
    authors: "Hubbard & Hubbard"
    year: 2015
    note: "Chapter 4 — geometric treatment of coordinate transformations and the Jacobian"
  - type: "paper"
    title: "Variational Inference with Normalizing Flows"
    authors: "Rezende & Mohamed"
    year: 2015
    note: "The normalizing flow framework: density transformation via the change of variables formula with tractable Jacobian determinants"
  - type: "paper"
    title: "Auto-Encoding Variational Bayes"
    authors: "Kingma & Welling"
    year: 2014
    note: "The reparameterization trick: change of variables applied to move parameters outside the expectation for gradient estimation"
---
```

---

## 3. Content Outline

### Section 1: Overview & Motivation

**Opening example:** You've built a generative model — a neural network that maps simple noise $z \sim \mathcal{N}(0, I)$ to complex data $x = f(z)$. To train it, you need the density $p_X(x)$. The change of variables formula gives it: $p_X(x) = p_Z(f^{-1}(x)) \cdot |\det J_{f^{-1}}(x)|$. The entire architecture of normalizing flows is designed to make the right side of this equation tractable. And the formula itself — "adjust the density by the Jacobian determinant" — is exactly the integration change of variables from multivariable calculus, applied to probability.

This topic brings together the Jacobian determinant (Topic 10), the Inverse Function Theorem (Topic 12), and multiple integrals (Topic 13) into a single powerful formula. The reader already has all the ingredients; this topic assembles them.

No TheoremBlocks. No viz. 2–3 paragraphs.

### Section 2: Substitution in One Variable — The Template

**Review and reframe.** The reader knows $u$-substitution from single-variable calculus (Topic 7), but we reframe it through the lens of coordinate transformation to set up the multivariable version.

**TheoremBlocks:**

- **Theorem 1: Substitution Rule (1D)** — Let $g: [\alpha, \beta] \to [a, b]$ be a $C^1$ bijection with $g'(t) \neq 0$ on $(\alpha, \beta)$. Then for any continuous $f: [a, b] \to \mathbb{R}$:
$$\int_a^b f(x)\,dx = \int_\alpha^\beta f(g(t)) \,|g'(t)|\,dt.$$
The factor $|g'(t)|$ adjusts for how $g$ stretches or compresses the interval. When $g$ is increasing, $|g'(t)| = g'(t)$; when decreasing, $|g'(t)| = -g'(t)$, which also reverses the limits to compensate.
- **Remark 1: Why the absolute value?** — In 1D, you can track orientation via limit ordering. In $\mathbb{R}^n$, there are no "limits" to reverse — the absolute value of the Jacobian determinant is the only way to ensure positivity of the volume element. The absolute value is the conceptual bridge from 1D to $n$D.
- **Example 1: $\int_0^1 \sqrt{1 - x^2}\,dx$ via $x = \sin\theta$** — $g(\theta) = \sin\theta$, $g'(\theta) = \cos\theta$, limits $[0, \pi/2]$. The integral becomes $\int_0^{\pi/2} \cos^2\theta\,d\theta = \pi/4$. This is one quarter of the unit disk area — a preview of polar coordinates.
- **Example 2: $\int_0^\infty e^{-x^2/2}\,dx$ via $u = x^2/2$** — $x = \sqrt{2u}$, $dx = du/\sqrt{2u}$. The integral becomes $\frac{1}{\sqrt{2}} \int_0^\infty u^{-1/2} e^{-u}\,du = \frac{1}{\sqrt{2}} \Gamma(1/2) = \sqrt{\pi/2}$. This connects to the Gamma function (Topic 8) and previews the computation of the Gaussian integral later in this topic.

**Static image:** `1d-substitution.png` from the notebook.

### Section 3: The Change of Variables Formula in 2D

**The central formula.** This is where the Jacobian determinant enters integration.

**Geometric-first:** Draw a grid in the $(u, v)$-plane. The map $\varphi$ sends each small rectangle $du \times dv$ to a small parallelogram in the $(x, y)$-plane. The area of that parallelogram is approximately $|\det J_\varphi(u, v)| \cdot du\,dv$ — this is exactly the Volume Distortion Theorem from Topic 10. The change of variables formula says: sum up $f$ over the deformed parallelograms, weighting each by its area.

**TheoremBlocks:**

- **Definition 1: Coordinate Transformation** — A *coordinate transformation* (or *change of variables*) on an open set $D^* \subseteq \mathbb{R}^2$ is a $C^1$ function $\varphi: D^* \to D \subseteq \mathbb{R}^2$ that is a diffeomorphism: bijective, $C^1$, and with $C^1$ inverse $\varphi^{-1}: D \to D^*$.
- **Remark 2: Diffeomorphism vs. local diffeomorphism** — The IFT (Topic 12) guarantees a *local* diffeomorphism wherever $\det J_\varphi \neq 0$. For the change of variables formula, we need a *global* diffeomorphism on $D^*$ (or at least injectivity, with $\det J_\varphi = 0$ only on a set of measure zero). Polar coordinates fail to be a global diffeomorphism on $\{r > 0\}$ because of the $2\pi$-periodicity in $\theta$, but they are a diffeomorphism on any domain that doesn't wrap all the way around.
- **Theorem 2: Change of Variables (2D)** — Let $\varphi: D^* \to D$ be a $C^1$ diffeomorphism between open subsets of $\mathbb{R}^2$, and let $f: D \to \mathbb{R}$ be continuous. Then:
$$\iint_D f(x, y)\,dA = \iint_{D^*} f(\varphi(u, v))\,|\det J_\varphi(u, v)|\,du\,dv.$$
The Jacobian determinant $|\det J_\varphi|$ converts the area element $du\,dv$ in the $(u,v)$-coordinate system to the area element $dA$ in the $(x,y)$-coordinate system.
- **Example 3: Linear change of variables** — For $\varphi(u, v) = (au + bv,\, cu + dv)$ with $A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}$ and $\det A \neq 0$: $\det J_\varphi = \det A$ (constant). The formula reduces to $\iint_D f(x,y)\,dA = |\det A| \iint_{D^*} f(Au)\,du\,dv$. Linear maps scale all areas by the same factor.
- **Example 4: Affine shear $\varphi(u,v) = (u + v, v)$** — $\det J_\varphi = 1$. The integral is unchanged: $\iint_D f\,dA = \iint_{D^*} f(u+v, v)\,du\,dv$. Area-preserving transformations have a unit Jacobian determinant.
- **Remark 3: The formula in reverse** — Often we *start* with an integral in $(x, y)$ and want to transform *to* $(u, v)$. If $\varphi: D^* \to D$ is the transformation $(u, v) \mapsto (x, y)$, then we substitute $x = \varphi_1(u,v)$, $y = \varphi_2(u,v)$, $dA = |\det J_\varphi|\,du\,dv$, and change the region from $D$ to $D^* = \varphi^{-1}(D)$. The conceptual direction is: "I want simpler limits, so I find a $\varphi$ that maps a simple $D^*$ to the complicated $D$."

**Visualization:** `ChangeOfVariablesExplorer` embedded here — the flagship visualization.

**Static image:** `change-of-variables-2d.png` from the notebook.

### Section 4: Polar Coordinates

**The canonical example.** The reader has been waiting for this since Example 7 of Topic 13 (the disk integral that was "painful in Cartesian"). Polar coordinates are the prototypical 2D change of variables.

**TheoremBlocks:**

- **Definition 2: Polar Coordinates** — The *polar coordinate transformation* is $\varphi(r, \theta) = (r\cos\theta, r\sin\theta)$, mapping from $D^* = \{(r, \theta) : r > 0,\, \theta \in (0, 2\pi)\}$ to $D = \mathbb{R}^2 \setminus \{x \ge 0, y = 0\}$ (the plane minus the positive $x$-axis). The Jacobian is:
$$J_\varphi(r, \theta) = \begin{pmatrix} \cos\theta & -r\sin\theta \\ \sin\theta & r\cos\theta \end{pmatrix}, \qquad |\det J_\varphi| = r.$$
The area element is $dA = r\,dr\,d\theta$.
- **Remark 4: Why $r > 0$?** — At $r = 0$, $\det J_\varphi = 0$, and $\varphi$ collapses all $\theta$ values to the origin — it is not injective. The origin is a single point (measure zero), so excluding it does not affect the integral. This is typical: changes of variables are allowed to fail on sets of measure zero.
- **Example 5: Area of the unit disk (resolved)** — $\iint_{x^2+y^2 \le 1} dA = \int_0^{2\pi} \int_0^1 r\,dr\,d\theta = 2\pi \cdot \frac{1}{2} = \pi$. Compare with the Cartesian computation from Topic 13, Example 7: $\int_{-1}^1 \int_{-\sqrt{1-x^2}}^{\sqrt{1-x^2}} dy\,dx = \int_{-1}^1 2\sqrt{1-x^2}\,dx = \pi$. Same answer, but polar reduces the integral to a product of two elementary 1D integrals.
- **Example 6: $\iint_D (x^2 + y^2)\,dA$ over the annulus $1 \le x^2+y^2 \le 4$** — In polar: $\int_0^{2\pi} \int_1^2 r^2 \cdot r\,dr\,d\theta = 2\pi \cdot \frac{r^4}{4}\Big|_1^2 = 2\pi \cdot \frac{15}{4} = \frac{15\pi}{2}$. The circular symmetry of both the region and the integrand makes polar coordinates the natural choice.
- **Example 7: Volume under the paraboloid (resolved)** — From Topic 13, §7: the volume between $z = x^2 + y^2$ and $z = 4$ over the disk $x^2 + y^2 \le 4$. In polar: $V = \int_0^{2\pi} \int_0^2 (4 - r^2)\,r\,dr\,d\theta = 2\pi \int_0^2 (4r - r^3)\,dr = 2\pi [2r^2 - r^4/4]_0^2 = 2\pi(8 - 4) = 8\pi$. This resolves the forward reference from Topic 13.

**Visualization:** `PolarIntegralExplorer` embedded here.

**Static image:** `polar-coordinates.png` from the notebook.

### Section 5: The Gaussian Integral

**The crown jewel.** The computation of $\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}$ is one of the most important results in all of mathematics, appearing in probability (the normalizing constant of the normal distribution), statistical mechanics (the partition function), and quantum mechanics (path integrals). The proof is a triumph of the change-of-variables formula.

**TheoremBlocks:**

- **Proposition 1: The Gaussian Integral** — $\displaystyle\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}.$
- **Proof of Proposition 1** — Full proof in three steps.

  *Step 1: Square the integral.* Let $I = \int_{-\infty}^{\infty} e^{-x^2}\,dx$. Then:
  $$I^2 = \left(\int_{-\infty}^{\infty} e^{-x^2}\,dx\right)\left(\int_{-\infty}^{\infty} e^{-y^2}\,dy\right) = \iint_{\mathbb{R}^2} e^{-(x^2+y^2)}\,dA.$$
  The first equality uses Fubini (Topic 13, Theorem 1) to convert the product of two 1D integrals into a double integral. This requires justifying that $e^{-(x^2+y^2)}$ is integrable over $\mathbb{R}^2$ — it suffices to note that $\int_0^R \int_0^{2\pi} e^{-r^2} r\,d\theta\,dr = 2\pi \int_0^R r e^{-r^2}\,dr = \pi(1 - e^{-R^2}) \to \pi$ as $R \to \infty$, so the improper integral converges.

  *Step 2: Switch to polar coordinates.* $x^2 + y^2 = r^2$, $dA = r\,dr\,d\theta$:
  $$I^2 = \int_0^{2\pi}\int_0^{\infty} e^{-r^2}\,r\,dr\,d\theta.$$
  The inner integral is elementary: $\int_0^{\infty} r e^{-r^2}\,dr = \left[-\frac{1}{2}e^{-r^2}\right]_0^\infty = \frac{1}{2}$.

  *Step 3: Evaluate.* $I^2 = 2\pi \cdot \frac{1}{2} = \pi$. Since $I > 0$, $I = \sqrt{\pi}$.

- **Remark 5: Why is this hard in Cartesian?** — The function $e^{-x^2}$ has no elementary antiderivative (this is a theorem, not a failure of technique). The 1D integral is genuinely intractable without the 2D "trick." The change-of-variables formula transforms a hard 1D problem into an easy 2D one by exploiting radial symmetry.
- **Example 8: The Gaussian normalizing constant** — The PDF of $\mathcal{N}(\mu, \sigma^2)$ is $\frac{1}{\sigma\sqrt{2\pi}} e^{-(x-\mu)^2/(2\sigma^2)}$. Verify normalization: $\int_{-\infty}^{\infty} \frac{1}{\sigma\sqrt{2\pi}} e^{-(x-\mu)^2/(2\sigma^2)}\,dx = 1$ using the substitution $u = (x - \mu)/(\sigma\sqrt{2})$ and $\int_{-\infty}^{\infty} e^{-u^2}\,du = \sqrt{\pi}$.

**Visualization:** `GaussianIntegralExplorer` embedded here.

**Static image:** `gaussian-integral.png` from the notebook.

### Section 6: Cylindrical and Spherical Coordinates

**Extending to 3D.** The change of variables formula works in any dimension. Here, we cover the two standard 3D coordinate systems.

**TheoremBlocks:**

- **Definition 3: Cylindrical Coordinates** — The *cylindrical coordinate transformation* is $\varphi(r, \theta, z) = (r\cos\theta, r\sin\theta, z)$, with $r > 0$, $\theta \in (0, 2\pi)$, $z \in \mathbb{R}$. The Jacobian is:
$$J_\varphi = \begin{pmatrix} \cos\theta & -r\sin\theta & 0 \\ \sin\theta & r\cos\theta & 0 \\ 0 & 0 & 1 \end{pmatrix}, \qquad |\det J_\varphi| = r.$$
The volume element is $dV = r\,dr\,d\theta\,dz$.
- **Definition 4: Spherical Coordinates** — The *spherical coordinate transformation* is $\varphi(\rho, \theta, \phi) = (\rho\sin\phi\cos\theta,\, \rho\sin\phi\sin\theta,\, \rho\cos\phi)$, with $\rho > 0$, $\theta \in (0, 2\pi)$, $\phi \in (0, \pi)$. The Jacobian is:
$$J_\varphi = \begin{pmatrix} \sin\phi\cos\theta & -\rho\sin\phi\sin\theta & \rho\cos\phi\cos\theta \\ \sin\phi\sin\theta & \rho\sin\phi\cos\theta & \rho\cos\phi\sin\theta \\ \cos\phi & 0 & -\rho\sin\phi \end{pmatrix}, \qquad |\det J_\varphi| = \rho^2\sin\phi.$$
The volume element is $dV = \rho^2\sin\phi\,d\rho\,d\theta\,d\phi$. The full determinant computation is expanded (cofactor expansion along the third row).
- **Example 9: Volume of the unit ball** — $V = \iiint_{x^2+y^2+z^2 \le 1} dV = \int_0^{2\pi}\int_0^{\pi}\int_0^1 \rho^2 \sin\phi\,d\rho\,d\phi\,d\theta = 2\pi \cdot 2 \cdot \frac{1}{3} = \frac{4\pi}{3}.$ Three decoupled 1D integrals — the spherical symmetry of the ball makes the computation trivial.
- **Example 10: Moment of inertia of a solid sphere** — For a uniform solid sphere of mass $M$ and radius $R$: $I = \iiint \rho_{\text{mass}} (x^2 + y^2)\,dV$. In spherical coordinates: $x^2 + y^2 = \rho^2 \sin^2\phi$, so $I = \frac{3M}{4\pi R^3} \int_0^{2\pi}\int_0^{\pi}\int_0^R \rho^2 \sin^2\phi \cdot \rho^2 \sin\phi\,d\rho\,d\phi\,d\theta = \frac{2}{5} MR^2$.
- **Remark 6: Which coordinate system to use?** — Guidelines:
  - Polar: circular symmetry in 2D ($x^2 + y^2$ appears, region is a disk or annulus).
  - Cylindrical: cylindrical symmetry in 3D (the region or integrand is symmetric about the $z$-axis).
  - Spherical: spherical symmetry ($x^2 + y^2 + z^2$ appears, region is a ball or spherical shell).
  - If none of these symmetries are present, a custom coordinate transformation may still simplify the integral.

**Visualization:** `CoordinateSystemExplorer` embedded here.

**Static image:** `coordinate-systems-3d.png` from the notebook.

### Section 7: The General Change of Variables Theorem

**The full theorem.** Polar, cylindrical, and spherical are special cases. The general theorem handles any $C^1$ diffeomorphism.

**TheoremBlocks:**

- **Definition 5: $C^1$ Diffeomorphism** — A function $\varphi: D^* \to D$ between open subsets of $\mathbb{R}^n$ is a *$C^1$ diffeomorphism* if: (i) $\varphi$ is bijective, (ii) $\varphi$ is $C^1$ (continuously differentiable), and (iii) $\varphi^{-1}: D \to D^*$ is $C^1$. By the Inverse Function Theorem (Topic 12, Theorem 1), conditions (ii) and (iii) are equivalent to: $\varphi$ is $C^1$ and $\det J_\varphi(u) \neq 0$ for all $u \in D^*$.
- **Theorem 3: Change of Variables (General)** — Let $\varphi: D^* \to D$ be a $C^1$ diffeomorphism between open subsets of $\mathbb{R}^n$. Let $f: D \to \mathbb{R}$ be continuous and integrable over $D$. Then:
$$\int_D f(x)\,dx = \int_{D^*} f(\varphi(u))\,|\det J_\varphi(u)|\,du.$$
This reduces to the 1D substitution rule (Theorem 1) when $n = 1$, and to the 2D formula (Theorem 2) when $n = 2$.
- **Proof of Theorem 3** — Full proof. We follow Spivak's approach (Calculus on Manifolds, Theorem 3-13).

  *Step 1: The linear case.* If $\varphi(u) = Au + b$ is an affine map with $A$ invertible, then $D = A(D^*) + b$, $J_\varphi = A$, and the formula follows from the definition of the Riemann integral: the Riemann sum over $D$ with partition $P$ corresponds to the Riemann sum over $D^*$ with partition $A^{-1}(P - b)$, with each cell volume scaled by $|\det A|$.

  *Step 2: Local validity.* For a general $C^1$ diffeomorphism and any $u_0 \in D^*$, the linear approximation $\varphi(u) \approx \varphi(u_0) + J_\varphi(u_0)(u - u_0)$ is accurate on a small ball around $u_0$. The Jacobian determinant is continuous and nonzero, so $|\det J_\varphi|$ is nearly constant on a small enough ball. The formula holds locally up to an error that vanishes as the ball shrinks.

  *Step 3: Partition of unity.* Cover $D^*$ with a finite collection of balls $\{B_k\}$ (using compactness of $\overline{D^*}$ if $D^*$ is bounded; the general case uses exhaustion by compact subsets). Choose a subordinate partition of unity $\{\psi_k\}$: smooth functions $\psi_k \ge 0$ with $\text{supp}(\psi_k) \subset B_k$ and $\sum_k \psi_k = 1$ on $D^*$. Then:
  $$\int_D f\,dx = \sum_k \int_D (\psi_k \circ \varphi^{-1}) \cdot f\,dx = \sum_k \int_{B_k} (\psi_k \cdot f \circ \varphi)\,|\det J_\varphi|\,du = \int_{D^*} f(\varphi(u))\,|\det J_\varphi(u)|\,du.$$
  Each step uses: (i) the partition of unity decomposes $f$ into locally supported pieces, (ii) the linear case applies locally on each $B_k$ (up to the error in Step 2, which is controlled by the continuity of $J_\varphi$), (iii) summing recovers the full integral. The rigorous details involve showing the error terms from Step 2 sum to zero — this uses the uniform continuity of $J_\varphi$ on compact subsets.

- **Remark 7: Relaxing the hypotheses** — The theorem extends to $\varphi$ that fails to be injective or has $\det J_\varphi = 0$ on a set of measure zero (e.g., the origin for polar coordinates, or the $z$-axis for cylindrical coordinates). The Lebesgue version of the change-of-variables theorem (Track 7) handles this rigorously.

**Static image:** `general-diffeomorphism.png` from the notebook.

### Section 8: A Gallery of Coordinate Transformations

**Concrete examples.** This section builds computational fluency through a series of worked examples with different transformations.

**TheoremBlocks:**

- **Example 11: Elliptical coordinates** — $\varphi(u, v) = (au\cos v, bu\sin v)$ with $a, b > 0$. The Jacobian determinant is $|\det J_\varphi| = abu$. The area of the ellipse $\frac{x^2}{a^2} + \frac{y^2}{b^2} \le 1$ is: $\int_0^{2\pi}\int_0^1 ab\,u\,du\,dv = \pi ab$. This generalizes the disk area $\pi r^2$ to $\pi ab$.
- **Example 12: Parabolic coordinates** — $\varphi(u, v) = \left(\frac{u^2 - v^2}{2},\, uv\right)$, $|\det J_\varphi| = u^2 + v^2$. Useful for problems with parabolic symmetry (e.g., electrostatics).
- **Proposition 2: Composition of transformations** — If $\varphi_1: D_1^* \to D_1$ and $\varphi_2: D_1 \to D$ are $C^1$ diffeomorphisms, then $\varphi = \varphi_2 \circ \varphi_1: D_1^* \to D$ is a $C^1$ diffeomorphism with $\det J_\varphi = \det J_{\varphi_2}(\varphi_1(u)) \cdot \det J_{\varphi_1}(u)$. This follows from the chain rule for Jacobians (Topic 10, Theorem 2) and the multiplicativity of determinants. Geometrically: volume distortions compose multiplicatively, as established in Topic 10, Proposition 2.
- **Example 13: Composed transformation — from rotated ellipse** — To integrate over the region $x^2 + xy + y^2 \le 1$ (a rotated ellipse), first rotate by $\pi/4$ to diagonalize the quadratic form, then scale to a unit disk. The composed Jacobian determinant is the product of the individual determinants.

**Static image:** `transformation-gallery.png` from the notebook.

### Section 9: The Density Transformation Formula

**The probabilistic form.** This section reframes the change of variables formula for probability densities and connects to normalizing flows.

**TheoremBlocks:**

- **Definition 6: Density Transformation** — Let $Z$ be a random vector with density $p_Z$ and let $X = \varphi(Z)$ where $\varphi$ is a $C^1$ diffeomorphism. The density of $X$ is:
$$p_X(x) = p_Z(\varphi^{-1}(x)) \cdot |\det J_{\varphi^{-1}}(x)| = \frac{p_Z(\varphi^{-1}(x))}{|\det J_\varphi(\varphi^{-1}(x))|}.$$
This follows directly from the change of variables theorem applied to $P(X \in A) = \int_A p_X(x)\,dx = \int_{\varphi^{-1}(A)} p_Z(z)\,dz = \int_A p_Z(\varphi^{-1}(x)) |\det J_{\varphi^{-1}}(x)|\,dx$ for all measurable $A$.
- **Example 14: Log-normal from normal** — If $Z \sim \mathcal{N}(0, 1)$ and $X = e^Z$, then $\varphi(z) = e^z$, $\varphi^{-1}(x) = \ln x$, $|(\varphi^{-1})'(x)| = 1/x$. So $p_X(x) = \frac{1}{\sqrt{2\pi}} e^{-(\ln x)^2/2} \cdot \frac{1}{x} = \frac{1}{x\sqrt{2\pi}} e^{-(\ln x)^2/2}$ for $x > 0$. This is the log-normal density.
- **Remark 8: Normalizing flows** — A normalizing flow is a composition of $K$ diffeomorphisms: $x = f_K \circ f_{K-1} \circ \cdots \circ f_1(z)$. By the composition rule (Proposition 2):
$$\log p_X(x) = \log p_Z(z) - \sum_{k=1}^K \log |\det J_{f_k}(z_{k-1})|$$
where $z_0 = z$ and $z_k = f_k(z_{k-1})$. The entire architecture of flow-based generative models (RealNVP, Glow, Neural Spline Flows) is designed to make each $|\det J_{f_k}|$ cheap to compute — typically $O(n)$ instead of $O(n^3)$ — by using triangular Jacobians (coupling layers, autoregressive transforms). This is the change-of-variables formula doing heavy lifting in generative modeling.
- **Example 15: Affine coupling layer** — The RealNVP coupling layer splits $z = (z_a, z_b)$ and defines $x_a = z_a$, $x_b = z_b \odot \exp(s(z_a)) + t(z_a)$. The Jacobian is lower-triangular with diagonal entries $1$ (for $x_a$) and $\exp(s_i(z_a))$ (for $x_b$). So $\log|\det J| = \sum_i s_i(z_a)$ — a sum, not a determinant. This is $O(n)$ and trivially differentiable. The IFT (Topic 12) guarantees invertibility since $\exp(s_i) > 0$ everywhere.
- **Remark 9: The reparameterization trick** — In variational autoencoders, we need $\nabla_{\mu, \sigma} \mathbb{E}_{q_\phi(z)}[f(z)]$ where $q_\phi(z) = \mathcal{N}(\mu, \sigma^2)$. The expectation depends on $\mu, \sigma$ through the distribution, so we can't just differentiate under the integral sign. The trick: write $z = \mu + \sigma\epsilon$ with $\epsilon \sim \mathcal{N}(0, 1)$. This is a change of variables from $\epsilon$ to $z$. Now $\mathbb{E}_{q_\phi(z)}[f(z)] = \mathbb{E}_{\epsilon \sim \mathcal{N}(0,1)}[f(\mu + \sigma\epsilon)]$, and the gradient moves inside: $\nabla_{\mu, \sigma} \mathbb{E}[f(\mu + \sigma\epsilon)]$ is just a standard derivative of a deterministic function of $\mu, \sigma$ evaluated at a random $\epsilon$. The change-of-variables formula separates the randomness ($\epsilon$) from the parameters ($\mu, \sigma$).

**Visualization:** `NormalizingFlowExplorer` embedded here.

**Static image:** `ml-normalizing-flows.png` from the notebook.

### Section 10: Connections & Further Reading

Standard back-references, forward references, and formalml.com links. The prerequisite DAG includes edges from `multiple-integrals` and `inverse-implicit`, and forward edges to `surface-integrals`. Cross-track forward edge to `sigma-algebras` and `lebesgue-integral` (both planned).

---

## 4. Visualizations

### 4.1 ChangeOfVariablesExplorer (Flagship)

- **Filename:** `src/components/viz/ChangeOfVariablesExplorer.tsx`
- **What:** Left panel shows a uniform grid in the $(u, v)$-parameter space. The right panel shows the deformed grid in the $(x, y)$-image space. As the user selects different transformations, the grid deforms smoothly. Each cell in the parameter space is colored by $|\det J_\varphi|$ — lighter where the cell is stretched, darker where compressed. Hovering over a cell highlights it in both panels and shows the Jacobian determinant at that point.
- **Interactions:**
  - Transformation presets: polar, elliptical, shear, scaling, parabolic, custom.
  - Grid resolution slider (5–30 per axis).
  - Toggle: show/hide Jacobian determinant heatmap.
  - Toggle: show/hide area element vectors (the column vectors of $J_\varphi$ at a selected point).
  - Animate: smooth morph between identity and selected transformation.
- **Readout:** Selected cell coordinates in both systems, $\det J_\varphi$ at selected point, area ratio.
- **Layout:** Two-panel side-by-side. Left: parameter space with a uniform grid. Right: image space with deformed grid.
- **Performance:** At resolution 30, 900 cells — render as SVG paths. Use D3 transitions for morph animation.
- **Color scale:** Use `vizColors.diverging` for the Jacobian determinant heatmap (blue = compression, white = 1, red = expansion).

### 4.2 PolarIntegralExplorer

- **Filename:** `src/components/viz/PolarIntegralExplorer.tsx`
- **What:** Compute integrals over circular/annular regions. Left panel: Cartesian grid with the region outlined. Right panel: polar grid with the same region as a rectangle. The integral is evaluated in both coordinate systems, showing numerical agreement.
- **Interactions:**
  - Region presets: unit disk, annulus, sector, semicircle.
  - Function presets: 1 (area), $x^2 + y^2$, $e^{-(x^2+y^2)}$, $xy$, $\sqrt{x^2+y^2}$.
  - Partition slider (n = 2–30 per axis).
  - Toggle: Cartesian grid / polar grid / both.
  - Animate: sweep integration (radial sweep in polar, grid sweep in Cartesian).
- **Readout:** Integral value (Cartesian Riemann sum), integral value (polar Riemann sum), exact value, error.
- **Layout:** Two-panel side-by-side.

### 4.3 GaussianIntegralExplorer

- **Filename:** `src/components/viz/GaussianIntegralExplorer.tsx`
- **What:** Visualize the Gaussian integral proof. Left: 3D surface $z = e^{-(x^2+y^2)}$ with Riemann sum columns. Right: polar view showing radial integration as concentric rings.
- **Interactions:**
  - Step-through: step 1 (show $I$), step 2 (show $I^2$ as a double integral), step 3 (switch to polar), step 4 (evaluate).
  - Truncation radius $R$ slider (1–5) for the improper integral.
  - Toggle: 3D surface / top-down heatmap.
- **Readout:** $I_R = \int_{-R}^R e^{-x^2}\,dx$, $I_R^2$, polar integral $\pi(1 - e^{-R^2})$, $\sqrt{\pi}$ (exact).
- **Layout:** Two-panel. Left: 3D/heatmap. Right: convergence plot of $I_R \to \sqrt{\pi}$.

### 4.4 CoordinateSystemExplorer

- **Filename:** `src/components/viz/CoordinateSystemExplorer.tsx`
- **What:** 3D visualization of cylindrical and spherical coordinate systems. Shows coordinate surfaces (constant-$r$, constant-$\theta$, constant-$\phi$ surfaces) and volume elements.
- **Interactions:**
  - Coordinate system toggle: cylindrical/spherical.
  - Parameter sliders: $r$, $\theta$, $\phi$ (or $z$ for cylindrical).
  - Toggle: show/hide coordinate surfaces.
  - Toggle: show/hide volume element box at selected point.
  - Rotate 3D view (drag).
- **Layout:** Single panel, 3D. Annotations show the volume element formula and the current $|\det J|$ value.

### 4.5 NormalizingFlowExplorer

- **Filename:** `src/components/viz/NormalizingFlowExplorer.tsx`
- **What:** Demonstrate density transformation. Start with a standard Gaussian in $z$-space. Apply a diffeomorphism $\varphi$ and watch the density deform according to the change-of-variables formula.
- **Interactions:**
  - Transformation presets: affine (shift + scale), quadratic, coupling layer (simplified RealNVP), composition of 2 layers.
  - Parameter sliders (depends on selected transformation).
  - Toggle: show $p_Z(z)$ / show $p_X(x)$ / show both.
  - Toggle: show $|\det J_\varphi|$ overlay.
  - Animate: morph from identity to selected transformation.
- **Readout:** $\int p_X(x)\,dx$ (should be ≈ 1), $\log|\det J_\varphi|$ at selected point, KL divergence from target (if target distribution is selected).
- **Layout:** Two-panel. Left: $z$-space density (1D or 2D heatmap). Right: $x$-space density after transformation.

---

## 5. Data Modules

### `src/data/change-of-variables-data.ts`

**Interfaces:**

```typescript
interface CoordinateTransformPreset {
  name: string;
  label: string;
  phi: (u: number, v: number) => [number, number];
  jacobian: (u: number, v: number) => [[number, number], [number, number]];
  detJ: (u: number, v: number) => number;
  paramDomain: { u: [number, number]; v: [number, number] };
  description: string;
}

interface PolarIntegralPreset {
  name: string;
  label: string;
  f: (x: number, y: number) => number;
  fPolar: (r: number, theta: number) => number;
  region: { rRange: [number, number]; thetaRange: [number, number] };
  exactValue: number;
}

interface CoordinateSystem3DPreset {
  name: string;
  label: string;
  system: 'cylindrical' | 'spherical';
  phi: (p1: number, p2: number, p3: number) => [number, number, number];
  detJ: (p1: number, p2: number, p3: number) => number;
  volumeElement: string; // LaTeX string for display
  paramRanges: { p1: [number, number]; p2: [number, number]; p3: [number, number] };
  paramLabels: [string, string, string];
}

interface FlowPreset {
  name: string;
  label: string;
  forward: (z: number) => number; // 1D flow for simplicity
  inverse: (x: number) => number;
  logDetJ: (z: number) => number;
  params: Record<string, { min: number; max: number; default: number; label: string }>;
}
```

**Exports:**

- `COORDINATE_TRANSFORM_PRESETS` (6): identity, polar, elliptical, shear, scaling, parabolic.
- `POLAR_INTEGRAL_PRESETS` (5): area, $r^2$, Gaussian, $xy$, $\sqrt{r}$.
- `COORDINATE_SYSTEM_3D_PRESETS` (2): cylindrical, spherical.
- `FLOW_PRESETS` (4): affine, quadratic, coupling, composed.

---

## 6. Shared Utility Module Extensions

### 6.1 `integration.ts` (Extension)

**New functions:**

```typescript
export function changeOfVariables2D(
  f: (x: number, y: number) => number,
  phi: (u: number, v: number) => [number, number],
  detJ: (u: number, v: number) => number,
  uRange: [number, number],
  vRange: [number, number] | ((u: number) => [number, number]),
  nu?: number,
  nv?: number
): number;

export function polarIntegral(
  f: (r: number, theta: number) => number,
  rRange: [number, number],
  thetaRange: [number, number],
  nr?: number,
  ntheta?: number
): number;

export function cylindricalIntegral(
  f: (r: number, theta: number, z: number) => number,
  rRange: [number, number],
  thetaRange: [number, number],
  zRange: [number, number] | ((r: number, theta: number) => [number, number]),
  nr?: number,
  ntheta?: number,
  nz?: number
): number;

export function sphericalIntegral(
  f: (rho: number, theta: number, phi: number) => number,
  rhoRange: [number, number],
  thetaRange: [number, number],
  phiRange: [number, number],
  nrho?: number,
  ntheta?: number,
  nphi?: number
): number;

export function jacobianAreaElement(
  phi: (u: number, v: number) => [number, number],
  u: number,
  v: number,
  h?: number
): number;

export interface CoordinateTransformGridCell {
  uCenter: number;
  vCenter: number;
  corners: Array<{ x: number; y: number }>;
  detJ: number;
  area: number;
}

export function coordinateTransformGrid(
  phi: (u: number, v: number) => [number, number],
  uRange: [number, number],
  vRange: [number, number],
  nu: number,
  nv: number
): CoordinateTransformGridCell[];
```

**Backward compatibility:** Extension only. All existing functions from Topics 7, 8, and 13 are unchanged.

### 6.2 `multivariate.ts` (Extension)

**New functions:**

```typescript
export function densityTransform(
  pZ: (z: number) => number,
  phiInverse: (x: number) => number,
  detJInverse: (x: number) => number,
  x: number
): number;

export function densityTransform2D(
  pZ: (z1: number, z2: number) => number,
  phiInverse: (x1: number, x2: number) => [number, number],
  detJInverse: (x1: number, x2: number) => number,
  x1: number,
  x2: number
): number;

export function normalizingFlowStep(
  pPrev: (z: number) => number,
  forward: (z: number) => number,
  inverse: (x: number) => number,
  logDetJ: (z: number) => number,
  x: number
): number;
```

**Backward compatibility:** Extension only. All existing functions from Topics 9–13 are unchanged.

---

## 7. Curriculum Graph Updates

**Add node:**
```json
{ "id": "change-of-variables", "label": "Change of Variables & the Jacobian Determinant", "domain": "multivar-integral", "status": "published", "url": "/topics/change-of-variables" }
```

**Add edges:**
```json
{ "source": "multiple-integrals", "target": "change-of-variables" }
{ "source": "inverse-implicit", "target": "change-of-variables" }
{ "source": "change-of-variables", "target": "surface-integrals" }
```

**Verify downstream planned nodes exist.** If not, add `surface-integrals` with `"status": "planned"`.

**Update `curriculum.ts`:** Mark `change-of-variables` as `published` in the `multivar-integral` track.

---

## 8. Cross-References

**Update existing topics (change "coming soon" to live links):**

1. `riemann-integral.mdx` — Forward ref to change of variables ($u$-substitution generalizes).
2. `jacobian.mdx` — Example 7 (polar coordinates), Remark 4 (preview of change-of-variables formula), Section 6 (coordinate transformations). Update all forward references to live links.
3. `multiple-integrals.mdx` — Example 7 (disk integral → now link to §4 here), Section 10 ML connections (Gaussian integral preview → now link to §5 here), forward ref in §11.
4. `inverse-implicit.mdx` — §5 downstream mention of change of variables.
5. `improper-integrals.mdx` — Gaussian integral mention.

**This topic links FROM:** `multiple-integrals`, `inverse-implicit`, `jacobian`, `riemann-integral`, `improper-integrals`, `completeness-compactness` (all live links).

**Forward refs (plain text):** Surface Integrals & the Divergence Theorem, The Lebesgue Integral, Sigma-Algebras & Measures.

---

## 9. Images

| # | Filename | Description |
|---|----------|-------------|
| 1 | `1d-substitution.png` | Side-by-side: original integral with $x$-axis, transformed integral with $u$-axis, area correspondence |
| 2 | `change-of-variables-2d.png` | Uniform grid in $(u,v)$ space deformed by $\varphi$ into $(x,y)$ space, cells colored by $|\det J_\varphi|$ |
| 3 | `polar-coordinates.png` | Cartesian grid vs. polar grid on the unit disk, area element comparison |
| 4 | `gaussian-integral.png` | 3D surface $e^{-(x^2+y^2)}$ with polar radial rings, convergence plot |
| 5 | `coordinate-systems-3d.png` | Side-by-side: cylindrical coordinate surfaces and spherical coordinate surfaces |
| 6 | `general-diffeomorphism.png` | Arbitrary diffeomorphism deforming a grid, with Jacobian determinant heatmap overlay |
| 7 | `transformation-gallery.png` | Four-panel: elliptical, parabolic, composed, and shear transformations |
| 8 | `density-transformation.png` | Gaussian density $p_Z$ transformed by $\varphi$ into $p_X$, with $|\det J|$ curve shown |
| 9 | `ml-normalizing-flows.png` | Multi-layer normalizing flow diagram: $z \to f_1 \to f_2 \to \cdots \to f_K \to x$, densities at each stage |

---

## 10. Testing Checklist

- [ ] MDX renders at `/topics/change-of-variables`
- [ ] All TheoremBlocks render LaTeX correctly (6 definitions, 3 theorems, 2 propositions, 15 examples, 9 remarks, 2 proofs)
- [ ] All 5 viz components load on scroll and function correctly
- [ ] All cross-references resolve (no 404s)
- [ ] Forward references use plain text + "(coming soon)"
- [ ] Curriculum graph and curriculum.ts updated
- [ ] Static images load from `public/images/topics/change-of-variables/`
- [ ] Responsive layout on mobile
- [ ] Pagefind indexes the new topic
- [ ] `pnpm build` succeeds with zero errors

---

## 11. Build Order

1. Extend `integration.ts` — add coordinate transform functions. Test `polarIntegral` against known values ($\pi$ for unit disk, $\frac{4\pi}{3}$ for unit ball).
2. Extend `multivariate.ts` — add density transform functions. Test `densityTransform` with log-normal example.
3. Create `change-of-variables-data.ts` — all presets.
4. Create `change-of-variables.mdx` — full frontmatter and content. No viz yet.
5. Copy notebook figures to `public/images/topics/change-of-variables/`.
6. Build `ChangeOfVariablesExplorer.tsx` (flagship).
7. Build `PolarIntegralExplorer.tsx`.
8. Build `GaussianIntegralExplorer.tsx`.
9. Build `CoordinateSystemExplorer.tsx`.
10. Build `NormalizingFlowExplorer.tsx`.
11. Embed all components with `client:visible`.
12. Update `riemann-integral.mdx` forward refs to live links.
13. Update `jacobian.mdx` forward refs to live links.
14. Update `multiple-integrals.mdx` forward refs to live links.
15. Update `inverse-implicit.mdx` forward refs to live links.
16. Update `improper-integrals.mdx` forward refs to live links.
17. Update curriculum graph — add node and edges.
18. Update `curriculum.ts` — mark topic published.
19. Run testing checklist.
20. `pnpm build` — zero errors.
21. Commit and deploy.

---

## Appendix A: Key Differences from the Multiple Integrals Brief (Topic 13)

1. **Two prerequisites from different tracks.** `multiple-integrals` (Track 4) + `inverse-implicit` (Track 3) converge here. This is the second topic with a cross-track prerequisite structure (the first was Topic 13 itself with `riemann-integral` + `gradient`).
2. **Resolves more forward references than any prior topic.** Three prior topics (7, 10, 13) explicitly set up this content with forward hooks. The disk integral, the $r$ in $r\,dr\,d\theta$, and the Gaussian integral all resolve here.
3. **The proof is a partition-of-unity argument.** Unlike Fubini (Topic 13), which used a Darboux squeeze, the change of variables proof uses the partition of unity technique — a new proof strategy that the reader hasn't seen before. This connects forward to manifold integration (smooth manifolds on formalml.com).
4. **Flagship viz is a grid deformation.** Unlike the 3D Riemann sum boxes in Topic 13, the flagship here is a 2D grid deformation with a Jacobian heatmap. This is conceptually different: it visualizes the *transformation* rather than the *integral*.
5. **ML connection is normalizing flows.** This is the most ML-heavy section of any Track 4 topic. The density transformation formula is not just an application — it *is* the mathematical content of normalizing flows. The connection is structural, not analogical.
6. **The Gaussian integral is a capstone result.** This proof resolves a forward reference from Topic 8 (improper integrals) and connects to probability theory on formalml.com. It's the most important single computation in the topic.
7. **3D coordinate systems are introduced.** Cylindrical and spherical coordinates are defined and used for the first time. The Jacobian determinant computation for spherical coordinates is the most complex matrix computation on the site so far.
8. **Density transformation = probabilistic change of variables.** The reframing from $\int_D f\,dx = \int_{D^*} f \circ \varphi \cdot |\det J_\varphi|\,du$ to $p_X(x) = p_Z(\varphi^{-1}(x)) \cdot |\det J_{\varphi^{-1}}(x)|$ is the conceptual bridge between calculus and probability. This is the most important connection to formalml.com in the entire track.

---

## Appendix B: Formal Element Inventory

| Type | # | Title |
|------|---|-------|
| Definition | 1 | Coordinate Transformation |
| Definition | 2 | Polar Coordinates |
| Definition | 3 | Cylindrical Coordinates |
| Definition | 4 | Spherical Coordinates |
| Definition | 5 | $C^1$ Diffeomorphism |
| Definition | 6 | Density Transformation |
| Theorem | 1 | Substitution Rule (1D) |
| Theorem | 2 | Change of Variables (2D) |
| Theorem | 3 | Change of Variables (General) |
| Proposition | 1 | The Gaussian Integral |
| Proposition | 2 | Composition of Transformations |
| Example | 1 | $\int_0^1 \sqrt{1-x^2}\,dx$ via $x = \sin\theta$ |
| Example | 2 | $\int_0^\infty e^{-x^2/2}\,dx$ via $u = x^2/2$ |
| Example | 3 | Linear change of variables |
| Example | 4 | Affine shear $\varphi(u,v) = (u+v, v)$ |
| Example | 5 | Area of the unit disk (resolved) |
| Example | 6 | $\iint (x^2+y^2)\,dA$ over annulus |
| Example | 7 | Volume under paraboloid (resolved) |
| Example | 8 | Gaussian normalizing constant |
| Example | 9 | Volume of the unit ball |
| Example | 10 | Moment of inertia of a solid sphere |
| Example | 11 | Elliptical coordinates — area of ellipse |
| Example | 12 | Parabolic coordinates |
| Example | 13 | Composed transformation — rotated ellipse |
| Example | 14 | Log-normal from normal |
| Example | 15 | Affine coupling layer (RealNVP) |
| Remark | 1 | Why the absolute value? |
| Remark | 2 | Diffeomorphism vs. local diffeomorphism |
| Remark | 3 | The formula in reverse |
| Remark | 4 | Why $r > 0$? |
| Remark | 5 | Why is the Gaussian integral hard in Cartesian? |
| Remark | 6 | Which coordinate system to use? |
| Remark | 7 | Relaxing the hypotheses |
| Remark | 8 | Normalizing flows |
| Remark | 9 | The reparameterization trick |
| Proof | — | 2 proofs total (Proposition 1 — Gaussian integral, Theorem 3 — general change of variables) |

---

*Brief version: v1 | Created: 2026-04-03 | Author: Jonathan Rocha*  
*Reference notebook: `notebooks/change-of-variables/14_change_of_variables.ipynb`*  
*Reference doc: `docs/plans/formalcalculus-handoff-reference.md`*
