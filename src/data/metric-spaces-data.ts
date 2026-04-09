/**
 * Data presets and scenario definitions for the Metric Spaces & Topology
 * topic (Topic 29).
 *
 * All functions are pure and deterministic — no Math.random(), no
 * module-level computation. Follows the lazy-getter pattern of
 * `lp-spaces-data.ts`: getters compute on demand when viz components call
 * them, so a stale hot-reload never holds a cached result and the bundle
 * never ships precomputed arrays.
 *
 * This module intentionally does NOT extend any `shared/` module. Metric-
 * space helpers here are pedagogical (contraction iteration, MDP setup),
 * not building blocks later topics will reuse. Topic 30 (Banach Spaces)
 * will introduce its own `shared/functional-analysis.ts` if it needs one.
 *
 * Two viz components consume this module:
 *  - `MetricContractionExplorer`  — via `getContractionScenario(id)`
 *  - `BellmanIterationExplorer`    — via `getBellmanScenario(id)`
 *
 * `CompactnessCounterexampleExplorer` does NOT consume this module — its
 * sin(nπx) family is computed inline from `n` (no data needed).
 */

// ── Contraction-mapping scenarios ──────────────────────────

/**
 * A scenario for the `MetricContractionExplorer` flagship viz.
 *
 * Each scenario bundles:
 *  - a contraction map `T: ℝⁿ → ℝⁿ` parameterized by the Lipschitz
 *    constant `k` (the viz's slider),
 *  - a way to compute the exact fixed point `x*` at any `k` (so the
 *    viz can display `d(x_n, x*)` without numerical drift),
 *  - a default starting point for the iteration,
 *  - viewport bounds, and
 *  - a one-line pedagogical note.
 */
export interface ContractionScenario {
  /** Stable string id — matches the dropdown option value. */
  id: string;
  /** Reader-facing label (no `$` delimiters — plain text). */
  label: string;
  /**
   * The contraction map. Takes the current point and the Lipschitz
   * constant `k`. Returns the next point. For 1D cobweb scenarios the
   * input and output arrays have length 1; for 2D planar scenarios both
   * have length 2.
   */
  map: (point: number[], k: number) => number[];
  /**
   * Compute the exact fixed point `x*` at the given `k`. For the
   * `rotation-scale` scenario this is a closed-form 2×2 matrix inverse;
   * for the `nonlinear` and `picard-cobweb` scenarios it runs an inner
   * fixed-point iteration from a deterministic seed (NOT the user's `x₀`),
   * which converges for all `k` the slider can produce.
   */
  fixedPoint: (k: number) => number[];
  /** Default starting point for the iteration when the scenario is selected. */
  defaultStart: number[];
  /** Visualization bounds. */
  domain: { xMin: number; xMax: number; yMin: number; yMax: number };
  /** True for 1D cobweb scenarios, false for 2D planar scenarios. */
  is1D: boolean;
  /** One-line pedagogical note displayed in the info panel. */
  description: string;
}

/** Angle (radians) used by the `rotation-scale` scenario. 30° = π/6. */
const ROTATION_ANGLE = Math.PI / 6;

/** Translation vector used by the `rotation-scale` scenario. */
const ROTATION_OFFSET: readonly [number, number] = [0.5, 0.3];

/**
 * Deterministic fixed-point finder for 1D scalar equations `x = g(x)`.
 * Used by the `nonlinear` (which decouples into two 1D problems) and
 * `picard-cobweb` scenarios. Starts from `x0 = 0` and iterates up to
 * `maxIter` times with tolerance `tol`. Returns the last iterate even
 * if the tolerance is not met — the caller is responsible for knowing
 * when convergence is guaranteed (`k < 1` is always safe here).
 */
function solveScalarFixedPoint(
  g: (x: number) => number,
  maxIter: number = 500,
  tol: number = 1e-14,
): number {
  let x = 0;
  for (let i = 0; i < maxIter; i++) {
    const next = g(x);
    if (Math.abs(next - x) < tol) return next;
    x = next;
  }
  return x;
}

/**
 * Look up a contraction scenario by id. Unknown ids fall back to
 * `rotation-scale` (the default flagship scenario).
 *
 * @param scenarioId — one of `"rotation-scale"`, `"nonlinear"`, `"picard-cobweb"`
 */
export function getContractionScenario(scenarioId: string): ContractionScenario {
  switch (scenarioId) {
    case 'nonlinear':
      return {
        id: 'nonlinear',
        label: 'Nonlinear (2D)',
        map: (point, k) => {
          const [x, y] = point;
          return [k * Math.sin(x) + 0.3, k * Math.cos(y) - 0.2];
        },
        fixedPoint: (k) => {
          // The map decouples: x* solves x = k sin(x) + 0.3 and
          // y* solves y = k cos(y) - 0.2. Each is a 1D fixed point.
          const xStar = solveScalarFixedPoint((x) => k * Math.sin(x) + 0.3);
          const yStar = solveScalarFixedPoint((y) => k * Math.cos(y) - 0.2);
          return [xStar, yStar];
        },
        defaultStart: [-1.2, 1.5],
        domain: { xMin: -2, xMax: 2, yMin: -2, yMax: 2 },
        is1D: false,
        description:
          'A smooth, separable nonlinear map. Lipschitz constant is bounded by k, so k < 1 guarantees convergence.',
      };

    case 'picard-cobweb':
      return {
        id: 'picard-cobweb',
        label: 'Picard-style 1D (cobweb)',
        map: (point, k) => [k * Math.cos(point[0])],
        fixedPoint: (k) => [solveScalarFixedPoint((x) => k * Math.cos(x))],
        defaultStart: [0.1],
        domain: { xMin: -0.3, xMax: 1.5, yMin: -0.3, yMax: 1.5 },
        is1D: true,
        description:
          'The classic cobweb for T(x) = k cos(x). At k = 1 the fixed point is the Dottie number ≈ 0.7391.',
      };

    case 'rotation-scale':
    default:
      return {
        id: 'rotation-scale',
        label: 'Rotation + scale (2D)',
        map: (point, k) => {
          const [x, y] = point;
          const c = Math.cos(ROTATION_ANGLE);
          const s = Math.sin(ROTATION_ANGLE);
          // T(x, y) = k · Rθ · (x, y) + c
          return [
            k * (c * x - s * y) + ROTATION_OFFSET[0],
            k * (s * x + c * y) + ROTATION_OFFSET[1],
          ];
        },
        fixedPoint: (k) => {
          // Fixed point solves (I − k·Rθ)·x* = c_offset.
          // I − k·Rθ = [[1 − k cos θ,  k sin θ], [−k sin θ, 1 − k cos θ]]
          // det = (1 − k cos θ)² + (k sin θ)²
          //     = (k − cos θ)² + sin²θ  ≥  sin²(π/6) = 0.25 > 0  for all real k.
          // The determinant is always strictly positive, so the inverse exists.
          const c = Math.cos(ROTATION_ANGLE);
          const s = Math.sin(ROTATION_ANGLE);
          const a = 1 - k * c;
          const b = k * s;
          const det = a * a + b * b;
          // Inverse of [[a, b], [−b, a]] is (1/det) · [[a, −b], [b, a]].
          return [
            (a * ROTATION_OFFSET[0] - b * ROTATION_OFFSET[1]) / det,
            (b * ROTATION_OFFSET[0] + a * ROTATION_OFFSET[1]) / det,
          ];
        },
        defaultStart: [-1.3, 1.3],
        domain: { xMin: -1.8, xMax: 1.8, yMin: -1.8, yMax: 1.8 },
        is1D: false,
        description:
          'An affine map T(x) = k·Rθ·x + c with θ = 30°. Operator norm of k·Rθ is exactly k.',
      };
  }
}

// ── Bellman-iteration scenario ─────────────────────────────

/**
 * A scenario for the `BellmanIterationExplorer` viz. Encodes a finite
 * Markov Decision Process (MDP) so the viz can apply the Bellman
 * optimality operator `(T* V)(s) = max_a [R(s,a) + γ · Σ_s' P(s'|s,a) · V(s')]`
 * to any initial value function.
 *
 * Only one scenario is currently defined: `three-state-mdp`. The
 * transition probabilities and rewards are hand-crafted so that the
 * optimal policy is non-trivial (it is NOT "always stay" or "always
 * move") — this avoids a trivial viz where the greedy action at every
 * state is obvious from inspection.
 */
export interface BellmanScenario {
  /** Stable id. */
  id: string;
  /** Reader-facing label. */
  label: string;
  /** State names, e.g. `["A", "B", "C"]`. */
  states: string[];
  /** Action names, e.g. `["stay", "move"]`. */
  actions: string[];
  /**
   * `transitions[s][a]` is a length-`|states|` probability vector summing to 1,
   * giving `P(s' | s, a)` for every next state `s'`.
   */
  transitions: number[][][];
  /** `rewards[s][a]` is the scalar immediate reward for taking action `a` in state `s`. */
  rewards: number[][];
  /** Default discount factor γ ∈ [0, 1). */
  defaultGamma: number;
  /** One-line pedagogical note. */
  description: string;
}

/**
 * Look up a Bellman scenario by id. Unknown ids fall back to
 * `three-state-mdp`.
 *
 * @param scenarioId — currently only `"three-state-mdp"` is defined
 */
export function getBellmanScenario(scenarioId: string): BellmanScenario {
  switch (scenarioId) {
    case 'three-state-mdp':
    default:
      return {
        id: 'three-state-mdp',
        label: 'Three-state MDP',
        states: ['A', 'B', 'C'],
        actions: ['stay', 'move'],
        // transitions[s][a] = [P(A), P(B), P(C)] for taking action a in state s.
        transitions: [
          // State A
          [
            [0.9, 0.1, 0.0], // stay: mostly stay in A
            [0.2, 0.6, 0.2], // move: mostly go to B
          ],
          // State B
          [
            [0.1, 0.8, 0.1], // stay: mostly stay in B
            [0.1, 0.2, 0.7], // move: mostly go to C
          ],
          // State C
          [
            [0.0, 0.1, 0.9], // stay: mostly stay in C (the reward-rich state)
            [0.3, 0.3, 0.4], // move: scatter back
          ],
        ],
        // rewards[s][a]: C is the goal (big reward for staying there),
        // A has a small reward for staying, B rewards nothing.
        rewards: [
          [1, 0], // A: stay=1, move=0
          [0, 0], // B: stay=0, move=0
          [10, 2], // C: stay=10, move=2
        ],
        defaultGamma: 0.9,
        description:
          'Three states with two actions each. C is the reward-rich absorbing-ish state; the optimal policy is "move toward C then stay".',
      };
  }
}
