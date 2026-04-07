import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  getRiemannPartition,
  getLebesguePartition,
  getPresetFunctions,
  type PresetFunction,
} from '../../data/sigma-algebras-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS: PresetFunction[] = getPresetFunctions();

// Riemann panel uses blue; Lebesgue panel uses indigo (the
// 'measure-integration' domain color from colorScales.ts).
const RIEMANN_COLOR = '#2563EB';
const LEBESGUE_COLOR = '#4F46E5';
const FUNCTION_COLOR = '#111827';
const PREIMAGE_FILL = '#C7D2FE'; // light indigo for preimage shading

const MIN_N = 2;
const MAX_N = 50;
const ANIMATION_TICK_MS = 80;

// ── Main component ──────────────────────────────────────────

export default function RiemannVsLebesgueExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [presetIdx, setPresetIdx] = useState(0);
  const [n, setN] = useState(8);
  const [animating, setAnimating] = useState(false);

  const preset = PRESETS[presetIdx];

  // Layout: two panels side by side on wide screens, stacked on narrow.
  const isWide = containerWidth >= 720;
  const panelWidth = isWide
    ? Math.min((containerWidth - 16) / 2, 460)
    : Math.min(containerWidth, 480);
  const panelHeight = Math.min(panelWidth * 0.85, 360);
  const margin = { top: 24, right: 18, bottom: 38, left: 48 };

  // ── Compute the function's display range ──────────────────

  const yRange = useMemo(() => {
    // Sample densely to find min/max for the y-axis
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const x = i / 200;
      const v = preset.f(x);
      if (Number.isFinite(v)) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    // Pad slightly so curves don't kiss the frame
    const pad = (hi - lo) * 0.08 || 0.1;
    return { lo: lo - pad, hi: hi + pad };
  }, [preset]);

  // ── Compute partitions ────────────────────────────────────

  const riemann = useMemo(
    () => getRiemannPartition(preset.f, n, 'midpoint'),
    [preset, n],
  );

  // For the Lebesgue partition use the function's actual y-range, clipped to ≥ 0
  // for non-negative presets and the natural range otherwise. The visualization
  // works for negative values too because the preimage shading is symmetric.
  const lebesgueYMin = Math.min(0, yRange.lo);
  const lebesgueYMax = yRange.hi;
  const lebesgue = useMemo(
    () => getLebesguePartition(preset.f, n, lebesgueYMin, lebesgueYMax),
    [preset, n, lebesgueYMin, lebesgueYMax],
  );

  // ── Densely sampled curve for the function plot ───────────

  const curve = useMemo(() => {
    const N = 400;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      pts.push([x, preset.f(x)]);
    }
    return pts;
  }, [preset]);

  // ── Animation: tick n upward, restart at MIN_N when it hits MAX_N ──

  useEffect(() => {
    if (!animating) return;
    const id = window.setInterval(() => {
      setN((prev) => (prev >= MAX_N ? MIN_N : prev + 2));
    }, ANIMATION_TICK_MS);
    return () => window.clearInterval(id);
  }, [animating]);

  // Stop the animation if the user moves the slider manually
  const handleSliderChange = useCallback((next: number) => {
    setAnimating(false);
    setN(next);
  }, []);

  // ── D3 refs ───────────────────────────────────────────────

  const riemannRef = useRef<SVGSVGElement | null>(null);
  const lebesgueRef = useRef<SVGSVGElement | null>(null);

  // ── Riemann panel: domain partition with vertical bars ────

  useEffect(() => {
    const node = riemannRef.current;
    if (!node || panelWidth === 0) return;

    const svg = d3.select(node);
    svg.selectAll('*').remove();
    svg.attr('width', panelWidth).attr('height', panelHeight);

    const innerW = panelWidth - margin.left - margin.right;
    const innerH = panelHeight - margin.top - margin.bottom;
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
    const yScale = d3
      .scaleLinear()
      .domain([yRange.lo, yRange.hi])
      .range([innerH, 0]);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${yScale(0)})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .selectAll('text')
      .style('font-size', '10px');
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .style('font-size', '10px');

    // Axis labels
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', 'var(--color-text-muted)')
      .text('x  (domain partition)');
    g.append('text')
      .attr('x', -innerH / 2)
      .attr('y', -36)
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .style('font-size', '11px')
      .style('fill', 'var(--color-text-muted)')
      .text('f(x)');

    // Title
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', RIEMANN_COLOR)
      .text('Riemann — slice the domain');

    // Rectangles (clipped so out-of-range bars don't escape)
    g.append('defs')
      .append('clipPath')
      .attr('id', 'riemann-clip')
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerH);
    const plot = g.append('g').attr('clip-path', 'url(#riemann-clip)');

    plot
      .selectAll('rect.bar')
      .data(riemann.subintervals)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.a))
      .attr('y', (_d, i) => yScale(Math.max(0, riemann.heights[i])))
      .attr('width', (d) => Math.max(0, xScale(d.b) - xScale(d.a) - 0.5))
      .attr('height', (_d, i) => {
        const h = riemann.heights[i];
        if (h >= 0) return Math.abs(yScale(0) - yScale(h));
        return Math.abs(yScale(h) - yScale(0));
      })
      .style('fill', RIEMANN_COLOR)
      .style('fill-opacity', 0.35)
      .style('stroke', RIEMANN_COLOR)
      .style('stroke-width', 0.6);

    // For negative-height regions, draw the bar below the axis
    plot
      .selectAll('rect.barNeg')
      .data(riemann.subintervals)
      .enter()
      .append('rect')
      .attr('class', 'barNeg')
      .attr('x', (d) => xScale(d.a))
      .attr('y', () => yScale(0))
      .attr('width', (d) => Math.max(0, xScale(d.b) - xScale(d.a) - 0.5))
      .attr('height', (_d, i) => {
        const h = riemann.heights[i];
        return h < 0 ? Math.abs(yScale(h) - yScale(0)) : 0;
      })
      .style('fill', RIEMANN_COLOR)
      .style('fill-opacity', 0.18);

    // Function curve on top
    const line = d3
      .line<[number, number]>()
      .defined((d) => Number.isFinite(d[1]))
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]));

    plot
      .append('path')
      .datum(curve)
      .attr('d', line)
      .style('fill', 'none')
      .style('stroke', FUNCTION_COLOR)
      .style('stroke-width', 1.6);
  }, [
    panelWidth,
    panelHeight,
    margin.left,
    margin.right,
    margin.top,
    margin.bottom,
    yRange,
    riemann,
    curve,
  ]);

  // ── Lebesgue panel: range partition with preimage shading ─

  useEffect(() => {
    const node = lebesgueRef.current;
    if (!node || panelWidth === 0) return;

    const svg = d3.select(node);
    svg.selectAll('*').remove();
    svg.attr('width', panelWidth).attr('height', panelHeight);

    const innerW = panelWidth - margin.left - margin.right;
    const innerH = panelHeight - margin.top - margin.bottom;
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
    const yScale = d3
      .scaleLinear()
      .domain([yRange.lo, yRange.hi])
      .range([innerH, 0]);

    g.append('g')
      .attr('transform', `translate(0,${yScale(0)})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .selectAll('text')
      .style('font-size', '10px');
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .style('font-size', '10px');

    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', 'var(--color-text-muted)')
      .text('x  (preimages)');
    g.append('text')
      .attr('x', -innerH / 2)
      .attr('y', -36)
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .style('font-size', '11px')
      .style('fill', 'var(--color-text-muted)')
      .text('f(x)  (range partition)');

    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', LEBESGUE_COLOR)
      .text('Lebesgue — slice the range');

    g.append('defs')
      .append('clipPath')
      .attr('id', 'lebesgue-clip')
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerH);
    const plot = g.append('g').attr('clip-path', 'url(#lebesgue-clip)');

    // Horizontal range bands
    for (let k = 0; k < lebesgue.levels.length - 1; k++) {
      const yLow = lebesgue.levels[k];
      const yHigh = lebesgue.levels[k + 1];
      plot
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', yScale(yLow))
        .attr('y2', yScale(yLow))
        .style('stroke', LEBESGUE_COLOR)
        .style('stroke-width', 0.4)
        .style('stroke-opacity', 0.4);

      // Preimage shading for this band: a vertical column over each preimage
      // interval, from y=0 up to yHigh (so the area = y_k · λ(preimage_k)
      // is visually represented as a Lebesgue "rectangle" with horizontal extent
      // = the preimage union and vertical extent = the level value).
      const intervals = lebesgue.preimageSets[k];
      const yTop = Math.max(0, yLow);
      const yBottom = 0;
      for (const iv of intervals) {
        plot
          .append('rect')
          .attr('x', xScale(iv.a))
          .attr('y', yScale(yHigh))
          .attr('width', Math.max(0.5, xScale(iv.b) - xScale(iv.a)))
          .attr('height', Math.abs(yScale(yLow) - yScale(yHigh)))
          .style('fill', PREIMAGE_FILL)
          .style('fill-opacity', 0.85)
          .style('stroke', LEBESGUE_COLOR)
          .style('stroke-width', 0.3)
          .style('stroke-opacity', 0.7);
        // Underline the preimage interval on the x-axis to make the
        // "pulled-back set" visible even when the band is thin.
        plot
          .append('line')
          .attr('x1', xScale(iv.a))
          .attr('x2', xScale(iv.b))
          .attr('y1', yScale(yBottom) + 1)
          .attr('y2', yScale(yBottom) + 1)
          .style('stroke', LEBESGUE_COLOR)
          .style('stroke-width', 2)
          .style('stroke-opacity', 0.6);
        // Also mark yTop unused for negative ranges (kept for symmetry)
        void yTop;
      }
    }

    // Function curve last so it's on top
    const line = d3
      .line<[number, number]>()
      .defined((d) => Number.isFinite(d[1]))
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]));

    plot
      .append('path')
      .datum(curve)
      .attr('d', line)
      .style('fill', 'none')
      .style('stroke', FUNCTION_COLOR)
      .style('stroke-width', 1.6);
  }, [
    panelWidth,
    panelHeight,
    margin.left,
    margin.right,
    margin.top,
    margin.bottom,
    yRange,
    lebesgue,
    curve,
  ]);

  // ── Render ────────────────────────────────────────────────

  const exactStr =
    preset.integralExact != null ? preset.integralExact.toFixed(4) : '—';
  const riemannErr =
    preset.integralExact != null
      ? Math.abs(riemann.sum - preset.integralExact)
      : NaN;
  const lebesgueErr =
    preset.integralExact != null
      ? Math.abs(lebesgue.sum - preset.integralExact)
      : NaN;

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
            value={presetIdx}
            onChange={(e) => {
              setAnimating(false);
              setPresetIdx(parseInt(e.target.value));
            }}
            className="rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            aria-label="Choose target function"
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
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
            min={MIN_N}
            max={MAX_N}
            step={1}
            value={n}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            className="w-40"
            aria-label="Number of partition elements"
          />
        </label>

        <button
          type="button"
          onClick={() => setAnimating((a) => !a)}
          className="rounded px-3 py-1 text-sm font-medium"
          style={{
            background: animating ? LEBESGUE_COLOR : 'var(--color-surface-alt)',
            color: animating ? '#fff' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
          aria-pressed={animating}
        >
          {animating ? 'Pause' : 'Animate'}
        </button>
      </div>

      {/* Two-panel SVG layout */}
      <div
        className="flex flex-wrap gap-4 justify-center"
        style={{ minHeight: panelHeight }}
      >
        <svg
          ref={riemannRef}
          className="rounded"
          style={{
            border: '1px solid var(--color-border)',
            background: 'var(--color-viz-bg)',
          }}
          role="img"
          aria-label="Riemann partition: vertical bars over a domain partition of [0, 1]"
        />
        <svg
          ref={lebesgueRef}
          className="rounded"
          style={{
            border: '1px solid var(--color-border)',
            background: 'var(--color-viz-bg)',
          }}
          role="img"
          aria-label="Lebesgue partition: horizontal range bands with preimage shading"
        />
      </div>

      {/* Numerical readout */}
      <div
        className="text-xs flex flex-wrap gap-x-4 gap-y-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span style={{ color: RIEMANN_COLOR }}>
          Riemann sum (midpoint, n = {n}): {riemann.sum.toFixed(4)}
          {Number.isFinite(riemannErr) && ` · err ${riemannErr.toExponential(2)}`}
        </span>
        <span style={{ color: LEBESGUE_COLOR }}>
          Lebesgue sum (n = {n}): {lebesgue.sum.toFixed(4)}
          {Number.isFinite(lebesgueErr) && ` · err ${lebesgueErr.toExponential(2)}`}
        </span>
        <span>Exact integral: {exactStr}</span>
      </div>

      <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
        {preset.description}
      </p>
    </div>
  );
}
