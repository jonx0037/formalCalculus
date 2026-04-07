import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  getCantorIterations,
  type CantorVariant,
} from '../../data/sigma-algebras-data';

// ── Constants ─────────────────────────────────────────────────

const STANDARD_COLOR = '#4F46E5'; // indigo (measure-integration)
const FAT_COLOR = '#DC2626'; // red — visibly distinct from the standard set

const MAX_ITERATIONS = 10;

// ── Main component ──────────────────────────────────────────

export default function CantorSetExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [iteration, setIteration] = useState(5);
  const [fat, setFat] = useState(false);

  const variant: CantorVariant = fat ? 'smith-volterra' : 'middle-thirds';
  const accentColor = fat ? FAT_COLOR : STANDARD_COLOR;

  // Generate iterations 0..MAX_ITERATIONS once per variant, then slice up to
  // the current iteration. This makes the slider feel instant.
  const allIterations = useMemo(
    () => getCantorIterations(MAX_ITERATIONS, variant),
    [variant],
  );
  const visible = allIterations.slice(0, iteration + 1);

  // ── Layout ────────────────────────────────────────────────

  const totalWidth = Math.min(containerWidth, 760);
  const totalHeight = Math.min(420, totalWidth * 0.6);
  const margin = { top: 18, right: 24, bottom: 32, left: 80 };

  // ── D3 render ─────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (totalWidth === 0) return;

      const innerW = totalWidth - margin.left - margin.right;
      const innerH = totalHeight - margin.top - margin.bottom;

      svg.attr('width', totalWidth).attr('height', totalHeight);
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW]);

      // Vertical: one row per iteration, centered
      const rowCount = visible.length;
      const rowHeight = innerH / Math.max(rowCount, 1);
      const barHeight = Math.max(2, Math.min(18, rowHeight * 0.55));

      // x-axis at the bottom
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 28)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('x');

      // Iteration labels and bars
      visible.forEach((iter, i) => {
        const yCenter = i * rowHeight + rowHeight / 2;

        // Label on the left: "n = i" with the count and length
        g.append('text')
          .attr('x', -8)
          .attr('y', yCenter + 3)
          .attr('text-anchor', 'end')
          .style('font-size', '10px')
          .style('fill', 'var(--color-text)')
          .text(`n = ${iter.iteration}`);

        g.append('text')
          .attr('x', -8)
          .attr('y', yCenter + 14)
          .attr('text-anchor', 'end')
          .style('font-size', '9px')
          .style('fill', 'var(--color-text-muted)')
          .text(
            `${iter.intervalCount.toLocaleString()} interval${iter.intervalCount === 1 ? '' : 's'}`,
          );

        // Cantor intervals as filled bars
        g.selectAll(null)
          .data(iter.intervals)
          .enter()
          .append('rect')
          .attr('x', (d) => xScale(d.a))
          .attr('y', yCenter - barHeight / 2)
          .attr('width', (d) => Math.max(0.5, xScale(d.b) - xScale(d.a)))
          .attr('height', barHeight)
          .style('fill', accentColor)
          .style('fill-opacity', 0.85);
      });
    },
    [
      visible,
      totalWidth,
      totalHeight,
      accentColor,
      margin.left,
      margin.right,
      margin.top,
      margin.bottom,
    ],
  );

  // ── Display values ────────────────────────────────────────

  const lastIter = visible[visible.length - 1];
  const fmt = (x: number) =>
    x === 0 ? '0' : x < 1e-4 ? x.toExponential(3) : x.toFixed(6);

  // For middle-thirds: closed form is (2/3)^n.
  // For Smith-Volterra: closed form for the cumulative removed length is
  //   1 - λ_n = Σ_{k=1}^n 2^(k-1) · (1/4)^k = (1/2)(1 - (1/2)^n).
  // So total length λ_n = 1 - (1/2)(1 - (1/2)^n) = 1/2 + (1/2)^(n+1),
  // which approaches 1/2 from above.
  const formula = fat
    ? '1/2 + (1/2)ⁿ⁺¹'
    : '(2/3)ⁿ';
  const limit = fat ? '1/2 (positive!)' : '0';

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label
          className="flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          n = {iteration}
          <input
            type="range"
            min={0}
            max={MAX_ITERATIONS}
            step={1}
            value={iteration}
            onChange={(e) => setIteration(parseInt(e.target.value))}
            className="w-40"
            aria-label="Iteration count"
          />
        </label>

        <label
          className="flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <input
            type="checkbox"
            checked={fat}
            onChange={(e) => setFat(e.target.checked)}
            aria-label="Use the Smith-Volterra (fat) Cantor variant with positive limiting measure"
          />
          Fat (Smith-Volterra) variant — positive limiting measure
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
        aria-label="Cantor set construction: stacked rows showing iterative middle removal"
      />

      {/* Numeric readout */}
      <div
        className="text-xs flex flex-wrap gap-x-4 gap-y-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span style={{ color: accentColor }}>
          Total length at n = {iteration}: {fmt(lastIter.totalLength)}
        </span>
        <span>
          Interval count: {lastIter.intervalCount.toLocaleString()}
        </span>
        <span>Closed form: {formula}</span>
        <span>Limit as n → ∞: {limit}</span>
      </div>

      <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
        {fat
          ? `Smith-Volterra-Cantor set: at step k, remove a middle interval of length 1/4ᵏ from every remaining interval. The total removed length is Σ 2ᵏ⁻¹ · (1/4)ᵏ = 1/2, so the limiting set has Lebesgue measure 1/2 — uncountable, nowhere dense, and yet positive-measure. This is the canonical demonstration that "Cantor-like" does not imply "measure zero."`
          : `Standard middle-thirds set: at every step, remove the open middle 1/3 of each remaining interval. After ${iteration} iterations, the total length is (2/3)^${iteration} = ${fmt(lastIter.totalLength)}. The limiting set is non-empty and uncountable — every ternary expansion in {0, 2}^ℕ gives a point in C — yet it has total length 0.`}
      </p>
    </div>
  );
}
