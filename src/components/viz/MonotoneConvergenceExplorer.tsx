import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  getMonotoneSequence,
  type ConvergenceSequence,
} from '../../data/lebesgue-integral-data';

// ── Constants ─────────────────────────────────────────────────

const FN_COLOR = '#4F46E5'; // indigo — current f_n
const LIMIT_COLOR = '#DC2626'; // red — pointwise limit f
const BAR_COLOR = '#4F46E5';

interface SeqOption {
  id: 'truncation' | 'expanding-support' | 'dyadic-simple';
  label: string;
}

const SEQUENCES: SeqOption[] = [
  { id: 'truncation', label: 'Truncation: min(f, n) for f = 1/√x' },
  { id: 'expanding-support', label: 'Expanding support: f · 1_{[−n,n]} for f = e^(−|x|/2)' },
  { id: 'dyadic-simple', label: 'Dyadic simple: s_n ↑ f for f = 4x(1−x)' },
];

const N_MIN = 1;
const N_MAX = 20;

// ── Main component ────────────────────────────────────────────

export default function MonotoneConvergenceExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [seqIdx, setSeqIdx] = useState(0);
  const [n, setN] = useState(5);

  const sequence: ConvergenceSequence = useMemo(
    () => getMonotoneSequence(SEQUENCES[seqIdx].id),
    [seqIdx],
  );

  // ── Layout ────────────────────────────────────────────────

  const stacked = containerWidth > 0 && containerWidth < 640;
  const totalWidth = Math.min(containerWidth, 880);
  const totalHeight = stacked ? 580 : 360;
  const leftW = stacked ? totalWidth : Math.floor(totalWidth * 0.6);
  const rightW = stacked ? totalWidth : totalWidth - leftW;
  const panelH = stacked ? 270 : totalHeight - 40;
  const margin = { top: 28, right: 14, bottom: 30, left: 44 };

  // ── Derived data ──────────────────────────────────────────

  const fnCurve = useMemo(() => {
    const N = 250;
    const [a, b] = sequence.domain;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = a + (i / (N - 1)) * (b - a);
      pts.push([x, sequence.fn(x, n)]);
    }
    return pts;
  }, [sequence, n]);

  const limitCurve = useMemo(() => {
    const N = 250;
    const [a, b] = sequence.domain;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = a + (i / (N - 1)) * (b - a);
      const y = sequence.limit(x);
      // Cap visually for unbounded targets like 1/√x near 0
      pts.push([x, Math.min(y, 50)]);
    }
    return pts;
  }, [sequence]);

  const integralHistory = useMemo(() => {
    const ks = Array.from({ length: N_MAX }, (_, i) => i + 1);
    return ks.map((k) => ({ k, value: sequence.integralOfFn(k) }));
  }, [sequence]);

  // y-domain for the function panel — cap so unbounded targets don't blow up
  const yMax = useMemo(() => {
    let m = 0;
    for (const [, y] of fnCurve) if (Number.isFinite(y) && y > m) m = y;
    for (const [, y] of limitCurve) if (Number.isFinite(y) && y > m) m = y;
    return Math.max(m * 1.15, 0.5);
  }, [fnCurve, limitCurve]);

  const integralYMax = useMemo(() => {
    let m = sequence.integralOfLimit;
    for (const { value } of integralHistory)
      if (Number.isFinite(value) && value > m) m = value;
    return Math.max(m * 1.15, 0.5);
  }, [integralHistory, sequence.integralOfLimit]);

  // ── D3 render ─────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (totalWidth === 0) return;

      svg.attr('width', totalWidth).attr('height', totalHeight);

      // ── Panel 1: function plot with shaded area under f_n ─────
      {
        const ox = 0;
        const oy = 0;
        const innerW = leftW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr('transform', `translate(${ox + margin.left},${oy + margin.top})`);

        const xScale = d3
          .scaleLinear()
          .domain([sequence.domain[0], sequence.domain[1]])
          .range([0, innerW]);
        const yScale = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text(`f_n at n = ${n} (f_n ≤ f, f_n ↑ f)`);

        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(d3.axisBottom(xScale).ticks(5))
          .selectAll('text')
          .style('font-size', '9px');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');

        g.append('defs')
          .append('clipPath')
          .attr('id', `mce-clip-${seqIdx}`)
          .append('rect')
          .attr('width', innerW)
          .attr('height', innerH);
        const plot = g.append('g').attr('clip-path', `url(#mce-clip-${seqIdx})`);

        const line = d3
          .line<[number, number]>()
          .defined(([, y]) => Number.isFinite(y))
          .x(([x]) => xScale(x))
          .y(([, y]) => yScale(y));

        // Shaded area under f_n
        const area = d3
          .area<[number, number]>()
          .defined(([, y]) => Number.isFinite(y))
          .x(([x]) => xScale(x))
          .y0(yScale(0))
          .y1(([, y]) => yScale(y));
        plot
          .append('path')
          .datum(fnCurve)
          .attr('d', area)
          .style('fill', FN_COLOR)
          .style('fill-opacity', 0.28);

        // Limit f (dashed red, drawn after area)
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

      // ── Panel 2: bar chart of ∫f_k for k = 1..N_MAX ──────────
      {
        const ox = stacked ? 0 : leftW;
        const oy = stacked ? panelH + 40 : 0;
        const innerW = rightW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr('transform', `translate(${ox + margin.left},${oy + margin.top})`);

        const xScale = d3
          .scaleBand<number>()
          .domain(integralHistory.map((d) => d.k))
          .range([0, innerW])
          .padding(0.2);
        const yScale = d3
          .scaleLinear()
          .domain([0, integralYMax])
          .range([innerH, 0]);

        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text('∫ f_k history (climbing ↑)');

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

        g.selectAll('rect.history-bar')
          .data(integralHistory)
          .enter()
          .append('rect')
          .attr('class', 'history-bar')
          .attr('x', (d) => xScale(d.k) ?? 0)
          .attr('y', (d) => yScale(Math.max(0, d.value)))
          .attr('width', xScale.bandwidth())
          .attr('height', (d) => Math.max(0, yScale(0) - yScale(Math.max(0, d.value))))
          .style('fill', (d) => (d.k <= n ? BAR_COLOR : 'var(--color-surface-alt)'))
          .style('fill-opacity', (d) => (d.k <= n ? 0.85 : 0.35))
          .style('stroke', (d) => (d.k <= n ? BAR_COLOR : 'var(--color-border)'))
          .style('stroke-width', 0.6);

        // Limit line ∫ f
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yScale(sequence.integralOfLimit))
          .attr('y2', yScale(sequence.integralOfLimit))
          .style('stroke', LIMIT_COLOR)
          .style('stroke-width', 1.4)
          .style('stroke-dasharray', '5,4');
        g.append('text')
          .attr('x', innerW - 4)
          .attr('y', yScale(sequence.integralOfLimit) - 4)
          .attr('text-anchor', 'end')
          .style('font-size', '9px')
          .style('font-weight', '600')
          .style('fill', LIMIT_COLOR)
          .text(`∫ f = ${sequence.integralOfLimit.toFixed(3)}`);
      }
    },
    [
      sequence,
      seqIdx,
      n,
      fnCurve,
      limitCurve,
      integralHistory,
      yMax,
      integralYMax,
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

  const integralAtN = sequence.integralOfFn(n);
  const limitValue = sequence.integralOfLimit;
  const gap = limitValue - integralAtN;

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
            value={seqIdx}
            onChange={(e) => setSeqIdx(parseInt(e.target.value))}
            className="rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            aria-label="Choose monotone-convergence sequence"
          >
            {SEQUENCES.map((s, i) => (
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
        aria-label="Monotone convergence explorer: f_n with shaded area and integral history bar chart climbing toward the limit"
      />

      {/* Numeric readout */}
      <div
        className="text-xs flex flex-wrap gap-x-4 gap-y-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span style={{ color: FN_COLOR }}>∫ f_n dμ = {integralAtN.toFixed(5)}</span>
        <span style={{ color: LIMIT_COLOR }}>∫ f dμ = {limitValue.toFixed(5)}</span>
        <span>Gap (∫ f − ∫ f_n) = {gap.toFixed(5)}</span>
      </div>

      <p
        className="text-xs italic"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {sequence.description} <strong style={{ fontStyle: 'normal' }}>MCT predicts: ∫ f_n ↑ ∫ f because f_n is non-decreasing and converges pointwise to f.</strong>
      </p>
    </div>
  );
}
