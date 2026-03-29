# formalCalculus

**The calculus and analysis foundations behind modern machine learning.**

Deep-dive explainers combining rigorous mathematics, interactive visualizations, and working code. The prequel to [formalML](https://formalml.com) — building the calculus machinery that ML assumes you already have.

[www.formalcalculus.com](https://www.formalcalculus.com)

---

## What This Is

formalCalculus is a curated collection of long-form explainers on the calculus and analysis foundations that modern ML relies on. Every topic receives a three-pillar treatment:

1. **Rigorous exposition** — Formal definitions, theorems, and proofs presented with full mathematical detail. Every epsilon-delta argument is expanded. Every inequality chain is justified.
2. **Interactive visualization** — Embedded widgets that let you manipulate parameters and watch the math come alive (e.g., drag an epsilon band to watch the delta band respond, slide a partition count to watch Riemann sums converge, animate secant lines into tangent lines).
3. **Working code** — Production-oriented Python implementations you can run immediately, with bridges to NumPy, SciPy, and standard scientific computing libraries.

The site exists because the gap between "I took Calc I–III" and "I understand why gradient descent converges" is wider than it needs to be.

### Relationship to formalML

formalCalculus is the **prequel**. Where formalML covers the mathematical machinery *of* machine learning (topology, optimization, information theory, category theory), formalCalculus covers the calculus and analysis that those topics *assume*. The two sites share an editorial voice, tech stack, and design philosophy, but are independent projects.

Every formalCalculus topic includes forward links to the formalML topics it enables, so you always know where the math leads.

## Curriculum

32 topics across 8 tracks, progressing from foundational single-variable calculus through the analysis that directly feeds into graduate-level ML theory.

### Track 1: Limits & Continuity

| Topic | Level | Description |
|-------|-------|-------------|
| Sequences, Limits & Convergence | Foundational | The rigorous foundation — epsilon-N definitions, convergence tests, subsequences |
| Epsilon-Delta & Continuity | Foundational | Making "arbitrarily close" precise — the definition that makes calculus rigorous |
| Completeness & Compactness | Intermediate | Why ℝ is special — Bolzano-Weierstrass, Heine-Borel, the completeness axiom |
| Uniform Convergence | Intermediate | When you can interchange limits — pointwise vs. uniform, continuity preservation |

### Track 2: Single-Variable Calculus

| Topic | Level | Description |
|-------|-------|-------------|
| The Derivative & Chain Rule | Foundational | Rates of change as linear approximation — the chain rule as composition of linear maps |
| Mean Value Theorem & Taylor Expansion | Intermediate | Local approximation theory — why Taylor series work and when they don't |
| The Riemann Integral & FTC | Foundational | Area as a limit of sums — the Fundamental Theorem connecting differentiation and integration |
| Improper Integrals & Special Functions | Intermediate | Gamma, Beta, Gaussian integral — the functions that appear everywhere in probability and ML |

### Track 3: Multivariable Differential Calculus

| Topic | Level | Description |
|-------|-------|-------------|
| Partial Derivatives & the Gradient | Foundational | Directional derivatives, steepest ascent — the geometric engine of optimization |
| The Jacobian & Multivariate Chain Rule | Intermediate | Derivatives as linear maps between ℝⁿ — the backbone of backpropagation |
| The Hessian & Second-Order Analysis | Intermediate | Curvature of loss surfaces — saddle points, convexity, Newton's method foundations |
| Inverse & Implicit Function Theorems | Advanced | When you can solve for variables locally — manifold structure, constraint surfaces |

### Track 4: Multivariable Integral Calculus

| Topic | Level | Description |
|-------|-------|-------------|
| Multiple Integrals & Fubini's Theorem | Intermediate | Iterated integration — computing marginal and joint densities |
| Change of Variables | Intermediate | The Jacobian determinant — polar, spherical, and general coordinate transformations |
| Line Integrals & Conservative Fields | Intermediate | Path integrals and potential functions — work, circulation, exact forms |
| Surface Integrals & the Divergence Theorem | Advanced | Flux, Gauss and Stokes theorems — differential forms preview |

### Track 5: Sequences, Series & Approximation

| Topic | Level | Description |
|-------|-------|-------------|
| Series Convergence & Tests | Foundational | Absolute and conditional convergence — ratio, root, comparison, integral tests |
| Power Series & Taylor Series | Intermediate | Radius of convergence, analytic functions — the backbone of local approximation |
| Fourier Series & Orthogonal Expansions | Intermediate | Periodic decomposition, L² convergence — signal processing foundations |
| Approximation Theory | Advanced | Weierstrass, Stone-Weierstrass — why neural networks can approximate anything |

### Track 6: Ordinary Differential Equations

| Topic | Level | Description |
|-------|-------|-------------|
| First-Order ODEs & Existence Theorems | Foundational | Separable and linear equations — Picard-Lindelöf existence and uniqueness |
| Linear Systems & Matrix Exponential | Intermediate | Systems of ODEs, eigenvalue methods — state-space models, dynamical systems |
| Stability & Dynamical Systems | Intermediate | Phase portraits, Lyapunov stability — convergence of iterative algorithms |
| Numerical Methods for ODEs | Intermediate | Euler, Runge-Kutta, adaptive stepping — neural ODE foundations |

### Track 7: Measure & Integration

| Topic | Level | Description |
|-------|-------|-------------|
| Sigma-Algebras & Measures | Advanced | Measurable spaces, Borel sets — the framework for rigorous probability |
| The Lebesgue Integral | Advanced | Construction and convergence theorems — dominated convergence, Fatou's lemma |
| Lp Spaces | Advanced | Function spaces with norms — completeness, Hölder and Minkowski inequalities |
| Radon-Nikodym & Probability Densities | Advanced | Absolutely continuous measures — densities as measure derivatives |

### Track 8: Functional Analysis Essentials

| Topic | Level | Description |
|-------|-------|-------------|
| Metric Spaces & Topology | Intermediate | Open sets, completeness, contraction mapping — fixed-point iteration |
| Normed & Banach Spaces | Advanced | Complete normed spaces, bounded operators — infinite-dimensional optimization |
| Inner Product & Hilbert Spaces | Advanced | Orthogonality, projections, Riesz representation — kernel methods, RKHS foundations |
| Calculus of Variations | Advanced | Functionals and Euler-Lagrange — the optimization framework behind physics and ML |

### Forward Links to formalML

Every track connects forward to specific formalML topics:

| formalCalculus Track | Enables (on formalml.com) |
|---------------------|--------------------------|
| Limits & Continuity | Convex Analysis, Measure-Theoretic Probability |
| Single-Variable Calculus | Shannon Entropy, Gradient Descent |
| Multivariable Differential | Gradient Descent, Smooth Manifolds, Information Geometry |
| Multivariable Integral | Measure-Theoretic Probability, Bayesian Nonparametrics |
| Series & Approximation | PAC Learning, Rate-Distortion Theory |
| ODEs | Random Walks, Gradient Descent convergence analysis |
| Measure & Integration | Measure-Theoretic Probability, Concentration Inequalities |
| Functional Analysis | Spectral Theorem, Riemannian Geometry, Sheaf Theory |

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | [Astro](https://astro.build) (static site generation) |
| Content | MDX with KaTeX for math rendering |
| Styling | Tailwind CSS |
| Visualizations | React 19 + D3.js (interactive components) |
| Search | [Pagefind](https://pagefind.app) (static search) |
| Package manager | pnpm |
| Hosting | Vercel |

## Project Structure

```
├── src/
│   ├── pages/              # Astro page routes
│   ├── content/
│   │   └── topics/         # MDX topic files
│   ├── components/
│   │   ├── ui/             # Astro UI components (Nav, TopicCard, etc.)
│   │   └── viz/            # React + D3 visualization components
│   │       └── shared/     # Shared types, color scales, hooks, utility modules
│   ├── layouts/            # Page layout templates
│   ├── data/               # Curriculum graph data, sample datasets
│   ├── lib/                # Utility modules
│   └── styles/             # Global CSS, design tokens
├── public/                 # Static assets
├── docs/plans/             # Planning & handoff documents
├── notebooks/              # Research notebooks (Jupyter)
├── astro.config.mjs        # Astro configuration
├── package.json
└── tsconfig.json
```

## Local Development

```bash
# Install dependencies
pnpm install

# Start dev server (localhost:4321)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Author

**Jonathan Rocha** — Data scientist and researcher. MS Data Science (SMU), MA English (Texas A&M University-Central Texas), BA History (Texas A&M University). Research interests: time-series data mining, topology-aware deep learning.

- GitHub: [@jonx0037](https://github.com/jonx0037)
- Consultancy: [DataSalt LLC](https://datasalt.ai)
- Sister project: [formalML](https://formalml.com)

## License

All rights reserved.
