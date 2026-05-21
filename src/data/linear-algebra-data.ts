/**
 * Data presets for Topic 33 (Linear Algebra) viz components.
 *
 * All functions are pure and deterministic — no Math.random(), no module-
 * level computation. Follows the lazy-getter pattern of
 * `metric-spaces-data.ts`: getters build their preset arrays on demand when
 * viz components call them, so hot reloads never hold stale cached arrays
 * and the bundle never ships precomputed data.
 *
 * Consumed by:
 *  - `BasisExplorer`               — via `getBasisPresets()`
 *  - `LinearMapMatrixBuilder`      — via `getLinearMapPresets()`
 *  - `DeterminantVolumeVisualizer` — via `getDeterminantPresets()`
 *  - `RankNullityVisualizer`       — via `getRankNullityPresets()`
 *
 * Only `getBasisPresets()` is consumed by code shipped in the first vertical
 * slice of Topic 33. The other three getters are populated to the brief's
 * minimum counts so that subsequent sessions can wire up their viz
 * components without touching this file.
 *
 * No dependency on the `shared/linearAlgebra.ts` module — presets are
 * static data, not computed via the utility routines.
 */

// ── BasisPreset ─────────────────────────────────────────────

/**
 * A named basis (or candidate spanning set) for `BasisExplorer` and the
 * 3D-mode placeholder. `ambient` records whether the preset lives in 2D or
 * 3D; `isOrthonormal` is the math fact, not a guess from the numbers.
 */
export interface BasisPreset {
  /** Stable string id — matches the dropdown option value. */
  id: string;
  /** Reader-facing label. */
  label: string;
  /** Each inner array is one vector. Length 2 if ambient = 2, length 3 if ambient = 3. */
  vectors: number[][];
  ambient: 2 | 3;
  /** True iff every pair is orthogonal and every vector has unit norm. */
  isOrthonormal: boolean;
  /** Optional pedagogical note shown in the info panel. */
  notes?: string;
}

/**
 * Curated basis presets for `BasisExplorer`. ≥6 entries per the brief.
 *
 * Pedagogical sequence:
 *   1. Standard 2D — the "boring" baseline showing the e_1, e_2 axes.
 *   2. Tilted 2D   — a 45° rotation; orthonormal but visibly off-axis.
 *   3. Skewed 2D   — non-orthogonal; Gram-Schmidt has something to do here.
 *   4. Dependent 2D — two parallel vectors; rank-deficient by construction.
 *   5. Standard 3D — e_1, e_2, e_3.
 *   6. Skewed 3D    — the basis used in notebook §8 (Gram-Schmidt example).
 */
export function getBasisPresets(): BasisPreset[] {
  return [
    {
      id: 'standard-2d',
      label: 'Standard basis (ℝ²)',
      vectors: [
        [1, 0],
        [0, 1],
      ],
      ambient: 2,
      isOrthonormal: true,
      notes: 'The canonical basis e₁, e₂. Every other 2D basis is a rotation, reflection, or shear of this one.',
    },
    {
      id: 'tilted-2d',
      label: 'Tilted basis (45°)',
      vectors: [
        [Math.SQRT1_2, Math.SQRT1_2],
        [-Math.SQRT1_2, Math.SQRT1_2],
      ],
      ambient: 2,
      isOrthonormal: true,
      notes: 'Orthonormal but rotated 45° from the standard basis. The same plane, a different choice of axes.',
    },
    {
      id: 'skewed-2d',
      label: 'Skewed (non-orthogonal)',
      vectors: [
        [1.5, 0.3],
        [0.4, 1.2],
      ],
      ambient: 2,
      isOrthonormal: false,
      notes: 'Linearly independent but not orthogonal. Gram-Schmidt would orthogonalize this in two steps.',
    },
    {
      id: 'dependent-2d',
      label: 'Linearly dependent',
      vectors: [
        [1, 0.5],
        [-2, -1],
      ],
      ambient: 2,
      isOrthonormal: false,
      notes: 'The second vector is −2× the first. Rank 1, not a basis of ℝ².',
    },
    {
      id: 'standard-3d',
      label: 'Standard basis (ℝ³)',
      vectors: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      ambient: 3,
      isOrthonormal: true,
      notes: 'The canonical basis e₁, e₂, e₃ of ℝ³.',
    },
    {
      id: 'skewed-3d',
      label: 'Skewed basis (ℝ³)',
      vectors: [
        [2.0, 0.5, 0.2],
        [1.0, 1.5, 0.4],
        [0.5, 0.8, 1.6],
      ],
      ambient: 3,
      isOrthonormal: false,
      notes: 'The Gram-Schmidt running example from notebook §8 — independent and visibly skewed.',
    },
    {
      id: 'tilted-3d',
      label: 'Orthonormal non-standard (ℝ³)',
      vectors: [
        [Math.SQRT1_2, Math.SQRT1_2, 0],
        [-Math.SQRT1_2, Math.SQRT1_2, 0],
        [0, 0, 1],
      ],
      ambient: 3,
      isOrthonormal: true,
      notes: 'A rotation of the xy-plane by 45° leaving the z-axis fixed. Orthonormal but not standard.',
    },
  ];
}

// ── LinearMapPreset ─────────────────────────────────────────

/**
 * A named 2×2 linear map for `LinearMapMatrixBuilder`. The matrix is the
 * map's representation in the standard basis; the geometric category
 * classifies what the map does to the unit square.
 */
export interface LinearMapPreset {
  /** Stable string id. */
  id: string;
  /** Reader-facing label. */
  label: string;
  /** 2×2 matrix as a row-major 2D array. */
  matrix: number[][];
  /** One-line description for the info panel. */
  description: string;
  geometricCategory:
    | 'rotation'
    | 'reflection'
    | 'projection'
    | 'scaling'
    | 'shear'
    | 'identity'
    | 'singular';
}

/**
 * Curated linear-map presets for `LinearMapMatrixBuilder`. ≥8 entries per
 * the brief, matching the canonical examples enumerated in §3.4 of the
 * handoff brief plus a few variants.
 *
 * (Consumed in a follow-up session; populated now so the file is complete.)
 */
export function getLinearMapPresets(): LinearMapPreset[] {
  const rot = (deg: number): number[][] => {
    const t = (deg * Math.PI) / 180;
    return [
      [Math.cos(t), -Math.sin(t)],
      [Math.sin(t), Math.cos(t)],
    ];
  };
  return [
    {
      id: 'identity',
      label: 'Identity',
      matrix: [
        [1, 0],
        [0, 1],
      ],
      description: 'The map that does nothing. Every vector is its own image.',
      geometricCategory: 'identity',
    },
    {
      id: 'rotation-30',
      label: 'Rotation by 30°',
      matrix: rot(30),
      description: 'Rotates every vector counter-clockwise by 30°. Lengths and angles preserved.',
      geometricCategory: 'rotation',
    },
    {
      id: 'rotation-90',
      label: 'Rotation by 90°',
      matrix: rot(90),
      description: 'Quarter turn counter-clockwise. e₁ → e₂, e₂ → −e₁.',
      geometricCategory: 'rotation',
    },
    {
      id: 'projection-x',
      label: 'Projection onto x-axis',
      matrix: [
        [1, 0],
        [0, 0],
      ],
      description: 'Drops the y-coordinate. The kernel is the y-axis; the image is the x-axis.',
      geometricCategory: 'projection',
    },
    {
      id: 'projection-diag',
      label: 'Projection onto y = x',
      matrix: [
        [0.5, 0.5],
        [0.5, 0.5],
      ],
      description: 'Sends every vector to its shadow on the diagonal y = x.',
      geometricCategory: 'projection',
    },
    {
      id: 'shear-horizontal',
      label: 'Horizontal shear (k = 1)',
      matrix: [
        [1, 1],
        [0, 1],
      ],
      description: 'Slides horizontal lines sideways by an amount proportional to y.',
      geometricCategory: 'shear',
    },
    {
      id: 'scale-2',
      label: 'Uniform scaling ×2',
      matrix: [
        [2, 0],
        [0, 2],
      ],
      description: 'Doubles every vector. Area of the unit square becomes 4.',
      geometricCategory: 'scaling',
    },
    {
      id: 'reflection-y',
      label: 'Reflection across y-axis',
      matrix: [
        [-1, 0],
        [0, 1],
      ],
      description: 'Negates the x-coordinate. Orientation-reversing; det = −1.',
      geometricCategory: 'reflection',
    },
  ];
}

// ── DeterminantPreset ───────────────────────────────────────

/**
 * A named matrix for `DeterminantVolumeVisualizer`. The expected determinant
 * is stored alongside the columns so the viz can verify its own row-
 * reduction implementation.
 */
export interface DeterminantPreset {
  id: string;
  label: string;
  /** Columns of the matrix (each entry is one column vector). */
  columns: number[][];
  expectedDeterminant: number;
  notes: string;
}

/**
 * Determinant presets. ≥5 entries per the brief, including a singular case
 * and an orientation-reversing case. Consumed in a follow-up session.
 */
export function getDeterminantPresets(): DeterminantPreset[] {
  return [
    {
      id: 'identity-2d',
      label: 'Identity (det = 1)',
      columns: [
        [1, 0],
        [0, 1],
      ],
      expectedDeterminant: 1,
      notes: 'The unit square remains the unit square. Area 1.',
    },
    {
      id: 'scale-2-2d',
      label: '2I (det = 4)',
      columns: [
        [2, 0],
        [0, 2],
      ],
      expectedDeterminant: 4,
      notes: 'Doubling both sides multiplies area by 4.',
    },
    {
      id: 'rotation-2d',
      label: 'Rotation (det = 1)',
      columns: [
        [Math.cos(Math.PI / 5), Math.sin(Math.PI / 5)],
        [-Math.sin(Math.PI / 5), Math.cos(Math.PI / 5)],
      ],
      expectedDeterminant: 1,
      notes: 'Rotations preserve area and orientation. det = +1 always.',
    },
    {
      id: 'reflection-2d',
      label: 'Reflection (det = −1)',
      columns: [
        [1, 0],
        [0, -1],
      ],
      expectedDeterminant: -1,
      notes: 'Orientation-reversing. |det| = 1 but the sign flips.',
    },
    {
      id: 'shear-2d',
      label: 'Shear (det = 1)',
      columns: [
        [1, 0],
        [0.7, 1],
      ],
      expectedDeterminant: 1,
      notes: 'Adding a multiple of one column to another never changes the determinant.',
    },
    {
      id: 'singular-2d',
      label: 'Singular (det = 0)',
      columns: [
        [1, 0.5],
        [2, 1],
      ],
      expectedDeterminant: 0,
      notes: 'The second column is 2× the first — the parallelogram collapses to a line.',
    },
  ];
}

// ── RankNullityPreset ───────────────────────────────────────

/**
 * A named `m × n` matrix with hand-computed rank and nullity for
 * `RankNullityVisualizer`. The shape tuple is `[m, n]`.
 */
export interface RankNullityPreset {
  id: string;
  label: string;
  matrix: number[][];
  rank: number;
  nullity: number;
  /** [rows, columns]. rank + nullity = columns. */
  shape: [number, number];
}

/**
 * Rank-nullity presets. ≥5 entries per the brief. Consumed in a follow-up
 * session.
 */
export function getRankNullityPresets(): RankNullityPreset[] {
  return [
    {
      id: 'full-rank-square',
      label: 'Full-rank 3×3 (rank 3, nullity 0)',
      matrix: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      rank: 3,
      nullity: 0,
      shape: [3, 3],
    },
    {
      id: 'full-rank-tall',
      label: 'Tall 3×2 (rank 2, nullity 0)',
      matrix: [
        [1, 0],
        [0, 1],
        [1, 1],
      ],
      rank: 2,
      nullity: 0,
      shape: [3, 2],
    },
    {
      id: 'full-rank-wide',
      label: 'Wide 2×3 (rank 2, nullity 1)',
      matrix: [
        [1, 0, 1],
        [0, 1, 1],
      ],
      rank: 2,
      nullity: 1,
      shape: [2, 3],
    },
    {
      id: 'rank-deficient-square',
      label: 'Rank-2 3×3 (rank 2, nullity 1)',
      matrix: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      rank: 2,
      nullity: 1,
      shape: [3, 3],
    },
    {
      id: 'rank-one-wide',
      label: 'Rank-1 2×4 (rank 1, nullity 3)',
      matrix: [
        [1, 2, 3, 4],
        [2, 4, 6, 8],
      ],
      rank: 1,
      nullity: 3,
      shape: [2, 4],
    },
  ];
}
