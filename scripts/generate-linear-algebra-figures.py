#!/usr/bin/env python3
"""
Generate the 12 static figures for Topic 33 (Linear Algebra).

Targets public/images/topics/linear-algebra/, with filenames matching the
handoff brief's §9 figure table:

  1.  linearity-vs-not.png         §3.1
  2.  vector-space-examples.png    §3.2
  3.  basis-and-span.png           §3.3
  4.  linear-map-zoo.png           §3.4
  5.  matrix-as-columns.png        §3.5
  6.  composition-is-product.png   §3.6
  7.  determinant-as-volume.png    §3.7
  8.  rank-nullity-picture.png     §3.8
  9.  change-of-basis.png          §3.9
  10. gram-schmidt-steps.png       §3.10
  11. least-squares-projection.png §3.11
  12. connections-summary.png      §3.13

Nine of these are direct translations of the notebook
`notebooks/linear-algebra/33_linear_algebra.ipynb` cells; three
(matrix-as-columns, change-of-basis, connections-summary) are new figures
specified by the brief but not in the notebook. All use the strict
NumPy + SciPy + Matplotlib library scope of the topic.

Run once before shipping:

    python3 scripts/generate-linear-algebra-figures.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch
from scipy import linalg as scilin

# ── Output directory ────────────────────────────────────────────────────

OUT_DIR = Path(__file__).resolve().parents[1] / "public" / "images" / "topics" / "linear-algebra"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Global matplotlib styling ───────────────────────────────────────────

# Match the notebook's style: simple, printable, no top/right spines.
plt.rcParams.update({
    "figure.dpi": 150,
    "savefig.dpi": 150,
    "savefig.bbox": "tight",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.alpha": 0.25,
    "font.size": 10,
})

np.random.seed(0)

# ── Helpers (from the notebook's setup cell) ────────────────────────────


def draw_vector(ax, tail, head, color="C0", label=None, lw=1.8, alpha=1.0):
    """Draw an arrow from tail to head on a 2D axes."""
    arrow = FancyArrowPatch(
        tuple(tail), tuple(head),
        arrowstyle="-|>", mutation_scale=14,
        color=color, lw=lw, alpha=alpha,
    )
    ax.add_patch(arrow)
    if label is not None:
        ax.annotate(label, xy=head, xytext=(head[0] + 0.08, head[1] + 0.08),
                    color=color, fontsize=10)


def set_square_axes(ax, lim=3, title=None):
    ax.set_xlim(-lim, lim)
    ax.set_ylim(-lim, lim)
    ax.set_aspect("equal")
    ax.axhline(0, color="black", lw=0.5, alpha=0.4)
    ax.axvline(0, color="black", lw=0.5, alpha=0.4)
    if title is not None:
        ax.set_title(title)


def save_and_close(fig, name: str):
    path = OUT_DIR / name
    fig.savefig(path)
    plt.close(fig)
    print(f"  wrote {path.relative_to(OUT_DIR.parents[3])}")


# ── 1. linearity-vs-not.png — §3.1 ──────────────────────────────────────


def figure_linearity_vs_not():
    """Three-panel: linear, affine, and quadratic-warp maps applied to a grid."""
    xs = np.linspace(-1, 1, 9)
    X, Y = np.meshgrid(xs, xs)
    grid = np.stack([X.ravel(), Y.ravel()], axis=0)

    A = np.array([[1.2, 0.4], [-0.2, 0.9]])
    b = np.array([[0.6], [0.5]])

    linear_img = A @ grid
    affine_img = A @ grid + b
    nonlinear_img = np.stack([grid[0], grid[1] + 0.4 * grid[0] ** 2], axis=0)

    def draw_grid(ax, pts, title):
        pts2 = pts.reshape(2, 9, 9)
        for i in range(9):
            ax.plot(pts2[0, i, :], pts2[1, i, :], color="0.3", lw=0.8)
            ax.plot(pts2[0, :, i], pts2[1, :, i], color="0.3", lw=0.8)
        ax.set_aspect("equal")
        ax.set_xlim(-2.5, 2.5)
        ax.set_ylim(-2.5, 2.5)
        ax.axhline(0, color="black", lw=0.5, alpha=0.4)
        ax.axvline(0, color="black", lw=0.5, alpha=0.4)
        ax.set_title(title)
        ax.grid(False)

    fig, axes = plt.subplots(1, 3, figsize=(12, 4))
    draw_grid(axes[0], linear_img, "Linear: lines stay lines,\norigin fixed")
    draw_grid(axes[1], affine_img, "Affine: lines stay lines,\norigin moves")
    draw_grid(axes[2], nonlinear_img, "Nonlinear: lines bend\ninto curves")
    fig.suptitle("Three maps acting on the same unit grid", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "linearity-vs-not.png")


# ── 2. vector-space-examples.png — §3.2 ─────────────────────────────────


def figure_vector_space_examples():
    """Three-panel: arrows in R^2, continuous functions on [0,1], polynomials in P_2."""
    fig, axes = plt.subplots(1, 3, figsize=(13, 4))

    ax = axes[0]
    for v, c in [((1.5, 0.3), "C0"), ((-0.5, 1.6), "C1"), ((0.8, -1.2), "C2")]:
        draw_vector(ax, (0, 0), v, color=c)
    set_square_axes(ax, lim=2.2, title=r"Arrows in $\mathbb{R}^2$")

    ax = axes[1]
    t = np.linspace(0, 1, 200)
    for label, f, c in [
        (r"$\sin(2\pi t)$", np.sin(2 * np.pi * t), "C0"),
        (r"$e^{-2t}$", np.exp(-2 * t), "C1"),
        (r"$(t-0.5)^2$", (t - 0.5) ** 2, "C2"),
    ]:
        ax.plot(t, f, label=label, color=c, lw=1.8)
    ax.set_title(r"Continuous functions $C[0, 1]$")
    ax.set_xlabel("t")
    ax.legend(loc="upper right", fontsize=8)

    ax = axes[2]
    x = np.linspace(-1.5, 1.5, 200)
    for label, coeffs, c in [
        (r"$1 + x$", (1, 1, 0), "C0"),
        (r"$x^2$", (0, 0, 1), "C1"),
        (r"$0.5 - x + 0.7 x^2$", (0.5, -1, 0.7), "C2"),
    ]:
        p = sum(a * x ** k for k, a in enumerate(coeffs))
        ax.plot(x, p, label=label, color=c, lw=1.8)
    ax.set_title(r"Polynomials $P_2$")
    ax.set_xlabel("x")
    ax.legend(loc="upper left", fontsize=8)

    fig.suptitle("Three vector spaces, same axioms", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "vector-space-examples.png")


# ── 3. basis-and-span.png — §3.3 (NEW; not in notebook) ─────────────────


def figure_basis_and_span():
    """Two-panel: two LI vectors with span (plane); three LD vectors with span (still plane)."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Panel 1: two linearly independent vectors in R^2 — span is the whole plane.
    ax = axes[0]
    ax.fill([-3, 3, 3, -3], [-3, -3, 3, 3], color="C0", alpha=0.10, edgecolor="none",
            label=r"span = $\mathbb{R}^2$")
    draw_vector(ax, (0, 0), (1.6, 0.3), color="C0", label=r"$v_1$")
    draw_vector(ax, (0, 0), (0.4, 1.4), color="C1", label=r"$v_2$")
    set_square_axes(ax, lim=2.5,
                    title="Two LI vectors:\nspan is all of " + r"$\mathbb{R}^2$")
    ax.legend(loc="lower right", fontsize=9)

    # Panel 2: three LD vectors in R^2 — the third is in the span of the first two.
    ax = axes[1]
    ax.fill([-3, 3, 3, -3], [-3, -3, 3, 3], color="C0", alpha=0.10, edgecolor="none",
            label=r"span = $\mathbb{R}^2$")
    draw_vector(ax, (0, 0), (1.6, 0.3), color="C0", label=r"$v_1$")
    draw_vector(ax, (0, 0), (0.4, 1.4), color="C1", label=r"$v_2$")
    draw_vector(ax, (0, 0), (1.6 + 0.4, 0.3 + 1.4), color="C3", lw=2.4,
                label=r"$v_3 = v_1 + v_2$")
    set_square_axes(ax, lim=2.5,
                    title="Three LD vectors:\nv₃ is redundant, span unchanged")
    ax.legend(loc="lower right", fontsize=9)

    fig.suptitle("Linear independence is about non-redundancy of directions", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "basis-and-span.png")


# ── 4. linear-map-zoo.png — §3.4 ────────────────────────────────────────


def figure_linear_map_zoo():
    """2×3 grid: identity, rotation, projection, shear, scaling, reflection."""
    theta = np.deg2rad(35)
    rot = np.array([[np.cos(theta), -np.sin(theta)],
                    [np.sin(theta), np.cos(theta)]])
    proj_x = np.array([[1, 0], [0, 0]])
    shear = np.array([[1, 0.7], [0, 1]])
    scale = np.array([[1.5, 0], [0, 0.6]])
    reflect = np.array([[-1, 0], [0, 1]])

    maps = [
        (np.eye(2), "Identity"),
        (rot, "Rotation 35°"),
        (proj_x, "Projection onto x-axis"),
        (shear, "Horizontal shear"),
        (scale, "Anisotropic scaling"),
        (reflect, "Reflection across y-axis"),
    ]

    corners = np.array([[0, 1, 1, 0], [0, 0, 1, 1]])

    fig, axes = plt.subplots(2, 3, figsize=(14, 8))
    for ax, (M, name) in zip(axes.flat, maps):
        img = M @ corners
        ax.fill(corners[0], corners[1], facecolor="0.85", edgecolor="0.4", alpha=0.55)
        ax.fill(img[0], img[1], facecolor="C0", alpha=0.25, edgecolor="C0")
        draw_vector(ax, (0, 0), tuple(M[:, 0]), color="C3", label=r"$T(e_1)$")
        draw_vector(ax, (0, 0), tuple(M[:, 1]), color="C2", label=r"$T(e_2)$")
        set_square_axes(ax, lim=2.0, title=name)

    fig.suptitle(r"The zoo of canonical linear maps — each matrix is $[T(e_1)\,|\,T(e_2)]$",
                 y=1.00)
    plt.tight_layout()
    save_and_close(fig, "linear-map-zoo.png")


# ── 5. matrix-as-columns.png — §3.5 (NEW; not in notebook) ──────────────


def figure_matrix_as_columns():
    """Two-panel: 2x2 matrix with columns as T(e1), T(e2); 3x3 matrix with isometric projection."""
    fig = plt.figure(figsize=(14, 5))

    # Panel 1: 2x2 matrix
    ax = fig.add_subplot(1, 2, 1)
    A = np.array([[1.5, -0.5], [0.5, 1.2]])
    # Standard basis e1, e2 in light grey
    draw_vector(ax, (0, 0), (1, 0), color="0.5", label=r"$e_1$", alpha=0.5)
    draw_vector(ax, (0, 0), (0, 1), color="0.5", label=r"$e_2$", alpha=0.5)
    # Image columns
    draw_vector(ax, (0, 0), tuple(A[:, 0]), color="C0", label=r"$Ae_1 = $ col 1")
    draw_vector(ax, (0, 0), tuple(A[:, 1]), color="C3", label=r"$Ae_2 = $ col 2")
    set_square_axes(ax, lim=2.5, title=r"2$\times$2: each column is $A e_j$")
    ax.text(-2.3, 2.0, f"A = [{A[0,0]:.1f}  {A[0,1]:.1f}]\n    [{A[1,0]:.1f}   {A[1,1]:.1f}]",
            family="monospace", fontsize=10,
            bbox=dict(facecolor="white", edgecolor="0.5", alpha=0.85))

    # Panel 2: 3x3 matrix with isometric projection
    ax2 = fig.add_subplot(1, 2, 2, projection="3d")
    A3 = np.array([
        [1.2, 0.3, -0.4],
        [0.2, 1.0, 0.5],
        [0.1, 0.4, 1.3],
    ])
    # Plot the three image columns of A3
    for j, c, lbl in zip(range(3), ["C0", "C3", "C2"], [r"$Ae_1$", r"$Ae_2$", r"$Ae_3$"]):
        col = A3[:, j]
        ax2.quiver(0, 0, 0, col[0], col[1], col[2], color=c, arrow_length_ratio=0.12,
                   linewidth=2)
        ax2.text(col[0] * 1.1, col[1] * 1.1, col[2] * 1.1, lbl, color=c, fontsize=10)
    # Also show e1, e2, e3 lightly
    for j in range(3):
        e = np.eye(3)[:, j]
        ax2.quiver(0, 0, 0, e[0], e[1], e[2], color="0.5", arrow_length_ratio=0.12,
                   linewidth=1, alpha=0.5)
    lim = 1.8
    ax2.set_xlim(-lim, lim); ax2.set_ylim(-lim, lim); ax2.set_zlim(-lim, lim)
    ax2.set_title(r"3$\times$3: image of $e_j$ = $j$-th column of $A$")
    ax2.view_init(elev=20, azim=35)

    fig.suptitle(r"The $j$-th column of the matrix is where $T$ sends the $j$-th basis vector",
                 y=1.02)
    plt.tight_layout()
    save_and_close(fig, "matrix-as-columns.png")


# ── 6. composition-is-product.png — §3.6 ────────────────────────────────


def figure_composition_is_product():
    """Apply A then B; show intermediate; dashed outline (BA)·square overlay."""
    A_mat = np.array([[0.9, -0.4], [0.5, 1.1]])
    B_mat = np.array([[1.0, 0.6], [-0.3, 0.8]])
    corners = np.array([[0, 1, 1, 0], [0, 0, 1, 1]])

    fig, axes = plt.subplots(1, 3, figsize=(13, 4.2))

    axes[0].fill(corners[0], corners[1], color="0.85", edgecolor="0.4")
    set_square_axes(axes[0], lim=3, title="Input: unit square")

    mid = A_mat @ corners
    axes[1].fill(mid[0], mid[1], color="C0", alpha=0.3, edgecolor="C0")
    set_square_axes(axes[1], lim=3, title="After applying A")

    out = B_mat @ mid
    axes[2].fill(out[0], out[1], color="C3", alpha=0.3, edgecolor="C3", label="B·(A·square)")
    out2 = (B_mat @ A_mat) @ corners
    axes[2].plot(np.append(out2[0], out2[0, 0]), np.append(out2[1], out2[1, 0]),
                 "--", color="black", lw=1.0, label="(BA)·square")
    set_square_axes(axes[2], lim=3, title="After applying B")
    axes[2].legend(loc="lower right", fontsize=8)

    fig.suptitle(r"Composition equals matrix product: $B \cdot (A \mathbf{x}) = (BA) \mathbf{x}$",
                 y=1.02)
    plt.tight_layout()
    save_and_close(fig, "composition-is-product.png")


# ── 7. determinant-as-volume.png — §3.7 ─────────────────────────────────


def figure_determinant_as_volume():
    """Three-panel: positive area, negative area, singular case (collapse)."""
    configs = [
        (np.array([[1.4, 0.5], [0.2, 1.1]]), "Positive orientation"),
        (np.array([[1.4, 0.5], [-0.2, -1.1]]), "Negative orientation"),
        (np.array([[1.0, 2.0], [0.5, 1.0]]), "Singular: area = 0"),
    ]

    fig, axes = plt.subplots(1, 3, figsize=(13, 4.2))
    for ax, (A, name) in zip(axes, configs):
        v1, v2 = A[:, 0], A[:, 1]
        quad = np.array([(0, 0), v1, v1 + v2, v2])
        d = np.linalg.det(A)
        color = "C2" if d > 0.01 else ("C3" if d < -0.01 else "0.5")
        ax.fill(quad[:, 0], quad[:, 1], color=color, alpha=0.30, edgecolor=color)
        draw_vector(ax, (0, 0), v1, color="C0", label=r"$a_1$")
        draw_vector(ax, (0, 0), v2, color="C1", label=r"$a_2$")
        set_square_axes(ax, lim=3, title=f"{name}\ndet A = {d:.3f}")

    fig.suptitle(r"$|\det A|$ is the area of the parallelogram spanned by the columns",
                 y=1.02)
    plt.tight_layout()
    save_and_close(fig, "determinant-as-volume.png")


# ── 8. rank-nullity-picture.png — §3.8 ──────────────────────────────────


def figure_rank_nullity_picture():
    """Two-panel: input space split into kernel + complement; output space with image highlighted."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Panel 1: input space R^3 (drawn in 2D for clarity) — kernel is the
    # vertical axis, complement is the xy-plane. Schematic.
    ax = axes[0]
    # Kernel line (vertical)
    ax.plot([0, 0], [-2.5, 2.5], color="C3", lw=8, alpha=0.30, label="kernel (dim 1)")
    # Complement plane (horizontal stripe through origin)
    ax.fill([-2.5, 2.5, 2.5, -2.5], [-0.5, -0.5, 0.5, 0.5], color="C0", alpha=0.18,
            edgecolor="none", label="complement (dim 2)")
    # Sample input vectors
    draw_vector(ax, (0, 0), (1.4, 0.0), color="C0", label=r"$v$ (image $\neq 0$)")
    draw_vector(ax, (0, 0), (0.0, 1.6), color="C3", label=r"$u \in \ker A$")
    draw_vector(ax, (0, 0), (1.4, 1.6), color="0.4",
                label=r"$v + u$ (same image as $v$)")
    set_square_axes(ax, lim=2.5,
                    title=r"Input space $\mathbb{R}^3$" + "\nrank-nullity: 1 + 2 = 3")
    ax.legend(loc="lower right", fontsize=8)

    # Panel 2: output space — image of A is a 2D subspace; kernel collapses to origin.
    ax = axes[1]
    # Image (2D plane through origin — shown as full plane in 2D viz)
    ax.fill([-2.5, 2.5, 2.5, -2.5], [-2.5, -2.5, 2.5, 2.5], color="C2", alpha=0.15,
            edgecolor="none", label="image (dim 2)")
    # The image vectors corresponding to the input arrows
    draw_vector(ax, (0, 0), (1.4 * 0.95, 0.3), color="C0", label=r"$A v \neq 0$")
    # Kernel vector → origin
    ax.scatter([0], [0], color="C3", s=120, zorder=4, label=r"$A u = 0$")
    set_square_axes(ax, lim=2.5,
                    title=r"Output space $\mathbb{R}^3$" +
                          "\nimage spans 2 dims; kernel collapses")
    ax.legend(loc="lower right", fontsize=8)

    fig.suptitle(r"Rank-Nullity: $\dim \ker A + \dim \mathrm{im}\, A = \dim V$",
                 y=1.02)
    plt.tight_layout()
    save_and_close(fig, "rank-nullity-picture.png")


# ── 9. change-of-basis.png — §3.9 (NEW; not in notebook) ────────────────


def figure_change_of_basis():
    """Two-panel: rotation in standard basis vs. same rotation in tilted basis."""
    theta = np.deg2rad(30)
    T = np.array([[np.cos(theta), -np.sin(theta)],
                  [np.sin(theta), np.cos(theta)]])

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Panel 1: standard basis
    ax = axes[0]
    corners = np.array([[0, 1, 1, 0], [0, 0, 1, 1]])
    ax.fill(corners[0], corners[1], color="0.85", edgecolor="0.4", alpha=0.55)
    out = T @ corners
    ax.fill(out[0], out[1], color="C0", alpha=0.30, edgecolor="C0")
    draw_vector(ax, (0, 0), (1, 0), color="0.5", alpha=0.7)
    draw_vector(ax, (0, 0), (0, 1), color="0.5", alpha=0.7)
    draw_vector(ax, (0, 0), tuple(T[:, 0]), color="C3", label=r"$T(e_1)$")
    draw_vector(ax, (0, 0), tuple(T[:, 1]), color="C2", label=r"$T(e_2)$")
    set_square_axes(ax, lim=2.5,
                    title=r"Standard basis $\mathcal{B}$" + "\n"
                          + r"$[T]_{\mathcal{B}}$ = rotation matrix")

    # Panel 2: tilted basis (45° rotation of standard)
    ax = axes[1]
    # New basis vectors
    p1 = np.array([1, 1]) / np.sqrt(2)
    p2 = np.array([-1, 1]) / np.sqrt(2)
    # Draw tilted basis
    draw_vector(ax, (0, 0), tuple(p1), color="0.5", alpha=0.7)
    draw_vector(ax, (0, 0), tuple(p2), color="0.5", alpha=0.7)
    # In the tilted basis, the rotation matrix is the SAME (rotations commute with rotations)
    # We render the same square in tilted coordinates and its image
    sq_tilted = corners[0:1].T * p1.reshape(1, 2) + corners[1:2].T * p2.reshape(1, 2)
    sq_tilted = sq_tilted.T
    ax.fill(sq_tilted[0], sq_tilted[1], color="0.85", edgecolor="0.4", alpha=0.55)
    out_tilted = T @ sq_tilted
    ax.fill(out_tilted[0], out_tilted[1], color="C0", alpha=0.30, edgecolor="C0")
    draw_vector(ax, (0, 0), tuple(T @ p1), color="C3", label=r"$T(v'_1)$")
    draw_vector(ax, (0, 0), tuple(T @ p2), color="C2", label=r"$T(v'_2)$")
    set_square_axes(ax, lim=2.5,
                    title=r"Tilted basis $\mathcal{B}'$" + "\n" +
                          r"$[T]_{\mathcal{B}'} = P^{-1}[T]_{\mathcal{B}}P$")

    fig.suptitle("Same linear map, two bases — the matrix changes via $P^{-1} \\cdot \\cdot P$",
                 y=1.02)
    plt.tight_layout()
    save_and_close(fig, "change-of-basis.png")


# ── 10. gram-schmidt-steps.png — §3.10 ──────────────────────────────────


def figure_gram_schmidt_steps():
    """Three-panel 3D: starting basis, intermediate u_k, final orthonormal q_k."""
    def gram_schmidt(vectors):
        Q = []
        intermediate = []
        for v in vectors:
            u = np.array(v, dtype=float)
            for q in Q:
                u = u - float(np.dot(v, q)) * q
            intermediate.append(u.copy())
            n = np.linalg.norm(u)
            if n < 1e-12:
                raise ValueError("Linearly dependent")
            Q.append(u / n)
        return Q, intermediate

    v_list = [
        np.array([2.0, 0.5, 0.2]),
        np.array([1.0, 1.5, 0.4]),
        np.array([0.5, 0.8, 1.6]),
    ]
    Q, U = gram_schmidt(v_list)

    fig = plt.figure(figsize=(14, 4.8))
    stages = [
        ("Starting basis", v_list, ["C0", "C1", "C2"]),
        ("After project-and-subtract\n(non-normalized u_k)", U, ["C0", "C1", "C2"]),
        (r"Final orthonormal basis $q_k$", Q, ["C0", "C1", "C2"]),
    ]
    for i, (title, vecs, colors) in enumerate(stages, start=1):
        ax = fig.add_subplot(1, 3, i, projection="3d")
        for v, c, lbl in zip(vecs, colors, ["1", "2", "3"]):
            ax.quiver(0, 0, 0, v[0], v[1], v[2], color=c, arrow_length_ratio=0.12,
                      linewidth=2)
            ax.text(v[0] * 1.05, v[1] * 1.05, v[2] * 1.05, lbl, color=c, fontsize=11)
        lim = 2.4
        ax.set_xlim(-lim, lim); ax.set_ylim(-lim, lim); ax.set_zlim(-lim, lim)
        ax.set_title(title)
        ax.view_init(elev=22, azim=35)

    fig.suptitle("Gram-Schmidt: input basis → orthogonal $u_k$ → orthonormal $q_k$",
                 y=1.00)
    plt.tight_layout()
    save_and_close(fig, "gram-schmidt-steps.png")


# ── 11. least-squares-projection.png — §3.11 ────────────────────────────


def figure_least_squares_projection():
    """Two-panel: data with fit and residual segments; residuals scatter."""
    rng = np.random.default_rng(4)
    n_pts = 25
    x_data = np.linspace(0, 10, n_pts)
    true_slope, true_intercept = 0.7, 1.5
    y_data = true_intercept + true_slope * x_data + rng.normal(0, 1.0, n_pts)

    X = np.column_stack([np.ones(n_pts), x_data])
    beta_hat = scilin.solve(X.T @ X, X.T @ y_data, assume_a="pos")
    y_hat = X @ beta_hat
    residual = y_data - y_hat

    fig, axes = plt.subplots(1, 2, figsize=(13, 4.5))

    ax = axes[0]
    ax.scatter(x_data, y_data, color="C0", zorder=3, label="data points")
    xs = np.linspace(0, 10, 100)
    ax.plot(xs, beta_hat[0] + beta_hat[1] * xs, color="C3", lw=2,
            label=r"$\hat{y} = \hat{\beta}_0 + \hat{\beta}_1 x$")
    for xi, yi, yh in zip(x_data, y_data, y_hat):
        ax.plot([xi, xi], [yi, yh], color="0.4", lw=0.8, alpha=0.7)
    ax.set_xlabel("x"); ax.set_ylabel("y")
    ax.set_title("Data, fit, and residual segments")
    ax.legend(loc="upper left", fontsize=9)

    ax = axes[1]
    ax.scatter(x_data, residual, color="C2", zorder=3)
    ax.axhline(0, color="0.4", lw=1.0)
    ax.set_xlabel("x"); ax.set_ylabel("residual")
    ax.set_title(r"Residuals — orthogonal to $\mathrm{col}(X)$")

    fig.suptitle("OLS as orthogonal projection of $\\mathbf{y}$ onto $\\mathrm{col}(X)$",
                 y=1.02)
    plt.tight_layout()
    save_and_close(fig, "least-squares-projection.png")


# ── 12. connections-summary.png — §3.13 (NEW; not in notebook) ──────────


def figure_connections_summary():
    """Four-panel forward-looking summary: eigenvalue preview, PCA preview, optimization, SVD."""
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    # Panel 1 (top-left): "directions that don't rotate" — preview of eigenvectors.
    ax = axes[0, 0]
    # A scaling along the y=x axis: matrix [[2,0],[0,0.5]] in a tilted basis.
    # Eigenvector directions: the two axes of the ellipse.
    theta = np.linspace(0, 2 * np.pi, 200)
    circle = np.array([np.cos(theta), np.sin(theta)])
    A = np.array([[2.0, 0.0], [0.0, 0.5]])
    ellipse = A @ circle
    ax.plot(circle[0], circle[1], "--", color="0.6", lw=1, label="unit circle (input)")
    ax.plot(ellipse[0], ellipse[1], "-", color="C0", lw=2, label="image (ellipse)")
    # Highlight the two eigenvectors
    draw_vector(ax, (0, 0), (1, 0), color="C3", lw=2.4)
    draw_vector(ax, (0, 0), (2, 0), color="C3", lw=1.4, alpha=0.5)
    draw_vector(ax, (0, 0), (0, 1), color="C2", lw=2.4)
    draw_vector(ax, (0, 0), (0, 0.5), color="C2", lw=1.4, alpha=0.5)
    set_square_axes(ax, lim=2.6,
                    title=r"Eigenvectors of $A$" +
                          "\n(the directions $A$ only scales)")
    ax.legend(loc="lower right", fontsize=8)

    # Panel 2 (top-right): data ellipse with principal axes — PCA preview.
    ax = axes[0, 1]
    rng = np.random.default_rng(1)
    n = 200
    # Anisotropic Gaussian along a tilted axis
    cov_diag = np.diag([1.0, 0.25])
    angle = np.deg2rad(30)
    R = np.array([[np.cos(angle), -np.sin(angle)], [np.sin(angle), np.cos(angle)]])
    cov = R @ cov_diag @ R.T
    data = rng.multivariate_normal([0, 0], cov, size=n)
    ax.scatter(data[:, 0], data[:, 1], color="C0", s=12, alpha=0.5, label="data")
    # Principal axes (eigenvectors of cov)
    e1 = R[:, 0] * np.sqrt(cov_diag[0, 0]) * 2.5
    e2 = R[:, 1] * np.sqrt(cov_diag[1, 1]) * 2.5
    draw_vector(ax, (0, 0), tuple(e1), color="C3", lw=2.4, label="principal axis 1")
    draw_vector(ax, (0, 0), tuple(e2), color="C2", lw=2.4, label="principal axis 2")
    set_square_axes(ax, lim=3.0,
                    title="PCA preview\n(eigenvectors of the covariance)")
    ax.legend(loc="lower right", fontsize=8)

    # Panel 3 (bottom-left): quadratic-loss contours with Hessian-axis basis — optimization preview.
    ax = axes[1, 0]
    xs = np.linspace(-2.5, 2.5, 120)
    ys = np.linspace(-2.5, 2.5, 120)
    XX, YY = np.meshgrid(xs, ys)
    # Quadratic with anisotropic Hessian
    H = np.array([[3.0, 0.8], [0.8, 1.0]])
    L = 0.5 * (XX * (H[0, 0] * XX + H[0, 1] * YY) +
               YY * (H[1, 0] * XX + H[1, 1] * YY))
    cs = ax.contour(XX, YY, L, levels=12, cmap="viridis", alpha=0.8)
    ax.clabel(cs, inline=True, fontsize=7, fmt="%.1f")
    # Show a gradient-descent path that zig-zags
    path = [np.array([2.0, 2.2])]
    eta = 0.18
    for _ in range(12):
        x = path[-1]
        g = H @ x
        path.append(x - eta * g)
    path = np.array(path)
    ax.plot(path[:, 0], path[:, 1], "o-", color="C3", lw=1.4, markersize=4,
            label="gradient descent path")
    set_square_axes(ax, lim=2.5,
                    title="Local loss surface near a minimum\n"
                          + r"(quadratic form $\frac{1}{2}\delta^\top H \delta$)")
    ax.legend(loc="lower right", fontsize=8)

    # Panel 4 (bottom-right): matrix factorization preview (SVD foreshadow).
    ax = axes[1, 1]
    # Schematic: A = U Σ V^T as three-step picture: rotate, scale, rotate.
    # Show before/after of the unit circle under A = U Sigma V^T.
    Sigma = np.diag([1.8, 0.6])
    U = np.array([[np.cos(np.deg2rad(20)), -np.sin(np.deg2rad(20))],
                  [np.sin(np.deg2rad(20)),  np.cos(np.deg2rad(20))]])
    Vt = np.array([[np.cos(np.deg2rad(-30)), -np.sin(np.deg2rad(-30))],
                   [np.sin(np.deg2rad(-30)),  np.cos(np.deg2rad(-30))]])
    A = U @ Sigma @ Vt
    th = np.linspace(0, 2 * np.pi, 200)
    circle = np.array([np.cos(th), np.sin(th)])
    img = A @ circle
    ax.plot(circle[0], circle[1], "--", color="0.6", lw=1, label="unit circle")
    ax.plot(img[0], img[1], color="C0", lw=2, label=r"$A \cdot$ circle")
    # Singular axes — image of the standard basis under A
    draw_vector(ax, (0, 0), tuple(A[:, 0]), color="C3", label=r"$A e_1$")
    draw_vector(ax, (0, 0), tuple(A[:, 1]), color="C2", label=r"$A e_2$")
    set_square_axes(ax, lim=2.5,
                    title=r"SVD preview: $A = U \Sigma V^\top$" +
                          "\n(rotate, scale, rotate)")
    ax.legend(loc="lower right", fontsize=8)

    fig.suptitle("Four things this topic prepares: eigenvectors · PCA · optimization · SVD",
                 y=1.00)
    plt.tight_layout()
    save_and_close(fig, "connections-summary.png")


# ── Main ─────────────────────────────────────────────────────────────────


def main():
    print(f"Writing figures to {OUT_DIR}")
    figure_linearity_vs_not()
    figure_vector_space_examples()
    figure_basis_and_span()
    figure_linear_map_zoo()
    figure_matrix_as_columns()
    figure_composition_is_product()
    figure_determinant_as_volume()
    figure_rank_nullity_picture()
    figure_change_of_basis()
    figure_gram_schmidt_steps()
    figure_least_squares_projection()
    figure_connections_summary()
    print("\n12 figures generated.")


if __name__ == "__main__":
    main()
