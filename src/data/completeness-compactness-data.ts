/**
 * Data presets for Completeness & Compactness (Topic 3) visualizations.
 * All functions are pure — no Math.random().
 */

import { seededRandom } from '../components/viz/shared/limits';

// ── Set Presets (SequentialCompactnessExplorer) ─────────────

export interface SetPreset {
  name: string;
  label: string;
  isCompact: boolean;
  isClosed: boolean;
  isBounded: boolean;
  domain: [number, number];
  contains: (x: number) => boolean;
  sampleSequence: (n: number, rng: () => number) => number;
  escapingSequence?: (n: number) => number;
}

export function getSetPresets(): SetPreset[] {
  return [
    {
      name: 'closed-unit',
      label: '[0, 1]',
      isCompact: true,
      isClosed: true,
      isBounded: true,
      domain: [-0.2, 1.2],
      contains: (x) => x >= 0 && x <= 1,
      sampleSequence: (_n, rng) => rng(),
    },
    {
      name: 'open-unit',
      label: '(0, 1)',
      isCompact: false,
      isClosed: false,
      isBounded: true,
      domain: [-0.2, 1.2],
      contains: (x) => x > 0 && x < 1,
      sampleSequence: (_n, rng) => {
        const v = rng();
        return 0.01 + v * 0.98; // stay away from endpoints
      },
      escapingSequence: (n) => 1 / (n + 1), // converges to 0, which is NOT in (0,1)
    },
    {
      name: 'half-line',
      label: '[0, ∞)',
      isCompact: false,
      isClosed: true,
      isBounded: false,
      domain: [-0.5, 12],
      contains: (x) => x >= 0,
      sampleSequence: (_n, rng) => rng() * 10,
      escapingSequence: (n) => n + 1, // diverges to ∞
    },
    {
      name: 'disconnected',
      label: '[0, 1] ∪ [2, 3]',
      isCompact: true,
      isClosed: true,
      isBounded: true,
      domain: [-0.3, 3.3],
      contains: (x) => (x >= 0 && x <= 1) || (x >= 2 && x <= 3),
      sampleSequence: (_n, rng) => {
        const v = rng();
        return v < 0.5 ? v * 2 : 2 + (v - 0.5) * 2; // map [0,0.5)→[0,1], [0.5,1)→[2,3]
      },
    },
  ];
}

// ── Bisection Targets (NestedIntervalExplorer) ──────────────

export interface BisectionTarget {
  name: string;
  label: string;
  value: number;
  interval: [number, number];
  checkFn: (mid: number) => 'left' | 'right';
}

export function getBisectionTargets(): BisectionTarget[] {
  return [
    {
      name: 'sqrt2',
      label: '√2 ≈ 1.41421',
      value: Math.SQRT2,
      interval: [1, 2],
      checkFn: (mid) => mid * mid < 2 ? 'right' : 'left',
    },
    {
      name: 'pi',
      label: 'π ≈ 3.14159',
      value: Math.PI,
      interval: [3, 4],
      checkFn: (mid) => mid < Math.PI ? 'right' : 'left',
    },
    {
      name: 'e',
      label: 'e ≈ 2.71828',
      value: Math.E,
      interval: [2, 3],
      checkFn: (mid) => mid < Math.E ? 'right' : 'left',
    },
  ];
}

// ── Compact Continuous Presets (CompactContinuousExplorer) ───

export interface CompactContinuousPreset {
  name: string;
  label: string;
  fn: (x: number) => number;
  compactDomain: [number, number];
  nonCompactDomain: [number, number];
  nonCompactType: 'open' | 'unbounded';
  hasMaxOnCompact: boolean;
  hasMaxOnNonCompact: boolean;
}

export function getCompactContinuousPresets(): CompactContinuousPreset[] {
  return [
    {
      name: 'quadratic',
      label: 'x² − x',
      fn: (x) => x * x - x,
      compactDomain: [-1, 2],
      nonCompactDomain: [-1, 2],
      nonCompactType: 'open',
      hasMaxOnCompact: true,
      hasMaxOnNonCompact: true, // max is in interior for this one
    },
    {
      name: 'reciprocal',
      label: '1/x',
      fn: (x) => 1 / x,
      compactDomain: [0.5, 3],
      nonCompactDomain: [0.01, 3],
      nonCompactType: 'open',
      hasMaxOnCompact: true,
      hasMaxOnNonCompact: false, // blows up near 0
    },
    {
      name: 'sin-x',
      label: 'sin(x)/x',
      fn: (x) => x === 0 ? 1 : Math.sin(x) / x,
      compactDomain: [-4 * Math.PI, 4 * Math.PI],
      nonCompactDomain: [-50, 50],
      nonCompactType: 'unbounded',
      hasMaxOnCompact: true,
      hasMaxOnNonCompact: true, // max is at x=0, in the interior
    },
    {
      name: 'exponential-decay',
      label: 'e^(−x²)',
      fn: (x) => Math.exp(-x * x),
      compactDomain: [-3, 3],
      nonCompactDomain: [-10, 10],
      nonCompactType: 'unbounded',
      hasMaxOnCompact: true,
      hasMaxOnNonCompact: true, // max at x=0
    },
    {
      name: 'boundary-max',
      label: 'x · sin(1/x)',
      fn: (x) => x === 0 ? 0 : x * Math.sin(1 / x),
      compactDomain: [0.01, 1],
      nonCompactDomain: [0.001, 1],
      nonCompactType: 'open',
      hasMaxOnCompact: true,
      hasMaxOnNonCompact: false, // increasingly wild oscillation near 0
    },
  ];
}

// ── Open Cover Generation (HeineBorelExplorer) ──────────────

export interface CoverInterval {
  id: number;
  left: number;
  right: number;
  selected: boolean;
}

/**
 * Generate a random open cover for a set contained in [setLeft, setRight].
 * For compact sets, the cover is guaranteed to actually cover the set.
 * Uses seeded randomness for reproducibility.
 */
export function generateOpenCover(
  setLeft: number,
  setRight: number,
  isCompact: boolean,
  seed: number,
  count: number = 12,
): CoverInterval[] {
  const rng = seededRandom(seed);
  const width = setRight - setLeft;
  const intervals: CoverInterval[] = [];

  if (isCompact) {
    // For [a, b]: generate overlapping intervals that cover [a, b]
    // Start with a guaranteed covering, then add some extra intervals
    const stepSize = width / (count * 0.6);
    let cursor = setLeft - stepSize * 0.3;

    for (let i = 0; i < count; i++) {
      const intervalWidth = stepSize * (0.8 + rng() * 0.8);
      const left = cursor - rng() * stepSize * 0.2;
      const right = left + intervalWidth;
      intervals.push({ id: i, left, right, selected: false });
      cursor += stepSize * (0.5 + rng() * 0.4);
    }
  } else {
    // For (a, b): generate intervals of the form (1/n, 1-1/n) type pattern
    // that cover most of the set but require infinitely many to cover all
    for (let i = 0; i < count; i++) {
      const shrink = 1 / (i + 2);
      const left = setLeft + shrink * width * (0.3 + rng() * 0.4);
      const intervalWidth = width * (0.1 + rng() * 0.2);
      intervals.push({ id: i, left, right: left + intervalWidth, selected: false });
    }
  }

  return intervals;
}

/**
 * Check whether selected intervals from a cover actually cover the set [setLeft, setRight].
 * Returns the coverage fraction and any uncovered gaps.
 */
export function checkCoverage(
  setLeft: number,
  setRight: number,
  intervals: CoverInterval[],
  samplePoints: number = 500,
): { covered: boolean; coverageFraction: number; uncoveredPoints: number[] } {
  const selected = intervals.filter(iv => iv.selected);
  const step = (setRight - setLeft) / samplePoints;
  const uncoveredPoints: number[] = [];
  let coveredCount = 0;

  for (let i = 0; i <= samplePoints; i++) {
    const x = setLeft + step * i;
    const isCovered = selected.some(iv => x > iv.left && x < iv.right);
    if (isCovered) {
      coveredCount++;
    } else {
      uncoveredPoints.push(x);
    }
  }

  return {
    covered: uncoveredPoints.length === 0,
    coverageFraction: coveredCount / (samplePoints + 1),
    uncoveredPoints: uncoveredPoints.slice(0, 20), // limit for display
  };
}

/**
 * Find a minimal finite subcover from the given intervals for [setLeft, setRight].
 * Uses a greedy algorithm: always pick the interval that extends coverage the most.
 */
export function findMinimalSubcover(
  setLeft: number,
  setRight: number,
  intervals: CoverInterval[],
): number[] | null {
  const sorted = [...intervals].sort((a, b) => a.left - b.left);
  const selectedIds: number[] = [];
  let cursor = setLeft;

  while (cursor < setRight) {
    // Find the interval that starts before cursor and extends the furthest right
    let bestIdx = -1;
    let bestRight = cursor;

    for (const iv of sorted) {
      if (iv.left < cursor + 1e-10 && iv.right > bestRight) {
        bestIdx = iv.id;
        bestRight = iv.right;
      }
    }

    if (bestIdx === -1 || bestRight <= cursor + 1e-10) {
      // Can't extend coverage — no finite subcover exists
      return null;
    }

    selectedIds.push(bestIdx);
    cursor = bestRight;
  }

  return selectedIds;
}
