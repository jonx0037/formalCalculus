import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { checkHolder, checkMinkowski } from './shared/measure';
import {
  getHolderScenario,
  type HolderScenario,
} from '../../data/lp-spaces-data';

// ── Constants ─────────────────────────────────────────────────

const F_COLOR = '#4F46E5'; // indigo — f
const G_COLOR = '#0891B2'; // cyan-blue — g
const PRODUCT_COLOR = '#DC2626'; // red — fg or f+g
const LHS_COLOR = '#4F46E5'; // indigo — left-hand side bar
const RHS_COLOR = '#DC2626'; // red — right-hand side (bound) bar

interface ScenarioOption {
  id: string;
  label: string;
}

const SCENARIOS: ScenarioOption[] = [
  { id: 'sin-x2', label: 'sin(πx) and x²' },
  { id: 'power-pair', label: 'x^(1/3) and x^(1/6) — near equality' },
  { id: 'indicators', label: 'Overlapping indicators' },
  { id: 'exp-cos', label: 'eˣ−1 and cos(πx/2)' },
];

const P_MIN = 1.1;
const P_MAX = 10.0;

// ── Main component ────────────────────────────────────────────

export default function HolderMinkowskiExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [p, setP] = useState(3);
  const [showMinkowski, setShowMinkowski] = useState(false);

  const scenario: HolderScenario = useMemo(
    () => getHolderScenario(SCENARIOS[scenarioIdx].id),
    [scenarioIdx],
  );

  const q = useMemo(() => p / (p - 1), [p]);

  // ── Layout ────────────────────────────────────────────────

  const stacked = containerWidth > 0 && containerWidth < 720;
  const totalWidth = Math.min(containerWidth || 0, 920);
  const totalHeight = stacked ? 620 : 400;
  const leftW = stacked ? totalWidth : Math.floor(totalWidth * 0.6);
  const rightW = stacked ? totalWidth : totalWidth - leftW;
  const panelH = stacked ? 290 : totalHeight - 40;
  const margin = { top: 30, right: 16, bottom: 32, left: 44 };

  // ── Function curves ───────────────────────────────────────

  const fCurve = useMemo(() => {
    const N = 250;
    const [a, b] = scenario.domain;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = a + (i / (N - 1)) * (b - a);
      pts.push([x, Math.abs(scenario.f(x))]);
    }
    return pts;
  }, [scenario]);

  const gCurve = useMemo(() => {
    const N = 250;
    const [a, b] = scenario.domain;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = a + (i / (N - 1)) * (b - a);
      pts.push([x, Math.abs(scenario.g(x))]);
    }
    return pts;
  }, [scenario]);

  // Either |f·g| (Hölder mode) or |f + g| (Minkowski mode).
  const productCurve = useMemo(() => {
    const N = 250;
    const [a, b] = scenario.domain;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = a + (i / (N - 1)) * (b - a);
      const y = showMinkowski
        ? Math.abs(scenario.f(x) + scenario.g(x))
        : Math.abs(scenario.f(x) * scenario.g(x));
      pts.push([x, y]);
    }
    return pts;
  }, [scenario, showMinkowski]);

  // ── Inequality computation (memoized) ─────────────────────

  const holderResult = useMemo(
    () => checkHolder(scenario.f, scenario.g, p, scenario.domain, 1000),
    [scenario, p],
  );

  const minkowskiResult = useMemo(
    () => checkMinkowski(scenario.f, scenario.g, p, scenario.domain, 1000),
    [scenario, p],
  );

  const lhs = showMinkowski ? minkowskiResult.lhs : holderResult.lhs;
  const rhs = showMinkowski ? minkowskiResult.rhs : holderResult.rhs;
  const ratio = rhs > 0 ? lhs / rhs : 0;

  // y-axis max for the left panel
  const yMax = useMemo(() => {
    let m = 0;
    for (const [, y] of fCurve) if (Number.isFinite(y) && y > m) m = y;
    for (const [, y] of gCurve) if (Number.isFinite(y) && y > m) m = y;
    for (const [, y] of productCurve) if (Number.isFinite(y) && y > m) m = y;
    return Math.max(m * 1.15, 0.2);
  }, [fCurve, gCurve, productCurve]);

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
          .text(showMinkowski ? '|f|, |g|, and |f + g|' : '|f|, |g|, and |fg|');

        // Axes
        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(d3.axisBottom(xScale).ticks(5))
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

        // Shaded area for the product/sum (red, light fill)
        const area = d3
          .area<[number, number]>()
          .defined(([, y]) => Number.isFinite(y))
          .x(([x]) => xScale(x))
          .y0(yScale(0))
          .y1(([, y]) => yScale(y));
        g.append('path')
          .datum(productCurve)
          .attr('d', area)
          .style('fill', PRODUCT_COLOR)
          .style('fill-opacity', 0.18);

        // f curve
        g.append('path')
          .datum(fCurve)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', F_COLOR)
          .style('stroke-width', 1.6);

        // g curve
        g.append('path')
          .datum(gCurve)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', G_COLOR)
          .style('stroke-width', 1.6)
          .style('stroke-dasharray', '5,3');

        // product curve (drawn on top)
        g.append('path')
          .datum(productCurve)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', PRODUCT_COLOR)
          .style('stroke-width', 1.8);
      }

      // ── Panel 2: inequality bar chart ──
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

        const barLabels = showMinkowski
          ? ['||f+g||_p', '||f||_p + ||g||_p']
          : ['||fg||_1', '||f||_p · ||g||_q'];
        const barValues = [lhs, rhs];

        const xScale = d3
          .scaleBand<string>()
          .domain(barLabels)
          .range([0, innerW])
          .padding(0.35);
        const barYMax = Math.max(...barValues, 0.05) * 1.2;
        const yScale = d3
          .scaleLinear()
          .domain([0, barYMax])
          .range([innerH, 0]);

        // Title
        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -12)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text(showMinkowski ? "Minkowski's inequality" : "Hölder's inequality");

        // Axes
        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(d3.axisBottom(xScale))
          .selectAll('text')
          .style('font-size', '9px');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');

        // Bars
        const colors = [LHS_COLOR, RHS_COLOR];
        g.selectAll('rect.bar')
          .data(barValues)
          .enter()
          .append('rect')
          .attr('class', 'bar')
          .attr('x', (_, i) => xScale(barLabels[i]) ?? 0)
          .attr('y', (d) => yScale(Math.max(0, d)))
          .attr('width', xScale.bandwidth())
          .attr('height', (d) =>
            Math.max(0, yScale(0) - yScale(Math.max(0, d))),
          )
          .style('fill', (_, i) => colors[i])
          .style('fill-opacity', 0.8)
          .style('stroke', (_, i) => colors[i])
          .style('stroke-width', 1.0);

        // Bar labels above each bar
        g.selectAll('text.bar-value')
          .data(barValues)
          .enter()
          .append('text')
          .attr('class', 'bar-value')
          .attr('x', (_, i) => (xScale(barLabels[i]) ?? 0) + xScale.bandwidth() / 2)
          .attr('y', (d) => yScale(Math.max(0, d)) - 6)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', (_, i) => colors[i])
          .text((d) => d.toFixed(4));
      }
    },
    [
      scenario,
      scenarioIdx,
      p,
      showMinkowski,
      fCurve,
      gCurve,
      productCurve,
      lhs,
      rhs,
      yMax,
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

  // ── JSX ───────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label
          className="flex items-center gap-1.5 font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Functions:
          <select
            value={scenarioIdx}
            onChange={(e) => setScenarioIdx(parseInt(e.target.value))}
            className="rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            aria-label="Choose function pair"
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
          p = {p.toFixed(2)} (q = {q.toFixed(2)})
          <input
            type="range"
            min={P_MIN}
            max={P_MAX}
            step={0.1}
            value={p}
            onChange={(e) => setP(parseFloat(e.target.value))}
            className="w-40"
            aria-label="Hölder exponent p"
          />
        </label>

        <label
          className="flex items-center gap-1.5 cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <input
            type="checkbox"
            checked={showMinkowski}
            onChange={(e) => setShowMinkowski(e.target.checked)}
            aria-label="Show Minkowski instead of Hölder"
          />
          Show Minkowski
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
        aria-label={
          showMinkowski
            ? `Minkowski inequality bar chart at p = ${p.toFixed(2)}: ||f+g||_p = ${lhs.toFixed(4)}, ||f||_p + ||g||_p = ${rhs.toFixed(4)}`
            : `Holder inequality bar chart at p = ${p.toFixed(2)}: ||fg||_1 = ${lhs.toFixed(4)}, ||f||_p * ||g||_q = ${rhs.toFixed(4)}`
        }
      />

      {/* Numeric readout */}
      <div
        className="text-xs flex flex-wrap gap-x-4 gap-y-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span style={{ color: LHS_COLOR }}>
          {showMinkowski ? '||f+g||_p' : '||fg||_1'} = {lhs.toFixed(5)}
        </span>
        <span style={{ color: RHS_COLOR }}>
          {showMinkowski ? '||f||_p + ||g||_p' : '||f||_p · ||g||_q'} ={' '}
          {rhs.toFixed(5)}
        </span>
        <span>ratio = {ratio.toFixed(4)}</span>
        {!showMinkowski && holderResult.isSharp && (
          <span style={{ color: PRODUCT_COLOR, fontWeight: 600 }}>
            sharp (Young saturation)
          </span>
        )}
      </div>

      <p
        className="text-xs italic"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {scenario.description} The bar chart on the right compares the two
        sides of the inequality. Slide p (or toggle Minkowski) to see how the
        ratio responds.
      </p>
    </div>
  );
}
