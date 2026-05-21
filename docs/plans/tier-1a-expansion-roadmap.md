# formalCalculus — Tier 1A Expansion Roadmap

> **Status:** Open. Last updated: 2026-05-20.
> **Companion roadmaps:** `~/Developer/Sites/formalStatistics/docs/plans/tier-1a-expansion-roadmap.md`, `~/Developer/Sites/formalML/docs/plans/tier-1a-expansion-roadmap.md`.
> **Source of gap list:** `~/Developer/Sites/formalML/docs/plans/cross-site-audit-report.md` "Deferred reciprocals" section (regen via `pnpm audit:cross-site`).

## Context

After the slug-normalization sweep (PR #38, fml #102, fs #40) + Path A reciprocal back-pointers (PR #38), the triad audit is fully reciprocity-clean: 0 missing, 0 slug drift, 0 direction mismatches. The 25 remaining **deferred** entries point at genuinely-missing topics — content gaps, not naming mismatches.

This roadmap enumerates the fc-side gaps (5 unique missing target slugs, 6 inbound cross-site edges) in priority order, with scope notes and downstream-unlock implications.

The next phase per missing topic follows the project's standard **two-deliverables workflow**: a chat brainstorming session produces (handoff brief, verified notebook), then a Claude Code session ships the topic. The per-topic chat brief is NOT this roadmap — this roadmap is the meta-plan that decides which topic to brainstorm next.

## Priority order

### 1. `convex-optimization` (2 inbound — highest leverage)

**Inbound:** `formalStatistics/regularization-and-penalized-estimation` (KKT subgradient calculus, soft-thresholding from convex optimality, ISTA/FISTA convergence). `formalML/high-dimensional-regression` (same KKT + proximal-method substrate, lasso convergence analysis).

**Scope (lightweight):** Convex sets and functions, subdifferential calculus for non-smooth convex functions, KKT optimality conditions for constrained problems, Lagrangian duality (weak and strong), first-order methods (gradient descent on smooth convex with O(1/k), subgradient methods, accelerated gradient with O(1/k²)), proximal operators and proximal gradient methods (ISTA / FISTA), basic convergence-rate analysis.

**Why ship first:** Two strong cross-site pulls; the only fc topic with multiple downstream consumers waiting on it. Foundational for all of regularization theory, sparse methods, modern ML optimization. Removes "TODO see convex-opt" markers in 2 currently-shipped sister topics.

**Suggested curriculum position:** Track 6 (Functional Analysis) adjacent to `calculus-of-variations`, after `hilbert-spaces`. Difficulty: advanced.

### 2. `eigenvalues-eigenvectors` (1 inbound — high leverage for the LA gap)

**Inbound:** `formalStatistics/multivariate-distributions` (spectral decomposition $\boldsymbol\Sigma = \mathbf{Q}\boldsymbol\Lambda\mathbf{Q}^\top$ as the principal-axes geometry of MVN, PCA mathematical core).

**Scope (lightweight):** Eigenvalue / eigenvector definition $Av = \lambda v$, characteristic polynomial, diagonalizability and similarity, spectral theorem for symmetric matrices (real eigenvalues + orthogonal eigenvectors), positive-(semi)definite matrices and quadratic forms, Rayleigh quotient and Courant–Fischer, geometric interpretation of eigenvalues as variances along principal axes.

**Why ship:** fc's current LA-adjacent topic `linear-systems` is ODE-motivated (matrix exponential, dynamics). There's no foundational pure-spectral-theory topic. Adding this would centralize the spectral-method substrate that recurs across PCA, SVD, kernel methods, GNN spectral methods, Cholesky decomposition — currently each fml/fs topic re-derives or hand-waves the eigenvalue setup. 1 cited inbound but many implicit downstream uses.

**Suggested curriculum position:** Track 2 (Single-Variable adjacency) or new linear-algebra track depending on appetite. After `hessian` (Hessian eigenvalues need this), before `hilbert-spaces` (Hilbert geometry needs spectral theory). Difficulty: intermediate.

### 3. `probability-and-union-bound` (1 inbound — foundational probability gap)

**Inbound:** `formalStatistics/multiple-testing-and-false-discovery` (Bonferroni proof uses the union bound; the FWER control argument is built on union bounds and inclusion-exclusion).

**Scope (lightweight):** Kolmogorov axioms (in concrete terms; the measure-theoretic version lives in `sigma-algebras` already), conditional probability, independence, the union bound (Boole's inequality), Bonferroni inequality, inclusion-exclusion principle for finite events, Borel–Cantelli lemmas (I and II), introductory probability inequalities (Markov, Chebyshev as lead-ins).

**Why ship:** fc has measure-theoretic-probability foundations in `sigma-algebras` and `radon-nikodym`, but no **introductory** probability topic that students can use without committing to measure theory. Filling this gap also creates a natural on-ramp to fml/`concentration-inequalities` (which currently jumps straight to sub-Gaussian / sub-exponential bounds).

**Suggested curriculum position:** Track 5 (Measure & Integration) before `sigma-algebras`, OR a new dedicated probability track. Difficulty: foundational.

### 4. `linear-algebra` (1 inbound — broad foundational impact)

**Inbound:** `formalStatistics/method-of-moments` (sandwich variance $A^{-1}BA^{-1\top}$, positive-definiteness of sample-moment covariance, quadratic-form positivity).

**Scope (lightweight):** Vector spaces, linear independence, bases and dimension, linear maps, matrix operations (multiplication, transpose, inverse), rank-nullity theorem, determinant (geometric interpretation: signed volume scaling), change of basis. **Excludes** spectral theory (→ topic #2 above).

**Why ship:** Same gap as #2 from a different angle — fc lacks a foundational LA topic. This sub-topic (vectors + maps + matrix algebra) is prereq for `eigenvalues-eigenvectors`. Could be shipped TOGETHER with #2 as a 2-part LA shipment, or as a single broader topic.

**Caveat:** Scope might partially overlap with `linear-systems` (which covers matrix exponential and ODE-relevant LA). If shipped, might trigger repositioning of `linear-systems` as "ODEs on linear systems" with the foundational LA hoisted out.

**Suggested curriculum position:** Earliest in any LA chain. Difficulty: foundational.

### 5. `induction` (1 inbound — lowest priority, narrow scope)

**Inbound:** `formalStatistics/multiple-testing-and-false-discovery` (Holm's procedure proof uses induction on the number of rejections $r$).

**Scope (lightweight):** Weak and strong mathematical induction, well-ordering principle, structural induction, recursion. Applications in elementary number theory and combinatorics.

**Why DEFER:** fc is a calculus / analysis site, not a discrete-math site. The single inbound use (Holm's proof) can be done with explicit recursion phrased as "iterating the Bonferroni bound" without invoking formal induction. Adding `induction` to fc would expand the curriculum scope significantly for ~1 downstream cite.

**Recommendation:** Mark as deferred indefinitely OR add as a brief appendix-style topic only if other discrete-math gaps emerge later.

## Cross-site downstream — what shipping each unlocks

| Shipping... | Triggers reciprocal additions on... | Removes deferred entries |
|---|---|---|
| `convex-optimization` | fs/regularization-and-penalized-estimation, fml/high-dimensional-regression | 2 |
| `eigenvalues-eigenvectors` | fs/multivariate-distributions | 1 |
| `probability-and-union-bound` | fs/multiple-testing-and-false-discovery | 1 |
| `linear-algebra` | fs/method-of-moments | 1 |
| `induction` | fs/multiple-testing-and-false-discovery | 1 |

Each shipment runs `pnpm audit:cross-site` after merging; the deferred-reciprocals.md auto-discharges the now-resolved entries via the self-healing pattern documented in CLAUDE.md.

## Recommended sequencing

1. **`convex-optimization` first** — highest leverage (2 inbound), strongest curriculum fit (Track 6, sibling of `calculus-of-variations`).
2. **`eigenvalues-eigenvectors`** next — fills the LA gap, centralizes spectral-method substrate.
3. **`probability-and-union-bound`** — fills the probability foundations gap.
4. **`linear-algebra`** — could be shipped paired with or before #2 (as a 2-part LA shipment) depending on scope appetite.
5. **`induction`** — defer indefinitely.

## Next steps when picking up a topic

Each topic ship follows the standard **two-deliverables** workflow:

1. **Chat brainstorming session** (claude.ai) using `~/Developer/Sites/formalCalculus/docs/plans/Claude Chat Starter Prompt — formalCalculus Topic Pre-Brief Drafting Template.md` (if extracted; otherwise adapt the formalML equivalent). Produces (handoff brief, verified notebook).
2. **Claude Code session** using the formalCalculus implementation starter prompt. Ships brief + notebook to the live site.

When a topic ships:
- Add MDX file to `src/content/topics/`
- Update `src/data/curriculum-graph.json` and `src/data/curriculum.ts`
- Re-run `pnpm audit:cross-site` (from formalML) to confirm reciprocal discharge
- Add the topic's row to any tracked content-metrics spreadsheet (if formalCalculus has one)

## Track placement decision (2026-05-20)

Decided during the pre-topic scaffolding session (PR: `tier-1a-prep`). The 4 high-leverage topics are assigned curriculum positions as follows:

- **New Linear Algebra track** (between `odes` and `measure-integration`): hosts `linear-algebra` then `eigenvalues-eigenvectors`. Rationale: fc currently lacks a foundational pure-LA topic. Centralizing the spectral-method substrate here (rather than hoisting it into `multivar-differential` or `functional-analysis`) creates clean room for future LA topics (SVD, Cholesky, matrix calculus) and keeps the prerequisite DAG readable.
- **New Probability Foundations track** (between `linear-algebra` and `measure-integration`): hosts `probability-and-union-bound`. Rationale: fc's existing probability foundations are measure-theoretic (`sigma-algebras`, `radon-nikodym`); there is no concrete-probability on-ramp. Slotting this track immediately before `measure-integration` makes the "discrete-probability → measure-theoretic" handoff visible in the curriculum page.
- **`convex-optimization` joins existing Functional Analysis track**: added as `planned: ['Convex Optimization']` on `functional-analysis`. Rationale: per roadmap "adjacent to `calculus-of-variations`, after `hilbert-spaces`" — Hilbert spaces are the natural setting for the geometric arguments behind first-order methods, projections, and duality.
- **`induction` deferred indefinitely**: per the roadmap's standalone recommendation. Single downstream cite (Holm's procedure) can be handled via "iterating the Bonferroni bound" phrasing without invoking formal induction; expanding scope into discrete math for one cite is not warranted.

Final track ordering (10 tracks, 32 published topics, 4 planned):

| # | Track | Published | Planned |
|---|---|---|---|
| 1 | Limits & Continuity | 4 | 0 |
| 2 | Single-Variable Calculus | 4 | 0 |
| 3 | Multivariable Differential | 4 | 0 |
| 4 | Multivariable Integral | 4 | 0 |
| 5 | Sequences, Series & Approximation | 4 | 0 |
| 6 | Ordinary Differential Equations | 4 | 0 |
| 7 | **Linear Algebra** *(new)* | 0 | 2 |
| 8 | **Probability Foundations** *(new)* | 0 | 1 |
| 9 | Measure & Integration | 4 | 0 |
| 10 | Functional Analysis Essentials | 4 | 1 |

Color assignments for the new tracks: teal `#0D9488` (Linear Algebra), fuchsia `#C026D3` (Probability Foundations).
