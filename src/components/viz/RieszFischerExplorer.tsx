import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  getCauchySequence,
  type CauchySequenceData,
} from '../../data/lp-spaces-data';

// ── Constants ─────────────────────────────────────────────────

const FN_COLOR = '#4F46E5'; // indigo — current f_n
const LIMIT_COLOR = '#DC2626'; // red — limit f
const ERROR_COLOR = '#F59E0B'; // amber — shaded |f_n - f|
const BAR_COLOR = '#4F46E5';

interface ScenarioOption {
  id: string;
  label: string;
}

const SCENARIOS: ScenarioOption[] = [
  {
    id: 'smooth-indicator',
    label: 'tanh mollification → 1_[0,1]',
  },
  {
    id: 'truncated-sin',
    label: 'sin(πx) · (1 − 1/n) → sin(πx)',
  },
];

const N_MIN = 1;
const N_MAX = 20;
const P_MIN = 1.0;
const P_MAX = 10.0;

// ── Main component ────────────────────────────────────────────

export default function RieszFischerExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [n, setN] = useState(5);
  const [p, setP] = useState(2);

  const scenario: CauchySequenceData = useMemo(
    () => getCauchySequence(SCENARIOS[scenarioIdx].id),
    [scenarioIdx],
  );

  // ── Layout ────────────────────────────────────────────────

  const stacked = containerWidth > 0 && containerWidth < 720;
  const totalWidth = Math.min(containerWidth || 0, 920);
  const totalHeight = stacked ? 620 : 400;
  const leftW = stacked ? totalWidth : Math.floor(totalWidth * 0.6);
  const rightW = stacked ? totalWidth : totalWidth - leftW;
  const panelH = stacked ? 290 : totalHeight - 40;
  const margin = { top: 30, right: 16, bottom: 32, left: 44 };

  // ── Curves ────────────────────────────────────────────────

  const fnCurve = useMemo(() => {
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
    const N = 250;
    const [a, b] = scenario.domain;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = a + (i / (N - 1)) * (b - a);
      pts.push([x, scenario.limit(x)]);
    }
    return pts;
  }, [scenario]);

  // Norm-difference history: ||f_k - f||_p for k = 1..N_MAX.
  // Memoized per (scenario, p) — independent of n, so the bar chart shows
  // the full sequence with k > n grayed out (mirroring MonotoneConvergenceExplorer).
  const normHistory = useMemo(() => {
    const ks = Array.from({ length: N_MAX }, (_, i) => i + 1);
    return ks.map((k) => ({ k, value: scenario.normDifference(k, p) }));
  }, [scenario, p]);

  // y-axis maxima
  const yMax = useMemo(() => {
    let m = 0;
    for (const [, y] of fnCurve) if (Number.isFinite(y) && y > m) m = y;
    for (const [, y] of limitCurve) if (Number.isFinite(y) && y > m) m = y;
    return Math.max(m * 1.15, 0.5);
  }, [fnCurve, limitCurve]);

  const histYMax = useMemo(() => {
    let m = 0;
    for (const { value } of normHistory)
      if (Number.isFinite(value) && value > m) m = value;
    return Math.max(m * 1.15, 0.05);
  }, [normHistory]);

  // ── D3 render ─────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (totalWidth === 0) return;

      svg.attr('width', totalWidth).attr('height', totalHeight);

      // ── Panel 1: function plot ──
      {
        const ox = 0;
        const oy = 0;
        const innerW = leftW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr(
            'transform',
            `translate(${ox + margin.left},${oy + margin.top})`,
          );

        const xScale = d3
          .scaleLinear()
          .domain([scenario.domain[0], scenario.domain[1]])
          .range([0, innerW]);
        const yScale = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

        // Title
        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -12)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text(`f_n at n = ${n} (indigo) and limit f (red dashed)`);

        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(d3.axisBottom(xScale).ticks(5))
          .selectAll('text')
          .style('font-size', '9px');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');

        // Clip
        g.append('defs')
          .append('clipPath')
          .attr('id', `rfe-clip-${scenarioIdx}`)
          .append('rect')
          .attr('width', innerW)
          .attr('height', innerH);
        const plot = g.append('g').attr('clip-path', `url(#rfe-clip-${scenarioIdx})`);

        const line = d3
          .line<[number, number]>()
          .defined(([, y]) => Number.isFinite(y))
          .x(([x]) => xScale(x))
          .y(([, y]) => yScale(y));

        // Shaded |f_n - f| between the two curves.
        // We build the shaded region as an area path with the upper edge being
        // max(f_n, f) and the lower edge being min(f_n, f) at each sample x.
        const errorPolygon: Array<[number, number]> = [];
        const N = fnCurve.length;
        for (let i = 0; i < N; i++) {
          const x = fnCurve[i][0];
          const upper = Math.max(fnCurve[i][1], limitCurve[i][1]);
          errorPolygon.push([x, upper]);
        }
        for (let i = N - 1; i >= 0; i--) {
          const x = fnCurve[i][0];
          const lower = Math.min(fnCurve[i][1], limitCurve[i][1]);
          errorPolygon.push([x, lower]);
        }
        plot
          .append('path')
          .datum(errorPolygon)
          .attr(
            'd',
            d3
              .line<[number, number]>()
              .x(([x]) => xScale(x))
              .y(([, y]) => yScale(y))
              .curve(d3.curveLinearClosed)(errorPolygon),
          )
          .style('fill', ERROR_COLOR)
          .style('fill-opacity', 0.32)
          .style('stroke', 'none');

        // Limit (red dashed)
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
          .datum(fnCurve)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', FN_COLOR)
          .style('stroke-width', 1.8);
      }

      // ── Panel 2: ||f_k - f||_p bar chart ──
      {
        const ox = stacked ? 0 : leftW;
        const oy = stacked ? panelH + 40 : 0;
        const innerW = rightW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr(
            'transform',
            `translate(${ox + margin.left},${oy + margin.top})`,
          );

        const xScale = d3
          .scaleBand<number>()
          .domain(normHistory.map((d) => d.k))
          .range([0, innerW])
          .padding(0.2);
        const yScale = d3
          .scaleLinear()
          .domain([0, histYMax])
          .range([innerH, 0]);

        // Title
        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -12)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text(`||f_k − f||_${p.toFixed(1)} (decaying ↓)`);

        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(
            d3
              .axisBottom(xScale)
              .tickValues(normHistory.filter((d) => d.k % 5 === 0).map((d) => d.k))
              .tickFormat((d) => String(d)),
          )
          .selectAll('text')
          .style('font-size', '9px');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');

        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', innerH + 26)
          .attr('text-anchor', 'middle')
          .style('font-size', '9px')
          .style('fill', 'var(--color-text-muted)')
          .text('k');

        // Bars: highlighted for k ≤ n, muted for k > n.
        g.selectAll('rect.norm-bar')
          .data(normHistory)
          .enter()
          .append('rect')
          .attr('class', 'norm-bar')
          .attr('x', (d) => xScale(d.k) ?? 0)
          .attr('y', (d) => yScale(Math.max(0, d.value)))
          .attr('width', xScale.bandwidth())
          .attr('height', (d) =>
            Math.max(0, yScale(0) - yScale(Math.max(0, d.value))),
          )
          .style('fill', (d) => (d.k <= n ? BAR_COLOR : 'var(--color-surface-alt)'))
          .style('fill-opacity', (d) => (d.k <= n ? 0.85 : 0.35))
          .style('stroke', (d) => (d.k <= n ? BAR_COLOR : 'var(--color-border)'))
          .style('stroke-width', 0.6);
      }
    },
    [
      scenario,
      scenarioIdx,
      n,
      p,
      fnCurve,
      limitCurve,
      normHistory,
      yMax,
      histYMax,
      totalWidth,
      totalHeight,
      leftW,
      rightW,
      panelH,
      stacked,
      margin.top,
      margin.right,
      margin.bottom,
      margin.left,
    ],
  );

  // ── Numeric readout ───────────────────────────────────────

  const currentNormDiff = scenario.normDifference(n, p);

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label
          className="flex items-center gap-1.5 font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Sequence:
          <select
            value={scenarioIdx}
            onChange={(e) => setScenarioIdx(parseInt(e.target.value))}
            className="rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            aria-label="Choose Cauchy sequence scenario"
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
            className="w-32"
            aria-label="Sequence index n"
          />
        </label>

        <label
          className="flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          p = {p.toFixed(1)}
          <input
            type="range"
            min={P_MIN}
            max={P_MAX}
            step={0.1}
            value={p}
            onChange={(e) => setP(parseFloat(e.target.value))}
            className="w-32"
            aria-label="Riesz-Fischer: Lp exponent p"
          />
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
        aria-label={`Riesz-Fischer explorer: f_n at n = ${n} and limit, with bar chart showing ||f_k - f||_${p.toFixed(1)} decaying as k grows`}
      />

      {/* Numeric readout */}
      <div
        className="text-xs flex flex-wrap gap-x-4 gap-y-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span style={{ color: FN_COLOR }}>f_n (indigo)</span>
        <span style={{ color: LIMIT_COLOR }}>limit f (red dashed)</span>
        <span style={{ color: ERROR_COLOR }}>|f_n − f| (amber shaded)</span>
        <span>
          ||f_{n} − f||_{p.toFixed(1)} = {currentNormDiff.toFixed(5)}
        </span>
      </div>

      <p
        className="text-xs italic"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {scenario.description} The bar chart shows how the L^p norm
        difference decays as k grows — completeness of L^p (Riesz–Fischer)
        guarantees that this Cauchy sequence converges in the L^p norm to
        the limit shown.
      </p>
    </div>
  );
}
