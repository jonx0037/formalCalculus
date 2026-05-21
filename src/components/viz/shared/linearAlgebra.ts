/**
 * Shared utility module for the Linear Algebra track (Track 9).
 *
 * Created by Topic 33 (linear-algebra).
 * Will be extended by Topic 34 (eigenvalues-eigenvectors): eigenvalue and
 * eigenvector computation, characteristic polynomial, diagonalization, and
 * matrix powers via diagonalization. No eigenvalue or SVD content lives in
 * this file — Topic 33 stops before spectral theory.
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
