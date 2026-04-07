import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  getDCTScenario,
  type ConvergenceSequence,
} from '../../data/lebesgue-integral-data';

// ── Constants ─────────────────────────────────────────────────

const FN_COLOR = '#4F46E5'; // indigo — current f_n
const LIMIT_COLOR = '#DC2626'; // red — pointwise limit f
const DOMINATOR_COLOR = '#16A34A'; // green — dominator g
const BAR_COLOR = '#4F46E5'; // indigo bars for integral history
const BAR_LIMIT_COLOR = '#DC2626'; // red dashed line for ∫ f

interface ScenarioOption {
  id: 'shrinking-sine' | 'cosine-decay' | 'no-dominator';
  label: string;
}

const SCENARIOS: ScenarioOption[] = [
  { id: 'shrinking-sine', label: 'DCT succeeds: sin(x/n) / (1 + x²)' },
  { id: 'cosine-decay', label: 'DCT succeeds: cos(x/n) · e^(−x)' },
  { id: 'no-dominator', label: 'DCT fails: spike sequence n · 1_{[0, 1/n]}' },
];

const N_MIN = 1;
const N_MAX = 30;

// ── Main component ────────────────────────────────────────────

export default function DominatedConvergenceExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [n, setN] = useState(5);
  const [showDominator, setShowDominator] = useState(true);

  const scenario: ConvergenceSequence = useMemo(
    () => getDCTScenario(SCENARIOS[scenarioIdx].id),
    [scenarioIdx],
  );

  // ── Layout ────────────────────────────────────────────────

  // Three panels side-by-side on wide screens; stacked on narrow.
  const stacked = containerWidth > 0 && containerWidth < 720;
  const totalWidth = Math.min(containerWidth, 960);
  const totalHeight = stacked ? 720 : 360;
  const panelW = stacked ? totalWidth : Math.floor(totalWidth / 3);
  const panelH = stacked ? 220 : totalHeight - 40;
  const margin = { top: 28, right: 14, bottom: 30, left: 42 };

  // ── Derived data ──────────────────────────────────────────

  const curve = useMemo(() => {
    const N = 250;
    const [a, b] = scenario.domain;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = a + (i / (N - 1)) * (b - a);
      pts.push([x, scenario.fn(x, n)]);
    }
    return pts;
  }, [scenario, n]);

  const limitCurve = useMemo(() => {
    const N = 200;
    const [a, b] = scenario.domain;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = a + (i / (N - 1)) * (b - a);
      pts.push([x, scenario.limit(x)]);
    }
    return pts;
  }, [scenario]);

  const dominatorCurve = useMemo(() => {
    if (!scenario.dominator) return null;
    const N = 200;
    const [a, b] = scenario.domain;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = a + (i / (N - 1)) * (b - a);
      pts.push([x, scenario.dominator!(x)]);
    }
    return pts;
  }, [scenario]);

  const integralHistory = useMemo(() => {
    // Compute ∫ f_k for k = 1..n; cap at N_MAX so the bar chart x-axis is stable.
    const ks = Array.from({ length: N_MAX }, (_, i) => i + 1);
    return ks.map((k) => ({ k, value: scenario.integralOfFn(k) }));
  }, [scenario]);

  // y-domain for the function panel — pick from the union of f_n, limit, dominator.
  const yMax = useMemo(() => {
    let m = 0;
    for (const [, y] of curve) if (Number.isFinite(y) && Math.abs(y) > m) m = Math.abs(y);
    for (const [, y] of limitCurve) if (Number.isFinite(y) && Math.abs(y) > m) m = Math.abs(y);
    if (showDominator && dominatorCurve)
      for (const [, y] of dominatorCurve)
        if (Number.isFinite(y) && Math.abs(y) > m) m = Math.abs(y);
    return Math.max(m * 1.15, 1.0);
  }, [curve, limitCurve, dominatorCurve, showDominator]);

  const hasNegative = useMemo(() => {
    for (const [, y] of curve) if (y < -1e-6) return true;
    return false;
  }, [curve]);

  // y-domain for the integral-history bar chart. Includes 0 as a baseline and
  // expands to whatever extreme values the integrals actually take — bars are
  // drawn relative to y=0 so negative integrals (e.g. signed-integrand sequences)
  // render correctly as downward bars instead of being silently clamped to 0.
  const integralYExtent = useMemo<[number, number]>(() => {
    let lo = Math.min(0, scenario.integralOfLimit);
    let hi = Math.max(0, scenario.integralOfLimit);
    for (const { value } of integralHistory) {
      if (Number.isFinite(value)) {
        if (value < lo) lo = value;
        if (value > hi) hi = value;
      }
    }
    const range = hi - lo;
    const pad = Math.max(range * 0.12, 0.05);
    return [lo - pad, hi + pad];
  }, [integralHistory, scenario.integralOfLimit]);

  // ── Render via useD3 ──────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (totalWidth === 0) return;

      svg.attr('width', totalWidth).attr('height', totalHeight);

      // Helper to lay out the three panels
      const panelOffset = (i: number): { x: number; y: number } => {
        if (stacked) return { x: 0, y: i * (panelH + 40) };
        return { x: i * panelW, y: 0 };
      };

      // ── Panel 1: function plot with f_n, limit, dominator ────
      {
        const { x: ox, y: oy } = panelOffset(0);
        const innerW = panelW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr('transform', `translate(${ox + margin.left},${oy + margin.top})`);

        const xScale = d3
          .scaleLinear()
          .domain([scenario.domain[0], scenario.domain[1]])
          .range([0, innerW]);
        const yDomain: [number, number] = hasNegative ? [-yMax, yMax] : [0, yMax];
        const yScale = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

        // Title
        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text(`f_n at n = ${n}`);

        // Axes
        g.append('g')
          .attr('transform', `translate(0,${yScale(0)})`)
          .call(d3.axisBottom(xScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');

        // Clip
        g.append('defs')
          .append('clipPath')
          .attr('id', `dce-clip-fn-${scenarioIdx}`)
          .append('rect')
          .attr('width', innerW)
          .attr('height', innerH);
        const plot = g.append('g').attr('clip-path', `url(#dce-clip-fn-${scenarioIdx})`);

        const line = d3
          .line<[number, number]>()
          .defined(([, y]) => Number.isFinite(y))
          .x(([x]) => xScale(x))
          .y(([, y]) => yScale(y));

        // Dominator envelope (drawn first, behind f_n and limit)
        if (showDominator && dominatorCurve) {
          // +g
          plot
            .append('path')
            .datum(dominatorCurve)
            .attr('d', line)
            .style('fill', 'none')
            .style('stroke', DOMINATOR_COLOR)
            .style('stroke-width', 1.4)
            .style('stroke-dasharray', '4,3')
            .style('opacity', 0.85);
          // −g (only if function is sign-changing)
          if (hasNegative) {
            const negDom = dominatorCurve.map(([x, y]) => [x, -y] as [number, number]);
            plot
              .append('path')
              .datum(negDom)
              .attr('d', line)
              .style('fill', 'none')
              .style('stroke', DOMINATOR_COLOR)
              .style('stroke-width', 1.4)
              .style('stroke-dasharray', '4,3')
              .style('opacity', 0.85);
          }
        }

        // Limit f (dashed red)
        plot
          .append('path')
          .datum(limitCurve)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', LIMIT_COLOR)
          .style('stroke-width', 1.6)
          .style('stroke-dasharray', '5,4');

        // f_n (solid indigo)
        plot
          .append('path')
          .datum(curve)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', FN_COLOR)
          .style('stroke-width', 1.8);
      }

      // ── Panel 2: shaded area under f_n vs. shaded area under f ─
      {
        const { x: ox, y: oy } = panelOffset(1);
        const innerW = panelW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr('transform', `translate(${ox + margin.left},${oy + margin.top})`);

        const xScale = d3
          .scaleLinear()
          .domain([scenario.domain[0], scenario.domain[1]])
          .range([0, innerW]);
        const yDomain: [number, number] = hasNegative ? [-yMax, yMax] : [0, yMax];
        const yScale = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text('Areas: ∫ f_n vs. ∫ f');

        g.append('g')
          .attr('transform', `translate(0,${yScale(0)})`)
          .call(d3.axisBottom(xScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');

        g.append('defs')
          .append('clipPath')
          .attr('id', `dce-clip-area-${scenarioIdx}`)
          .append('rect')
          .attr('width', innerW)
          .attr('height', innerH);
        const plot = g.append('g').attr('clip-path', `url(#dce-clip-area-${scenarioIdx})`);

        // Area under limit f (drawn first, in red with low opacity)
        const limitArea = d3
          .area<[number, number]>()
          .defined(([, y]) => Number.isFinite(y))
          .x(([x]) => xScale(x))
          .y0(yScale(0))
          .y1(([, y]) => yScale(y));
        plot
          .append('path')
          .datum(limitCurve)
          .attr('d', limitArea)
          .style('fill', LIMIT_COLOR)
          .style('fill-opacity', 0.18);

        // Area under f_n (drawn on top, in indigo with low opacity)
        plot
          .append('path')
          .datum(curve)
          .attr('d', limitArea)
          .style('fill', FN_COLOR)
          .style('fill-opacity', 0.28);
      }

      // ── Panel 3: bar chart of ∫ f_k for k = 1..n ──────────────
      {
        const { x: ox, y: oy } = panelOffset(2);
        const innerW = panelW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr('transform', `translate(${ox + margin.left},${oy + margin.top})`);

        const xScale = d3
          .scaleBand<number>()
          .domain(integralHistory.map((d) => d.k))
          .range([0, innerW])
          .padding(0.18);
        const yScale = d3
          .scaleLinear()
          .domain(integralYExtent)
          .range([innerH, 0]);
        const baselineY = yScale(0);

        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text('∫ f_k history (k = 1..30)');

        // x-axis: only label every 5th tick to avoid crowding
        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(
            d3
              .axisBottom(xScale)
              .tickValues(integralHistory.filter((d) => d.k % 5 === 0).map((d) => d.k))
              .tickFormat((d) => String(d)),
          )
          .selectAll('text')
          .style('font-size', '9px');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');

        // Bars — drawn relative to the y=0 baseline so negative integrals
        // render as downward bars rather than being clamped to 0.
        g.selectAll('rect.history-bar')
          .data(integralHistory)
          .enter()
          .append('rect')
          .attr('class', 'history-bar')
          .attr('x', (d) => xScale(d.k) ?? 0)
          .attr('y', (d) => Math.min(baselineY, yScale(d.value)))
          .attr('width', xScale.bandwidth())
          .attr('height', (d) => Math.abs(yScale(d.value) - baselineY))
          .style('fill', (d) => (d.k <= n ? BAR_COLOR : 'var(--color-surface-alt)'))
          .style('fill-opacity', (d) => (d.k <= n ? 0.85 : 0.35))
          .style('stroke', (d) => (d.k <= n ? BAR_COLOR : 'var(--color-border)'))
          .style('stroke-width', 0.6);

        // y=0 baseline (subtle grey line)
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', baselineY)
          .attr('y2', baselineY)
          .style('stroke', 'var(--color-text-muted)')
          .style('stroke-width', 0.5)
          .style('opacity', 0.4);

        // Dashed horizontal line at the limit value ∫ f
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yScale(scenario.integralOfLimit))
          .attr('y2', yScale(scenario.integralOfLimit))
          .style('stroke', BAR_LIMIT_COLOR)
          .style('stroke-width', 1.4)
          .style('stroke-dasharray', '5,4');
        g.append('text')
          .attr('x', innerW - 4)
          .attr('y', yScale(scenario.integralOfLimit) - 4)
          .attr('text-anchor', 'end')
          .style('font-size', '9px')
          .style('font-weight', '600')
          .style('fill', BAR_LIMIT_COLOR)
          .text(`∫ f = ${scenario.integralOfLimit.toFixed(3)}`);
      }
    },
    [
      scenario,
      scenarioIdx,
      n,
      showDominator,
      curve,
      limitCurve,
      dominatorCurve,
      integralHistory,
      yMax,
      hasNegative,
      integralYExtent,
      totalWidth,
      totalHeight,
      panelW,
      panelH,
      stacked,
      margin.top,
      margin.right,
      margin.bottom,
      margin.left,
    ],
  );

  // ── Numeric readout ───────────────────────────────────────

  const integralAtN = scenario.integralOfFn(n);
  const limitValue = scenario.integralOfLimit;
  const diff = Math.abs(integralAtN - limitValue);

  const caption = scenario.dctApplies
    ? 'DCT predicts: ∫ f_n → ∫ f because |f_n| ≤ g and ∫ g < ∞.'
    : 'DCT does not apply: no integrable dominator exists, and the integrals do not converge to ∫ f.';

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label
          className="flex items-center gap-1.5 font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Scenario:
          <select
            value={scenarioIdx}
            onChange={(e) => setScenarioIdx(parseInt(e.target.value))}
            className="rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            aria-label="Choose DCT scenario"
          >
            {SCENARIOS.map((s, i) => (
              <option key={s.id} value={i}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label
          className="flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          n = {n}
          <input
            type="range"
            min={N_MIN}
            max={N_MAX}
            step={1}
            value={n}
            onChange={(e) => setN(parseInt(e.target.value))}
            className="w-40"
            aria-label="Sequence index n"
          />
        </label>

        <label
          className="flex items-center gap-1.5 cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <input
            type="checkbox"
            checked={showDominator}
            onChange={(e) => setShowDominator(e.target.checked)}
            disabled={!scenario.dominator}
            aria-label="Show dominator envelope ±g"
          />
          Show dominator g
          {!scenario.dominator && (
            <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
              (no integrable dominator exists)
            </span>
          )}
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
        aria-label="Dominated convergence theorem explorer: f_n with optional dominator envelope, area comparison, and integral history bar chart"
      />

      {/* Numeric readout */}
      <div
        className="text-xs flex flex-wrap gap-x-4 gap-y-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span style={{ color: FN_COLOR }}>∫ f_n dμ = {integralAtN.toFixed(5)}</span>
        <span style={{ color: LIMIT_COLOR }}>∫ f dμ = {limitValue.toFixed(5)}</span>
        <span>|∫ f_n − ∫ f| = {diff.toFixed(5)}</span>
        {scenario.dominator && (
          <span style={{ color: DOMINATOR_COLOR }}>
            Dominator g is integrable
          </span>
        )}
      </div>

      <p
        className="text-xs italic"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {scenario.description} <strong style={{ fontStyle: 'normal' }}>{caption}</strong>
      </p>
    </div>
  );
}
