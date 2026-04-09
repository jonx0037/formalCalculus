/**
 * Data presets and scenario definitions for the Normed & Banach Spaces
 * topic (Topic 30).
 *
 * All functions are pure and deterministic — no Math.random().
 * Follows the lazy-getter pattern of `metric-spaces-data.ts`:
 * getters compute on demand when viz components call them.
 * Module-level constants (e.g. rotation matrix entries via
 * Math.cos/Math.sin) are small deterministic evaluations.
 *
 * Three viz components consume this module:
 *  - `OperatorNormExplorer`    — via `getMatrixPreset(id)`
 *  - `BaireCategoryExplorer`   — via `getBaireScenario(id)`
 *  - `DualSpaceExplorer`       — uses shared/functional-analysis.ts directly
 */

// ── Matrix presets for OperatorNormExplorer ───────────────────

/** A preset 2×2 matrix scenario for the OperatorNormExplorer. */
export interface MatrixPreset {
  /** Stable string id — matches the dropdown option value. */
  id: string;
  /** Reader-facing label. */
  label: string;
  /** The 2×2 matrix entries [a11, a12, a21, a22]. */
  entries: [number, number, number, number];
  /** One-line description for the info panel. */
  description: string;
}

const MATRIX_PRESETS: Record<string, MatrixPreset> = {
  identity: {
    id: 'identity',
    label: 'Identity',
    entries: [1, 0, 0, 1],
    description: 'The identity maps the unit ball to itself. Operator norm = 1, both singular values = 1.',
  },
  rotation: {
    id: 'rotation',
    label: 'Rotation (30°)',
    entries: [
      Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6),
      Math.sin(Math.PI / 6), Math.cos(Math.PI / 6),
    ],
    description: 'Rotation by 30°. Preserves the ℓ² norm (orthogonal matrix), so ‖R‖₂ = 1. Distorts ℓ¹ and ℓ∞ balls.',
  },
  shear: {
    id: 'shear',
    label: 'Shear',
    entries: [1, 1, 0, 1],
    description: 'Horizontal shear. Singular values differ — the shear stretches along one direction while preserving the other.',
  },
  projection: {
    id: 'projection',
    label: 'Projection',
    entries: [1, 0, 0, 0],
    description: 'Orthogonal projection onto the x-axis. Rank 1: σ₁ = 1, σ₂ = 0. The image of any unit ball is a line segment.',
  },
  singular: {
    id: 'singular',
    label: 'Anisotropic',
    entries: [2, 1, 0, 1],
    description: 'An upper-triangular matrix with distinct singular values. Shows how the operator norm captures the worst-case stretch.',
  },
};

/**
 * Get a matrix preset by id.
 * Falls back to the "singular" preset (the default) for unknown ids.
 */
export function getMatrixPreset(presetId: string): MatrixPreset {
  return MATRIX_PRESETS[presetId] ?? MATRIX_PRESETS['singular'];
}

/** All available matrix preset ids, in display order. */
export const MATRIX_PRESET_IDS = [
  'identity',
  'rotation',
  'shear',
  'projection',
  'singular',
] as const;
export type MatrixPresetId = (typeof MATRIX_PRESET_IDS)[number];

// ── Baire category scenarios for BaireCategoryExplorer ────────

/** A scenario for the Baire Category Explorer. */
export interface BaireScenario {
  /** Stable string id. */
  id: string;
  /** Reader-facing label. */
  label: string;
  /**
   * Return the n-th nowhere-dense set as a list of intervals within [0, 1].
   * The explorer removes these intervals progressively.
   */
  getNowhereDenseSet: (n: number) => Array<{ start: number; end: number }>;
  /** Whether the underlying space is complete (Baire applies) or not. */
  isComplete: boolean;
  /** One-line description. */
  description: string;
}

/**
 * Generate the n-th Cantor-like nowhere-dense set:
 * thin intervals centered on rationals p/q with small denominators,
 * with widths proportional to ε / q³.
 */
function cantorLikeSet(n: number): Array<{ start: number; end: number }> {
  const epsilon = 0.15 / (n + 1);
  const intervals: Array<{ start: number; end: number }> = [];
  // Enumerate rationals p/q in (0, 1) with denominator ≤ n + 2
  const maxDenom = n + 2;
  for (let q = 1; q <= maxDenom; q++) {
    for (let p = 1; p < q; p++) {
      if (gcd(p, q) !== 1) continue;
      const center = p / q;
      const halfWidth = epsilon / (q * q * q);
      intervals.push({
        start: Math.max(0, center - halfWidth),
        end: Math.min(1, center + halfWidth),
      });
    }
  }
  return mergeIntervals(intervals);
}

/**
 * Generate the n-th "rationals" nowhere-dense set:
 * singletons at rationals with small denominators (widened slightly for visibility).
 */
function rationalsSet(n: number): Array<{ start: number; end: number }> {
  const intervals: Array<{ start: number; end: number }> = [];
  const maxDenom = n + 1;
  const displayWidth = 0.003; // thin visible strip
  for (let q = 1; q <= maxDenom; q++) {
    for (let p = 0; p <= q; p++) {
      if (gcd(p, q) !== 1 && !(p === 0 && q === 1)) continue;
      const center = p / q;
      intervals.push({
        start: Math.max(0, center - displayWidth),
        end: Math.min(1, center + displayWidth),
      });
    }
  }
  return mergeIntervals(intervals);
}

/** Euclidean gcd. */
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b > 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Merge overlapping intervals, sorted by start. */
function mergeIntervals(
  intervals: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

const BAIRE_SCENARIOS: Record<string, BaireScenario> = {
  'cantor-like': {
    id: 'cantor-like',
    label: 'Cantor-like (ℝ, complete)',
    getNowhereDenseSet: cantorLikeSet,
    isComplete: true,
    description:
      'Remove thin intervals around rationals in [0,1] ⊂ ℝ. By Baire, the residual set is dense — the intersection of the complements is never empty.',
  },
  rationals: {
    id: 'rationals',
    label: 'ℚ is meager (incomplete)',
    getNowhereDenseSet: rationalsSet,
    isComplete: false,
    description:
      'ℚ = ∪{q}: each singleton is nowhere dense. ℚ is meager in itself — Baire fails because ℚ is not complete.',
  },
};

/**
 * Get a Baire scenario by id.
 * Falls back to "cantor-like" for unknown ids.
 */
export function getBaireScenario(scenarioId: string): BaireScenario {
  return BAIRE_SCENARIOS[scenarioId] ?? BAIRE_SCENARIOS['cantor-like'];
}

export const BAIRE_SCENARIO_IDS = ['cantor-like', 'rationals'] as const;
export type BaireScenarioId = (typeof BAIRE_SCENARIO_IDS)[number];

// ── Nested ball computation for BaireCategoryExplorer ─────────

export interface NestedBall {
  center: number;
  radius: number;
}

/**
 * Compute the nested ball sequence from the Baire Category proof.
 *
 * Given a list of nowhere-dense sets (as removed intervals), construct
 * closed balls B(x_n, r_n) with r_n < 1/n such that each ball lies
 * inside the previous ball and inside the complement of the n-th set.
 *
 * @param removedSets — the nowhere-dense sets removed at each step
 * @param maxBalls — maximum number of nested balls to compute
 */
export function computeNestedBalls(
  removedSets: Array<Array<{ start: number; end: number }>>,
  maxBalls: number = 20,
): NestedBall[] {
  const balls: NestedBall[] = [];
  let lo = 0;
  let hi = 1;

  for (let n = 0; n < Math.min(removedSets.length, maxBalls); n++) {
    const rMax = 1 / (n + 1);
    const removed = removedSets[n];

    // Find a subinterval of [lo, hi] that avoids all removed intervals
    // and has radius < rMax
    const gaps = computeGaps(removed, lo, hi);
    if (gaps.length === 0) break;

    // Pick the widest gap (deterministic choice)
    let bestGap = gaps[0];
    for (const gap of gaps) {
      if (gap.end - gap.start > bestGap.end - bestGap.start) {
        bestGap = gap;
      }
    }

    const center = (bestGap.start + bestGap.end) / 2;
    const maxR = Math.min(
      rMax,
      (bestGap.end - bestGap.start) / 2,
      (hi - lo) / 2,
    );
    const radius = maxR * 0.8; // slightly smaller for safety

    if (radius < 1e-10) break;

    balls.push({ center, radius });
    lo = center - radius;
    hi = center + radius;
  }

  return balls;
}

/** Compute the gaps (intervals not covered) within [lo, hi]. */
function computeGaps(
  removed: Array<{ start: number; end: number }>,
  lo: number,
  hi: number,
): Array<{ start: number; end: number }> {
  const gaps: Array<{ start: number; end: number }> = [];
  const clipped = removed
    .map((iv) => ({
      start: Math.max(iv.start, lo),
      end: Math.min(iv.end, hi),
    }))
    .filter((iv) => iv.start < iv.end)
    .sort((a, b) => a.start - b.start);

  let cursor = lo;
  for (const iv of clipped) {
    if (iv.start > cursor) {
      gaps.push({ start: cursor, end: iv.start });
    }
    cursor = Math.max(cursor, iv.end);
  }
  if (cursor < hi) {
    gaps.push({ start: cursor, end: hi });
  }
  return gaps;
}
