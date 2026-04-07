import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  getFubiniData,
  type FubiniScenario,
} from '../../data/lebesgue-integral-data';

// ── Constants ─────────────────────────────────────────────────

const SLICE_COLOR = '#4F46E5'; // indigo
const GRID_RESOLUTION = 50;

interface ScenarioOption {
  id: 'smooth-xy' | 'separable-exp' | 'pathological';
  label: string;
}

const SCENARIOS: ScenarioOption[] = [
  { id: 'smooth-xy', label: 'Smooth: f(x, y) = xy' },
  { id: 'separable-exp', label: 'Separable: f(x, y) = e^(−(x+y))' },
  { id: 'pathological', label: 'Pathological: (x²−y²)/(x²+y²)²' },
];

const AGREEMENT_TOL = 1e-6;

// ── Main component ────────────────────────────────────────────

export default function FubiniProductIntegralExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [scenarioIdx, setScenarioIdx] = useState(0);

  const scenario: FubiniScenario = useMemo(
    () => getFubiniData(SCENARIOS[scenarioIdx].id),
    [scenarioIdx],
  );

  // ── Layout ────────────────────────────────────────────────

  const stacked = containerWidth > 0 && containerWidth < 720;
  const totalWidth = Math.min(containerWidth, 880);
  const totalHeight = stacked ? 580 : 380;
  const heatmapW = stacked ? totalWidth : Math.floor(totalWidth * 0.55);
  const sliceW = stacked ? totalWidth : totalWidth - heatmapW;
  const panelH = stacked ? 270 : totalHeight - 30;
  const margin = { top: 28, right: 14, bottom: 32, left: 44 };

  // ── Heatmap grid data ──────────────────────────────────────

  const heatmapData = useMemo(() => {
    const N = GRID_RESOLUTION;
    const cells: Array<{ x: number; y: number; value: number }> = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        // Cell centers, in [0, 1]^2
        const x = (i + 0.5) / N;
        const y = (j + 0.5) / N;
        cells.push({ x, y, value: scenario.f(x, y) });
      }
    }
    return cells;
  }, [scenario]);

  // For the slice plot: x ↦ ∫₀¹ f(x, y) dy, sampled at 60 x-values via the
  // midpoint Riemann rule on a 50-point y-grid (sample at (j+0.5)/N_Y, sum,
  // multiply by step size). Cheap and good enough for the visual story.
  const sliceData = useMemo(() => {
    const N_X = 60;
    const N_Y = 50;
    const dy = 1 / N_Y;
    const points: Array<[number, number]> = [];
    for (let i = 0; i < N_X; i++) {
      const x = (i + 0.5) / N_X;
      let acc = 0;
      for (let j = 0; j < N_Y; j++) {
        const y = (j + 0.5) / N_Y;
        const v = scenario.f(x, y);
        acc += Number.isFinite(v) ? v : 0;
      }
      points.push([x, acc * dy]);
    }
    return points;
  }, [scenario]);

  // Color scale: diverging for sign-changing functions, sequential for non-negative
  const valueExtent = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const c of heatmapData) {
      if (Number.isFinite(c.value)) {
        if (c.value < lo) lo = c.value;
        if (c.value > hi) hi = c.value;
      }
    }
    return [lo, hi] as [number, number];
  }, [heatmapData]);

  // Cap the domain for the pathological case so the singularity at origin
  // doesn't crush the rest of the heatmap into a single color.
  const colorDomain: [number, number] = useMemo(() => {
    if (scenario.name === 'pathological') return [-5, 5];
    return valueExtent;
  }, [scenario.name, valueExtent]);

  // ── D3 render ─────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (totalWidth === 0) return;

      svg.attr('width', totalWidth).attr('height', totalHeight);

      // ── Panel 1: heatmap of f(x, y) ─────────────────────────
      {
        const ox = 0;
        const oy = 0;
        const innerW = heatmapW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const cellW = innerW / GRID_RESOLUTION;
        const cellH = innerH / GRID_RESOLUTION;
        const g = svg
          .append('g')
          .attr('transform', `translate(${ox + margin.left},${oy + margin.top})`);

        const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
        const yScale = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

        const isSignChanging = colorDomain[0] < 0 && colorDomain[1] > 0;
        const colorScale = isSignChanging
          ? d3.scaleDiverging<string>(
              [colorDomain[0], 0, colorDomain[1]],
              d3.interpolateRdBu,
            )
          : d3.scaleSequential<string>(d3.interpolateViridis).domain(colorDomain);

        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text('f(x, y) on [0, 1]²');

        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(d3.axisBottom(xScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');

        // Heatmap cells
        g.selectAll('rect.cell')
          .data(heatmapData)
          .enter()
          .append('rect')
          .attr('class', 'cell')
          .attr('x', (d) => xScale(d.x) - cellW / 2)
          .attr('y', (d) => yScale(d.y) - cellH / 2)
          .attr('width', cellW + 0.5)
          .attr('height', cellH + 0.5)
          .style('fill', (d) => {
            if (!Number.isFinite(d.value)) return '#888';
            // Clamp the value into the color domain to avoid out-of-range cells
            const v = Math.max(colorDomain[0], Math.min(colorDomain[1], d.value));
            return colorScale(v);
          });
      }

      // ── Panel 2: slice plot ∫₀¹ f(x, y) dy as a function of x ─
      {
        const ox = stacked ? 0 : heatmapW;
        const oy = stacked ? panelH + 30 : 0;
        const innerW = sliceW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr('transform', `translate(${ox + margin.left},${oy + margin.top})`);

        const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW]);

        // y-domain: include 0 for reference and pad both extremes
        let yLo = 0;
        let yHi = 0;
        for (const [, y] of sliceData) {
          if (Number.isFinite(y)) {
            if (y < yLo) yLo = y;
            if (y > yHi) yHi = y;
          }
        }
        const padding = Math.max((yHi - yLo) * 0.15, 0.1);
        const yScale = d3
          .scaleLinear()
          .domain([yLo - padding, yHi + padding])
          .range([innerH, 0]);

        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text('Slice: x ↦ ∫₀¹ f(x, y) dy');

        g.append('g')
          .attr('transform', `translate(0,${yScale(0)})`)
          .call(d3.axisBottom(xScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');

        const line = d3
          .line<[number, number]>()
          .defined(([, y]) => Number.isFinite(y))
          .x(([x]) => xScale(x))
          .y(([, y]) => yScale(y));

        g.append('path')
          .datum(sliceData)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', SLICE_COLOR)
          .style('stroke-width', 1.8);

        // y = 0 reference line
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yScale(0))
          .attr('y2', yScale(0))
          .style('stroke', 'var(--color-text-muted)')
          .style('stroke-width', 0.6)
          .style('stroke-dasharray', '3,3')
          .style('opacity', 0.6);
      }
    },
    [
      scenario,
      scenarioIdx,
      heatmapData,
      sliceData,
      colorDomain,
      totalWidth,
      totalHeight,
      heatmapW,
      sliceW,
      panelH,
      stacked,
      margin.top,
      margin.right,
      margin.bottom,
      margin.left,
    ],
  );

  // ── Numeric readout & agreement check ─────────────────────

  const fmt = (v: number | null): string =>
    v === null ? 'DNE' : v.toFixed(5);

  const allAgree =
    scenario.iteratedXY !== null &&
    scenario.iteratedYX !== null &&
    scenario.productIntegral !== null &&
    Math.abs(scenario.iteratedXY - scenario.iteratedYX) < AGREEMENT_TOL &&
    Math.abs(scenario.iteratedXY - scenario.productIntegral) < AGREEMENT_TOL;

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label
          className="flex items-center gap-1.5 font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Function:
          <select
            value={scenarioIdx}
            onChange={(e) => setScenarioIdx(parseInt(e.target.value))}
            className="rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            aria-label="Choose Fubini scenario"
          >
            {SCENARIOS.map((s, i) => (
              <option key={s.id} value={i}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        className="rounded"
        style={{
          border: '1px solid var(--color-border)',
          background: 'var(--color-viz-bg)',
        }}
        role="img"
        aria-label="Fubini product integral explorer: heatmap of f(x,y) and slice plot of the inner integral"
      />

      {/* Three integral values + agreement indicator */}
      <div
        className="text-xs flex flex-wrap gap-x-4 gap-y-1 items-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span>∫₀¹ ∫₀¹ f dy dx = {fmt(scenario.iteratedXY)}</span>
        <span>∫₀¹ ∫₀¹ f dx dy = {fmt(scenario.iteratedYX)}</span>
        <span>∫ f d(λ × λ) = {fmt(scenario.productIntegral)}</span>
        <span
          style={{
            color: allAgree ? '#16A34A' : '#DC2626',
            fontWeight: 600,
          }}
        >
          {allAgree ? '✓ all three agree' : '✗ disagreement (Fubini hypothesis fails)'}
        </span>
      </div>

      <p
        className="text-xs italic"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {scenario.description}
      </p>
    </div>
  );
}
