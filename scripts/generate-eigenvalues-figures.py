#!/usr/bin/env python3
"""
Generate the 12 static figures for Topic 34 (Eigenvalues & Eigenvectors).

Targets public/images/topics/eigenvalues-eigenvectors/, with filenames matching
the handoff brief's §9 figure table:

  1.  invariant-directions-zoo.png     §1
  2.  eigenspace-examples.png          §2
  3.  characteristic-polynomial-2x2.png §3
  4.  characteristic-polynomial-3x3.png §3
  5.  diagonalization-three-steps.png  §4
  6.  defective-matrix.png             §5
  7.  spectral-theorem-ellipse.png     §6
  8.  quadratic-form-zoo.png           §7
  9.  rayleigh-quotient-circle.png     §8
  10. courant-fischer-subspaces.png    §9
  11. principal-axes-unified.png       §10
  12. gradient-descent-spectrum.png    §11

Library scope: NumPy + Matplotlib only (no SymPy, no Pandas). Matches the
discipline of scripts/generate-linear-algebra-figures.py. Eigenvalue
computation via np.linalg.eig / np.linalg.eigh as the brief permits.

Run once:

    python3 scripts/generate-eigenvalues-figures.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Circle, Ellipse

OUT_DIR = (
    Path(__file__).resolve().parents[1]
    / "public"
    / "images"
    / "topics"
    / "eigenvalues-eigenvectors"
)
OUT_DIR.mkdir(parents=True, exist_ok=True)

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


# ── Helpers ─────────────────────────────────────────────────────────────


def draw_vector(ax, tail, head, color="C0", label=None, lw=1.8, alpha=1.0):
    arrow = FancyArrowPatch(
        tuple(tail), tuple(head),
        arrowstyle="-|>", mutation_scale=14,
        color=color, lw=lw, alpha=alpha,
    )
    ax.add_patch(arrow)
    if label is not None:
        ax.annotate(label, xy=head, xytext=(head[0] + 0.08, head[1] + 0.08),
                    color=color, fontsize=10)


def set_square(ax, lim=3, title=None):
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


def transform_grid(A, lim=2, n=11):
    xs = np.linspace(-lim, lim, n)
    horiz_segments = []
    vert_segments = []
    for y in xs:
        pts = np.column_stack([xs, np.full_like(xs, y)])
        horiz_segments.append(A @ pts.T)
    for x in xs:
        pts = np.column_stack([np.full_like(xs, x), xs])
        vert_segments.append(A @ pts.T)
    return horiz_segments, vert_segments


def draw_transformed_grid(ax, A, color="#4f46e5", alpha=0.4, lim=2, n=11):
    horiz, vert = transform_grid(A, lim=lim, n=n)
    for seg in horiz:
        ax.plot(seg[0], seg[1], color=color, alpha=alpha, lw=0.7)
    for seg in vert:
        ax.plot(seg[0], seg[1], color=color, alpha=alpha, lw=0.7)


# ── 1. invariant-directions-zoo.png ─────────────────────────────────────


def figure_invariant_directions_zoo():
    """Four-panel: uniform scaling, rotation, shear, generic 2x2."""
    matrices = [
        ([[1.5, 0], [0, 1.5]], "Uniform scaling — every direction invariant"),
        ([[np.cos(np.pi / 4), -np.sin(np.pi / 4)], [np.sin(np.pi / 4), np.cos(np.pi / 4)]], "Rotation by 45° — no real invariant"),
        ([[1, 0.5], [0, 1]], "Horizontal shear — one invariant (x-axis)"),
        ([[2, 1], [1, 2]], "Generic symmetric — two distinct invariants"),
    ]
    fig, axes = plt.subplots(1, 4, figsize=(15, 4.2))
    for ax, (M, title) in zip(axes, matrices):
        A = np.array(M, float)
        # Standard unit grid (light)
        for v in np.linspace(-3, 3, 13):
            ax.plot([v, v], [-3, 3], color="#e5e7eb", lw=0.5)
            ax.plot([-3, 3], [v, v], color="#e5e7eb", lw=0.5)
        # Transformed grid (colored)
        draw_transformed_grid(ax, A, color="#7c3aed", alpha=0.6, lim=2)
        # Try to compute real eigenvectors and plot them as solid lines
        eigvals, eigvecs = np.linalg.eig(A)
        for i, lam in enumerate(eigvals):
            if abs(lam.imag) < 1e-8:
                v = eigvecs[:, i].real
                v = v / np.linalg.norm(v)
                color = ["#2563eb", "#059669"][i % 2]
                ax.plot([-3 * v[0], 3 * v[0]], [-3 * v[1], 3 * v[1]],
                        color=color, lw=2.5, alpha=0.9)
        set_square(ax, 3, title)
    fig.suptitle("Linear maps and their invariant directions",
                 fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "invariant-directions-zoo.png")


# ── 2. eigenspace-examples.png ──────────────────────────────────────────


def figure_eigenspace_examples():
    """Three-panel: diagonal matrix, projection, 90 deg rotation."""
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))

    # Panel 1: diagonal diag(2, 0.5)
    A = np.array([[2, 0], [0, 0.5]])
    ax = axes[0]
    draw_transformed_grid(ax, A, color="#7c3aed", alpha=0.5, lim=2)
    ax.plot([-3, 3], [0, 0], color="#2563eb", lw=2.5)
    ax.plot([0, 0], [-3, 3], color="#059669", lw=2.5)
    ax.annotate("E_2 (×2)", (2.5, 0.15), color="#2563eb", fontweight="bold")
    ax.annotate("E_0.5 (×½)", (0.15, 2.6), color="#059669", fontweight="bold")
    set_square(ax, 3, "Diagonal: coordinate axes are eigenspaces")

    # Panel 2: projection onto x-axis
    A = np.array([[1, 0], [0, 0]])
    ax = axes[1]
    # Show several vectors mapping to their projections
    rng = np.random.RandomState(1)
    for _ in range(8):
        v = rng.uniform(-2, 2, 2)
        proj = A @ v
        ax.plot([v[0], proj[0]], [v[1], proj[1]], color="#9ca3af", lw=0.8, ls="--")
        ax.plot(v[0], v[1], "o", color="#9ca3af", ms=4)
        ax.plot(proj[0], proj[1], "o", color="#dc2626", ms=4)
    ax.plot([-3, 3], [0, 0], color="#2563eb", lw=2.5)
    ax.plot([0, 0], [-3, 3], color="#059669", lw=2.5)
    ax.annotate("E_1 = x-axis", (1.6, -0.3), color="#2563eb", fontweight="bold")
    ax.annotate("E_0 = y-axis", (0.15, 2.6), color="#059669", fontweight="bold")
    set_square(ax, 3, "Projection: λ = 1, 0 with x/y axes")

    # Panel 3: 90 deg rotation
    A = np.array([[0, -1], [1, 0]])
    ax = axes[2]
    for theta in np.linspace(0, 2 * np.pi, 9, endpoint=False):
        v = np.array([np.cos(theta), np.sin(theta)]) * 1.5
        Av = A @ v
        ax.plot([0, v[0]], [0, v[1]], color="#9ca3af", lw=1)
        ax.plot([0, Av[0]], [0, Av[1]], color="#7c3aed", lw=1.2, alpha=0.7)
        ax.plot(v[0], v[1], "o", color="#9ca3af", ms=4)
        ax.plot(Av[0], Av[1], "o", color="#7c3aed", ms=4)
    ax.text(0, 2.7, "no real invariant direction\n(every vector rotated 90°)",
            ha="center", va="top", color="#dc2626", fontsize=10, fontweight="bold")
    set_square(ax, 3, "Rotation by 90°: complex eigenvalues ±i")

    fig.suptitle("Eigenspaces — three qualitative examples",
                 fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "eigenspace-examples.png")


# ── 3-4. characteristic-polynomial-2x2 and 3x3 ──────────────────────────


def _plot_char_poly(ax, A, lam_range=(-2, 6), title=""):
    lambdas = np.linspace(*lam_range, 400)
    n = A.shape[0]
    poly_vals = np.array([np.linalg.det(lam * np.eye(n) - A) for lam in lambdas])
    ax.plot(lambdas, poly_vals, color="#7c3aed", lw=2.25)
    ax.axhline(0, color="black", lw=0.6)
    # Real eigenvalues as red dots
    eigvals = np.linalg.eigvals(A)
    for lam in eigvals:
        if abs(lam.imag) < 1e-8:
            ax.plot(lam.real, 0, "o", color="#dc2626", ms=10)
            ax.annotate(f"λ = {lam.real:.2f}", (lam.real, 0),
                        textcoords="offset points", xytext=(8, 14),
                        color="#dc2626", fontweight="bold", fontsize=10)
    ax.set_xlabel("λ")
    ax.set_ylabel("p_A(λ)")
    ax.set_title(title)
    ax.grid(True, alpha=0.25)


def figure_characteristic_polynomial_2x2():
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    A = np.array([[4, -2], [1, 1]])
    axes[0].axis("off")
    axes[0].text(0.5, 0.75, "A = [[4, -2], [1, 1]]",
                 ha="center", va="center", fontsize=16,
                 fontfamily="monospace", transform=axes[0].transAxes)
    axes[0].text(0.5, 0.45, r"$p_A(\lambda) = \lambda^2 - 5\lambda + 6 = (\lambda - 2)(\lambda - 3)$",
                 ha="center", va="center", fontsize=14, transform=axes[0].transAxes)
    axes[0].text(0.5, 0.2, "eigenvalues 2 and 3 — distinct, diagonalizable",
                 ha="center", va="center", fontsize=11, color="#6b7280",
                 transform=axes[0].transAxes)
    _plot_char_poly(axes[1], A, lam_range=(-1, 5), title="Characteristic polynomial")
    fig.suptitle("Characteristic polynomial of a 2×2 matrix",
                 fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "characteristic-polynomial-2x2.png")


def figure_characteristic_polynomial_3x3():
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    A = np.array([[2, 0, 1], [0, 3, 0], [1, 0, 2]])
    axes[0].axis("off")
    axes[0].text(0.5, 0.70, "A = [[2, 0, 1],\n     [0, 3, 0],\n     [1, 0, 2]]",
                 ha="center", va="center", fontsize=14,
                 fontfamily="monospace", transform=axes[0].transAxes)
    eigvals = np.linalg.eigvals(A)
    real_eigs = sorted([lam.real for lam in eigvals if abs(lam.imag) < 1e-8], reverse=True)
    axes[0].text(0.5, 0.32, f"eigenvalues: {', '.join(f'{e:.1f}' for e in real_eigs)}",
                 ha="center", va="center", fontsize=12, color="#dc2626",
                 fontweight="bold", transform=axes[0].transAxes)
    axes[0].text(0.5, 0.15, "p_A(λ) is a cubic polynomial",
                 ha="center", va="center", fontsize=11, color="#6b7280",
                 transform=axes[0].transAxes)
    _plot_char_poly(axes[1], A, lam_range=(0, 4.5), title="Characteristic polynomial (cubic)")
    fig.suptitle("Characteristic polynomial of a 3×3 matrix",
                 fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "characteristic-polynomial-3x3.png")


# ── 5. diagonalization-three-steps.png ──────────────────────────────────


def figure_diagonalization_three_steps():
    A = np.array([[4, -2], [1, 1]])
    eigvals, eigvecs = np.linalg.eig(A)
    # Order non-increasingly
    idx = np.argsort(-eigvals.real)
    eigvals = eigvals[idx].real
    eigvecs = eigvecs[:, idx].real
    P = eigvecs
    D = np.diag(eigvals)
    Pinv = np.linalg.inv(P)

    x = np.array([1.5, 1.0])
    stages = [
        (np.eye(2), x, "x"),
        (Pinv, Pinv @ x, "P⁻¹·x"),
        (D @ Pinv, D @ Pinv @ x, "D·P⁻¹·x"),
    ]

    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    titles = ["Step 1: change to eigenbasis (P⁻¹)",
              "Step 2: scale along eigendirections (D)",
              "Step 3: change back (P)"]
    transforms = [Pinv, D @ Pinv, A]
    for ax, T, title in zip(axes, transforms, titles):
        # Standard light grid
        for v in np.linspace(-3, 3, 13):
            ax.plot([v, v], [-3, 3], color="#e5e7eb", lw=0.5)
            ax.plot([-3, 3], [v, v], color="#e5e7eb", lw=0.5)
        draw_transformed_grid(ax, T, color="#7c3aed", alpha=0.5, lim=2)
        # Eigenvectors as dashed lines under T
        for i, lam in enumerate(eigvals):
            v = eigvecs[:, i]
            v = v / np.linalg.norm(v)
            color = ["#2563eb", "#059669"][i]
            ax.plot([-3 * v[0], 3 * v[0]], [-3 * v[1], 3 * v[1]],
                    color=color, lw=1.5, alpha=0.6, ls="--")
        # Probe vector under T
        tx = T @ x
        draw_vector(ax, (0, 0), tx, color="#dc2626", lw=2.5)
        set_square(ax, 4, title)
    Ax = A @ x
    fig.suptitle(f"A = P·D·P⁻¹ for A = [[4, −2], [1, 1]]   →   A·x = ({Ax[0]:.2f}, {Ax[1]:.2f})",
                 fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "diagonalization-three-steps.png")


# ── 6. defective-matrix.png ─────────────────────────────────────────────


def figure_defective_matrix():
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    J = np.array([[2, 1], [0, 2]], float)

    # Left: matrix info
    axes[0].axis("off")
    axes[0].text(0.5, 0.75, "J₂ = [[2, 1], [0, 2]]",
                 ha="center", va="center", fontsize=16,
                 fontfamily="monospace", transform=axes[0].transAxes)
    axes[0].text(0.5, 0.50, r"$p_{J_2}(\lambda) = (\lambda - 2)^2$",
                 ha="center", va="center", fontsize=14, transform=axes[0].transAxes)
    axes[0].text(0.5, 0.28, "algebraic multiplicity 2, geometric multiplicity 1",
                 ha="center", va="center", fontsize=11, color="#dc2626",
                 fontweight="bold", transform=axes[0].transAxes)
    axes[0].text(0.5, 0.13, "defective — no eigenbasis",
                 ha="center", va="center", fontsize=11, color="#6b7280",
                 transform=axes[0].transAxes)

    # Right: action on unit square
    ax = axes[1]
    square = np.array([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]).T
    Jsq = J @ square
    ax.fill(square[0], square[1], color="#9ca3af", alpha=0.3, label="unit square")
    ax.fill(Jsq[0], Jsq[1], color="#7c3aed", alpha=0.3, label="J₂(unit square)")
    ax.plot(square[0], square[1], color="#9ca3af", lw=1.5)
    ax.plot(Jsq[0], Jsq[1], color="#7c3aed", lw=2)
    # Eigenvector (x-axis)
    ax.plot([-1, 4], [0, 0], color="#2563eb", lw=2.5, alpha=0.9)
    ax.annotate("only eigenvector\n(x-axis, λ = 2)",
                (3.5, 0.15), color="#2563eb", fontweight="bold")
    ax.legend(loc="upper left", fontsize=9)
    set_square(ax, 4, "J₂ stretches and shears — no second eigendirection")
    fig.suptitle("A defective 2×2 matrix",
                 fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "defective-matrix.png")


# ── 7. spectral-theorem-ellipse.png ─────────────────────────────────────


def figure_spectral_theorem_ellipse():
    A = np.array([[3, 2], [2, 3]], float)
    eigvals, eigvecs = np.linalg.eigh(A)
    idx = np.argsort(-eigvals)
    eigvals = eigvals[idx]
    eigvecs = eigvecs[:, idx]

    fig, axes = plt.subplots(1, 2, figsize=(15, 5))

    # Left: unit circle
    ax = axes[0]
    theta = np.linspace(0, 2 * np.pi, 200)
    circle = np.array([np.cos(theta), np.sin(theta)])
    ax.plot(circle[0], circle[1], color="#9ca3af", lw=1.5)
    ax.fill(circle[0], circle[1], color="#9ca3af", alpha=0.15)
    for i in range(2):
        v = eigvecs[:, i]
        color = ["#2563eb", "#059669"][i]
        ax.plot([0, v[0]], [0, v[1]], color=color, lw=2.5)
        ax.annotate(f"q_{i+1}",
                    (v[0] * 1.1, v[1] * 1.1),
                    color=color, fontweight="bold", fontsize=11)
    set_square(ax, 6, "Unit circle (with eigenvector directions)")

    # Right: image ellipse
    ax = axes[1]
    image = A @ circle
    ax.plot(image[0], image[1], color="#7c3aed", lw=2.25, ls="--")
    ax.fill(image[0], image[1], color="#7c3aed", alpha=0.1)
    for i in range(2):
        v = eigvecs[:, i] * eigvals[i]
        color = ["#2563eb", "#059669"][i]
        ax.plot([0, v[0]], [0, v[1]], color=color, lw=2.5)
        ax.annotate(f"λ_{i+1} q_{i+1}  (λ = {eigvals[i]:.1f})",
                    (v[0] * 1.08, v[1] * 1.08),
                    color=color, fontweight="bold", fontsize=10)
    set_square(ax, 6, "A · (unit circle) = ellipse with principal axes")
    fig.suptitle(f"Spectral theorem: A = [[3, 2], [2, 3]]   →   A = QΛQᵀ, eigenvalues {eigvals[0]:.0f} and {eigvals[1]:.0f}",
                 fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "spectral-theorem-ellipse.png")


# ── 8. quadratic-form-zoo.png ───────────────────────────────────────────


def _plot_contour(ax, A, levels, title, lim=2.5):
    xs = np.linspace(-lim, lim, 100)
    ys = np.linspace(-lim, lim, 100)
    X, Y = np.meshgrid(xs, ys)
    Z = A[0, 0] * X**2 + 2 * A[0, 1] * X * Y + A[1, 1] * Y**2
    cs = ax.contour(X, Y, Z, levels=levels, cmap="viridis", linewidths=1.5)
    ax.clabel(cs, inline=True, fontsize=8, fmt="%.1f")
    # Eigenvectors
    eigvals, eigvecs = np.linalg.eigh(A)
    for i in range(2):
        v = eigvecs[:, i]
        color = ["#2563eb", "#059669"][i]
        ax.plot([-lim * v[0], lim * v[0]], [-lim * v[1], lim * v[1]],
                color=color, lw=1.8, ls="--", alpha=0.85)
    set_square(ax, lim, title)


def figure_quadratic_form_zoo():
    fig, axes = plt.subplots(1, 5, figsize=(20, 4.5))
    cases = [
        (np.eye(2), [0.5, 1, 2, 4], "Pos-def isotropic\n(circular)"),
        (np.diag([4, 1]), [0.5, 1, 2, 4], "Pos-def elongated\n(elliptical)"),
        (np.array([[1, 0], [0, 0]], float), [0.25, 1, 2.25, 4], "Pos-semidef\n(parallel lines)"),
        (np.diag([1, -1]), [-2, -0.5, 0, 0.5, 2], "Indefinite\n(saddle)"),
        (np.diag([-2, -1]), [-4, -2, -1, -0.5], "Neg-def\n(dome)"),
    ]
    for ax, (A, levels, title) in zip(axes, cases):
        _plot_contour(ax, A, levels, title)
    fig.suptitle("Quadratic forms by definiteness — contour topologies",
                 fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "quadratic-form-zoo.png")


# ── 9. rayleigh-quotient-circle.png ─────────────────────────────────────


def figure_rayleigh_quotient_circle():
    A = np.array([[3, 2], [2, 3]], float)
    eigvals, eigvecs = np.linalg.eigh(A)
    idx = np.argsort(-eigvals)
    eigvals = eigvals[idx]
    eigvecs = eigvecs[:, idx]

    fig, axes = plt.subplots(1, 2, figsize=(15, 5))

    # Left: unit circle with eigenvector directions
    ax = axes[0]
    theta = np.linspace(0, 2 * np.pi, 200)
    ax.plot(np.cos(theta), np.sin(theta), color="#9ca3af", lw=1.5)
    for i in range(2):
        v = eigvecs[:, i]
        color = ["#2563eb", "#059669"][i]
        ax.plot([-2 * v[0], 2 * v[0]], [-2 * v[1], 2 * v[1]],
                color=color, lw=2, alpha=0.85)
        ang = np.arctan2(v[1], v[0])
        ax.annotate(f"q_{i+1} (λ = {eigvals[i]:.0f})",
                    (np.cos(ang) * 1.15, np.sin(ang) * 1.15),
                    color=color, fontweight="bold", fontsize=10)
    set_square(ax, 2, "Unit circle and eigenvector directions")

    # Right: Rayleigh quotient vs theta
    ax = axes[1]
    theta_dense = np.linspace(0, 2 * np.pi, 400)
    R = np.array([np.cos(t) ** 2 * A[0, 0] + 2 * np.cos(t) * np.sin(t) * A[0, 1]
                  + np.sin(t) ** 2 * A[1, 1]
                  for t in theta_dense])
    ax.plot(theta_dense, R, color="#7c3aed", lw=2.25)
    ax.axhline(eigvals[0], color="#2563eb", ls="--", lw=1.5)
    ax.axhline(eigvals[1], color="#059669", ls="--", lw=1.5)
    ax.text(2 * np.pi - 0.2, eigvals[0] + 0.15, f"λ_max = {eigvals[0]:.0f}",
            color="#2563eb", ha="right", fontweight="bold", fontsize=10)
    ax.text(2 * np.pi - 0.2, eigvals[1] - 0.35, f"λ_min = {eigvals[1]:.0f}",
            color="#059669", ha="right", fontweight="bold", fontsize=10)
    ax.set_xlabel("θ")
    ax.set_ylabel("R_A(x(θ))")
    ax.set_xticks([0, np.pi / 2, np.pi, 3 * np.pi / 2, 2 * np.pi])
    ax.set_xticklabels(["0", "π/2", "π", "3π/2", "2π"])
    ax.set_title("Rayleigh quotient on the unit circle")
    fig.suptitle("Rayleigh quotient extrema are the eigenvalues",
                 fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "rayleigh-quotient-circle.png")


# ── 10. courant-fischer-subspaces.png ───────────────────────────────────


def figure_courant_fischer_subspaces():
    A = np.diag([3.0, 2.0, 1.0])
    eigvals = np.linalg.eigvalsh(A)
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))

    titles = [
        f"Free max over all unit x: λ_max = {eigvals[-1]:.0f}",
        f"Max over 2D subspace ⊥ q₃: λ₂ = {eigvals[-2]:.0f}",
        f"Constrained to 1D subspace: a single value",
    ]
    # We'll just illustrate with bar plots showing the achievable range
    for ax, t, scenario in zip(axes, titles, ["free", "2d-perp-q3", "1d"]):
        if scenario == "free":
            ax.bar([0], [eigvals[-1]], color="#2563eb", alpha=0.7, width=0.4)
            ax.set_ylim(0, 3.5)
            ax.set_xticks([0])
            ax.set_xticklabels(["max R_A"])
        elif scenario == "2d-perp-q3":
            ax.bar([0], [eigvals[-2]], color="#059669", alpha=0.7, width=0.4)
            ax.set_ylim(0, 3.5)
            ax.set_xticks([0])
            ax.set_xticklabels(["max R_A | x ⊥ q₃"])
        else:
            ax.bar([0], [1.7], color="#d97706", alpha=0.7, width=0.4)
            ax.set_ylim(0, 3.5)
            ax.set_xticks([0])
            ax.set_xticklabels(["R_A on a 1D subspace"])
        ax.axhline(eigvals[-1], color="#2563eb", ls="--", lw=1, alpha=0.6)
        ax.axhline(eigvals[0], color="#059669", ls="--", lw=1, alpha=0.6)
        ax.text(0.05, eigvals[-1] - 0.06, f"λ_max = {eigvals[-1]:.0f}",
                color="#2563eb", fontsize=9, transform=ax.transAxes)
        ax.text(0.05, eigvals[0] / 3.5 - 0.04, f"λ_min = {eigvals[0]:.0f}",
                color="#059669", fontsize=9, transform=ax.transAxes)
        ax.set_title(t, fontsize=10)
        ax.set_ylabel("Rayleigh quotient")
        ax.grid(True, alpha=0.25, axis="y")
    fig.suptitle("Courant-Fischer: max-min over subspaces gives every eigenvalue",
                 fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "courant-fischer-subspaces.png")


# ── 11. principal-axes-unified.png ──────────────────────────────────────


def figure_principal_axes_unified():
    fig, axes = plt.subplots(2, 2, figsize=(13, 11))
    Sigma = np.array([[4, 2], [2, 2]], float)
    eigvals, eigvecs = np.linalg.eigh(Sigma)
    idx = np.argsort(-eigvals)
    eigvals = eigvals[idx]
    eigvecs = eigvecs[:, idx]

    # Top-left: data ellipse (covariance)
    ax = axes[0, 0]
    theta = np.linspace(0, 2 * np.pi, 200)
    pts = np.array([np.cos(theta), np.sin(theta)])
    # Map unit circle by sqrt(Sigma) to get the 1-std contour
    L = eigvecs @ np.diag(np.sqrt(eigvals))
    ellipse_pts = L @ pts
    ax.plot(ellipse_pts[0], ellipse_pts[1], color="#7c3aed", lw=2.25)
    ax.fill(ellipse_pts[0], ellipse_pts[1], color="#7c3aed", alpha=0.15)
    rng = np.random.RandomState(0)
    samples = rng.multivariate_normal([0, 0], Sigma, size=200)
    ax.plot(samples[:, 0], samples[:, 1], "o", color="#6b7280", ms=2, alpha=0.4)
    for i in range(2):
        v = eigvecs[:, i] * np.sqrt(eigvals[i])
        color = ["#2563eb", "#059669"][i]
        ax.plot([0, v[0]], [0, v[1]], color=color, lw=2.5)
    set_square(ax, 4, "Data ellipse: covariance Σ\n(eigenvectors = principal components)")

    # Top-right: loss landscape (Hessian)
    ax = axes[0, 1]
    H = np.array([[5, 1], [1, 1]], float)
    eigH, eigVH = np.linalg.eigh(H)
    idx2 = np.argsort(-eigH)
    eigH = eigH[idx2]
    eigVH = eigVH[:, idx2]
    xs = np.linspace(-3, 3, 100)
    ys = np.linspace(-3, 3, 100)
    X, Y = np.meshgrid(xs, ys)
    Z = H[0, 0] * X**2 + 2 * H[0, 1] * X * Y + H[1, 1] * Y**2
    cs = ax.contour(X, Y, Z, levels=[1, 3, 6, 12], cmap="viridis", linewidths=1.5)
    ax.clabel(cs, inline=True, fontsize=8, fmt="%.0f")
    for i in range(2):
        v = eigVH[:, i]
        color = ["#2563eb", "#059669"][i]
        ax.plot([-3 * v[0], 3 * v[0]], [-3 * v[1], 3 * v[1]],
                color=color, lw=2, ls="--", alpha=0.85)
    set_square(ax, 3, "Loss landscape: Hessian H\n(eigenvectors = principal curvatures)")

    # Bottom-left: whitening
    ax = axes[1, 0]
    W = eigvecs @ np.diag(1.0 / np.sqrt(eigvals)) @ eigvecs.T
    whitened = (W @ samples.T).T
    ax.plot(whitened[:, 0], whitened[:, 1], "o", color="#6b7280", ms=2, alpha=0.4)
    circ = np.array([np.cos(theta), np.sin(theta)])
    ax.plot(circ[0], circ[1], color="#dc2626", lw=2.25)
    set_square(ax, 3, "Whitening: Σ^(−1/2) Σ Σ^(−1/2) = I\n(data ellipse → unit circle)")

    # Bottom-right: generic ellipsoid
    ax = axes[1, 1]
    A = np.array([[3, 0.5], [0.5, 1]], float)
    eigA, eigVA = np.linalg.eigh(A)
    idx3 = np.argsort(-eigA)
    eigA = eigA[idx3]
    eigVA = eigVA[:, idx3]
    L2 = eigVA @ np.diag(1.0 / np.sqrt(eigA)) @ eigVA.T
    boundary = L2 @ pts
    ax.plot(boundary[0], boundary[1], color="#7c3aed", lw=2.25)
    ax.fill(boundary[0], boundary[1], color="#7c3aed", alpha=0.15)
    for i in range(2):
        v = eigVA[:, i] / np.sqrt(eigA[i])
        color = ["#2563eb", "#059669"][i]
        ax.plot([0, v[0]], [0, v[1]], color=color, lw=2.5)
    set_square(ax, 2, "Generic ellipsoid: xᵀAx = 1\n(eigenvectors = principal axes)")

    fig.suptitle("The same spectral picture, four contexts",
                 fontsize=13, fontweight="bold", y=1.0)
    plt.tight_layout()
    save_and_close(fig, "principal-axes-unified.png")


# ── 12. gradient-descent-spectrum.png ───────────────────────────────────


def figure_gradient_descent_spectrum():
    H = np.diag([100.0, 1.0])
    # Loss landscape: L(theta) = 0.5 * theta^T H theta
    fig, axes = plt.subplots(1, 3, figsize=(16, 5))

    # Panel 1: contour with eigenvector axes
    ax = axes[0]
    xs = np.linspace(-1.5, 1.5, 100)
    ys = np.linspace(-1.5, 1.5, 100)
    X, Y = np.meshgrid(xs, ys)
    Z = 0.5 * (H[0, 0] * X**2 + H[1, 1] * Y**2)
    cs = ax.contour(X, Y, Z, levels=20, cmap="viridis", linewidths=1.2, alpha=0.7)
    ax.set_aspect("equal")
    ax.set_xlabel("θ₁")
    ax.set_ylabel("θ₂")
    ax.set_title("Quadratic loss contours\nκ = λ_max/λ_min = 100")
    ax.grid(True, alpha=0.25)

    # Panel 2: trajectories at 3 step sizes
    ax = axes[1]
    cs2 = ax.contour(X, Y, Z, levels=15, cmap="viridis", linewidths=0.8, alpha=0.5)
    eta_optimal = 2 / (H[0, 0] + H[1, 1])
    etas = [eta_optimal * 0.3, eta_optimal, eta_optimal * 0.985]
    labels = ["η too small", "η optimal", "η too large"]
    colors_traj = ["#9ca3af", "#2563eb", "#dc2626"]
    theta0 = np.array([1.0, 1.4])
    for eta, lbl, color in zip(etas, labels, colors_traj):
        traj = [theta0.copy()]
        t = theta0.copy()
        for _ in range(30):
            t = t - eta * (H @ t)
            traj.append(t.copy())
        traj = np.array(traj)
        ax.plot(traj[:, 0], traj[:, 1], "o-", color=color, ms=4, lw=1.5,
                alpha=0.85, label=lbl)
    ax.legend(loc="lower left", fontsize=9)
    ax.set_aspect("equal")
    ax.set_xlim(-1.5, 1.5)
    ax.set_ylim(-1.5, 1.5)
    ax.set_xlabel("θ₁")
    ax.set_ylabel("θ₂")
    ax.set_title("Gradient descent trajectories")
    ax.grid(True, alpha=0.25)

    # Panel 3: loss vs iteration
    ax = axes[2]
    for eta, lbl, color in zip(etas, labels, colors_traj):
        losses = []
        t = theta0.copy()
        for _ in range(100):
            losses.append(0.5 * t @ H @ t)
            t = t - eta * (H @ t)
        ax.semilogy(losses, color=color, lw=1.8, label=lbl)
    # Newton: converges in one step
    ax.plot([0, 1], [0.5 * theta0 @ H @ theta0, 1e-30], "o--",
            color="#059669", lw=1.8, ms=5, label="Newton (1 step)")
    ax.set_xlabel("iteration k")
    ax.set_ylabel("L(θ_k)  (log)")
    ax.set_title("Convergence rate")
    ax.legend(loc="upper right", fontsize=9)
    ax.grid(True, alpha=0.25, which="both")
    fig.suptitle("Gradient descent on a quadratic loss with κ = 100",
                 fontsize=12, fontweight="bold", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "gradient-descent-spectrum.png")


# ── Main ────────────────────────────────────────────────────────────────


def main():
    figs = [
        figure_invariant_directions_zoo,
        figure_eigenspace_examples,
        figure_characteristic_polynomial_2x2,
        figure_characteristic_polynomial_3x3,
        figure_diagonalization_three_steps,
        figure_defective_matrix,
        figure_spectral_theorem_ellipse,
        figure_quadratic_form_zoo,
        figure_rayleigh_quotient_circle,
        figure_courant_fischer_subspaces,
        figure_principal_axes_unified,
        figure_gradient_descent_spectrum,
    ]
    print(f"Generating {len(figs)} figures to {OUT_DIR}...")
    for fn in figs:
        fn()
    print(f"\nAll {len(figs)} figures regenerated.")


if __name__ == "__main__":
    main()
