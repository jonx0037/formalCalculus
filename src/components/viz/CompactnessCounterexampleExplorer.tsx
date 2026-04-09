/**
 * CompactnessCounterexampleExplorer — Topic 29, Section 6.
 *
 * Demonstrates the "closed and bounded but NOT compact" phenomenon in
 * C([0, 1]) by plotting the family f_n(x) = sin(n·π·x) side-by-side with
 * the pairwise sup-norm distance matrix. All off-diagonal entries are
 * bounded below by 1, so no subsequence is Cauchy and no subsequence
 * converges — the closed unit ball in C([0, 1]) fails sequential
 * compactness.
 *
 * A toggle compares against an equicontinuous family a_k·sin(π·x) with
 * a_k ∈ [0.3, 1]. By Arzelà–Ascoli that family DOES have a uniformly
 * convergent subsequence, and the pairwise-distance matrix visibly
 * shrinks toward zero as N grows.
 */

import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import { sampleCurve, type Point2D } from './shared/plotting';

// ── Constants ─────────────────────────────────────────────────

const SAMPLE_COUNT = 200;
const DOMAIN: [number, number] = [0, 1];

type FamilyMode = 'sin-counterexample' | 'equicontinuous';

const margin = { top: 24, right: 16, bottom: 40, left: 44 };

// ── Helpers ───────────────────────────────────────────────────

/** Build the function family for the selected mode and size. */
function buildFamily(mode: FamilyMode, N: number): Array<(x: number) => number> {
  const family: Array<(x: number) => number> = [];
  for (let k = 0; k < N; k++) {
    if (mode === 'sin-counterexample') {
      const n = k + 1; // sin(π x), sin(2π x), sin(3π x), …
      family.push((x: number) => Math.sin(n * Math.PI * x));
    } else {
      // Equicontinuous: a_k · sin(π x) with amplitudes in [0.3, 1].
      const a = N > 1 ? 0.3 + 0.7 * (k / (N - 1)) : 0.65;
      family.push((x: number) => a * Math.sin(Math.PI * x));
    }
  }
  return family;
}

/** Pairwise sup-norm distance matrix computed on the shared sample grid. */
function computeDistanceMatrix(curves: Point2D[][]): number[][] {
  const N = curves.length;
  const dist: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  if (N === 0) return dist;
  const gridSize = curves[0].length;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      let maxDiff = 0;
      for (let g = 0; g < gridSize; g++) {
        const d = Math.abs(curves[i][g][1] - curves[j][g][1]);
        if (d > maxDiff) maxDiff = d;
      }
      dist[i][j] = maxDiff;
      dist[j][i] = maxDiff;
    }
  }
  return dist;
}

/** Minimum off-diagonal entry — key pedagogical number. */
function minOffDiagonal(dist: number[][]): number {
  let min = Infinity;
  for (let i = 0; i < dist.length; i++) {
    for (let j = 0; j < dist.length; j++) {
      if (i === j) continue;
      if (dist[i][j] < min) min = dist[i][j];
    }
  }
  return Number.isFinite(min) ? min : 0;
}

/** Index-based HSL gradient, red for counterexample, green for equicontinuous. */
function curveColor(mode: FamilyMode, i: number, total: number): string {
  const t = total > 1 ? i / (total - 1) : 0;
  const lightness = 68 - t * 38; // 68% → 30%
  return mode === 'sin-counterexample'
    ? `hsl(0, 70%, ${lightness}%)`
    : `hsl(150, 55%, ${lightness}%)`;
}

// ── Main component ────────────────────────────────────────────

export default function CompactnessCounterexampleExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [N, setN] = useState(8);
  const [mode, setMode] = useState<FamilyMode>('sin-counterexample');

  const handleModeChange = useCallback((next: FamilyMode) => {
    setMode(next);
  }, []);

  // Build the family and sample it once.
  const curves = useMemo(() => {
    const family = buildFamily(mode, N);
    return family.map((f) => sampleCurve(f, DOMAIN, SAMPLE_COUNT));
  }, [mode, N]);

  const distMatrix = useMemo(() => computeDistanceMatrix(curves), [curves]);
  const minOff = useMemo(() => minOffDiagonal(distMatrix), [distMatrix]);

  // Responsive two-panel layout: side-by-side on wide screens, stacked on narrow.
  const stacked = containerWidth > 0 && containerWidth < 720;
  const totalWidth = Math.min(containerWidth || 0, 920);
  const panelH = stacked ? 320 : 360;
  const leftW = stacked ? totalWidth : Math.floor(totalWidth * 0.58);
  const rightW = stacked ? totalWidth : totalWidth - leftW;

  // ── D3 rendering — left panel: curves ───────────────────────
  const leftSvgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (leftW <= 0 || panelH <= 0) return;
      const innerW = leftW - margin.left - margin.right;
      const innerH = panelH - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain(DOMAIN).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([-1.1, 1.1]).range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      // Zero line
      g.append('line')
        .attr('x1', 0)
        .attr('y1', yScale(0))
        .attr('x2', innerW)
        .attr('y2', yScale(0))
        .attr('stroke', '#9ca3af')
        .attr('stroke-width', 0.8)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.6);

      // Draw each curve
      const lineGen = d3
        .line<Point2D>()
        .x(([x]) => xScale(x))
        .y(([, y]) => yScale(y));

      curves.forEach((curve, i) => {
        g.append('path')
          .datum(curve)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', curveColor(mode, i, curves.length))
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.85);
      });

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text(
          mode === 'sin-counterexample'
            ? `Family f_n(x) = sin(nπx) for n = 1..${N}`
            : `Equicontinuous family a_k·sin(πx) for k = 1..${N}`,
        );

      // x label
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('x');
    },
    [leftW, panelH, curves, mode, N],
  );

  // ── D3 rendering — right panel: heatmap ─────────────────────
  const rightSvgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (rightW <= 0 || panelH <= 0) return;
      const innerW = rightW - margin.left - margin.right;
      const innerH = panelH - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const cellSize = Math.min(innerW, innerH) / Math.max(N, 1);
      const gridSide = cellSize * N;
      const gridOffsetX = (innerW - gridSide) / 2;
      const gridOffsetY = (innerH - gridSide) / 2;

      // Color scale: 0 → white, 2 → deep blue. Saturate above 2.
      const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 2]);

      // Draw cells
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const val = distMatrix[i][j];
          g.append('rect')
            .attr('x', gridOffsetX + j * cellSize)
            .attr('y', gridOffsetY + i * cellSize)
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('fill', i === j ? '#f3f4f6' : colorScale(Math.min(val, 2)))
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 0.6);
          // Numeric label in each cell — only when cells are big enough to read.
          if (N <= 10 && cellSize > 18) {
            g.append('text')
              .attr('x', gridOffsetX + j * cellSize + cellSize / 2)
              .attr('y', gridOffsetY + i * cellSize + cellSize / 2 + 3)
              .attr('text-anchor', 'middle')
              .style('font-size', '9px')
              .style(
                'fill',
                i === j || val < 1 ? '#4b5563' : '#ffffff',
              )
              .text(i === j ? '—' : val.toFixed(2));
          }
        }
      }

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text('Pairwise sup-norm distances ‖f_i − f_j‖∞');

      // Optional row/column index labels when N is small
      if (N <= 12) {
        const labelStyle = (sel: d3.Selection<SVGTextElement, unknown, null, undefined>) =>
          sel
            .style('font-size', '9px')
            .style('fill', 'var(--color-text-secondary, #6b7280)')
            .attr('text-anchor', 'middle');
        for (let i = 0; i < N; i++) {
          labelStyle(
            g
              .append('text')
              .attr('x', gridOffsetX + i * cellSize + cellSize / 2)
              .attr('y', gridOffsetY - 3)
              .text(String(i + 1)),
          );
          labelStyle(
            g
              .append('text')
              .attr('x', gridOffsetX - 6)
              .attr('y', gridOffsetY + i * cellSize + cellSize / 2 + 3)
              .text(String(i + 1)),
          );
        }
      }
    },
    [rightW, panelH, distMatrix, N],
  );

  // ── Render ──────────────────────────────────────────────────

  const verdictText =
    mode === 'sin-counterexample'
      ? `All off-diagonal entries ≥ ${minOff.toFixed(2)} — no subsequence is Cauchy.`
      : `Min off-diagonal distance: ${minOff.toFixed(3)} — grows arbitrarily small with N.`;

  return (
    <div
      ref={containerRef}
      className="my-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Family:</span>
          <div className="inline-flex rounded border border-zinc-300 dark:border-zinc-600">
            <button
              type="button"
              onClick={() => handleModeChange('sin-counterexample')}
              className={`px-3 py-1 text-xs ${
                mode === 'sin-counterexample'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              sin(nπx) counterexample
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('equicontinuous')}
              className={`border-l border-zinc-300 px-3 py-1 text-xs dark:border-zinc-600 ${
                mode === 'equicontinuous'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              a_k·sin(πx) equicontinuous
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">N:</span>
          <input
            type="range"
            min={2}
            max={20}
            step={1}
            value={N}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-40"
          />
          <span className="w-8 text-right font-mono text-xs">{N}</span>
        </label>
      </div>

      {/* Two SVG panels */}
      <div
        className={stacked ? 'flex flex-col gap-3' : 'flex flex-row gap-3'}
        style={{ width: totalWidth || '100%' }}
      >
        <svg
          ref={leftSvgRef}
          width={leftW}
          height={panelH}
          role="img"
          aria-label={
            mode === 'sin-counterexample'
              ? `Plot of sin(nπx) for n = 1 to ${N}`
              : `Plot of equicontinuous family a_k sin(πx) for k = 1 to ${N}`
          }
          style={{
            background: 'var(--color-bg-surface, #fafafa)',
            borderRadius: '6px',
          }}
        />
        <svg
          ref={rightSvgRef}
          width={rightW}
          height={panelH}
          role="img"
          aria-label={`Pairwise sup-norm distance matrix for a family of ${N} functions`}
          style={{
            background: 'var(--color-bg-surface, #fafafa)',
            borderRadius: '6px',
          }}
        />
      </div>

      {/* Verdict */}
      <div
        className={`mt-3 rounded border px-3 py-2 text-sm ${
          mode === 'sin-counterexample'
            ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200'
        }`}
      >
        <strong>{verdictText}</strong>
        <div className="mt-1 text-xs font-normal opacity-90">
          {mode === 'sin-counterexample'
            ? 'The closed unit ball in C([0,1]) is closed and bounded but not compact: no subsequence of these functions converges in the sup-norm.'
            : 'This family is uniformly bounded and equicontinuous, so by Arzelà–Ascoli it has a uniformly convergent subsequence — compactness is restored.'}
        </div>
      </div>
    </div>
  );
}
