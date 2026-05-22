/**
 * Shared utility module for the Linear Algebra track (Track 9).
 *
 * Created by Topic 33 (linear-algebra).
 * Extended by Topic 34 (eigenvalues-eigenvectors): characteristic polynomial,
 * 2×2 and 3×3 closed-form eigenvalue/eigenvector computation, diagonalization,
 * symmetric/spectral decomposition, quadratic forms, Rayleigh quotient,
 * definiteness classification. For n > 3, eigenvalue routines throw — viz
 * components never exceed 3×3, and a hand-rolled QR pseudo-implementation
 * would inflate the module without serving any reader. Trefethen & Bau is
 * the right place to learn the production numerical theory.
 *
 * All functions are pure and deterministic — no Math.random(), no module-
 * level computation. The module has no D3 or React dependencies, so it can
 * be consumed by both viz components (React) and the build-time checks
 * (Node).
 *
 * Functions operate on plain `number[]` (Vector) and `number[][]` (Matrix)
 * structures to remain interoperable with D3 data binding and the existing
 * viz patterns. There is no `Matrix` class; the type alias is for readability
 * only.
 *
 * Numerical conventions:
 *  - Default rank/independence tolerance: 1e-10.
 *  - Default pivot-zero threshold inside row reduction: 1e-14.
 *  - `determinant` and `rank` share a single Gaussian-elimination engine
 *    with partial pivoting.
 *  - `solve` and `inverse` THROW on singular input; their callers are
 *    responsible for checking invertibility first (`Math.abs(determinant(A))
 *    > tol`, or equivalently `rank(A) === A.length`).
 *  - `gramSchmidt` throws if the input vectors are not linearly independent.
 *  - `normalize` throws on the zero vector.
 *
 * Smoke checks (in JSDoc examples below) verify each routine against a
 * hand-computed value. The full numerical verification of every theorem in
 * Topic 33 lives in `notebooks/linear-algebra/33_linear_algebra.ipynb`.
 */

// ── Types ───────────────────────────────────────────────────

/** A real matrix represented as an array of rows. */
export type Matrix = number[][];

/** A real vector represented as an array of numbers. */
export type Vector = number[];

// ── Vector primitives ───────────────────────────────────────

/**
 * Dot product of two equal-length vectors.
 *
 * @example
 *   dot([1, 2, 3], [4, 5, 6]) // → 32
 */
export function dot(u: Vector, v: Vector): number {
  if (u.length !== v.length) {
    throw new Error(`dot: length mismatch (${u.length} vs ${v.length})`);
  }
  let sum = 0;
  for (let i = 0; i < u.length; i++) sum += u[i] * v[i];
  return sum;
}

/**
 * Euclidean norm √⟨v, v⟩.
 *
 * @example
 *   norm([3, 4]) // → 5
 */
export function norm(v: Vector): number {
  return Math.sqrt(dot(v, v));
}

/** Scale a vector by a scalar. */
export function scale(v: Vector, c: number): Vector {
  return v.map((x) => c * x);
}

/** Add two equal-length vectors. */
export function addVec(u: Vector, v: Vector): Vector {
  if (u.length !== v.length) {
    throw new Error(`addVec: length mismatch (${u.length} vs ${v.length})`);
  }
  return u.map((x, i) => x + v[i]);
}

/** Subtract two equal-length vectors. */
export function subVec(u: Vector, v: Vector): Vector {
  if (u.length !== v.length) {
    throw new Error(`subVec: length mismatch (${u.length} vs ${v.length})`);
  }
  return u.map((x, i) => x - v[i]);
}

/**
 * Normalize a vector to unit length. Throws on the zero vector.
 *
 * @example
 *   normalize([3, 4]) // → [0.6, 0.8]
 */
export function normalize(v: Vector): Vector {
  const n = norm(v);
  if (n < 1e-14) {
    throw new Error('normalize: cannot normalize the zero vector');
  }
  return scale(v, 1 / n);
}

// ── Matrix primitives ───────────────────────────────────────

/**
 * Multiply a matrix (m × n) by a vector (length n). Returns a length-m vector.
 *
 * @example
 *   matVec([[1, 2], [3, 4]], [5, 6]) // → [17, 39]
 */
export function matVec(A: Matrix, v: Vector): Vector {
  const m = A.length;
  if (m === 0) return [];
  const n = A[0].length;
  if (v.length !== n) {
    throw new Error(`matVec: matrix has ${n} cols but vector has length ${v.length}`);
  }
  const result: Vector = new Array(m);
  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += A[i][j] * v[j];
    result[i] = sum;
  }
  return result;
}

/**
 * Multiply two matrices A (m × k) and B (k × n). Returns m × n.
 *
 * @example
 *   matMul([[1, 2], [3, 4]], [[5, 6], [7, 8]]) // → [[19, 22], [43, 50]]
 */
export function matMul(A: Matrix, B: Matrix): Matrix {
  const m = A.length;
  if (m === 0) return [];
  const k = A[0].length;
  if (B.length !== k) {
    throw new Error(`matMul: inner dimension mismatch (A is ${m}x${k}, B has ${B.length} rows)`);
  }
  const n = B[0].length;
  const result: Matrix = [];
  for (let i = 0; i < m; i++) {
    const row: Vector = new Array(n);
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let p = 0; p < k; p++) sum += A[i][p] * B[p][j];
      row[j] = sum;
    }
    result.push(row);
  }
  return result;
}

/** Transpose: rows become columns. */
export function transpose(A: Matrix): Matrix {
  const m = A.length;
  if (m === 0) return [];
  const n = A[0].length;
  const result: Matrix = [];
  for (let j = 0; j < n; j++) {
    const row: Vector = new Array(m);
    for (let i = 0; i < m; i++) row[i] = A[i][j];
    result.push(row);
  }
  return result;
}

/** Identity matrix of size n. */
export function identity(n: number): Matrix {
  const result: Matrix = [];
  for (let i = 0; i < n; i++) {
    const row: Vector = new Array(n).fill(0);
    row[i] = 1;
    result.push(row);
  }
  return result;
}

// ── Solving and decomposition ───────────────────────────────

/**
 * Internal: row-reduce a copy of A to row-echelon form using Gaussian
 * elimination with partial pivoting. Returns the reduced matrix, the sign
 * tracker (±1 per row swap), and the count of pivots found.
 *
 * Tracks `pivotRow` independently of `col` so that a column with all
 * zeros at and below `pivotRow` is correctly skipped without losing the
 * slot for the next column's pivot — e.g. `[[0, 1], [0, 0]]` has rank 1
 * with the pivot at (0, 1), not on the diagonal. A simpler col-based loop
 * would fail to recognize that pivot and report rank 0.
 *
 * Used by `determinant`, `rank`, `solve`, and `inverse`. For square
 * invertible matrices, pivots end up on the diagonal so `determinant`'s
 * diagonal-product computation still works. For singular square matrices,
 * `pivotCount < n` is the detection signal and `determinant` returns 0.
 */
function rowReduceToTriangular(
  A: Matrix,
  tol: number = 1e-14,
): {
  reduced: Matrix;
  sign: number;
  pivotCount: number;
} {
  const m = A.length;
  if (m === 0) return { reduced: [], sign: 1, pivotCount: 0 };
  const n = A[0].length;
  const B: Matrix = A.map((row) => row.slice());
  let sign = 1;
  let pivotRow = 0;
  for (let col = 0; col < n && pivotRow < m; col++) {
    // Partial pivot: find the row at or below `pivotRow` with the largest
    // |entry| in this column.
    let bestRow = pivotRow;
    let pivotMag = Math.abs(B[pivotRow][col]);
    for (let r = pivotRow + 1; r < m; r++) {
      const mag = Math.abs(B[r][col]);
      if (mag > pivotMag) {
        pivotMag = mag;
        bestRow = r;
      }
    }
    if (pivotMag < tol) {
      // No usable pivot in this column — move on without advancing
      // pivotRow, so the next column gets a chance at this row.
      continue;
    }
    if (bestRow !== pivotRow) {
      [B[pivotRow], B[bestRow]] = [B[bestRow], B[pivotRow]];
      sign = -sign;
    }
    // Eliminate below the pivot.
    for (let r = pivotRow + 1; r < m; r++) {
      const factor = B[r][col] / B[pivotRow][col];
      if (factor === 0) continue;
      for (let c = col; c < n; c++) {
        B[r][c] -= factor * B[pivotRow][c];
      }
    }
    pivotRow++;
  }
  return { reduced: B, sign, pivotCount: pivotRow };
}

/**
 * Determinant of a square matrix via Gaussian elimination with partial pivoting.
 * Returns 0 for singular matrices. O(n³) time.
 *
 * @example
 *   determinant([[1, 2], [3, 4]]) // → -2 (within 1e-12)
 *   determinant([[1, 0], [0, 1]]) // → 1
 *   determinant([[1, 2], [2, 4]]) // → 0 (singular)
 */
export function determinant(A: Matrix): number {
  const n = A.length;
  if (n === 0) return 1; // det of the empty matrix is 1 by convention
  if (A.some((row) => row.length !== n)) {
    throw new Error('determinant: matrix must be square');
  }
  const { reduced, sign, pivotCount } = rowReduceToTriangular(A);
  if (pivotCount < n) return 0;
  let det = sign;
  for (let i = 0; i < n; i++) det *= reduced[i][i];
  return det;
}

/**
 * Rank of a matrix via row reduction. Tolerance controls when a pivot is
 * considered zero.
 *
 * @example
 *   rank([[1, 2, 3], [2, 4, 6], [7, 8, 9]]) // → 2 (rows 1 and 2 are parallel)
 *   rank([[1, 0], [0, 1]]) // → 2
 *   rank([[0, 1], [0, 0]]) // → 1 (pivot at (0, 1), not on the diagonal)
 */
export function rank(A: Matrix, tol: number = 1e-10): number {
  if (A.length === 0) return 0;
  const { pivotCount } = rowReduceToTriangular(A, tol);
  return pivotCount;
}

/**
 * Convenience: rank of the matrix whose columns are the given vectors. All
 * input vectors must have the same length.
 */
export function rankFromColumns(columns: Vector[], tol: number = 1e-10): number {
  if (columns.length === 0) return 0;
  const m = columns[0].length;
  if (columns.some((c) => c.length !== m)) {
    throw new Error('rankFromColumns: all input vectors must have the same length');
  }
  // Build the matrix with the given vectors as columns.
  const A: Matrix = [];
  for (let i = 0; i < m; i++) {
    const row: Vector = new Array(columns.length);
    for (let j = 0; j < columns.length; j++) row[j] = columns[j][i];
    A.push(row);
  }
  return rank(A, tol);
}

/**
 * Test whether a set of vectors is linearly independent.
 *
 * @example
 *   isLinearlyIndependent([[1, 0], [0, 1]]) // → true
 *   isLinearlyIndependent([[1, 2], [2, 4]]) // → false
 */
export function isLinearlyIndependent(vectors: Vector[], tol: number = 1e-10): boolean {
  if (vectors.length === 0) return true;
  return rankFromColumns(vectors, tol) === vectors.length;
}

/**
 * Solve Ax = b for a square invertible A via Gaussian elimination with
 * partial pivoting. Throws if A is singular.
 *
 * @example
 *   solve([[2, 1], [1, 3]], [5, 10]) // → [1, 3] (within 1e-12)
 */
export function solve(A: Matrix, b: Vector): Vector {
  const n = A.length;
  if (n === 0) return [];
  if (A.some((row) => row.length !== n)) {
    throw new Error('solve: matrix must be square');
  }
  if (b.length !== n) {
    throw new Error(`solve: right-hand side has length ${b.length}, expected ${n}`);
  }
  // Build the augmented matrix [A | b].
  const aug: Matrix = A.map((row, i) => [...row, b[i]]);
  // Forward elimination with partial pivoting.
  let sign = 1;
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotMag = Math.abs(aug[col][col]);
    for (let r = col + 1; r < n; r++) {
      const mag = Math.abs(aug[r][col]);
      if (mag > pivotMag) {
        pivotMag = mag;
        pivotRow = r;
      }
    }
    if (pivotMag < 1e-12) {
      throw new Error('solve: matrix is singular');
    }
    if (pivotRow !== col) {
      [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
      sign = -sign;
    }
    for (let r = col + 1; r < n; r++) {
      const factor = aug[r][col] / aug[col][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) {
        aug[r][c] -= factor * aug[col][c];
      }
    }
  }
  // Back substitution.
  void sign; // sign isn't needed for the solve, only the determinant
  const x: Vector = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) sum -= aug[i][j] * x[j];
    x[i] = sum / aug[i][i];
  }
  return x;
}

/**
 * Compute the inverse of a square invertible matrix via Gauss-Jordan
 * elimination on [A | I]. Throws if singular.
 *
 * @example
 *   inverse([[2, 0], [0, 4]]) // → [[0.5, 0], [0, 0.25]]
 *   inverse([[1, 2], [3, 4]]) // → [[-2, 1], [1.5, -0.5]]
 */
export function inverse(A: Matrix): Matrix {
  const n = A.length;
  if (n === 0) return [];
  if (A.some((row) => row.length !== n)) {
    throw new Error('inverse: matrix must be square');
  }
  // Augment with the identity.
  const aug: Matrix = A.map((row, i) => {
    const idRow = new Array(n).fill(0);
    idRow[i] = 1;
    return [...row, ...idRow];
  });
  for (let col = 0; col < n; col++) {
    // Partial pivot.
    let pivotRow = col;
    let pivotMag = Math.abs(aug[col][col]);
    for (let r = col + 1; r < n; r++) {
      const mag = Math.abs(aug[r][col]);
      if (mag > pivotMag) {
        pivotMag = mag;
        pivotRow = r;
      }
    }
    if (pivotMag < 1e-12) {
      throw new Error('inverse: matrix is singular');
    }
    if (pivotRow !== col) {
      [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
    }
    // Scale pivot row to make the pivot equal to 1.
    const pivot = aug[col][col];
    for (let c = 0; c < 2 * n; c++) aug[col][c] /= pivot;
    // Eliminate the pivot column from every other row.
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      if (factor === 0) continue;
      for (let c = 0; c < 2 * n; c++) {
        aug[r][c] -= factor * aug[col][c];
      }
    }
  }
  // The right half of the augmented matrix is now A⁻¹.
  return aug.map((row) => row.slice(n));
}

// ── Orthogonalization ───────────────────────────────────────

/**
 * Apply the Gram-Schmidt process to produce an orthonormal set of vectors
 * from a linearly independent input. Returns the orthonormal vectors `Q` in
 * the same order; optionally returns the intermediate non-normalized `u_k`
 * vectors for step-by-step visualization. Throws if the input is dependent.
 *
 * @example
 *   gramSchmidt([[1, 1], [1, 0]]).Q
 *   // → [[0.707..., 0.707...], [0.707..., -0.707...]]
 */
export function gramSchmidt(
  vectors: Vector[],
  options: { returnIntermediate?: boolean } = {},
): { Q: Vector[]; intermediate?: Vector[] } {
  if (vectors.length === 0) {
    return options.returnIntermediate ? { Q: [], intermediate: [] } : { Q: [] };
  }
  const ambient = vectors[0].length;
  if (vectors.some((v) => v.length !== ambient)) {
    throw new Error('gramSchmidt: all input vectors must have the same length');
  }
  const Q: Vector[] = [];
  const intermediate: Vector[] = [];
  for (const v of vectors) {
    let u: Vector = v.slice();
    for (const q of Q) {
      const projCoef = dot(v, q);
      u = subVec(u, scale(q, projCoef));
    }
    intermediate.push(u.slice());
    const n = norm(u);
    if (n < 1e-12) {
      throw new Error('gramSchmidt: input vectors are linearly dependent');
    }
    Q.push(scale(u, 1 / n));
  }
  return options.returnIntermediate ? { Q, intermediate } : { Q };
}

/**
 * Orthogonal projection of `v` onto the span of the given vectors. The basis
 * is orthonormalized internally; if the basis is already orthonormal, the
 * result is `Σ ⟨v, q_i⟩ q_i` directly. Throws if `basis` is dependent.
 */
export function projectOnto(v: Vector, basis: Vector[]): Vector {
  if (basis.length === 0) {
    return new Array(v.length).fill(0);
  }
  const { Q } = gramSchmidt(basis);
  let proj: Vector = new Array(v.length).fill(0);
  for (const q of Q) {
    const coef = dot(v, q);
    proj = addVec(proj, scale(q, coef));
  }
  return proj;
}

// ── Geometric primitives for viz ────────────────────────────

/**
 * Project a 3D vector to a 2D screen plane via a fixed isometric projection.
 * The projection matrix is the standard 30°/30° isometric used by
 * engineering drawings; it preserves equal foreshortening along all three
 * axes. Returns [x_screen, y_screen] with `+x` pointing right and `+y`
 * pointing up (caller flips for SVG `y`-down if needed).
 *
 * The projection is intentionally fixed (not parameterized) — there is no
 * orbit/rotate control. Topic 33's 3D visualizations are diagrammatic, not
 * exploratory.
 */
export function projectToScreen(v: Vector): [number, number] {
  if (v.length !== 3) {
    throw new Error(`projectToScreen: expected length-3 vector, got length ${v.length}`);
  }
  const [x, y, z] = v;
  // Standard isometric: cos 30° ≈ 0.866, sin 30° = 0.5.
  // ys uses `z - s * (x + y)` so that positive z maps to a larger
  // screen-y value (upward, after the yScale flip in consuming components).
  const c = Math.cos(Math.PI / 6);
  const s = Math.sin(Math.PI / 6);
  const xs = c * (x - y);
  const ys = z - s * (x + y);
  return [xs, ys];
}

/**
 * Vertices of the parallelogram spanned by two 2D vectors anchored at the
 * origin. Returned in counter-clockwise order starting at the origin:
 *   0, a, a + b, b
 * Suitable for an SVG `<polygon>` `points` attribute.
 */
export function parallelogramVertices(a: Vector, b: Vector): Vector[] {
  if (a.length !== 2 || b.length !== 2) {
    throw new Error('parallelogramVertices: both inputs must be length-2 vectors');
  }
  return [[0, 0], [a[0], a[1]], [a[0] + b[0], a[1] + b[1]], [b[0], b[1]]];
}

/**
 * Edge list (as pairs of vertex indices into the 8-vertex parallelepiped) for
 * the wireframe of the parallelepiped spanned by three 3D vectors a, b, c.
 *
 * Vertex layout (index in the 8-vertex array):
 *   0: origin
 *   1: a
 *   2: b
 *   3: c
 *   4: a + b
 *   5: a + c
 *   6: b + c
 *   7: a + b + c
 *
 * Returns the 12 edges of the parallelepiped (4 along each of the three
 * directions a, b, c). The caller assembles the actual vertex coordinates by
 * combining its three input vectors with the index pairs returned here.
 */
export function parallelepipedEdges(): [number, number][] {
  return [
    // Along a
    [0, 1], [3, 5], [2, 4], [6, 7],
    // Along b
    [0, 2], [1, 4], [3, 6], [5, 7],
    // Along c
    [0, 3], [1, 5], [2, 6], [4, 7],
  ];
}

// ════════════════════════════════════════════════════════════════════════
// Eigenvalues, characteristic polynomial, diagonalization, spectral theorem
// ════════════════════════════════════════════════════════════════════════
//
// Added by Topic 34 (Eigenvalues & Eigenvectors). All routines below operate
// on 2×2 or 3×3 real matrices in closed form; larger sizes throw. Eigenvalues
// are returned in canonical { real: number[]; imag: number[] } form, with
// real eigenvalues sorted non-increasingly and complex conjugate pairs grouped
// (positive imag first by convention).

/**
 * Tolerance for "approximately zero" floating-point comparisons (imaginary
 * parts of eigenvalues, kernel entries, etc.). Tighter than the rank
 * tolerance used by Topic 33's existing routines because the eigenvalue
 * pipeline accumulates extra error from the char-poly-plus-root-finding step.
 */
const EIG_TOL = 1e-9;

/**
 * Tolerance for clustering "approximately equal" eigenvalues.  Looser than
 * EIG_TOL because the closed-form 2×2 / 3×3 root finders can return repeated
 * eigenvalues with absolute difference of order ~1e-9 (and worse for
 * ill-conditioned matrices).  This is the threshold for "treat these two
 * computed eigenvalues as the same true eigenvalue with multiplicity > 1."
 */
const EIG_CLUSTER_TOL = 1e-6;

// ── Internal polynomial root finders ────────────────────────

/**
 * Solve a·x² + b·x + c = 0 with real coefficients. Returns a length-2
 * { real, imag }. For real roots the two entries are sorted non-increasingly;
 * for a complex conjugate pair the positive-imag root is first.
 */
function solveQuadraticReal(
  a: number,
  b: number,
  c: number,
): { real: [number, number]; imag: [number, number] } {
  if (Math.abs(a) < 1e-14) {
    throw new Error('solveQuadraticReal: leading coefficient ≈ 0');
  }
  const disc = b * b - 4 * a * c;
  if (disc >= -EIG_TOL) {
    const safeDisc = Math.max(disc, 0);
    const sq = Math.sqrt(safeDisc);
    const r1 = (-b + sq) / (2 * a);
    const r2 = (-b - sq) / (2 * a);
    return r1 >= r2
      ? { real: [r1, r2], imag: [0, 0] }
      : { real: [r2, r1], imag: [0, 0] };
  }
  const sq = Math.sqrt(-disc);
  const re = -b / (2 * a);
  const im = sq / (2 * a);
  return { real: [re, re], imag: [im, -im] };
}

/**
 * Solve x³ + a·x² + b·x + c = 0 (monic cubic with real coefficients) in closed
 * form via the depressed-cubic substitution. Returns a length-3 { real, imag };
 * real roots are sorted non-increasingly, complex conjugate pairs are grouped
 * with positive imag first.
 *
 * The three branches handle:
 *   - Triple/repeated root case (p ≈ 0 and q ≈ 0)
 *   - Three real roots (discriminant Δ ≥ 0): trigonometric method
 *   - One real + complex conjugate pair (Δ < 0): Cardano's formula
 */
function solveMonicCubicReal(
  a: number,
  b: number,
  c: number,
): { real: [number, number, number]; imag: [number, number, number] } {
  // Depressed cubic: x = t − a/3, t³ + p·t + q = 0
  const p = b - (a * a) / 3;
  const q = (2 * a * a * a) / 27 - (a * b) / 3 + c;
  const shift = -a / 3;

  // Triple root (p ≈ 0 and q ≈ 0): everything at the shift.
  if (Math.abs(p) < EIG_TOL && Math.abs(q) < EIG_TOL) {
    return { real: [shift, shift, shift], imag: [0, 0, 0] };
  }

  // Discriminant of the depressed cubic: Δ = −4p³ − 27q²
  const D = -4 * p * p * p - 27 * q * q;

  if (D >= -EIG_TOL && p < 0) {
    // Three real roots — trigonometric formula.
    const r = 2 * Math.sqrt(-p / 3);
    const cosArg = Math.max(-1, Math.min(1, (3 * q) / (p * r)));
    const phi = Math.acos(cosArg);
    const roots: number[] = [
      r * Math.cos(phi / 3) + shift,
      r * Math.cos((phi - 2 * Math.PI) / 3) + shift,
      r * Math.cos((phi + 2 * Math.PI) / 3) + shift,
    ];
    roots.sort((x, y) => y - x);
    return {
      real: [roots[0], roots[1], roots[2]],
      imag: [0, 0, 0],
    };
  }

  // One real root + complex conjugate pair (or repeated real with p ≥ 0).
  const halfQ = q / 2;
  const inner = halfQ * halfQ + (p * p * p) / 27;
  const sq = Math.sqrt(Math.max(inner, 0));
  const u = Math.cbrt(-halfQ + sq);
  const v = Math.cbrt(-halfQ - sq);
  const tReal = u + v;
  const realRoot = tReal + shift;
  const otherReal = -tReal / 2 + shift;
  const otherImag = (Math.sqrt(3) / 2) * (u - v);
  if (Math.abs(otherImag) < EIG_TOL) {
    // Numerically real (double root case).
    const roots = [realRoot, otherReal, otherReal].sort((x, y) => y - x);
    return {
      real: [roots[0], roots[1], roots[2]],
      imag: [0, 0, 0],
    };
  }
  return {
    real: [realRoot, otherReal, otherReal],
    imag: [0, Math.abs(otherImag), -Math.abs(otherImag)],
  };
}

// ── Internal: null-space basis via reduced row echelon form ─

/**
 * Compute an orthonormal basis of the null space of M via Gauss-Jordan
 * elimination to reduced row echelon form, then Gram-Schmidt on the kernel
 * generators. Returns the empty list when M has trivial kernel.
 */
function nullSpaceBasis(M: Matrix, tol: number = EIG_TOL): Vector[] {
  const m = M.length;
  if (m === 0) return [];
  const n = M[0].length;
  const R: Matrix = M.map((row) => row.slice());
  let pivotRow = 0;
  const pivotCols: number[] = [];
  for (let col = 0; col < n && pivotRow < m; col++) {
    let bestRow = pivotRow;
    let pivotMag = Math.abs(R[pivotRow][col]);
    for (let r = pivotRow + 1; r < m; r++) {
      const mag = Math.abs(R[r][col]);
      if (mag > pivotMag) {
        pivotMag = mag;
        bestRow = r;
      }
    }
    if (pivotMag < tol) continue;
    if (bestRow !== pivotRow) {
      [R[pivotRow], R[bestRow]] = [R[bestRow], R[pivotRow]];
    }
    const pivot = R[pivotRow][col];
    for (let c = 0; c < n; c++) R[pivotRow][c] /= pivot;
    for (let r = 0; r < m; r++) {
      if (r === pivotRow) continue;
      const factor = R[r][col];
      if (Math.abs(factor) < tol) continue;
      for (let c = 0; c < n; c++) R[r][c] -= factor * R[pivotRow][c];
    }
    pivotCols.push(col);
    pivotRow++;
  }

  const pivotSet = new Set(pivotCols);
  const rawBasis: Vector[] = [];
  for (let col = 0; col < n; col++) {
    if (pivotSet.has(col)) continue;
    const v: Vector = new Array(n).fill(0);
    v[col] = 1;
    for (let i = 0; i < pivotCols.length; i++) {
      v[pivotCols[i]] = -R[i][col];
    }
    rawBasis.push(v);
  }
  if (rawBasis.length === 0) return [];
  // Orthonormalize so callers get a tidy basis they can use directly.
  return gramSchmidt(rawBasis).Q;
}

// ── Characteristic polynomial ───────────────────────────────

/**
 * Coefficients [c₀, c₁, …, cₙ] of the characteristic polynomial
 * p_A(λ) = det(λI − A) for an n×n matrix A. The polynomial is monic of
 * degree n (cₙ = 1). Computed via direct expansion for n ≤ 3 and Faddeev-
 * Le Verrier for n ≥ 4.
 *
 * @example
 *   characteristicPolynomial([[4, -2], [1, 1]]) // → [6, -5, 1]  (λ² − 5λ + 6)
 */
export function characteristicPolynomial(A: Matrix): number[] {
  const n = A.length;
  if (n === 0) return [1];
  if (A.some((row) => row.length !== n)) {
    throw new Error('characteristicPolynomial: matrix must be square');
  }
  if (n === 1) return [-A[0][0], 1];
  if (n === 2) {
    const a = A[0][0];
    const b = A[0][1];
    const c = A[1][0];
    const d = A[1][1];
    return [a * d - b * c, -(a + d), 1];
  }
  if (n === 3) {
    // p(λ) = λ³ − tr(A)λ² + s₂λ − det(A)
    // where s₂ = sum of all 2×2 principal minors of A.
    const tr = A[0][0] + A[1][1] + A[2][2];
    const m01 = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    const m02 = A[0][0] * A[2][2] - A[0][2] * A[2][0];
    const m12 = A[1][1] * A[2][2] - A[1][2] * A[2][1];
    const s2 = m01 + m02 + m12;
    const det = determinant(A);
    return [-det, s2, -tr, 1];
  }
  // Faddeev-Le Verrier for n ≥ 4. p(λ) = λⁿ + p₁λⁿ⁻¹ + … + pₙ.
  // Recurrence: M_1 = A, then M_k = A·(M_{k-1} + p_{k-1}·I) for k ≥ 2.
  // Equivalently, set prev = I when k = 1 and prev = M_{k-1} + p_{k-1}·I
  // otherwise.  The prev matrix is built with standard nested loops rather
  // than nested .map() calls — for large n the intermediate-array
  // allocations are non-trivial.
  const coeffsHigh: number[] = new Array(n + 1).fill(0);
  coeffsHigh[n] = 1;
  let Mk: Matrix = identity(n).map((row) => row.map(() => 0));
  for (let k = 1; k <= n; k++) {
    const prevCoeff = coeffsHigh[n - k + 1];
    const prev: Matrix = new Array(n);
    if (k === 1) {
      // prev = I.
      for (let i = 0; i < n; i++) {
        const row: Vector = new Array(n);
        for (let j = 0; j < n; j++) row[j] = i === j ? 1 : 0;
        prev[i] = row;
      }
    } else {
      // prev = Mk + prevCoeff·I.
      for (let i = 0; i < n; i++) {
        const row: Vector = new Array(n);
        for (let j = 0; j < n; j++) {
          row[j] = Mk[i][j] + (i === j ? prevCoeff : 0);
        }
        prev[i] = row;
      }
    }
    Mk = matMul(A, prev);
    let trace = 0;
    for (let i = 0; i < n; i++) trace += Mk[i][i];
    coeffsHigh[n - k] = -trace / k;
  }
  return coeffsHigh;
}

/** Evaluate the characteristic polynomial of A at λ via Horner's method. */
export function characteristicPolynomialAt(A: Matrix, lambda: number): number {
  const c = characteristicPolynomial(A);
  let acc = 0;
  for (let i = c.length - 1; i >= 0; i--) {
    acc = acc * lambda + c[i];
  }
  return acc;
}

// ── Eigenvalues: closed-form for n ≤ 3 ──────────────────────

/**
 * Eigenvalues of a 2×2 real matrix in closed form via the quadratic formula
 * on the characteristic polynomial λ² − tr(A)λ + det(A). Real eigenvalues are
 * sorted non-increasingly; complex conjugate pairs are returned with positive
 * imag first.
 *
 * @example
 *   eigenvalues2x2([[4, -2], [1, 1]]) // → { real: [3, 2], imag: [0, 0] }
 *   eigenvalues2x2([[0, -1], [1, 0]]) // → { real: [0, 0], imag: [1, -1] }
 */
export function eigenvalues2x2(A: Matrix): { real: [number, number]; imag: [number, number] } {
  if (A.length !== 2 || A[0].length !== 2 || A[1].length !== 2) {
    throw new Error('eigenvalues2x2: expected a 2×2 matrix');
  }
  return solveQuadraticReal(1, -(A[0][0] + A[1][1]), A[0][0] * A[1][1] - A[0][1] * A[1][0]);
}

/**
 * Eigenvalues of a 3×3 real matrix in closed form via the cubic formula on
 * the characteristic polynomial. Real eigenvalues are sorted non-increasingly;
 * a single real + complex conjugate pair returns the real root first, then
 * the conjugate pair with positive imag first.
 */
export function eigenvalues3x3(A: Matrix): {
  real: [number, number, number];
  imag: [number, number, number];
} {
  if (A.length !== 3 || A.some((row) => row.length !== 3)) {
    throw new Error('eigenvalues3x3: expected a 3×3 matrix');
  }
  // Char poly is λ³ + (−tr)λ² + s₂λ + (−det). Solve the monic cubic.
  const tr = A[0][0] + A[1][1] + A[2][2];
  const m01 = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const m02 = A[0][0] * A[2][2] - A[0][2] * A[2][0];
  const m12 = A[1][1] * A[2][2] - A[1][2] * A[2][1];
  const s2 = m01 + m02 + m12;
  const det = determinant(A);
  return solveMonicCubicReal(-tr, s2, -det);
}

/**
 * Orthonormal basis of the eigenspace E_λ = ker(A − λI) for a (real) eigenvalue
 * λ. Returns the empty array if (A − λI) has trivial kernel within tolerance
 * (i.e. λ is not an eigenvalue at this precision).
 */
export function eigenvectorsForEigenvalue(
  A: Matrix,
  lambda: number,
  tol: number = EIG_TOL,
): Vector[] {
  const n = A.length;
  if (A.some((row) => row.length !== n)) {
    throw new Error('eigenvectorsForEigenvalue: matrix must be square');
  }
  const M: Matrix = A.map((row, i) =>
    row.map((val, j) => (i === j ? val - lambda : val)),
  );
  return nullSpaceBasis(M, tol);
}

// ── Diagonalization ─────────────────────────────────────────

/**
 * Test whether a 2×2 or 3×3 real matrix is diagonalizable over the reals.
 * Returns true iff every eigenvalue is real and its geometric multiplicity
 * equals its algebraic multiplicity. Complex eigenvalues cause a false return
 * unless `allowComplex: true` is passed (in which case the real-Jordan form
 * is still consulted but never returned — this routine only asks about
 * real diagonalizability).
 */
export function isDiagonalizable(
  A: Matrix,
  options: { allowComplex?: boolean; tol?: number } = {},
): boolean {
  const tol = options.tol ?? EIG_TOL;
  const n = A.length;
  if (n === 0) return true;
  if (A.some((row) => row.length !== n)) {
    throw new Error('isDiagonalizable: matrix must be square');
  }
  if (n > 3) {
    throw new Error('isDiagonalizable: only 2×2 and 3×3 matrices are supported');
  }
  const { real, imag } = n === 2 ? eigenvalues2x2(A) : eigenvalues3x3(A);
  // Reject complex eigenvalues unless allowComplex.
  for (let i = 0; i < imag.length; i++) {
    if (Math.abs(imag[i]) > tol && !options.allowComplex) return false;
  }
  // For each distinct real eigenvalue, geometric mult must equal algebraic.
  const reals: number[] = [];
  for (let i = 0; i < real.length; i++) {
    if (Math.abs(imag[i]) <= tol) reals.push(real[i]);
  }
  const sorted = [...reals].sort((a, b) => a - b);
  // Group into multiplicity buckets.
  const groups: { value: number; mult: number }[] = [];
  for (const r of sorted) {
    const last = groups[groups.length - 1];
    if (last !== undefined && Math.abs(last.value - r) <= EIG_CLUSTER_TOL) last.mult++;
    else groups.push({ value: r, mult: 1 });
  }
  for (const g of groups) {
    if (g.mult > 1) {
      const eigvecs = eigenvectorsForEigenvalue(A, g.value, tol);
      if (eigvecs.length < g.mult) return false;
    }
  }
  return true;
}

/**
 * Compute the diagonalization A = P·D·P⁻¹ when it exists. Throws if A is
 * defective or has complex eigenvalues (use `allowComplex` only for testing
 * via `isDiagonalizable`). Columns of P are eigenvectors; D is the diagonal
 * matrix of corresponding eigenvalues, ordered non-increasingly.
 */
export function diagonalize(A: Matrix): { P: Matrix; D: Matrix; Pinv: Matrix } {
  const n = A.length;
  if (n === 0) return { P: [], D: [], Pinv: [] };
  if (A.some((row) => row.length !== n)) {
    throw new Error('diagonalize: matrix must be square');
  }
  if (n > 3) {
    throw new Error('diagonalize: only 2×2 and 3×3 matrices are supported');
  }
  const { real, imag } = n === 2 ? eigenvalues2x2(A) : eigenvalues3x3(A);
  for (const im of imag) {
    if (Math.abs(im) > EIG_TOL) {
      throw new Error('diagonalize: matrix has complex eigenvalues — not diagonalizable over ℝ');
    }
  }
  // Gather eigenvectors, distinct value by distinct value.
  const usedIndices = new Set<number>();
  const columns: Vector[] = [];
  const eigList: number[] = [];
  for (let i = 0; i < real.length; i++) {
    if (usedIndices.has(i)) continue;
    const lambda = real[i];
    // Find all sibling indices (within tolerance) and skip them after.
    const siblings: number[] = [i];
    for (let j = i + 1; j < real.length; j++) {
      if (Math.abs(real[j] - lambda) <= EIG_CLUSTER_TOL && Math.abs(imag[j]) <= EIG_TOL) {
        siblings.push(j);
      }
    }
    const eigvecs = eigenvectorsForEigenvalue(A, lambda);
    if (eigvecs.length < siblings.length) {
      throw new Error(
        `diagonalize: matrix is defective (eigenvalue ${lambda.toFixed(4)} has algebraic mult ${siblings.length} but geometric mult ${eigvecs.length})`,
      );
    }
    for (let k = 0; k < siblings.length; k++) {
      columns.push(eigvecs[k]);
      eigList.push(lambda);
      usedIndices.add(siblings[k]);
    }
  }
  // Assemble P (columns become rows of the transpose then transpose back).
  const P: Matrix = transpose(columns);
  const D: Matrix = identity(n).map((row, i) => row.map((_, j) => (i === j ? eigList[i] : 0)));
  const Pinv = inverse(P);
  return { P, D, Pinv };
}

// ── Symmetric matrices and spectral theorem ─────────────────

/**
 * Test whether a matrix is square and symmetric within tolerance.
 *
 * @example
 *   isSymmetric([[1, 2], [2, 3]]) // → true
 *   isSymmetric([[1, 2], [3, 4]]) // → false
 */
export function isSymmetric(A: Matrix, tol: number = EIG_TOL): boolean {
  const n = A.length;
  if (n === 0) return true;
  if (A.some((row) => row.length !== n)) return false;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[i][j] - A[j][i]) > tol) return false;
    }
  }
  return true;
}

/**
 * Spectral decomposition A = Q·Λ·Qᵀ of a real symmetric matrix. Returns
 * { Q, Lambda } with Q orthogonal (columns are orthonormal eigenvectors) and
 * Lambda diagonal (eigenvalues sorted non-increasingly). For non-symmetric
 * input, symmetrizes to (A + Aᵀ)/2 unless `strict: true`. Supported for
 * n ≤ 3; throws for larger n.
 */
export function spectralDecompositionSymmetric(
  A: Matrix,
  options: { strict?: boolean } = {},
): { Q: Matrix; Lambda: Matrix } {
  const n = A.length;
  if (n === 0) return { Q: [], Lambda: [] };
  if (A.some((row) => row.length !== n)) {
    throw new Error('spectralDecompositionSymmetric: matrix must be square');
  }
  if (n > 3) {
    throw new Error('spectralDecompositionSymmetric: only 2×2 and 3×3 matrices are supported');
  }
  let S: Matrix = A.map((row) => row.slice());
  if (!isSymmetric(A)) {
    if (options.strict) {
      throw new Error('spectralDecompositionSymmetric: input is not symmetric and strict mode is on');
    }
    // Symmetrize: S = (A + Aᵀ)/2
    S = A.map((row, i) => row.map((_, j) => (A[i][j] + A[j][i]) / 2));
  }
  const { real, imag } = n === 2 ? eigenvalues2x2(S) : eigenvalues3x3(S);
  // Symmetric ⇒ all eigenvalues real (within numerical noise).
  for (const im of imag) {
    if (Math.abs(im) > EIG_CLUSTER_TOL) {
      throw new Error('spectralDecompositionSymmetric: numerical instability — complex eigenvalue from symmetric input');
    }
  }
  // Gather eigenvectors per distinct eigenvalue (with multiplicity).
  const eigValuesDesc = [...real].sort((a, b) => b - a);
  const usedSlots = new Array(eigValuesDesc.length).fill(false);
  const columnsByEig: { value: number; vec: Vector }[] = [];
  for (let i = 0; i < eigValuesDesc.length; i++) {
    if (usedSlots[i]) continue;
    const lambda = eigValuesDesc[i];
    const siblings: number[] = [i];
    for (let j = i + 1; j < eigValuesDesc.length; j++) {
      if (Math.abs(eigValuesDesc[j] - lambda) <= EIG_CLUSTER_TOL) siblings.push(j);
    }
    const eigvecs = eigenvectorsForEigenvalue(S, lambda);
    if (eigvecs.length < siblings.length) {
      // Symmetric should never be defective — numerical edge. Fall back to perturbation.
      throw new Error(`spectralDecompositionSymmetric: numerical instability finding eigenvectors for λ=${lambda.toFixed(6)}`);
    }
    for (let k = 0; k < siblings.length; k++) {
      columnsByEig.push({ value: lambda, vec: eigvecs[k] });
      usedSlots[siblings[k]] = true;
    }
  }
  // Final Gram-Schmidt across all columns ensures orthonormality even when
  // eigenvectors come from different (numerically close) eigenspaces.
  const rawCols = columnsByEig.map((c) => c.vec);
  const { Q: orthoCols } = gramSchmidt(rawCols);
  const Q: Matrix = transpose(orthoCols);
  const Lambda: Matrix = identity(n).map((row, i) =>
    row.map((_, j) => (i === j ? columnsByEig[i].value : 0)),
  );
  return { Q, Lambda };
}

// ── Quadratic forms, Rayleigh quotient, definiteness ────────

/**
 * Evaluate the quadratic form xᵀ·A·x. A is assumed (but not checked) to be
 * symmetric; for asymmetric A the result is xᵀ((A + Aᵀ)/2)x, i.e. the
 * symmetric part dominates.
 *
 * @example
 *   quadraticForm([[2, 0], [0, 3]], [1, 1]) // → 5
 */
export function quadraticForm(A: Matrix, x: Vector): number {
  return dot(x, matVec(A, x));
}

/**
 * Rayleigh quotient R_A(x) = xᵀ·A·x / xᵀ·x. Throws on the zero vector.
 */
export function rayleighQuotient(A: Matrix, x: Vector): number {
  const denom = dot(x, x);
  if (denom < 1e-14) {
    throw new Error('rayleighQuotient: undefined at the zero vector');
  }
  return quadraticForm(A, x) / denom;
}

/**
 * Classify the definiteness of a symmetric matrix by inspecting its eigenvalue
 * signs within tolerance for "approximately zero" eigenvalues.
 *  - All λ > tol:                positive-definite
 *  - All λ ≥ -tol, some |λ| ≤ tol: positive-semidefinite
 *  - All λ < -tol:               negative-definite
 *  - All λ ≤ tol, some |λ| ≤ tol: negative-semidefinite
 *  - Mixed signs:                indefinite
 *  - All |λ| ≤ tol:              zero
 */
export function classifyDefiniteness(
  A: Matrix,
  tol: number = 1e-7,
):
  | 'positive-definite'
  | 'positive-semidefinite'
  | 'negative-definite'
  | 'negative-semidefinite'
  | 'indefinite'
  | 'zero' {
  const n = A.length;
  if (n === 0) return 'zero';
  const { Lambda } = spectralDecompositionSymmetric(A);
  const eigvals: number[] = [];
  for (let i = 0; i < n; i++) eigvals.push(Lambda[i][i]);
  let hasPos = false;
  let hasNeg = false;
  let hasZero = false;
  for (const lam of eigvals) {
    if (lam > tol) hasPos = true;
    else if (lam < -tol) hasNeg = true;
    else hasZero = true;
  }
  if (!hasPos && !hasNeg) return 'zero';
  if (hasPos && hasNeg) return 'indefinite';
  if (hasPos) return hasZero ? 'positive-semidefinite' : 'positive-definite';
  return hasZero ? 'negative-semidefinite' : 'negative-definite';
}
