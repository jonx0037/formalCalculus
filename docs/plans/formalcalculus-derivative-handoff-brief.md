# Claude Code Handoff Brief: The Derivative & Chain Rule

**Project:** formalCalculus — [formalcalculus.com](https://www.formalcalculus.com)  
**Repo:** `github.com/jonx0037/formalCalculus`  
**Stack:** Astro 6 · React 19 · MDX · Tailwind CSS 4 · D3.js 7 · KaTeX · Vercel  
**Package Manager:** pnpm  
**Status:** Ready for implementation  
**Reference Notebook:** `notebooks/derivative/05_derivative_chain_rule.ipynb`  
**Reference Doc:** `docs/plans/formalcalculus-handoff-reference.md`

---

## 1. Objective

Add a new topic page **"The Derivative & Chain Rule"** as the **first topic in the Single-Variable Calculus track** on formalcalculus.com.

1. This is **topic 5 of 32** and the **fifth topic published** on formalcalculus.com. All four topics in the Limits & Continuity track (`sequences-limits`, `epsilon-delta`, `completeness-compactness`, `uniform-convergence`) are deployed and live. This is the **first topic in a new track** (Single-Variable Calculus).
2. **Prerequisites:** `sequences-limits` and `epsilon-delta`. The derivative is defined as a limit (Topic 1 machinery), and the relationship between differentiability and continuity requires the ε-δ framework (Topic 2). Completeness and compactness (Topic 3) and uniform convergence (Topic 4) are not direct prerequisites — they become relevant for the Mean Value Theorem and Taylor expansion in Topic 6.
3. **Downstream within formalCalculus:**
   - `mean-value-taylor` (direct) — Rolle's theorem, MVT, and Taylor expansion all rest on the derivative definition and the chain rule
   - `riemann-integral` (indirect) — the Fundamental Theorem of Calculus connects differentiation and integration
   - `gradient` (indirect) — partial derivatives generalize single-variable derivatives to ℝⁿ
   - `jacobian` (indirect) — the multivariate chain rule generalizes the single-variable chain rule; backpropagation is the chain rule applied to computation graphs
   - `hessian` (indirect) — second-order derivatives, concavity analysis
4. **Forward links to formalml.com:**
   - `gradient-descent` — The derivative is the engine of gradient-based optimization. Single-variable gradient descent $\theta_{t+1} = \theta_t - \eta f'(\theta_t)$ is the prototype for all gradient methods. The chain rule enables backpropagation through deep network layers.
   - `shannon-entropy` — Derivatives of entropy $H(p) = -\sum p_i \log p_i$, KL divergence, and cross-entropy loss — the calculus that drives information-theoretic objectives in ML.
   - `smooth-manifolds` — Differentiable functions are the morphisms of smooth manifolds. The single-variable derivative is the 1D prototype for the pushforward map.
5. This topic **creates** the shared utility module `differentiation.ts` at `src/components/viz/shared/differentiation.ts`. This module will be extended by Topics 6–8 in the Single-Variable Calculus track.

**Content scope:**

- The derivative as a limit: $f'(a) = \lim_{h \to 0} \frac{f(a+h) - f(a)}{h}$
- Geometric interpretation: secant lines converging to the tangent line as $h \to 0$
- The derivative as the best linear approximation: $f(a+h) \approx f(a) + f'(a)h$
- Differentiability implies continuity (with proof) — but continuity does not imply differentiability
- Differentiation rules derived from the limit definition: sum rule, product rule (Leibniz), quotient rule
- The chain rule: $(f \circ g)'(a) = f'(g(a)) \cdot g'(a)$ — the composition of linear approximations
- The chain rule as a preview of the Jacobian: derivatives as linear maps between tangent spaces
- Higher-order derivatives: $f''$, concavity, and the second derivative test preview
- Non-differentiable functions: corners ($|x|$), cusps ($x^{2/3}$), vertical tangents ($x^{1/3}$), and the Weierstrass function (continuous everywhere, differentiable nowhere)
- ML connections: backpropagation as the chain rule on computation graphs, automatic differentiation (forward and reverse mode), gradient computation for common loss functions

---

## 2. MDX File

### Location

```
src/content/topics/derivative.mdx
```

The entry `id` will be `derivative`. The dynamic route resolves to `/topics/derivative`.

### Frontmatter

```yaml
---
title: "The Derivative & Chain Rule"
subtitle: "Rates of change as limits of difference quotients — the tangent line as the best linear approximation, differentiation rules from first principles, and the chain rule that makes backpropagation possible"
status: "published"
difficulty: "foundational"
prerequisites:
  - "sequences-limits"
  - "epsilon-delta"
tags:
  - "calculus"
  - "derivative"
  - "differentiation"
  - "chain-rule"
  - "tangent-line"
  - "linear-approximation"
  - "backpropagation"
  - "automatic-differentiation"
domain: "single-variable"
videoId: null
notebookPath: "notebooks/derivative/05_derivative_chain_rule.ipynb"
githubUrl: "https://github.com/jonx0037/formalCalculus/blob/main/src/content/topics/derivative.mdx"
datePublished: 2026-03-30
estimatedReadTime: 45
abstract: "The derivative of f at a is the limit f'(a) = lim_{h→0} [f(a+h) - f(a)] / h — the instantaneous rate of change, the slope of the tangent line, and the best linear approximation to f near a, all in one definition. Geometrically, the derivative is what you get when secant lines through (a, f(a)) and (a+h, f(a+h)) converge as h → 0: the limiting slope is f'(a), and the limiting line is the tangent. This limit need not exist — |x| is continuous at 0 but has no derivative there because the left and right secant slopes disagree, and the Weierstrass function is continuous everywhere but differentiable nowhere. When the derivative does exist, differentiability implies continuity (but not the converse), and differentiation obeys algebraic rules derived directly from the limit definition: the sum rule, the product rule (Leibniz rule), the quotient rule, and — most importantly — the chain rule (f ∘ g)'(a) = f'(g(a)) · g'(a). The chain rule says that the derivative of a composition is the product of the derivatives along the chain. This is not a coincidence — it reflects the fact that the derivative at each point is a linear map, and composing linear maps means multiplying them. In machine learning, the chain rule is used in backpropagation: given a loss L = L(f(g(h(x)))), the gradient ∂L/∂x is computed by multiplying local derivatives and backpropagating them through the computation graph, which is exactly the chain rule applied layer by layer. Automatic differentiation (reverse mode = backprop, forward mode = tangent propagation) mechanizes this process, and every gradient-based optimizer — SGD, Adam, RMSProp — depends on the chain rule to compute the gradients it needs."
formalmlConnections:
  - topic: "gradient-descent"
    site: "formalml"
    relationship: "Single-variable gradient descent θ_{t+1} = θ_t - η f'(θ_t) is the prototype for all gradient methods. The chain rule enables backpropagation — computing gradients through compositions of functions (network layers) — which is the computational engine of gradient-based optimization."
  - topic: "shannon-entropy"
    site: "formalml"
    relationship: "Derivatives of entropy H(p) = -Σ pᵢ log pᵢ, KL divergence, and cross-entropy loss are central to information-theoretic ML objectives. The derivative d/dp(-p log p) = -log p - 1 connects information content to optimization."
  - topic: "smooth-manifolds"
    site: "formalml"
    relationship: "The single-variable derivative is the 1D prototype for the pushforward map between tangent spaces. Differentiable functions are the morphisms of smooth manifolds — the chain rule becomes functoriality of the tangent functor."
connections:
  - topic: "sequences-limits"
    relationship: "The derivative is defined as a limit. The convergence theory from Topic 1 — the ε-N definition, limit uniqueness, the algebra of limits — provides the rigorous foundation for the difference quotient limit that defines f'(a)."
  - topic: "epsilon-delta"
    relationship: "The limit in the derivative definition is a function limit (h → 0), formalized by the ε-δ framework from Topic 2. The proof that differentiability implies continuity uses ε-δ continuity directly."
references:
  - type: "book"
    title: "Understanding Analysis"
    authors: "Abbott"
    year: 2015
    note: "Chapter 5 develops the derivative from the limit definition through the Mean Value Theorem — the primary reference for our rigorous-but-accessible approach"
  - type: "book"
    title: "Principles of Mathematical Analysis"
    authors: "Rudin"
    year: 1976
    note: "Chapter 5 on differentiation — the compact, definitive treatment of single-variable derivatives"
  - type: "book"
    title: "Calculus"
    authors: "Spivak"
    year: 2008
    note: "Chapters 9–11 develop differentiation with unusual care for geometric intuition alongside full rigor — exceptional treatment of the chain rule proof"
  - type: "book"
    title: "Deep Learning"
    authors: "Goodfellow, Bengio & Courville"
    year: 2016
    note: "Section 6.5 on back-propagation — the chain rule as the computational engine of deep learning"
  - type: "paper"
    title: "Automatic Differentiation in Machine Learning: a Survey"
    authors: "Baydin, Pearlmutter, Radul & Siskind"
    year: 2018
    url: "https://arxiv.org/abs/1502.05767"
    note: "Comprehensive survey of forward-mode and reverse-mode AD — mechanizing the chain rule for gradient computation"
---
```

---

## 3. Content Outline

### Section 1: Overview & Motivation

**Opening example:** Start with a neural network's loss function $L(\theta)$ plotted against a single parameter $\theta$. The reader has adjusted learning rates and watched loss curves — but what does it mean when the loss is "going down"? The derivative $L'(\theta)$ tells us the direction and rate. The chain rule tells us how to compute it by composing layers. This topic makes both precise.

No TheoremBlocks. No viz. 2–3 paragraphs setting up the "why."

### Section 2: The Derivative as a Limit

**Core definition section.** Begin with the geometric picture — two points on a curve connected by a secant line — before the formula. The slope of the secant through $(a, f(a))$ and $(a+h, f(a+h))$ is the difference quotient $\frac{f(a+h) - f(a)}{h}$. As $h \to 0$, the secant rotates toward the tangent. The derivative is the limit of this process.

**TheoremBlocks:**

- **Definition 1: The Derivative** — $f'(a) = \lim_{h \to 0} \frac{f(a+h) - f(a)}{h}$, with the plain-English gloss: "the instantaneous rate of change of $f$ at $a$." Mention that this limit is a function limit (connecting to Topic 2's ε-δ framework): for every $\varepsilon > 0$, there exists $\delta > 0$ such that $0 < |h| < \delta$ implies $\left|\frac{f(a+h) - f(a)}{h} - f'(a)\right| < \varepsilon$.
- **Definition 2: Left and Right Derivatives** — $f'_-(a) = \lim_{h \to 0^-}$ and $f'_+(a) = \lim_{h \to 0^+}$. The derivative exists if and only if both one-sided derivatives exist and agree (connecting to Topic 2's one-sided limits).
- **Example 1: Derivative of $f(x) = x^2$ at $a = 3$ from the definition** — Full algebraic expansion: $\frac{(3+h)^2 - 9}{h} = \frac{6h + h^2}{h} = 6 + h \to 6$. Every step is shown.
- **Example 2: Derivative of $f(x) = \sqrt{x}$ at $a > 0$ from the definition** — Rationalization technique: multiply by $\frac{\sqrt{a+h} + \sqrt{a}}{\sqrt{a+h} + \sqrt{a}}$. Result: $f'(a) = \frac{1}{2\sqrt{a}}$.

**Visualization:** `SecantToTangentExplorer` embedded here.

**Static image:** `secant-to-tangent.png` from the notebook.

### Section 3: The Derivative as Linear Approximation

**The key conceptual shift:** The tangent line $y = f(a) + f'(a)(x - a)$ is not just a geometric artifact — it is the *best linear approximation* to $f$ near $a$. The error $f(a+h) - f(a) - f'(a)h$ goes to zero faster than $h$ itself.

**TheoremBlocks:**

- **Proposition 1: Derivative as Best Linear Approximation** — $f$ is differentiable at $a$ with derivative $f'(a)$ if and only if there exists a linear function $L(h) = f'(a) \cdot h$ such that $f(a+h) = f(a) + L(h) + r(h)$ where $\lim_{h \to 0} r(h)/h = 0$. The remainder $r(h)$ is "little-o of $h$."
- **Remark 1: Linear maps preview** — In one dimension, a linear map $L: \mathbb{R} \to \mathbb{R}$ is multiplication by a scalar. The derivative $f'(a)$ *is* that scalar. In $\mathbb{R}^n$, the derivative will be a matrix (the Jacobian) — multiplication by a linear map. The single-variable case is the prototype.

**Visualization:** `LinearApproximationExplorer` embedded here.

**Static image:** `linear-approximation.png` from the notebook.

### Section 4: Differentiability and Continuity

**TheoremBlocks:**

- **Theorem 1: Differentiability Implies Continuity** — If $f$ is differentiable at $a$, then $f$ is continuous at $a$.
- **Proof of Theorem 1** — Full proof: Write $f(a+h) - f(a) = \frac{f(a+h) - f(a)}{h} \cdot h$. As $h \to 0$, the first factor $\to f'(a)$ (by differentiability) and the second factor $\to 0$. By the algebra of limits (Topic 1, Theorem 3), the product $\to f'(a) \cdot 0 = 0$. So $\lim_{h \to 0} f(a+h) = f(a)$, which is continuity at $a$ (Topic 2, Definition 5).
- **Remark 2: The converse is false** — Continuity does not imply differentiability. The function $f(x) = |x|$ is continuous at $x = 0$ but has $f'_-(0) = -1$ and $f'_+(0) = 1$, so the derivative does not exist. This is not pathological — it happens at every ReLU kink in a neural network.
- **Example 3: $f(x) = |x|$ is not differentiable at 0** — Left derivative: $\lim_{h \to 0^-} \frac{|h|}{h} = \lim_{h \to 0^-} \frac{-h}{h} = -1$. Right derivative: $\lim_{h \to 0^+} \frac{|h|}{h} = 1$. Since $-1 \neq 1$, the derivative does not exist.

**Visualization:** `DifferentiabilityExplorer` embedded here.

**Static image:** `differentiability-continuity.png` from the notebook.

### Section 5: Differentiation Rules

**Every rule derived from the limit definition.** No "it can be shown" — every proof expands the difference quotient, applies algebra of limits, and arrives at the result.

**TheoremBlocks:**

- **Theorem 2: Sum Rule** — $(f + g)'(a) = f'(a) + g'(a)$.
- **Proof of Theorem 2** — One-line proof via linearity of limits.
- **Theorem 3: Constant Multiple Rule** — $(cf)'(a) = c \cdot f'(a)$.
- **Theorem 4: Product Rule (Leibniz Rule)** — $(fg)'(a) = f'(a)g(a) + f(a)g'(a)$.
- **Proof of Theorem 4** — The add-and-subtract trick: $f(a+h)g(a+h) - f(a)g(a) = f(a+h)g(a+h) - f(a+h)g(a) + f(a+h)g(a) - f(a)g(a)$. Factor, take limits (using Theorem 1 for $f(a+h) \to f(a)$ since $f$ is differentiable, hence continuous).
- **Theorem 5: Quotient Rule** — $\left(\frac{f}{g}\right)'(a) = \frac{f'(a)g(a) - f(a)g'(a)}{g(a)^2}$, provided $g(a) \neq 0$.
- **Proof of Theorem 5** — Derived from the limit definition. The key step is adding and subtracting $f(a)g(a)$ in the numerator.
- **Example 4: Power rule for $f(x) = x^n$** — Derived from the product rule by induction, or directly from the binomial theorem: $\frac{(a+h)^n - a^n}{h} = \sum_{k=1}^{n} \binom{n}{k} a^{n-k} h^{k-1} \to na^{n-1}$.

**Static image:** `differentiation-rules.png` from the notebook.

### Section 6: The Chain Rule

**The most important theorem in the topic.** Geometric-first: if $g$ stretches the input by a factor of $g'(a)$ near $a$, and $f$ stretches the output by a factor of $f'(g(a))$ near $g(a)$, then the composition $f \circ g$ stretches by $f'(g(a)) \cdot g'(a)$ — the product of the local stretching factors.

**TheoremBlocks:**

- **Theorem 6: The Chain Rule** — If $g$ is differentiable at $a$ and $f$ is differentiable at $g(a)$, then $(f \circ g)'(a) = f'(g(a)) \cdot g'(a)$.
- **Proof of Theorem 6** — Full proof using the linear approximation characterization (Proposition 1). Define $\varphi(k) = \frac{f(g(a) + k) - f(g(a))}{k} - f'(g(a))$ for $k \neq 0$ and $\varphi(0) = 0$. Then $f(g(a) + k) - f(g(a)) = [f'(g(a)) + \varphi(k)] \cdot k$. Set $k = g(a+h) - g(a)$, divide by $h$, take the limit. The subtlety: we cannot divide by $g(a+h) - g(a)$ directly because it might be zero for $h \neq 0$ — the linear approximation proof avoids this pitfall (as Spivak emphasizes).
- **Example 5: Chain rule applied** — $\frac{d}{dx}\sin(x^2)$ at $x = a$. Outer: $f(u) = \sin(u)$, $f'(u) = \cos(u)$. Inner: $g(x) = x^2$, $g'(x) = 2x$. Result: $\cos(a^2) \cdot 2a$.
- **Example 6: Nested composition (three layers)** — $\frac{d}{dx} e^{\sin(x^2)}$. Three derivatives multiplied: $e^{\sin(x^2)} \cdot \cos(x^2) \cdot 2x$. This is a three-layer "network" — the chain rule applies at each layer.
- **Remark 3: The chain rule as composition of linear maps** — Each derivative $f'(a)$ is a linear map $\mathbb{R} \to \mathbb{R}$ (multiplication by $f'(a)$). The chain rule says the derivative of a composition is the *composition* of the derivatives — which in 1D is multiplication. In $\mathbb{R}^n$, "multiplication" becomes matrix multiplication: $(J_{f \circ g})(a) = J_f(g(a)) \cdot J_g(a)$. The chain rule is *functorial*. (→ formalML: smooth manifolds)

**Visualization:** `ChainRuleCompositionExplorer` embedded here.

**Static image:** `chain-rule-composition.png` from the notebook.

### Section 7: Higher-Order Derivatives

- **Definition 3: Higher-Order Derivatives** — $f''(a) = (f')'(a)$, and inductively $f^{(n)}(a) = (f^{(n-1)})'(a)$. Notation: $f''$, $f'''$, $f^{(4)}$, $f^{(n)}$. Leibniz notation: $\frac{d^2 f}{dx^2}$, $\frac{d^n f}{dx^n}$.
- **Remark 4: Concavity and the second derivative** — $f''(a) > 0$ means $f$ is concave up (the tangent line lies below the graph). $f''(a) < 0$ means concave down (tangent above). This is the 1D version of the Hessian's positive/negative definiteness, which determines whether a critical point is a local minimum, maximum, or saddle. (→ formalCalculus: `hessian`)

**Static image:** `higher-order-derivatives.png` from the notebook.

### Section 8: Non-Differentiable Functions

**Where differentiability fails.** Four pathologies:

1. **Corners** — $f(x) = |x|$ at $x = 0$: left and right derivatives disagree.
2. **Cusps** — $f(x) = x^{2/3}$ at $x = 0$: difference quotient $\to \pm\infty$.
3. **Vertical tangents** — $f(x) = x^{1/3}$ at $x = 0$: derivative is $+\infty$.
4. **Everywhere non-differentiable** — The Weierstrass function $W(x) = \sum_{n=0}^{\infty} a^n \cos(b^n \pi x)$ with $0 < a < 1$, $b$ an odd integer, $ab > 1 + \frac{3\pi}{2}$: continuous everywhere, differentiable nowhere.

- **Remark 5: Non-differentiability in ML** — ReLU$(x) = \max(0, x)$ has a corner at $x = 0$ — identical to $|x|$ shifted. In practice, ML frameworks define the "derivative" at the kink as $0$ or $1$ by convention. This works because the set of inputs landing exactly on the kink has measure zero (→ formalCalculus: `sigma-algebras`). The Weierstrass function shows that pathology can be extreme — but it's the non-generic case.

**Static image:** `non-differentiable-functions.png` from the notebook.

### Section 9: Connections to ML — Backpropagation & Automatic Differentiation

**Substantial section — not an afterthought.** This is where the derivative and chain rule connect directly to modern ML practice.

**Subsection 9.1: Backpropagation is the chain rule.** A simple computation graph: input $x$, hidden $z = \sigma(wx + b)$, output $L = (z - y)^2$. Forward pass computes $L$; backward pass computes $\frac{dL}{dw} = \frac{dL}{dz} \cdot \frac{dz}{dw}$ by applying the chain rule at each node.

**Subsection 9.2: Automatic differentiation.** Forward mode (tangent propagation): propagate $\dot{x} = 1$ forward through the graph, accumulating $\dot{z} = f'(x) \cdot \dot{x}$ at each node. Reverse mode (backprop): propagate $\bar{L} = 1$ backward, accumulating $\bar{x} = f'(x) \cdot \bar{z}$ at each node. Forward mode has cost $O(n)$ per input variable; reverse mode has cost $O(1)$ per output variable — which is why backprop wins for scalar loss + many parameters.

**Subsection 9.3: Common ML derivatives.** Table of derivatives for common loss and activation functions:
- Sigmoid: $\sigma'(x) = \sigma(x)(1 - \sigma(x))$
- Tanh: $\tanh'(x) = 1 - \tanh^2(x)$
- ReLU: $\text{ReLU}'(x) = \mathbf{1}_{x > 0}$
- Cross-entropy loss derivative
- MSE loss derivative

**Visualization:** `BackpropGraphExplorer` embedded here.

**Static image:** `backprop-chain-rule.png` from the notebook.

### Section 10: Computational Notes

**Numerical differentiation in Python.** Forward difference, central difference, Richardson extrapolation. NumPy/SciPy implementations. Numerical pitfalls: catastrophic cancellation at small $h$, truncation error at large $h$, the optimal $h \sim \sqrt{\epsilon_{\text{mach}}}$ for forward differences and $h \sim \epsilon_{\text{mach}}^{1/3}$ for central differences.

**Static image:** `numerical-differentiation.png` from the notebook.

### Section 11: Connections & Further Reading

Cross-reference table and DAG diagram. Same pattern as Track 1 topics.

---

## 4. Visualizations

### 4.1 SecantToTangentExplorer

- **Component name:** `SecantToTangentExplorer`
- **Filename:** `src/components/viz/SecantToTangentExplorer.tsx`
- **What it visualizes:** A function graph with a secant line through $(a, f(a))$ and $(a+h, f(a+h))$. As the user adjusts $h$, the secant rotates toward the tangent line. When $h$ is sufficiently small, the secant and tangent are visually indistinguishable.
- **User interactions:**
  - $h$ slider (range: $-2$ to $2$, centered at $0$, logarithmic scaling near $0$). Dragging $h$ toward $0$ animates the secant into the tangent.
  - "Play" button that auto-animates $h \to 0$ smoothly.
  - Function preset dropdown: $x^2$, $\sin(x)$, $\sqrt{x}$, $e^x$, $1/x$.
  - Point $a$ slider to move the base point along the curve.
- **Numerical readout panel:** Current $h$ value, secant slope $\frac{f(a+h)-f(a)}{h}$, derivative $f'(a)$, difference $|\text{secant slope} - f'(a)|$.
- **Data source:** Inline computation (functions defined in the component).
- **Panel layout:** Single panel with readout sidebar.
- **Reference pattern:** Derivative explorer pattern (§4 of reference doc).

### 4.2 LinearApproximationExplorer

- **Component name:** `LinearApproximationExplorer`
- **Filename:** `src/components/viz/LinearApproximationExplorer.tsx`
- **What it visualizes:** A function $f$, its tangent line at a point $a$, and the error $|f(x) - T(x)|$ where $T(x) = f(a) + f'(a)(x-a)$. Shows visually that the tangent line is the best linear approximation near $a$.
- **User interactions:**
  - Drag point $a$ along the curve to reposition the tangent line.
  - Function preset dropdown: $x^2$, $\sin(x)$, $e^x$, $\ln(x)$, $x^3 - x$.
  - "Zoom" button that magnifies the neighborhood of $a$ to show the tangent hugging the curve.
  - Toggle to show/hide the error shading between $f$ and $T$.
- **Data source:** Inline computation.
- **Panel layout:** Two-panel: left shows $f$ + tangent, right shows error magnitude $|f(x) - T(x)|$ as a function of distance from $a$.

### 4.3 DifferentiabilityExplorer

- **Component name:** `DifferentiabilityExplorer`
- **Filename:** `src/components/viz/DifferentiabilityExplorer.tsx`
- **What it visualizes:** Tabbed explorer showing four types of (non-)differentiability: smooth function, corner ($|x|$), cusp ($x^{2/3}$), and the Weierstrass function.
- **User interactions:**
  - Tab selector: "Smooth" / "Corner" / "Cusp" / "Weierstrass"
  - "Zoom" button to magnify the problematic point, showing how corners never smooth out no matter how far you zoom.
  - $h$ slider (on the smooth and corner tabs) showing left/right secant slopes disagreeing at a corner.
- **Data source:** Inline for smooth/corner/cusp; data module for Weierstrass partial sums.
- **Panel layout:** Single panel per tab, with left/right derivative readouts.

### 4.4 ChainRuleCompositionExplorer

- **Component name:** `ChainRuleCompositionExplorer`
- **Filename:** `src/components/viz/ChainRuleCompositionExplorer.tsx`
- **What it visualizes:** The chain rule as a composition of stretching. Two side-by-side function plots — $g$ on the left, $f$ on the right — with an animated "signal" that flows from input $x$ through $g$ to produce $g(x)$, then through $f$ to produce $f(g(x))$. The local stretching at each stage is represented by a scale factor, and the product of the scale factors equals the chain rule derivative.
- **User interactions:**
  - $x$ slider (moves the input point).
  - Function pair preset dropdown: ($x^2$, $\sin$); ($\sin$, $e^x$); ($\ln$, $x^2$).
  - "Animate flow" button that sends a visual pulse from $x$ through $g$ into $f$.
- **Numerical readout:** $g'(x)$, $f'(g(x))$, and their product $(f \circ g)'(x)$.
- **Data source:** Inline computation.
- **Panel layout:** Two-panel side-by-side (left = $g$, right = $f$) with flow arrows connecting them.

### 4.5 BackpropGraphExplorer

- **Component name:** `BackpropGraphExplorer`
- **Filename:** `src/components/viz/BackpropGraphExplorer.tsx`
- **What it visualizes:** A simple computation graph (3–4 nodes) representing a one-hidden-layer network: $x \to z = \sigma(wx+b) \to L = (z-y)^2$. The forward pass highlights nodes left-to-right with their computed values. Backward pass highlights nodes right-to-left with computed gradients, showing the chain rule multiplication at each edge.
- **User interactions:**
  - $w$ slider (weight), $b$ slider (bias), $x$ slider (input), $y$ slider (target).
  - Toggle: "Forward Pass" / "Backward Pass" / "Both"
  - Activation preset: sigmoid, tanh, ReLU.
- **Numerical readout:** Forward values ($z$, $L$) and backward gradients ($\frac{dL}{dz}$, $\frac{dz}{dw}$, $\frac{dL}{dw}$).
- **Data source:** Inline computation.
- **Panel layout:** Single computation graph with annotated edges, readout below.

---

## 5. Data Modules

### 5.1 `derivative-data.ts`

- **Filename:** `src/data/derivative-data.ts`
- **Exported interfaces:**

```typescript
interface FunctionPreset {
  name: string;
  label: string;              // Display label (e.g., "f(x) = x²")
  f: (x: number) => number;
  f_prime: (x: number) => number;
  domain: [number, number];
  defaultPoint: number;       // Default value of a
}

interface ChainRulePreset {
  name: string;
  label: string;
  g: (x: number) => number;
  g_prime: (x: number) => number;
  g_label: string;
  f: (u: number) => number;
  f_prime: (u: number) => number;
  f_label: string;
  domain: [number, number];
}

interface ActivationPreset {
  name: string;
  label: string;
  sigma: (x: number) => number;
  sigma_prime: (x: number) => number;
}

interface WeierstrasstParams {
  a: number;
  b: number;
  maxTerms: number;
}
```

- **Exported constants:**
  - `FUNCTION_PRESETS: FunctionPreset[]` — 5 presets for SecantToTangent and LinearApproximation.
  - `CHAIN_RULE_PRESETS: ChainRulePreset[]` — 3 composition pairs.
  - `ACTIVATION_PRESETS: ActivationPreset[]` — sigmoid, tanh, ReLU.
  - `WEIERSTRASS_PARAMS: WeierstrasstParams` — default $a = 0.5$, $b = 7$, maxTerms = 50.
  - `DIFFERENTIABILITY_PRESETS` — Four presets (smooth, corner, cusp, Weierstrass) for the DifferentiabilityExplorer.

- **Computation:** All eager (function references are cheap; no heavy computation at import time).

---

## 6. Shared Utility Module: `differentiation.ts`

### Location

```
src/components/viz/shared/differentiation.ts
```

### New interfaces

```typescript
interface SecantLine {
  x1: number; y1: number;
  x2: number; y2: number;
  slope: number;
}

interface TangentLine {
  x0: number;
  y0: number;
  slope: number;
}

interface DerivativeResult {
  x: number;
  f_x: number;
  f_prime_x: number;
  method: 'exact' | 'forward' | 'central' | 'richardson';
}

interface ChainRuleStep {
  functionLabel: string;
  input: number;
  output: number;
  localDerivative: number;
}

interface DifferentiabilityCheck {
  x0: number;
  leftDerivative: number | null;   // null if DNE (infinite)
  rightDerivative: number | null;
  isDifferentiable: boolean;
  failureReason?: 'disagreement' | 'infinite' | 'oscillation';
}
```

### New functions

```typescript
/** Compute secant line through (a, f(a)) and (a+h, f(a+h)) */
export function computeSecant(f: (x: number) => number, a: number, h: number): SecantLine;

/** Compute tangent line at (a, f(a)) using exact derivative */
export function computeTangent(f: (x: number) => number, f_prime: (x: number) => number, a: number): TangentLine;

/** Forward difference approximation: [f(x+h) - f(x)] / h */
export function forwardDifference(f: (x: number) => number, x: number, h: number): number;

/** Central difference approximation: [f(x+h) - f(x-h)] / (2h) */
export function centralDifference(f: (x: number) => number, x: number, h: number): number;

/** Richardson extrapolation for improved numerical derivative */
export function richardsonExtrapolation(f: (x: number) => number, x: number, h: number, order?: number): number;

/** Check differentiability at x0 by comparing left and right difference quotients */
export function checkDifferentiability(
  f: (x: number) => number,
  x0: number,
  hValues?: number[]
): DifferentiabilityCheck;

/** Compute chain rule for a composition: returns the sequence of local derivatives and their product */
export function evaluateChainRule(
  steps: Array<{ f: (x: number) => number; f_prime: (x: number) => number; label: string }>,
  x: number
): { steps: ChainRuleStep[]; totalDerivative: number };

/** Generate derivative curve: array of (x, f'(x)) points */
export function generateDerivativeCurve(
  f_prime: (x: number) => number,
  interval: [number, number],
  n: number
): Array<{ x: number; y: number }>;

/** Weierstrass function partial sum */
export function weierstrass(x: number, a: number, b: number, terms: number): number;

/** Seeded pseudo-random (same pattern as limits.ts) */
export function seededRandom(seed: number): () => number;
```

### Backward compatibility

This is a **new module** — no backward compatibility concerns. It follows the same file structure pattern as `limits.ts` from Track 1.

---

## 7. Curriculum Graph Updates

### `src/data/curriculum-graph.json`

**Add node:**
```json
{ "id": "derivative", "label": "The Derivative & Chain Rule", "domain": "single-variable", "status": "published", "url": "/topics/derivative" }
```

**Add edges:**
```json
{ "source": "sequences-limits", "target": "derivative" },
{ "source": "epsilon-delta", "target": "derivative" }
```

**Note:** Do *not* add edges from `derivative` to downstream topics (`mean-value-taylor`, `gradient`, `jacobian`) yet — those edges will be added when those topics are implemented.

### `src/data/curriculum.ts`

In the `single-variable` track, change `"The Derivative & Chain Rule"` from `planned` to `published`. All other topics in the track remain `planned`.

---

## 8. Cross-References

### Existing topics that should link TO `derivative`

- **`sequences-limits.mdx`** — If there is a forward reference like "The Derivative & Chain Rule *(coming soon)*", update it to a live link: `[The Derivative & Chain Rule](/topics/derivative)`.
- **`epsilon-delta.mdx`** — If there is a forward reference to the derivative topic, update it to a live link.

### Topics that `derivative` links FROM (back-references)

- `[Sequences, Limits & Convergence](/topics/sequences-limits)` — referenced when invoking the limit definition, algebra of limits.
- `[Epsilon-Delta & Continuity](/topics/epsilon-delta)` — referenced in the differentiability-implies-continuity proof and the ε-δ formulation of the derivative.

### Forward references to planned topics (plain text, not links)

- **Mean Value Theorem & Taylor Expansion** *(coming soon)* — referenced in §7 (higher-order derivatives preview) and §6 (chain rule generalizations).
- **Partial Derivatives & the Gradient** *(coming soon)* — referenced in §6 (chain rule generalizes to Jacobian).
- **The Jacobian & Multivariate Chain Rule** *(coming soon)* — referenced in §6 and §9 (backpropagation as multivariate chain rule).
- **The Hessian & Second-Order Analysis** *(coming soon)* — referenced in §7 (second derivative test).
- **The Riemann Integral & FTC** *(coming soon)* — referenced in §11 (FTC connects derivative and integral).
- **Sigma-Algebras & Measures** *(coming soon)* — referenced in §8 (measure zero remark about ReLU kinks).

### formalml.com forward links (external, informational only)

- [Gradient Descent](https://formalml.com/topics/gradient-descent) → formalML
- [Shannon Entropy](https://formalml.com/topics/shannon-entropy) → formalML
- [Smooth Manifolds](https://formalml.com/topics/smooth-manifolds) → formalML

All open in new tab with `target="_blank" rel="noopener"`.

---

## 9. Images

All images from the notebook go to `public/images/topics/derivative/`.

| Filename | Description |
|----------|-------------|
| `secant-to-tangent.png` | Three-panel: secant at $h=1$, $h=0.3$, $h=0.05$ approaching tangent on $f(x)=x^2$ |
| `linear-approximation.png` | Two-panel: tangent line as local approximation + error magnitude vs. distance |
| `differentiability-continuity.png` | Four-panel: smooth ($x^2$), corner ($|x|$), cusp ($x^{2/3}$), vertical tangent ($x^{1/3}$) |
| `differentiation-rules.png` | Three-panel: product rule, geometric decomposition, quotient rule, power rule |
| `chain-rule-composition.png` | Two-panel: input-through-$g$-through-$f$ flow with derivative scaling annotations |
| `higher-order-derivatives.png` | Three-panel: $f$, $f'$, $f''$ for $x^3 - 3x$ showing concavity |
| `non-differentiable-functions.png` | Four-panel: corner, cusp, vertical tangent, Weierstrass function (partial sum) |
| `backprop-chain-rule.png` | Computation graph with forward and backward pass annotations |
| `numerical-differentiation.png` | Two-panel: error vs. $h$ (forward/central/Richardson) + optimal $h$ identification |

All images referenced in MDX with:

```mdx
![Secant lines approaching tangent](/images/topics/derivative/secant-to-tangent.png)
```

---

## 10. Testing Checklist

### Topic content

- [ ] Topic page renders at `/topics/derivative`
- [ ] Title, subtitle, difficulty badge ("foundational"), reading time display correctly
- [ ] Abstract renders in the info box
- [ ] Prerequisites section shows links to `sequences-limits` and `epsilon-delta`
- [ ] formalML forward links box renders with badges (gradient-descent, shannon-entropy, smooth-manifolds)
- [ ] All TheoremBlocks render KaTeX correctly (3 definitions, 6 theorems, 6 examples, 5 remarks)
- [ ] All proofs display with ∎ tombstone
- [ ] Static images load from `public/images/topics/derivative/`
- [ ] All internal cross-references to `sequences-limits` and `epsilon-delta` resolve (not 404)

### Viz components

- [ ] `SecantToTangentExplorer` loads on scroll (`client:visible`)
- [ ] `SecantToTangentExplorer` $h$ slider animates secant → tangent smoothly
- [ ] `SecantToTangentExplorer` function preset dropdown works for all 5 presets
- [ ] `SecantToTangentExplorer` point $a$ slider repositions base point
- [ ] `SecantToTangentExplorer` "Play" auto-animation works
- [ ] `SecantToTangentExplorer` numerical readout updates in real time
- [ ] `LinearApproximationExplorer` draggable point repositions tangent
- [ ] `LinearApproximationExplorer` zoom button magnifies neighborhood
- [ ] `LinearApproximationExplorer` error panel shows $|f - T|$ vs. distance
- [ ] `DifferentiabilityExplorer` all four tabs render and switch
- [ ] `DifferentiabilityExplorer` zoom on corner tab shows non-smoothing behavior
- [ ] `DifferentiabilityExplorer` $h$ slider shows disagreeing slopes at corners
- [ ] `ChainRuleCompositionExplorer` two-panel layout renders
- [ ] `ChainRuleCompositionExplorer` $x$ slider updates both panels and flow
- [ ] `ChainRuleCompositionExplorer` derivative readout shows product correctly
- [ ] `BackpropGraphExplorer` forward/backward toggle works
- [ ] `BackpropGraphExplorer` sliders ($w$, $b$, $x$, $y$) update graph values
- [ ] `BackpropGraphExplorer` gradient annotations match hand-computed values

### Cross-references

- [ ] Links to `sequences-limits` and `epsilon-delta` work (resolve to published pages)
- [ ] `sequences-limits.mdx` updated: derivative forward reference is now a live link (if applicable)
- [ ] `epsilon-delta.mdx` updated: derivative forward reference is now a live link (if applicable)
- [ ] All other forward references use plain text + "(coming soon)"
- [ ] All formalml.com links open in a new tab with `target="_blank" rel="noopener"`

### Infrastructure

- [ ] `differentiation.ts` shared module compiles with no TypeScript errors
- [ ] `derivative-data.ts` data module compiles
- [ ] No modifications to `limits.ts` (backward compatibility preserved)
- [ ] Page is responsive (viz components stack vertically on mobile)
- [ ] "Foundational" difficulty badge is styled correctly (green)
- [ ] Curriculum graph shows `derivative` as "published" (not "coming soon")
- [ ] Pagefind indexes the new topic on rebuild
- [ ] Build succeeds with zero errors: `pnpm build`

---

## 11. Build Order

1. **Create `src/components/viz/shared/differentiation.ts`** — the new shared utility module. Implement `computeSecant`, `computeTangent`, `forwardDifference`, `centralDifference`, `richardsonExtrapolation`, `checkDifferentiability`, `evaluateChainRule`, `generateDerivativeCurve`, `weierstrass`, `seededRandom`. Write console log tests to verify. This module is used by all viz components in this topic.
2. **Create `src/data/derivative-data.ts`** — function presets, chain rule presets, activation presets, Weierstrass parameters, differentiability presets. Verify exports compile.
3. **Create `derivative.mdx`** with full frontmatter and all markdown/LaTeX content. Use `TheoremBlock` for all formal elements (3 definitions, 6 theorems, 6 examples, 5 remarks, proofs). No interactive components yet — just the prose and static images.
4. Copy notebook figures to `public/images/topics/derivative/` and verify they load in the MDX.
5. **Build `SecantToTangentExplorer.tsx`** — the flagship component. Start with the $h$ slider and slope computation, then add function presets, point slider, and auto-play. This is the most important visualization on the page.
6. **Build `LinearApproximationExplorer.tsx`** — draggable point + tangent line + error panel.
7. **Build `DifferentiabilityExplorer.tsx`** — tabbed four-panel component (smooth, corner, cusp, Weierstrass).
8. **Build `ChainRuleCompositionExplorer.tsx`** — two-panel composition flow with derivative multiplication readout.
9. **Build `BackpropGraphExplorer.tsx`** — computation graph with forward/backward pass highlighting.
10. Embed all five components in the MDX at their appropriate section positions with `client:visible`.
11. **Update `sequences-limits.mdx` and `epsilon-delta.mdx`** — Change any forward references to "The Derivative & Chain Rule *(coming soon)*" to live links: `[The Derivative & Chain Rule](/topics/derivative)`.
12. **Update curriculum graph data** — change `derivative` status from `"planned"` to `"published"` in `curriculum-graph.json`. Add node and edges.
13. **Update `curriculum.ts`** — move `"The Derivative & Chain Rule"` from `planned` to `published` in the `single-variable` track.
14. Run topic content and viz checklist (§10).
15. `pnpm build` — verify zero errors.
16. Commit and deploy.

---

## Appendix A: Key Differences from Track 1 Briefs

1. **First topic in a new track.** All four Limits & Continuity topics are live. This topic opens the Single-Variable Calculus track. It has cross-track prerequisites (`sequences-limits` and `epsilon-delta` from Track 1) but no within-track predecessors.
2. **Creates a new shared utility module.** `differentiation.ts` is the Track 2 equivalent of `limits.ts`. It must be designed to be extended by Topics 6–8 (Mean Value/Taylor, Riemann Integral, Improper Integrals). Keep interfaces clean and functions pure.
3. **Five viz components** — matching the Track 1 average. The `SecantToTangentExplorer` is the flagship, paralleling the `EpsilonNExplorer` (Topic 1) and `EpsilonDeltaExplorer` (Topic 2) as the component that immediately conveys the core concept through interaction.
4. **Foundational difficulty with a twist.** The reader has now completed Topics 1–4 and is comfortable with ε-δ proofs and limit arguments. The derivative definition itself is not as conceptually hard as ε-N was in Topic 1 — but the chain rule proof has a genuine subtlety (the $g(a+h) = g(a)$ problem) that must be addressed carefully, not swept under the rug.
5. **The ML connection is exceptionally strong.** Backpropagation *is* the chain rule. This is the most direct calculus → ML bridge in the entire formalCalculus curriculum. The "Connections to ML" section (§9) should be the most substantial of any topic so far — it earns its length because the connection is not just motivational but *structural*: the chain rule does not merely "appear in" ML, it *is* the computational engine.
6. **New track = verify track rendering.** The curriculum page must show "The Derivative & Chain Rule" as published within the Single-Variable Calculus track, with the remaining three topics still "coming soon." Verify that the Track 2 header and track navigation render correctly.

---

## Appendix B: Formal Element Inventory

| Type | # | Title |
|------|---|-------|
| Definition | 1 | The Derivative |
| Definition | 2 | Left and Right Derivatives |
| Definition | 3 | Higher-Order Derivatives |
| Proposition | 1 | Derivative as Best Linear Approximation |
| Theorem | 1 | Differentiability Implies Continuity |
| Theorem | 2 | Sum Rule |
| Theorem | 3 | Constant Multiple Rule |
| Theorem | 4 | Product Rule (Leibniz Rule) |
| Theorem | 5 | Quotient Rule |
| Theorem | 6 | The Chain Rule |
| Example | 1 | Derivative of $x^2$ at $a=3$ from the definition |
| Example | 2 | Derivative of $\sqrt{x}$ from the definition |
| Example | 3 | $f(x) = |x|$ is not differentiable at 0 |
| Example | 4 | Power rule via binomial theorem |
| Example | 5 | Chain rule: $\frac{d}{dx}\sin(x^2)$ |
| Example | 6 | Three-layer chain rule: $\frac{d}{dx}e^{\sin(x^2)}$ |
| Remark | 1 | Linear maps preview (derivative as scalar → Jacobian as matrix) |
| Remark | 2 | The converse is false (continuity ⇏ differentiability) |
| Remark | 3 | The chain rule as composition of linear maps (functoriality preview) |
| Remark | 4 | Concavity and the second derivative (Hessian preview) |
| Remark | 5 | Non-differentiability in ML (ReLU kinks, measure zero) |
| Proof | — | 5 proofs total (Theorem 1, Theorem 2, Theorem 4, Theorem 5, Theorem 6) |

---

*Brief version: v1 | Created: 2026-03-30 | Author: Jonathan Rocha*  
*Reference notebook: `notebooks/derivative/05_derivative_chain_rule.ipynb`*  
*Reference doc: `docs/plans/formalcalculus-handoff-reference.md`*
