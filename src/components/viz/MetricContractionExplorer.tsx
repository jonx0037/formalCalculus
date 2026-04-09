/**
 * MetricContractionExplorer — flagship viz for Topic 29 (Metric Spaces & Topology).
 *
 * Demonstrates the Banach Contraction Mapping Theorem interactively:
 *  - Three scenarios (2D rotation+scale, 2D nonlinear, 1D Picard-style cobweb)
 *  - Lipschitz constant slider k ∈ [0, 1.2] — boundary at k = 1 is the pedagogical "aha"
 *  - Click-to-set starting point x₀
 *  - Iterate path rendered as a polyline with per-index blue gradient
 *  - Exact fixed point x* displayed as a red marker
 *  - Info panel showing iteration count, d(x_n, x*), the theoretical bound kⁿ/(1−k)·d(x₀, x₁),
 *    and a "contraction ✓ / ✗" verdict based on k.
 *
 * Naming note: named `MetricContractionExplorer` to avoid collision with the
 * pre-existing `ContractionMappingExplorer` (a 1D cobweb diagram used by
 * Topics 12 and 21). See docs/plans for the naming rationale.
 */

import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import { sampleCurve } from './shared/plotting';
import {
  getContractionScenario,
  type ContractionScenario,
} from '../../data/metric-spaces-data';

// ── Constants ─────────────────────────────────────────────────

const SCENARIO_IDS = ['rotation-scale', 'nonlinear', 'picard-cobweb'] as const;
type ScenarioId = (typeof SCENARIO_IDS)[number];

/** Maximum number of iterates to compute and render. Beyond this, the
 *  convergence story is either already told or visibly diverging. */
const MAX_ITERATIONS = 60;

/** Divergence safeguard: stop iterating if any coordinate exceeds this bound. */
const DIVERGENCE_BOUND = 1000;

/** Convergence tolerance: stop iterating once consecutive iterates are this close. */
const CONVERGENCE_TOL = 1e-12;

const FIXED_POINT_COLOR = '#DC2626'; // red
const DIVERGENT_COLOR = '#F97316'; // orange
const START_COLOR = '#6b7280'; // gray
const DIAGONAL_COLOR = '#9ca3af'; // light gray
const CURVE_COLOR = '#2563EB'; // blue (for the 1D T(x) curve)

const margin = { top: 24, right: 20, bottom: 40, left: 50 };

// ── Helpers ───────────────────────────────────────────────────

function euclideanDistance(a: number[], b: number[]): number {
  let sumSq = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sumSq += d * d;
  }
  return Math.sqrt(sumSq);
}

/** Compute the iterate sequence x₀, x₁, …, x_n = Tⁿ(x₀), stopping at
 *  MAX_ITERATIONS, divergence, or convergence. */
function computeIterates(
  scenario: ContractionScenario,
  x0: number[],
  k: number,
): number[][] {
  const iterates: number[][] = [x0.slice()];
  let current = x0.slice();
  for (let n = 0; n < MAX_ITERATIONS; n++) {
    const next = scenario.map(current, k);
    iterates.push(next);
    // Divergence check
    if (next.some((v) => !Number.isFinite(v) || Math.abs(v) > DIVERGENCE_BOUND)) {
      break;
    }
    // Convergence check
    if (euclideanDistance(next, current) < CONVERGENCE_TOL) {
      break;
    }
    current = next;
  }
  return iterates;
}

/** Interpolate from light blue to dark blue for iterate index i ∈ [0, total−1]. */
function iterateColor(i: number, total: number): string {
  const t = total > 1 ? i / (total - 1) : 0;
  const lightness = 72 - t * 42; // 72% → 30%
  return `hsl(214, 85%, ${lightness}%)`;
}

// ── Main component ────────────────────────────────────────────

export default function MetricContractionExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min((width || 400) * 0.7, 480);

  const [scenarioId, setScenarioId] = useState<ScenarioId>('rotation-scale');
  const [k, setK] = useState(0.7);

  const scenario = useMemo(() => getContractionScenario(scenarioId), [scenarioId]);

  const [x0, setX0] = useState<number[]>(() => scenario.defaultStart.slice());

  const handleScenarioChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextId = e.target.value as ScenarioId;
      setScenarioId(nextId);
      setX0(getContractionScenario(nextId).defaultStart.slice());
    },
    [],
  );

  const handleReset = useCallback(() => {
    setX0(scenario.defaultStart.slice());
  }, [scenario]);

  const iterates = useMemo(
    () => computeIterates(scenario, x0, k),
    [scenario, x0, k],
  );

  const xStar = useMemo(() => scenario.fixedPoint(k), [scenario, k]);

  // Final distance and theoretical bound, for the info panel.
  const finalDistance = useMemo(() => {
    if (iterates.length === 0) return 0;
    return euclideanDistance(iterates[iterates.length - 1], xStar);
  }, [iterates, xStar]);

  const theoreticalBound = useMemo(() => {
    // k^n / (1 − k) · d(x₀, x₁), with n = iterates.length − 1.
    if (k >= 1 || iterates.length < 2) return null;
    const n = iterates.length - 1;
    const d01 = euclideanDistance(iterates[0], iterates[1]);
    return (Math.pow(k, n) / (1 - k)) * d01;
  }, [k, iterates]);

  // For the 1D cobweb: sample the curve y = T(x).
  const curveSamples = useMemo(() => {
    if (!scenario.is1D) return [];
    return sampleCurve(
      (x) => scenario.map([x], k)[0],
      [scenario.domain.xMin, scenario.domain.xMax],
      250,
    );
  }, [scenario, k]);

  // ── D3 rendering ────────────────────────────────────────────
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (!width || width <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleLinear()
        .domain([scenario.domain.xMin, scenario.domain.xMax])
        .range([0, innerW]);
      const yScale = d3
        .scaleLinear()
        .domain([scenario.domain.yMin, scenario.domain.yMax])
        .range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text')
        .style('font-size', '10px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text')
        .style('font-size', '10px');

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('x');
      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -36)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '12px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text(scenario.is1D ? 'y' : 'y');

      // y = x diagonal (always drawn — reference line)
      const domMin = Math.max(scenario.domain.xMin, scenario.domain.yMin);
      const domMax = Math.min(scenario.domain.xMax, scenario.domain.yMax);
      g.append('line')
        .attr('x1', xScale(domMin))
        .attr('y1', yScale(domMin))
        .attr('x2', xScale(domMax))
        .attr('y2', yScale(domMax))
        .attr('stroke', DIAGONAL_COLOR)
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.7);

      if (scenario.is1D) {
        // ── 1D COBWEB BRANCH ─────────────────────────────────
        // Draw the curve y = T(x)
        const lineGen = d3
          .line<[number, number]>()
          .defined(([, y]) => Number.isFinite(y))
          .x(([x]) => xScale(x))
          .y(([, y]) => yScale(y));
        g.append('path')
          .datum(curveSamples)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', CURVE_COLOR)
          .attr('stroke-width', 2);

        // Draw cobweb segments between iterates.
        for (let i = 0; i < iterates.length - 1; i++) {
          const xn = iterates[i][0];
          const xn1 = iterates[i + 1][0];
          // Skip if either coordinate is out of frame — keeps divergent
          // cases from stretching the rendering offscreen.
          if (
            xn < scenario.domain.xMin ||
            xn > scenario.domain.xMax ||
            xn1 < scenario.domain.yMin - 1 ||
            xn1 > scenario.domain.yMax + 1
          ) {
            continue;
          }
          // Vertical: (xn, xn) → (xn, T(xn) = xn+1)
          g.append('line')
            .attr('x1', xScale(xn))
            .attr('y1', yScale(xn))
            .attr('x2', xScale(xn))
            .attr('y2', yScale(xn1))
            .attr('stroke', iterateColor(i, iterates.length))
            .attr('stroke-width', 1.6)
            .attr('opacity', 0.85);
          // Horizontal: (xn, xn+1) → (xn+1, xn+1)
          g.append('line')
            .attr('x1', xScale(xn))
            .attr('y1', yScale(xn1))
            .attr('x2', xScale(xn1))
            .attr('y2', yScale(xn1))
            .attr('stroke', iterateColor(i, iterates.length))
            .attr('stroke-width', 1.6)
            .attr('opacity', 0.85);
        }
      } else {
        // ── 2D PLANAR BRANCH ─────────────────────────────────
        // Draw iterate polyline: x₀ → x₁ → x₂ → …
        for (let i = 0; i < iterates.length - 1; i++) {
          const a = iterates[i];
          const b = iterates[i + 1];
          // Skip segments that leave the viewport badly — helps divergent cases.
          const aInside =
            a[0] >= scenario.domain.xMin - 0.5 &&
            a[0] <= scenario.domain.xMax + 0.5 &&
            a[1] >= scenario.domain.yMin - 0.5 &&
            a[1] <= scenario.domain.yMax + 0.5;
          if (!aInside) continue;
          const diverging = k >= 1 && i > 0;
          const color = diverging
            ? DIVERGENT_COLOR
            : iterateColor(i, iterates.length);
          g.append('line')
            .attr('x1', xScale(a[0]))
            .attr('y1', yScale(a[1]))
            .attr('x2', xScale(b[0]))
            .attr('y2', yScale(b[1]))
            .attr('stroke', color)
            .attr('stroke-width', 1.6)
            .attr('opacity', 0.75);
        }
        // Iterate dots
        for (let i = 0; i < iterates.length; i++) {
          const p = iterates[i];
          if (
            p[0] < scenario.domain.xMin - 0.5 ||
            p[0] > scenario.domain.xMax + 0.5 ||
            p[1] < scenario.domain.yMin - 0.5 ||
            p[1] > scenario.domain.yMax + 0.5
          ) {
            continue;
          }
          g.append('circle')
            .attr('cx', xScale(p[0]))
            .attr('cy', yScale(p[1]))
            .attr('r', i === 0 ? 5 : 3)
            .attr('fill', i === 0 ? 'none' : iterateColor(i, iterates.length))
            .attr('stroke', i === 0 ? START_COLOR : '#fff')
            .attr('stroke-width', i === 0 ? 2 : 0.8);
        }
      }

      // Fixed point x* (drawn on top of iterates so it's visible)
      if (
        Number.isFinite(xStar[0]) &&
        (scenario.is1D || Number.isFinite(xStar[1]))
      ) {
        const xStarX = scenario.is1D ? xStar[0] : xStar[0];
        const xStarY = scenario.is1D ? xStar[0] : xStar[1];
        if (
          xStarX >= scenario.domain.xMin &&
          xStarX <= scenario.domain.xMax &&
          xStarY >= scenario.domain.yMin &&
          xStarY <= scenario.domain.yMax
        ) {
          g.append('circle')
            .attr('cx', xScale(xStarX))
            .attr('cy', yScale(xStarY))
            .attr('r', 6)
            .attr('fill', FIXED_POINT_COLOR)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        }
      }

      // Click overlay (last so it sits on top)
      g.append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx, my] = d3.pointer(event);
          const clickedX = xScale.invert(mx);
          const clickedY = yScale.invert(my);
          if (scenario.is1D) {
            // For 1D we only care about the x-coordinate (cobweb starts on y = x).
            const clamped = Math.max(
              scenario.domain.xMin,
              Math.min(scenario.domain.xMax, clickedX),
            );
            setX0([clamped]);
          } else {
            const clampedX = Math.max(
              scenario.domain.xMin,
              Math.min(scenario.domain.xMax, clickedX),
            );
            const clampedY = Math.max(
              scenario.domain.yMin,
              Math.min(scenario.domain.yMax, clickedY),
            );
            setX0([clampedX, clampedY]);
          }
        });

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text(
          scenario.is1D
            ? 'Cobweb diagram'
            : `Iterate path in R²`,
        );
    },
    [width, height, scenario, scenarioId, k, x0, iterates, xStar, curveSamples],
  );

  // ── Render ──────────────────────────────────────────────────

  const contractionVerdict =
    k < 1
      ? `k < 1 — contraction ✓`
      : k === 1
        ? `k = 1 — not strict`
        : `k > 1 — not a contraction ✗`;

  const n = iterates.length - 1;

  return (
    <div
      ref={containerRef}
      className="my-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
      style={{ width: '100%' }}
    >
      {/* Controls row */}
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">Scenario:</span>
          <select
            value={scenarioId}
            onChange={handleScenarioChange}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {SCENARIO_IDS.map((id) => (
              <option key={id} value={id}>
                {getContractionScenario(id).label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">
            Lipschitz <em>k</em>:
          </span>
          <input
            type="range"
            min={0}
            max={1.2}
            step={0.05}
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            className="w-40"
          />
          <span className="w-10 font-mono text-xs text-zinc-600 dark:text-zinc-400">
            {k.toFixed(2)}
          </span>
        </label>

        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Reset x₀
        </button>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={`Contraction mapping visualization for the ${scenario.label} scenario with Lipschitz constant ${k.toFixed(2)}`}
        style={{
          overflow: 'visible',
          background: 'var(--color-bg-surface, #fafafa)',
          borderRadius: '6px',
        }}
      />

      {/* Info panel */}
      <div className="mt-3 flex flex-wrap gap-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/60">
        <div>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            Iterations:
          </span>{' '}
          <span className="font-mono">{n}</span>
        </div>
        <div>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            d(x_n, x*):
          </span>{' '}
          <span className="font-mono">
            {finalDistance < 1e-12 ? '< 1e−12' : finalDistance.toExponential(3)}
          </span>
        </div>
        <div>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            Bound kⁿ/(1−k)·d(x₀,x₁):
          </span>{' '}
          <span className="font-mono">
            {theoreticalBound === null
              ? 'N/A (not a contraction)'
              : theoreticalBound < 1e-12
                ? '< 1e−12'
                : theoreticalBound.toExponential(3)}
          </span>
        </div>
        <div
          className={
            k < 1
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }
        >
          <span className="font-semibold">{contractionVerdict}</span>
        </div>
      </div>

      <p className="mt-2 text-xs italic text-zinc-500 dark:text-zinc-400">
        {scenario.description} Click anywhere in the plot to set a new starting
        point <em>x₀</em>; drag the slider to change <em>k</em>.
      </p>
    </div>
  );
}
