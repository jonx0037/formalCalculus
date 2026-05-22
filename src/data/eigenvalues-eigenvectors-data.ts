/**
 * Data presets for Topic 34 (Eigenvalues & Eigenvectors) viz components.
 *
 * Lazy-getter pattern matching `linear-algebra-data.ts`: getters build their
 * preset arrays on demand when viz components call them, so hot reloads never
 * hold stale cached arrays and the bundle never ships precomputed data.
 *
 * Consumed by:
 *  - `EigenvectorExplorer`              — via `getEigenvalueMatrixPresets()`
 *  - `CharacteristicPolynomialVisualizer` — via `getEigenvalueMatrixPresets()`
 *  - `DiagonalizationExplorer`          — via `getEigenvalueMatrixPresets()` (diagonalizable subset)
 *  - `SpectralDecompositionVisualizer`  — via `getQuadraticFormPresets()`
 *  - `QuadraticFormVisualizer`          — via `getQuadraticFormPresets()`
 *  - `RayleighQuotientExplorer`         — via `getRayleighPresets()`
 *
 * Precomputed eigenvalues, condition numbers, and eigenvector angles are
 * stored alongside each matrix for cross-checking against the runtime
 * computations from `shared/linearAlgebra.ts`. Eigenvalue values match those
 * produced by `np.linalg.eig` / `np.linalg.eigh` in the research notebook
 * `notebooks/eigenvalues-eigenvectors/34_eigenvalues_eigenvectors.ipynb`.
 */

// ── EigenvalueMatrixPreset ──────────────────────────────────

/**
 * A named matrix consumed by `EigenvectorExplorer`,
 * `CharacteristicPolynomialVisualizer`, and (when diagonalizable)
 * `DiagonalizationExplorer`. The `eigenvalues` field is precomputed for
 * display readouts; viz components should still call the utility module's
 * `eigenvalues2x2` / `eigenvalues3x3` to recompute live, but the preset's
 * values are the source of truth for "what should appear" in tests.
 */
export interface EigenvalueMatrixPreset {
  id: string;
  label: string;
  /** 2×2 or 3×3 real matrix. */
  matrix: number[][];
  classification:
    | 'distinct-real'
    | 'distinct-real-3d'
    | 'repeated-diagonalizable'
    | 'repeated-defective'
    | 'complex-pair'
    | 'scalar'
    | 'symmetric-positive-definite'
    | 'symmetric-indefinite'
    | 'symmetric-rank-deficient';
  /** Eigenvalues in the canonical { real, imag } form (matches utility output). */
  eigenvalues: { real: number[]; imag: number[] };
  description: string;
  tags: string[];
}

/**
 * Curated eigenvalue-matrix presets covering every classification in the
 * pedagogical zoo. ≥10 entries per brief §5.
 */
export function getEigenvalueMatrixPresets(): EigenvalueMatrixPreset[] {
  return [
    {
      id: 'identity-2d',
      label: 'Identity (2D)',
      matrix: [
        [1, 0],
        [0, 1],
      ],
      classification: 'scalar',
      eigenvalues: { real: [1, 1], imag: [0, 0] },
      description:
        'The identity matrix: every direction is an eigenvector with eigenvalue 1. The eigenspace E_1 is all of ℝ². A degenerate but important case.',
      tags: ['scalar', '2d', 'isotropic'],
    },
    {
      id: 'diag-2-half',
      label: 'diag(2, ½) — two distinct real',
      matrix: [
        [2, 0],
        [0, 0.5],
      ],
      classification: 'distinct-real',
      eigenvalues: { real: [2, 0.5], imag: [0, 0] },
      description:
        'A diagonal matrix with two distinct positive eigenvalues. The standard basis is already an eigenbasis: e₁ is stretched by 2, e₂ is compressed by ½.',
      tags: ['diagonal', '2d', 'distinct-real'],
    },
    {
      id: 'distinct-2d',
      label: 'A = [[4, −2], [1, 1]] — Example 7',
      matrix: [
        [4, -2],
        [1, 1],
      ],
      classification: 'distinct-real',
      eigenvalues: { real: [3, 2], imag: [0, 0] },
      description:
        'A non-diagonal matrix with two distinct real eigenvalues 3 and 2. Eigenvectors are (2, 1)ᵀ and (1, 1)ᵀ. This is Example 7 of the topic: diagonalizable because the eigenvalues are distinct.',
      tags: ['diagonalizable', '2d', 'distinct-real', 'example-7'],
    },
    {
      id: 'rotation-90',
      label: 'Rotation by 90° — complex pair',
      matrix: [
        [0, -1],
        [1, 0],
      ],
      classification: 'complex-pair',
      eigenvalues: { real: [0, 0], imag: [1, -1] },
      description:
        'A 90° rotation has no real invariant directions: every nonzero vector is rotated, never merely scaled. Over ℂ the eigenvalues are ±i with eigenvectors (1, ∓i)ᵀ. Complex eigenvalues mean a rotational component.',
      tags: ['rotation', '2d', 'complex', 'no-real-eigenvectors'],
    },
    {
      id: 'defective-jordan',
      label: 'Defective J₂ = [[2, 1], [0, 2]]',
      matrix: [
        [2, 1],
        [0, 2],
      ],
      classification: 'repeated-defective',
      eigenvalues: { real: [2, 2], imag: [0, 0] },
      description:
        'A Jordan block. Eigenvalue λ = 2 has algebraic multiplicity 2 but geometric multiplicity 1 — the eigenspace is only the x-axis. This matrix is defective and cannot be diagonalized.',
      tags: ['defective', '2d', 'jordan-block', 'repeated'],
    },
    {
      id: 'scalar-2I',
      label: '2I — repeated, diagonalizable',
      matrix: [
        [2, 0],
        [0, 2],
      ],
      classification: 'scalar',
      eigenvalues: { real: [2, 2], imag: [0, 0] },
      description:
        'The scalar matrix 2I has eigenvalue 2 with algebraic multiplicity 2 and geometric multiplicity 2 — every direction is an eigenvector. Compare with the defective Jordan block above to see what "repeated but diagonalizable" means.',
      tags: ['scalar', '2d', 'repeated', 'isotropic'],
    },
    {
      id: 'symmetric-pd',
      label: 'Symmetric PD [[2, 1], [1, 2]]',
      matrix: [
        [2, 1],
        [1, 2],
      ],
      classification: 'symmetric-positive-definite',
      eigenvalues: { real: [3, 1], imag: [0, 0] },
      description:
        'A real symmetric positive-definite matrix. Eigenvalues 3 and 1 are real; eigenvectors (1, 1)ᵀ/√2 and (1, −1)ᵀ/√2 are orthogonal. The spectral theorem A = QΛQᵀ holds in closed form.',
      tags: ['symmetric', '2d', 'positive-definite'],
    },
    {
      id: 'symmetric-indefinite',
      label: 'Symmetric indefinite [[1, 2], [2, 1]]',
      matrix: [
        [1, 2],
        [2, 1],
      ],
      classification: 'symmetric-indefinite',
      eigenvalues: { real: [3, -1], imag: [0, 0] },
      description:
        'A symmetric indefinite matrix. Eigenvalues 3 and −1 have opposite signs — the quadratic form xᵀAx is a saddle. Eigenvectors are still orthogonal (spectral theorem doesn\'t need definiteness).',
      tags: ['symmetric', '2d', 'indefinite', 'saddle'],
    },
    {
      id: 'symmetric-rank-deficient',
      label: 'Symmetric rank-1 [[4, 2], [2, 1]]',
      matrix: [
        [4, 2],
        [2, 1],
      ],
      classification: 'symmetric-rank-deficient',
      eigenvalues: { real: [5, 0], imag: [0, 0] },
      description:
        'Symmetric positive-semidefinite with rank 1. Eigenvalues 5 and 0 — the quadratic form xᵀAx is a parallel-trough surface, not a bowl. The null space (eigenspace for 0) is one-dimensional.',
      tags: ['symmetric', '2d', 'positive-semidefinite', 'rank-deficient'],
    },
    {
      id: 'diag-3d-distinct',
      label: 'diag(2, 3, 5) — three distinct real (3D)',
      matrix: [
        [2, 0, 0],
        [0, 3, 0],
        [0, 0, 5],
      ],
      classification: 'distinct-real-3d',
      eigenvalues: { real: [5, 3, 2], imag: [0, 0, 0] },
      description:
        'A 3×3 diagonal matrix with three distinct positive eigenvalues. The standard basis is an eigenbasis. Useful for the diagonalization explorer\'s 3D mode.',
      tags: ['diagonal', '3d', 'distinct-real'],
    },
    {
      id: 'symmetric-3d-tridiag',
      label: 'Symmetric tridiagonal (3D)',
      matrix: [
        [2, 1, 0],
        [1, 2, 1],
        [0, 1, 2],
      ],
      classification: 'symmetric-positive-definite',
      eigenvalues: { real: [2 + Math.SQRT2, 2, 2 - Math.SQRT2], imag: [0, 0, 0] },
      description:
        '3×3 symmetric tridiagonal matrix with eigenvalues 2 + √2, 2, 2 − √2. Positive-definite. Mirrors the finite-difference second-derivative operator — the prototype Hessian of a 1D quadratic loss.',
      tags: ['symmetric', '3d', 'tridiagonal', 'positive-definite'],
    },
  ];
}

// ── QuadraticFormPreset ─────────────────────────────────────

/**
 * A named symmetric 2×2 matrix for `SpectralDecompositionVisualizer` and
 * `QuadraticFormVisualizer`. The `geometryDescription` field describes the
 * level-set topology in plain language ("elongated bowl", "saddle").
 */
export interface QuadraticFormPreset {
  id: string;
  label: string;
  /** 2×2 symmetric matrix. */
  matrix: [[number, number], [number, number]];
  definiteness:
    | 'positive-definite'
    | 'positive-semidefinite'
    | 'indefinite'
    | 'negative-definite'
    | 'negative-semidefinite';
  /** Eigenvalues sorted non-increasingly. */
  eigenvalues: [number, number];
  /** λ_max / λ_min — null when the smaller eigenvalue is 0 (degenerate). */
  conditionNumber: number | null;
  description: string;
  geometryDescription: string;
}

/**
 * Curated symmetric 2×2 presets, ≥6 covering each definiteness class.
 */
export function getQuadraticFormPresets(): QuadraticFormPreset[] {
  return [
    {
      id: 'isotropic',
      label: 'Isotropic — identity',
      matrix: [
        [1, 0],
        [0, 1],
      ],
      definiteness: 'positive-definite',
      eigenvalues: [1, 1],
      conditionNumber: 1,
      description:
        'The identity. The quadratic form xᵀIx = ‖x‖² has circular level sets. Eigenvalues coincide and every direction is principal — the most symmetric case.',
      geometryDescription: 'circular contours (sphere → sphere)',
    },
    {
      id: 'elongated',
      label: 'Elongated bowl (κ = 5)',
      matrix: [
        [5, 0],
        [0, 1],
      ],
      definiteness: 'positive-definite',
      eigenvalues: [5, 1],
      conditionNumber: 5,
      description:
        'A positive-definite diagonal matrix with eigenvalues 5 and 1. The level sets {xᵀAx = c} are ellipses with semi-axis lengths √(c/5) and √c — a 1:√5 aspect ratio. Condition number κ = 5 means gradient descent is moderately anisotropic here.',
      geometryDescription: 'elliptical contours, semi-axes 1 : √5',
    },
    {
      id: 'rotated-elongated',
      label: 'Rotated elongated (κ ≈ 9)',
      matrix: [
        [3, 2],
        [2, 3],
      ],
      definiteness: 'positive-definite',
      eigenvalues: [5, 1],
      conditionNumber: 5,
      description:
        'Eigenvalues 5 and 1, but the principal axes are now rotated 45° (eigenvectors (1, 1)ᵀ/√2 and (1, −1)ᵀ/√2). Same level-set shape as the elongated preset, rotated.',
      geometryDescription: 'rotated elliptical contours, 45° axes',
    },
    {
      id: 'rank-deficient',
      label: 'Degenerate (κ = ∞)',
      matrix: [
        [1, 0],
        [0, 0],
      ],
      definiteness: 'positive-semidefinite',
      eigenvalues: [1, 0],
      conditionNumber: null,
      description:
        'Positive-semidefinite with one zero eigenvalue. The quadratic form xᵀAx = x₁² depends only on x₁ — level sets are pairs of vertical lines. The y-axis is a "trough" along which the form is flat.',
      geometryDescription: 'parallel-line contours (a trough along the y-axis)',
    },
    {
      id: 'saddle',
      label: 'Saddle — diag(1, −1)',
      matrix: [
        [1, 0],
        [0, -1],
      ],
      definiteness: 'indefinite',
      eigenvalues: [1, -1],
      conditionNumber: -1,
      description:
        'Indefinite: eigenvalues 1 and −1. The quadratic form xᵀAx = x₁² − x₂² is the saddle surface; level sets are hyperbolas. The asymptotes are the eigenvector lines y = ±x.',
      geometryDescription: 'hyperbolic contours, asymptotes y = ±x',
    },
    {
      id: 'inverse-bowl',
      label: 'Inverted bowl — diag(−2, −3)',
      matrix: [
        [-2, 0],
        [0, -3],
      ],
      definiteness: 'negative-definite',
      eigenvalues: [-2, -3],
      conditionNumber: 1.5,
      description:
        'Negative-definite. xᵀAx is a downward-opening paraboloid (dome). Level sets {xᵀAx = c} are ellipses for c < 0, empty for c > 0. The maximum is at the origin.',
      geometryDescription: 'elliptical contours (dome), all negative values',
    },
    {
      id: 'ill-conditioned',
      label: 'Ill-conditioned bowl (κ = 100)',
      matrix: [
        [100, 0],
        [0, 1],
      ],
      definiteness: 'positive-definite',
      eigenvalues: [100, 1],
      conditionNumber: 100,
      description:
        'Highly anisotropic positive-definite matrix. The level sets are needles 1 : 10 aspect ratio. Gradient descent on this quadratic loss zigzags badly; Newton\'s method (which rescales by H⁻¹) converges in one step.',
      geometryDescription: 'extremely elongated ellipses, semi-axes 0.1 : 1',
    },
  ];
}

// ── RayleighPreset ──────────────────────────────────────────

/**
 * A named symmetric 2×2 matrix for `RayleighQuotientExplorer`. Includes the
 * eigenvector angles so the viz can highlight where the Rayleigh quotient
 * reaches its extrema as the user sweeps a probe vector around the unit
 * circle.
 */
export interface RayleighPreset {
  id: string;
  label: string;
  matrix: [[number, number], [number, number]];
  /** Largest eigenvalue. */
  lambdaMax: number;
  /** Smallest eigenvalue. */
  lambdaMin: number;
  /** Angle (radians, in [0, π)) of the eigenvector for λ_max. */
  topEigenvectorAngle: number;
  /** Angle (radians, in [0, π)) of the eigenvector for λ_min. */
  bottomEigenvectorAngle: number;
  description: string;
}

/**
 * Curated symmetric 2×2 presets covering condition numbers from 1 to 100.
 */
export function getRayleighPresets(): RayleighPreset[] {
  return [
    {
      id: 'isotropic',
      label: 'Isotropic (κ = 1)',
      matrix: [
        [2, 0],
        [0, 2],
      ],
      lambdaMax: 2,
      lambdaMin: 2,
      topEigenvectorAngle: 0,
      bottomEigenvectorAngle: Math.PI / 2,
      description:
        'A scalar matrix. The Rayleigh quotient R(x) = 2 for every nonzero x — the unit-circle plot is a constant horizontal line. Every direction is an eigenvector.',
    },
    {
      id: 'moderate',
      label: 'Moderate (κ = 5)',
      matrix: [
        [5, 0],
        [0, 1],
      ],
      lambdaMax: 5,
      lambdaMin: 1,
      topEigenvectorAngle: 0,
      bottomEigenvectorAngle: Math.PI / 2,
      description:
        'Diagonal positive-definite, eigenvalues 5 and 1. R(x) ranges between 1 (at the y-axis) and 5 (at the x-axis). The probe vector\'s angle θ gives R(x) = 5 cos²θ + sin²θ.',
    },
    {
      id: 'rotated',
      label: 'Rotated (κ = 5, axes 45°)',
      matrix: [
        [3, 2],
        [2, 3],
      ],
      lambdaMax: 5,
      lambdaMin: 1,
      topEigenvectorAngle: Math.PI / 4,
      bottomEigenvectorAngle: (3 * Math.PI) / 4,
      description:
        'Same eigenvalues as the moderate preset but rotated. R(x) peaks at θ = 45° (eigenvector (1, 1)ᵀ/√2) and bottoms at θ = 135°. Useful for showing the Rayleigh-quotient plot shifting under rotation.',
    },
    {
      id: 'ill-conditioned',
      label: 'Ill-conditioned (κ = 100)',
      matrix: [
        [100, 0],
        [0, 1],
      ],
      lambdaMax: 100,
      lambdaMin: 1,
      topEigenvectorAngle: 0,
      bottomEigenvectorAngle: Math.PI / 2,
      description:
        'Highly anisotropic. R(x) spans two decades over the unit circle, with a sharp peak at the x-axis. The plot makes vivid why ill-conditioned losses are hard for gradient descent — almost every direction looks like the slow one.',
    },
    {
      id: 'indefinite',
      label: 'Indefinite (saddle)',
      matrix: [
        [1, 0],
        [0, -1],
      ],
      lambdaMax: 1,
      lambdaMin: -1,
      topEigenvectorAngle: 0,
      bottomEigenvectorAngle: Math.PI / 2,
      description:
        'Indefinite matrix with eigenvalues ±1. R(x) crosses zero at θ = 45° and 135° (the asymptotes of the saddle), peaks at θ = 0 (eigenvalue 1), bottoms at θ = π/2 (eigenvalue −1).',
    },
  ];
}
