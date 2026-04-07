import { useState, useMemo, useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  getOuterMeasureCover,
  type MeasureInterval,
} from '../../data/sigma-algebras-data';

// ── Constants ─────────────────────────────────────────────────

const TARGET_COLOR = '#0F172A'; // slate-900
const COVER_COLOR = '#4F46E5'; // indigo (measure-integration)
const HANDLE_COLOR = '#2563EB';

const MAX_INTERVALS = 8;

// Default target set: [0.3, 0.7] — matches the source notebook
const DEFAULT_TARGET: MeasureInterval[] = [{ a: 0.3, b: 0.7 }];

// ── Main component ──────────────────────────────────────────

export default function OuterMeasureExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [nIntervals, setNIntervals] = useState(2);
  // The cover is initialized from the helper but can be locally edited by drag
  // and reset by the "Reset" button or by changing nIntervals.
  const initialCover = useMemo(
    () => getOuterMeasureCover(DEFAULT_TARGET, nIntervals),
    [nIntervals],
  );
  const [cover, setCover] = useState<MeasureInterval[]>(initialCover.cover);

  // Reset cover when nIntervals changes (the user controls intent through the slider)
  useEffect(() => {
    setCover(initialCover.cover);
  }, [initialCover]);

  const exactMeasure = initialCover.exactMeasure;
  const coverLength = cover.reduce((sum, iv) => sum + (iv.b - iv.a), 0);

  // ── Layout ────────────────────────────────────────────────

  const totalWidth = Math.min(containerWidth, 760);
  const totalHeight = 240;
  const margin = { top: 36, right: 28, bottom: 60, left: 28 };

  // ── Drag handlers ─────────────────────────────────────────

  const handleDragLeftEdge = useCallback(
    (idx: number, newA: number) => {
      setCover((prev) => {
        const next = [...prev];
        const iv = next[idx];
        next[idx] = { a: Math.max(0, Math.min(newA, iv.b - 0.005)), b: iv.b };
        return next;
      });
    },
    [],
  );

  const handleDragRightEdge = useCallback(
    (idx: number, newB: number) => {
      setCover((prev) => {
        const next = [...prev];
        const iv = next[idx];
        next[idx] = { a: iv.a, b: Math.max(iv.a + 0.005, Math.min(newB, 1)) };
        return next;
      });
    },
    [],
  );

  const handleDragWhole = useCallback((idx: number, deltaX: number) => {
    setCover((prev) => {
      const next = [...prev];
      const iv = next[idx];
      const w = iv.b - iv.a;
      let a = iv.a + deltaX;
      if (a < 0) a = 0;
      if (a + w > 1) a = 1 - w;
      next[idx] = { a, b: a + w };
      return next;
    });
  }, []);

  // ── Optimize: shrink each cover interval to just the target it overlaps ──

  const handleOptimize = useCallback(() => {
    setCover((prev) => {
      // For each cover interval, find its intersection with the target,
      // then expand by a tiny epsilon to keep "open".
      const eps = 0.005;
      return prev.map((iv) => {
        // Intersect with [0.3, 0.7]
        const a = Math.max(iv.a, DEFAULT_TARGET[0].a);
        const b = Math.min(iv.b, DEFAULT_TARGET[0].b);
        if (a >= b) {
          // No overlap with target; collapse to a tiny interval at the original center
          const center = (iv.a + iv.b) / 2;
          return { a: center - eps, b: center + eps };
        }
        return { a: Math.max(0, a - eps), b: Math.min(1, b + eps) };
      });
    });
  }, []);

  const handleReset = useCallback(() => {
    setCover(initialCover.cover);
  }, [initialCover]);

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

      // Bottom axis: the number line
      const axisY = innerH;
      g.append('g')
        .attr('transform', `translate(0,${axisY})`)
        .call(d3.axisBottom(xScale).ticks(11))
        .selectAll('text')
        .style('font-size', '10px');

      // Target set (drawn as a thick black bar on the axis)
      const targetRowY = axisY - 26;
      g.append('text')
        .attr('x', -6)
        .attr('y', targetRowY + 4)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', 'var(--color-text)')
        .text('A');

      DEFAULT_TARGET.forEach((iv) => {
        g.append('rect')
          .attr('x', xScale(iv.a))
          .attr('y', targetRowY - 5)
          .attr('width', xScale(iv.b) - xScale(iv.a))
          .attr('height', 10)
          .style('fill', TARGET_COLOR)
          .style('fill-opacity', 0.85);
      });

      // Cover row (above target)
      const coverRowY = targetRowY - 60;
      g.append('text')
        .attr('x', -6)
        .attr('y', coverRowY + 4)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', 'var(--color-text)')
        .text('cover');

      // Each cover interval = filled rectangle + drag handles on left and right
      cover.forEach((iv, idx) => {
        const x1 = xScale(iv.a);
        const x2 = xScale(iv.b);
        const w = x2 - x1;

        // Body (draggable as a whole)
        const body = g
          .append('rect')
          .attr('x', x1)
          .attr('y', coverRowY - 12)
          .attr('width', Math.max(1, w))
          .attr('height', 24)
          .style('fill', COVER_COLOR)
          .style('fill-opacity', 0.25)
          .style('stroke', COVER_COLOR)
          .style('stroke-width', 1)
          .style('cursor', 'grab');

        const dragBody = d3
          .drag<SVGRectElement, unknown>()
          .on('start', function () {
            d3.select(this).style('cursor', 'grabbing');
          })
          .on('drag', (event) => {
            const dx = event.dx / innerW;
            handleDragWhole(idx, dx);
          })
          .on('end', function () {
            d3.select(this).style('cursor', 'grab');
          });

        body.call(dragBody as never);

        // Left handle
        const leftHandle = g
          .append('circle')
          .attr('cx', x1)
          .attr('cy', coverRowY)
          .attr('r', 6)
          .style('fill', HANDLE_COLOR)
          .style('cursor', 'ew-resize');

        const dragLeft = d3
          .drag<SVGCircleElement, unknown>()
          .on('drag', (event) => {
            const xRaw = event.x;
            const newA = xScale.invert(xRaw);
            handleDragLeftEdge(idx, newA);
          });
        leftHandle.call(dragLeft as never);

        // Right handle
        const rightHandle = g
          .append('circle')
          .attr('cx', x2)
          .attr('cy', coverRowY)
          .attr('r', 6)
          .style('fill', HANDLE_COLOR)
          .style('cursor', 'ew-resize');

        const dragRight = d3
          .drag<SVGCircleElement, unknown>()
          .on('drag', (event) => {
            const xRaw = event.x;
            const newB = xScale.invert(xRaw);
            handleDragRightEdge(idx, newB);
          });
        rightHandle.call(dragRight as never);

        // Width label
        g.append('text')
          .attr('x', (x1 + x2) / 2)
          .attr('y', coverRowY - 18)
          .attr('text-anchor', 'middle')
          .style('font-size', '9px')
          .style('fill', COVER_COLOR)
          .text((iv.b - iv.a).toFixed(3));
      });

      // x-axis label
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('x');
    },
    [
      cover,
      totalWidth,
      totalHeight,
      handleDragLeftEdge,
      handleDragRightEdge,
      handleDragWhole,
      margin.left,
      margin.right,
      margin.top,
      margin.bottom,
    ],
  );

  // ── Render ────────────────────────────────────────────────

  const gap = coverLength - exactMeasure;

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label
          className="flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          intervals = {nIntervals}
          <input
            type="range"
            min={1}
            max={MAX_INTERVALS}
            step={1}
            value={nIntervals}
            onChange={(e) => setNIntervals(parseInt(e.target.value))}
            className="w-32"
            aria-label="Number of cover intervals"
          />
        </label>

        <button
          type="button"
          onClick={handleOptimize}
          className="rounded px-3 py-1 text-sm font-medium"
          style={{
            background: COVER_COLOR,
            color: '#fff',
            border: '1px solid var(--color-border)',
          }}
        >
          Optimize cover
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="rounded px-3 py-1 text-sm"
          style={{
            background: 'var(--color-surface-alt)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          Reset
        </button>
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
        aria-label="Outer measure cover: target set and adjustable covering intervals on a number line"
      />

      {/* Numeric readout */}
      <div
        className="text-xs flex flex-wrap gap-x-4 gap-y-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span style={{ color: COVER_COLOR }}>
          Σ |cover intervals| = {coverLength.toFixed(4)}
        </span>
        <span>
          Exact measure of A = [0.3, 0.7]: λ(A) = {exactMeasure.toFixed(4)}
        </span>
        <span style={{ color: gap < 0.01 ? '#059669' : 'var(--color-text-muted)' }}>
          Gap = {gap.toFixed(4)}
        </span>
      </div>

      <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
        Drag the endpoints (or the bar bodies) to reshape the cover. The
        Lebesgue outer measure λ*(A) is the <em>infimum</em> of the total cover
        length over all countable open covers — so the cover length is always{' '}
        <em>at least</em> λ(A) = 0.4. As you tighten the cover, the gap shrinks
        toward zero. Try "Optimize cover" to snap to a near-optimal arrangement.
      </p>
    </div>
  );
}
