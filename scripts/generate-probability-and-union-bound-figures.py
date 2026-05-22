#!/usr/bin/env python3
"""
Generate the 9 static figures for Topic 35 (Probability & The Union Bound).

Targets public/images/topics/probability-and-union-bound/, with filenames
matching the handoff brief's §9 figure table:

  1.  union-bound-tightness.png        §1, §4
  2.  inclusion-exclusion-3-event.png  §5
  3.  borel-cantelli-divergence.png    §6
  4.  markov-geometric.png             §7
  5.  concentration-ladder.png         §8
  6.  hoeffding-derivation-steps.png   §8
  7.  pac-bound.png                    §9
  8.  multiple-testing-bonferroni.png  §11
  9.  bandit-ucb-confidence-bands.png  §12

Library scope: NumPy + SciPy + Matplotlib only (per CLAUDE.md + brief §11).
No SymPy, no Pandas. matplotlib mathtext does not parse \\begin{pmatrix};
ASCII bracket notation is used for any tabular displays inside figures.

Run once:

    python3 scripts/generate-probability-and-union-bound-figures.py

The script is idempotent — running it twice produces byte-identical output
modulo matplotlib version differences in font hinting.
"""

from __future__ import annotations

from pathlib import Path
from math import comb

import numpy as np
import scipy.stats as stats
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, FancyArrowPatch

OUT_DIR = (
    Path(__file__).resolve().parents[1]
    / "public"
    / "images"
    / "topics"
    / "probability-and-union-bound"
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

# Probability Foundations track color (fuchsia) + a small palette to keep the
# figures visually coherent across the topic.
C_FUCHSIA = "#C026D3"
C_BLUE = "#2563EB"
C_RED = "#DC2626"
C_GREEN = "#16A34A"
C_ORANGE = "#F97316"
C_PURPLE = "#7C3AED"
C_GREY = "#6B7280"
C_LIGHT = "#CBD5E1"
C_INK = "#0F172A"


def save_and_close(fig, name: str) -> None:
    path = OUT_DIR / name
    fig.savefig(path)
    plt.close(fig)
    print(f"  wrote {path.relative_to(OUT_DIR.parents[3])}")


# ── 1. union-bound-tightness.png ─────────────────────────────────────


def figure_union_bound_tightness() -> None:
    """Three-panel: disjoint / uniform-overlap / nested. Each shows three circles
    on the unit square with exact union and Σ P(A_i) annotated."""

    def circle_area(r: float) -> float:
        return float(np.pi * r * r)

    def union_area_mc(circles, n: int = 4000) -> float:
        """Deterministic Halton-grid estimate of union area on [0,1]²."""
        def halton(i: int, base: int) -> float:
            f, r = 1.0, 0.0
            while i > 0:
                f /= base
                r += f * (i % base)
                i //= base
            return r
        pts = np.array([[halton(i + 1, 2), halton(i + 1, 3)] for i in range(n)])
        inside = np.zeros(n, dtype=bool)
        for (cx, cy, r) in circles:
            inside |= (pts[:, 0] - cx) ** 2 + (pts[:, 1] - cy) ** 2 <= r * r
        return float(inside.mean())

    configs = {
        "disjoint": [(0.22, 0.22, 0.13), (0.78, 0.22, 0.13), (0.78, 0.78, 0.13)],
        "uniform-overlap": [
            (0.50, 0.34, 0.22),
            (0.638, 0.58, 0.22),
            (0.362, 0.58, 0.22),
        ],
        "nested": [(0.50, 0.50, 0.28), (0.50, 0.50, 0.22), (0.50, 0.50, 0.16)],
    }
    colors = [C_FUCHSIA, C_BLUE, C_GREEN]

    fig, axes = plt.subplots(1, 3, figsize=(12, 4.2))
    for ax, (name, circles) in zip(axes, configs.items()):
        for (cx, cy, r), col in zip(circles, colors):
            ax.add_patch(Circle((cx, cy), r, facecolor=col, edgecolor=col,
                                alpha=0.32, lw=1.6))
        ax.add_patch(Rectangle((0, 0), 1, 1, fill=False, edgecolor=C_GREY, lw=1))
        ax.set_xlim(-0.05, 1.05)
        ax.set_ylim(-0.05, 1.05)
        ax.set_aspect("equal")
        ax.set_xticks([0, 0.5, 1])
        ax.set_yticks([0, 0.5, 1])

        sum_marg = sum(circle_area(c[2]) for c in circles)
        exact = union_area_mc(circles)
        ratio = sum_marg / exact if exact > 0 else float("inf")
        ax.set_title(
            f"{name}\nexact P(∪) = {exact:.3f}   "
            f"Σ P(Aᵢ) = {sum_marg:.3f}   ratio = {ratio:.2f}×",
            fontsize=10,
        )

    fig.suptitle(
        "Union-bound tightness across three overlap configurations",
        y=1.02,
        fontsize=11,
    )
    plt.tight_layout()
    save_and_close(fig, "union-bound-tightness.png")


# ── 2. inclusion-exclusion-3-event.png ───────────────────────────────


def figure_inclusion_exclusion_3_event() -> None:
    """Three overlapping circles with the 7 regions annotated by inclusion–exclusion
    term contributions."""
    fig, ax = plt.subplots(figsize=(8.2, 6))

    # Three circles of equal radius arranged symmetrically.
    r = 0.36
    centers = [(0.0, 0.20), (0.30, -0.20), (-0.30, -0.20)]
    colors = [C_FUCHSIA, C_BLUE, C_GREEN]
    labels = ["A", "B", "C"]

    for (cx, cy), col, lab in zip(centers, colors, labels):
        ax.add_patch(Circle((cx, cy), r, facecolor=col, edgecolor=col, alpha=0.32, lw=2))
        # Outer label
        offset = np.array([cx, cy]) / np.linalg.norm([cx, cy] + np.array([1e-9, 0]))
        ax.text(cx + 0.55 * offset[0], cy + 0.55 * offset[1], lab,
                fontsize=18, fontweight="bold", color=col, ha="center", va="center")

    # Region annotations (approximate centroids).
    # 3 singletons (k=1, sign +): A only, B only, C only.
    ax.text(0.0, 0.55, "A only\n(+)", fontsize=9, ha="center", color=C_FUCHSIA)
    ax.text(0.52, -0.36, "B only\n(+)", fontsize=9, ha="center", color=C_BLUE)
    ax.text(-0.52, -0.36, "C only\n(+)", fontsize=9, ha="center", color=C_GREEN)
    # 3 pairs (k=2, sign −): AB only, AC only, BC only.
    ax.text(0.22, 0.02, "A∩B\n(−)", fontsize=9, ha="center", color=C_INK)
    ax.text(-0.22, 0.02, "A∩C\n(−)", fontsize=9, ha="center", color=C_INK)
    ax.text(0.0, -0.32, "B∩C\n(−)", fontsize=9, ha="center", color=C_INK)
    # 1 triple (k=3, sign +): ABC.
    ax.text(0.0, -0.10, "A∩B∩C\n(+)", fontsize=9, ha="center",
            color=C_INK, fontweight="bold",
            bbox=dict(facecolor="white", edgecolor="none", alpha=0.7, boxstyle="round"))

    ax.set_xlim(-1.0, 1.0)
    ax.set_ylim(-0.85, 0.95)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(
        "Inclusion–exclusion (3 events):\n"
        "P(A∪B∪C) = P(A)+P(B)+P(C) − P(A∩B)−P(A∩C)−P(B∩C) + P(A∩B∩C)",
        fontsize=11,
    )
    plt.tight_layout()
    save_and_close(fig, "inclusion-exclusion-3-event.png")


# ── 3. borel-cantelli-divergence.png ─────────────────────────────────


def figure_borel_cantelli_divergence() -> None:
    """Two-panel: partial sum + trajectory pair."""
    rng = np.random.default_rng(7)
    N = 2000
    n_idx = np.arange(1, N + 1)

    p_conv = 1.0 / n_idx ** 2          # BC-I
    p_div = 1.0 / n_idx                # BC-II

    n_trials = 8
    traj_conv = np.cumsum(rng.uniform(size=(n_trials, N)) < p_conv[None, :], axis=1)
    traj_div = np.cumsum(rng.uniform(size=(n_trials, N)) < p_div[None, :], axis=1)
    sum_conv = np.cumsum(p_conv)
    sum_div = np.cumsum(p_div)

    fig, (axL, axR) = plt.subplots(1, 2, figsize=(12, 4.4))

    # BC-I panel.
    for j in range(n_trials):
        axL.plot(n_idx, traj_conv[j], color=C_BLUE, alpha=0.4, lw=1)
    axL.plot(n_idx, sum_conv, color=C_FUCHSIA, lw=2, label="partial sum Σ pₙ")
    axL.set_xscale("log")
    axL.set_title(f"BC-I:  pₙ = 1/n²,  Σ pₙ < ∞ (→ π²/6 ≈ {np.pi**2/6:.3f})")
    axL.set_xlabel("n")
    axL.set_ylabel("cumulative # of occurrences")
    axL.legend(loc="upper left", frameon=False)

    # BC-II panel.
    for j in range(n_trials):
        axR.plot(n_idx, traj_div[j], color=C_RED, alpha=0.4, lw=1)
    axR.plot(n_idx, sum_div, color=C_FUCHSIA, lw=2, label="partial sum Σ pₙ")
    axR.set_xscale("log")
    axR.set_title("BC-II:  pₙ = 1/n,  Σ pₙ = ∞")
    axR.set_xlabel("n")
    axR.set_ylabel("cumulative # of occurrences")
    axR.legend(loc="upper left", frameon=False)

    fig.suptitle("Borel–Cantelli regimes — trajectory simulation", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "borel-cantelli-divergence.png")


# ── 4. markov-geometric.png ──────────────────────────────────────────


def figure_markov_geometric() -> None:
    """Survival curve P(X > t) with the Markov rectangle shaded; the area
    of the rectangle equals a · P(X ≥ a) ≤ E[X] = area under the curve."""
    # Use an exponential survival curve as a clean pedagogical example.
    lam = 1.0
    t = np.linspace(0, 5, 400)
    survival = np.exp(-lam * t)  # P(X > t) for Exp(1)
    a = 1.5
    p_geq_a = float(np.exp(-lam * a))

    fig, ax = plt.subplots(figsize=(7.8, 4.5))

    # Survival curve and shaded total area = E[X].
    ax.fill_between(t, 0, survival, color=C_LIGHT, alpha=0.7,
                    label="E[X] = ∫₀^∞ P(X > t) dt = total area")
    ax.plot(t, survival, color=C_INK, lw=2)

    # Markov rectangle of width a, height P(X ≥ a).
    ax.add_patch(Rectangle((0, 0), a, p_geq_a, facecolor=C_FUCHSIA, alpha=0.55,
                           edgecolor=C_FUCHSIA, lw=2,
                           label=f"Markov rectangle: width a = {a},  height P(X ≥ a) ≈ {p_geq_a:.3f}"))

    # Annotation lines.
    ax.axvline(a, color=C_FUCHSIA, ls=":", lw=1.2, alpha=0.7)
    ax.axhline(p_geq_a, color=C_FUCHSIA, ls=":", lw=1.2, alpha=0.7)
    ax.annotate("P(X ≥ a)", xy=(0.02, p_geq_a), xytext=(0.06, p_geq_a + 0.04),
                fontsize=10, color=C_FUCHSIA)
    ax.annotate("a", xy=(a, 0.02), xytext=(a + 0.06, 0.05),
                fontsize=11, color=C_FUCHSIA)

    ax.set_xlim(0, 5)
    ax.set_ylim(0, 1.05)
    ax.set_xlabel("t")
    ax.set_ylabel("P(X > t)")
    ax.set_title("Markov's inequality, geometrically: a · P(X ≥ a) ≤ E[X]")
    ax.legend(loc="upper right", frameon=False, fontsize=9)
    plt.tight_layout()
    save_and_close(fig, "markov-geometric.png")


# ── 5. concentration-ladder.png ──────────────────────────────────────


def figure_concentration_ladder() -> None:
    """For Bernoulli(0.5) sample mean with n=100, overlay
    empirical / Markov / Chebyshev / Hoeffding tail probabilities."""
    rng = np.random.default_rng(13)
    n = 100
    n_mc = 200_000
    means = rng.binomial(n, 0.5, size=n_mc) / n
    deviations = np.abs(means - 0.5)

    eps = np.linspace(0.01, 0.49, 80)
    emp = np.array([(deviations >= e).mean() for e in eps])
    emp = np.maximum(emp, 1e-7)  # floor for log axis
    # Markov on |X|: vacuous (≤ E[|X|]/a ≤ 1/a for X ∈ [0,1]; in this case = 0.5/eps).
    markov = np.minimum(0.5 / eps, 1.0)
    chebyshev = np.minimum(0.25 / (n * eps ** 2), 1.0)
    hoeffding = np.minimum(2 * np.exp(-2 * n * eps ** 2), 1.0)

    fig, ax = plt.subplots(figsize=(8.5, 5))
    ax.plot(eps, emp, "o", markersize=3, color=C_INK, label="empirical tail (MC)")
    ax.plot(eps, markov, "-", lw=1.6, color=C_GREY, alpha=0.85,
            label="Markov on |X|  (vacuous here)")
    ax.plot(eps, chebyshev, "-", lw=2, color=C_ORANGE, label="Chebyshev σ²/(n ε²)")
    ax.plot(eps, hoeffding, "-", lw=2, color=C_RED, label="Hoeffding 2 exp(−2 n ε²)")
    ax.set_yscale("log")
    ax.set_ylim(1e-12, 1.5)
    ax.set_xlabel("ε")
    ax.set_ylabel(r"P(|$\bar X_n$ − μ| ≥ ε)")
    ax.set_title(f"Concentration ladder for Bernoulli(0.5) sample mean, n = {n}")
    ax.legend(loc="upper right", frameon=False)
    plt.tight_layout()
    save_and_close(fig, "concentration-ladder.png")


# ── 6. hoeffding-derivation-steps.png ────────────────────────────────


def figure_hoeffding_derivation_steps() -> None:
    """Annotated proof-flow schematic for the 5-step Hoeffding derivation.
    Hand-laid-out matplotlib boxes + arrows — no LaTeX matrix environments."""
    fig, ax = plt.subplots(figsize=(11, 5.4))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 5)
    ax.axis("off")

    boxes = [
        (0.4, 2.0, "Step 1\n\nMarkov on e^{λS_n}\n\n"
                   "P(S_n ≥ t) ≤ e^{−λt} · E[e^{λS_n}]", C_FUCHSIA),
        (2.6, 2.0, "Step 2\n\nIndependence\n\n"
                   "E[e^{λS_n}] = Πᵢ E[e^{λX_i}]", C_BLUE),
        (4.8, 2.0, "Step 3\n\nHoeffding's lemma\n\n"
                   "E[e^{λX_i}] ≤ exp(λ²(bᵢ−aᵢ)²/8)", C_GREEN),
        (7.0, 2.0, "Step 4\n\nCombine\n\n"
                   "P(S_n ≥ t) ≤ exp(−λt + λ²/8 · Σ(bᵢ−aᵢ)²)", C_ORANGE),
        (9.2, 2.0, "Step 5\n\nOptimize over λ\n\n"
                   "λ* = 4t/Σ(bᵢ−aᵢ)²\n\n"
                   "⇒ exp(−2t²/Σ(bᵢ−aᵢ)²)", C_RED),
    ]

    for (x, y, text, col) in boxes:
        ax.add_patch(Rectangle((x, y), 2.0, 1.5, facecolor=col, alpha=0.18,
                               edgecolor=col, lw=2))
        ax.text(x + 1.0, y + 0.75, text, ha="center", va="center", fontsize=9,
                color=C_INK)

    # Arrows between boxes
    arrow_y = 2.75
    for x in [2.4, 4.6, 6.8, 9.0]:
        ax.add_patch(FancyArrowPatch((x, arrow_y), (x + 0.2, arrow_y),
                                     arrowstyle="-|>", mutation_scale=20,
                                     color=C_INK, lw=1.5))

    # Title and footer.
    ax.text(5.5, 4.3, "Hoeffding's inequality — five steps",
            ha="center", va="center", fontsize=13, fontweight="bold", color=C_INK)
    ax.text(5.5, 0.6,
            "Setup: X₁, …, X_n independent, X_i ∈ [a_i, b_i] a.s., E[X_i] = 0.\n"
            "Conclusion: P(S_n ≥ t) ≤ exp(−2 t² / Σ(b_i − a_i)²).",
            ha="center", va="center", fontsize=10, color=C_GREY)

    plt.tight_layout()
    save_and_close(fig, "hoeffding-derivation-steps.png")


# ── 7. pac-bound.png ─────────────────────────────────────────────────


def figure_pac_bound() -> None:
    """Three-panel: (a) per-hypothesis Hoeffding tail, (b) union-bound stacking
    over |H|=10, 100, 1000, (c) PAC deviation vs n for several |H|."""
    fig, axes = plt.subplots(1, 3, figsize=(13.5, 4.5))

    # Panel (a): per-hypothesis Hoeffding.
    n_fixed = 1000
    eps = np.linspace(0.005, 0.20, 200)
    panel_a = 2 * np.exp(-2 * n_fixed * eps ** 2)
    axes[0].plot(eps, panel_a, color=C_RED, lw=2)
    axes[0].set_yscale("log")
    axes[0].set_ylim(1e-8, 2)
    axes[0].set_xlabel("ε")
    axes[0].set_ylabel("per-hypothesis tail")
    axes[0].set_title(f"(a) Single h: 2 exp(−2nε²) at n={n_fixed}")

    # Panel (b): union-bound stacking.
    Hs = [10, 100, 1000]
    cols = [C_BLUE, C_PURPLE, C_FUCHSIA]
    for H, col in zip(Hs, cols):
        axes[1].plot(eps, np.minimum(H * panel_a, 1.0), color=col, lw=2,
                     label=f"|H| = {H}")
    axes[1].set_yscale("log")
    axes[1].set_ylim(1e-6, 2)
    axes[1].set_xlabel("ε")
    axes[1].set_ylabel("union-bound tail  |H| · 2 exp(−2nε²)")
    axes[1].set_title("(b) Union bound: H · per-h tail")
    axes[1].legend(loc="upper right", frameon=False)

    # Panel (c): PAC deviation vs n for several |H| at δ = 0.05.
    n_grid = np.logspace(2, 5, 200)
    delta = 0.05
    for H, col in zip([10, 100, 1000, 10000],
                       [C_BLUE, C_PURPLE, C_FUCHSIA, C_RED]):
        eps_pac = np.sqrt(np.log(2 * H / delta) / (2 * n_grid))
        axes[2].plot(n_grid, eps_pac, color=col, lw=2, label=f"|H| = {H}")
    axes[2].set_xscale("log")
    axes[2].set_yscale("log")
    axes[2].set_xlabel("sample size n")
    axes[2].set_ylabel(r"PAC deviation $\sqrt{\log(2|H|/\delta)/(2n)}$")
    axes[2].set_title(f"(c) PAC deviation vs n (δ = {delta})")
    axes[2].legend(loc="lower left", frameon=False)

    fig.suptitle("PAC generalization bound — Hoeffding × union bound", y=1.02)
    plt.tight_layout()
    save_and_close(fig, "pac-bound.png")


# ── 8. multiple-testing-bonferroni.png ───────────────────────────────


def figure_multiple_testing_bonferroni() -> None:
    """FWER vs number of tests m for three procedures under all-true nulls."""
    alpha = 0.05
    m_grid = np.arange(1, 101)

    fwer_none = 1.0 - (1.0 - alpha) ** m_grid
    fwer_bonferroni = 1.0 - (1.0 - alpha / m_grid) ** m_grid
    # Holm under independence and all-true nulls is identical to Bonferroni in FWER;
    # the gain shows up under positive correlation. We plot both equal for honesty.
    fwer_holm = fwer_bonferroni

    fig, ax = plt.subplots(figsize=(8.5, 4.6))
    ax.plot(m_grid, fwer_none, "-", color=C_RED, lw=2.2,
            label=r"no correction  $1 - (1-\alpha)^m$")
    ax.plot(m_grid, fwer_bonferroni, "-", color=C_BLUE, lw=2.2,
            label="Bonferroni (each test at α/m)")
    ax.plot(m_grid, fwer_holm, "--", color=C_FUCHSIA, lw=2,
            label="Holm step-down (≡ Bonferroni under indep)")
    ax.axhline(alpha, color=C_GREEN, ls=":", lw=1.5,
               label=f"target FWER α = {alpha}")

    ax.set_xlabel("number of tests m")
    ax.set_ylabel("family-wise error rate")
    ax.set_title("FWER under all-true nulls, independent tests")
    ax.legend(loc="center right", frameon=False)
    ax.set_ylim(0, 1.05)
    plt.tight_layout()
    save_and_close(fig, "multiple-testing-bonferroni.png")


# ── 9. bandit-ucb-confidence-bands.png ───────────────────────────────


def figure_bandit_ucb_confidence_bands() -> None:
    """Two-armed bandit with arm means μ_1 = 0.6, μ_2 = 0.5, T = 200 pulls
    alternating. Show running mean ± Hoeffding-via-union-bound confidence width."""
    rng = np.random.default_rng(31)
    T = 200
    means = [0.6, 0.5]
    delta = 0.10  # overall FWER budget

    # Each arm gets T/2 pulls in an alternating schedule for clean visualization.
    sample_path = {0: [], 1: []}
    running_mean = {0: [], 1: []}
    pull_times = {0: [], 1: []}
    for t in range(1, T + 1):
        arm = (t - 1) % 2
        x = rng.binomial(1, means[arm])
        sample_path[arm].append(x)
        running_mean[arm].append(np.mean(sample_path[arm]))
        pull_times[arm].append(t)

    fig, ax = plt.subplots(figsize=(9.5, 4.8))
    cols = [C_FUCHSIA, C_BLUE]
    for arm in (0, 1):
        ts = np.array(pull_times[arm])
        mh = np.array(running_mean[arm])
        n_a = np.arange(1, len(ts) + 1)
        # Union bound across K=2 arms and T time steps for simultaneous coverage:
        width = np.sqrt(np.log(2 * 2 * T / delta) / (2 * n_a))
        ax.plot(ts, mh, color=cols[arm], lw=2,
                label=f"arm {arm + 1} running mean  (true μ = {means[arm]})")
        ax.fill_between(ts, mh - width, mh + width, color=cols[arm], alpha=0.18)
        ax.axhline(means[arm], color=cols[arm], ls=":", lw=1, alpha=0.55)

    ax.set_xlabel("time t")
    ax.set_ylabel("running mean ± Hoeffding/UCB width")
    ax.set_title(
        "Two-arm bandit: Hoeffding × union-bound confidence bands\n"
        f"K = 2 arms, T = {T} pulls, target simultaneous coverage 1 − δ = {1 - delta}"
    )
    ax.set_ylim(0, 1)
    ax.legend(loc="upper right", frameon=False, fontsize=9)
    plt.tight_layout()
    save_and_close(fig, "bandit-ucb-confidence-bands.png")


# ── Main ─────────────────────────────────────────────────────────────


def main() -> None:
    print(f"Writing figures to {OUT_DIR}")
    figure_union_bound_tightness()
    figure_inclusion_exclusion_3_event()
    figure_borel_cantelli_divergence()
    figure_markov_geometric()
    figure_concentration_ladder()
    figure_hoeffding_derivation_steps()
    figure_pac_bound()
    figure_multiple_testing_bonferroni()
    figure_bandit_ucb_confidence_bands()
    print("All figures written.")


if __name__ == "__main__":
    # Make NumPy reproducible for the legacy code paths that don't use a Generator.
    np.random.seed(0)
    main()
