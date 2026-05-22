/**
 * UnionBoundTightnessExplorer — Topic 35 §§1, 4 (flagship).
 *
 * Two-panel viz:
 *   - Left:  unit-square canvas with m draggable circles (events A_1, …, A_m)
 *            and a numeric tightness ratio display
 *   - Right: horizontal bar chart comparing
 *              • exact P(⋃ A_i)            (via inclusion–exclusion)
 *              • Σ P(A_i)                  (the union-bound upper estimate)
 *              • Σ P(A_i) − Σ_{i<j} P(A_i ∩ A_j)  (Bonferroni depth-2 truncation)
 *
 * The gap between the exact bar and the Σ bar IS the looseness of the union
 * bound — when the events are disjoint, the bars are equal and the bound is
 * tight; when the events overlap, Σ overshoots and the gap opens up.
 *
 * Interactions:
 *   - Number-of-events selector m ∈ {2, 3, 4}
 *   - Per-event radius slider
 *   - Drag each circle's center on the unit square
 *   - Preset buttons: disjoint / uniform-overlap / nested
 *
 * Data source: `computeEventOverlap` and `getOverlapPreset` from
 * `src/data/probability-and-union-bound-data.ts`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  computeEventOverlap,
  getOverlapPreset,
  type CircleEvent,
  type UnionProbabilities,
} from '../../data/probability-and-union-bound-data';

const CANVAS_SIZE = 360;
const BARS_WIDTH = 360;
const BARS_HEIGHT = 220;
const margin = { top: 24, right: 28, bottom: 36, left: 110 };
const COLOR_GRID = '#cbd5e1';
const COLOR_AXIS = '#64748b';
const COLOR_BAR_EXACT = '#2563eb';
const COLOR_BAR_SUM = '#dc2626';
const COLOR_BAR_BONF = '#16a34a';

function formatProb(p: number, digits = 3): string {
  if (!Number.isFinite(p)) return '—';
  return p.toFixed(digits);
}

function formatRatio(r: number): string {
  if (!Number.isFinite(r)) return '∞';
  return r.toFixed(2) + '×';
}

type PresetId = 'disjoint' | 'uniform-overlap' | 'nested';
type EventCount = 2 | 3 | 4;

export default function UnionBoundTightnessExplorer() {
  const { ref: containerRef } = useResizeObserver<HTMLDivElement>();
  const [m, setM] = useState<EventCount>(3);
  const [preset, setPreset] = useState<PresetId>('uniform-overlap');
  const [events, setEvents] = useState<CircleEvent[]>(
    () => getOverlapPreset('uniform-overlap', 3).events,
  );

  // When the preset or m changes, rebuild the events array.
  const applyPreset = useCallback((id: PresetId, count: EventCount) => {
    setPreset(id);
    setM(count);
    setEvents(getOverlapPreset(id, count).events);
  }, []);

  // Keep the visible events in sync if user changes m without picking a new preset.
  useEffect(() => {
    setEvents((prev) => {
      if (prev.length === m) return prev;
      return getOverlapPreset(preset, m).events;
    });
  }, [m, preset]);

  const overlap: UnionProbabilities = useMemo(() => computeEventOverlap(events), [events]);

  // Sliders move a specific circle's radius.
  const updateRadius = useCallback((index: number, r: number) => {
    setEvents((prev) =>
      prev.map((c, i) => (i === index ? { ...c, r: Math.min(Math.max(r, 0.05), 0.45) } : c)),
    );
  }, []);

  // Drag handle moves a circle center, clamped to [0, 1]².
  const updateCenter = useCallback((index: number, cx: number, cy: number) => {
    setEvents((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              cx: Math.min(Math.max(cx, 0), 1),
              cy: Math.min(Math.max(cy, 0), 1),
            }
          : c,
      ),
    );
  }, []);

  // ── Left canvas: m circles on [0, 1]² ───────────────────────
  const leftRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const size = CANVAS_SIZE;
      const pad = 24;
      const xScale = d3.scaleLinear().domain([0, 1]).range([pad, size - pad]);
      const yScale = d3.scaleLinear().domain([0, 1]).range([size - pad, pad]);

      svg.attr('viewBox', `0 0 ${size} ${size}`);

      // Unit square border.
      svg
        .append('rect')
        .attr('x', xScale(0))
        .attr('y', yScale(1))
        .attr('width', xScale(1) - xScale(0))
        .attr('height', yScale(0) - yScale(1))
        .style('fill', 'none')
        .style('stroke', COLOR_GRID)
        .style('stroke-width', 1.5);

      // Grid lines at 0.25, 0.5, 0.75.
      const ticks = [0.25, 0.5, 0.75];
      const grid = svg.append('g');
      ticks.forEach((t) => {
        grid
          .append('line')
          .attr('x1', xScale(t))
          .attr('x2', xScale(t))
          .attr('y1', yScale(0))
          .attr('y2', yScale(1))
          .style('stroke', COLOR_GRID)
          .style('stroke-dasharray', '3 3')
          .style('opacity', 0.6);
        grid
          .append('line')
          .attr('x1', xScale(0))
          .attr('x2', xScale(1))
          .attr('y1', yScale(t))
          .attr('y2', yScale(t))
          .style('stroke', COLOR_GRID)
          .style('stroke-dasharray', '3 3')
          .style('opacity', 0.6);
      });

      // Axis labels (0 and 1 on each axis).
      svg
        .append('text')
        .attr('x', xScale(0))
        .attr('y', yScale(0) + 16)
        .attr('text-anchor', 'middle')
        .style('fill', COLOR_AXIS)
        .style('font-size', '10px')
        .text('0');
      svg
        .append('text')
        .attr('x', xScale(1))
        .attr('y', yScale(0) + 16)
        .attr('text-anchor', 'middle')
        .style('fill', COLOR_AXIS)
        .style('font-size', '10px')
        .text('1');
      svg
        .append('text')
        .attr('x', xScale(0) - 10)
        .attr('y', yScale(1) + 4)
        .attr('text-anchor', 'end')
        .style('fill', COLOR_AXIS)
        .style('font-size', '10px')
        .text('1');
      svg
        .append('text')
        .attr('x', xScale(0) - 10)
        .attr('y', yScale(0) + 4)
        .attr('text-anchor', 'end')
        .style('fill', COLOR_AXIS)
        .style('font-size', '10px')
        .text('0');

      // Circles + drag handles.
      events.forEach((c, idx) => {
        // Radius in pixel space; scaled by xScale span.
        const pixelRadius = c.r * (xScale(1) - xScale(0));

        svg
          .append('circle')
          .attr('cx', xScale(c.cx))
          .attr('cy', yScale(c.cy))
          .attr('r', pixelRadius)
          .style('fill', c.color)
          .style('fill-opacity', 0.28)
          .style('stroke', c.color)
          .style('stroke-width', 1.6);

        // Label at center.
        svg
          .append('text')
          .attr('x', xScale(c.cx))
          .attr('y', yScale(c.cy) + 4)
          .attr('text-anchor', 'middle')
          .style('fill', c.color)
          .style('font-size', '13px')
          .style('font-weight', '700')
          .style('pointer-events', 'none')
          .text(c.label);

        // Drag handle: a smaller filled disk at the center.
        svg
          .append('circle')
          .attr('cx', xScale(c.cx))
          .attr('cy', yScale(c.cy))
          .attr('r', 6)
          .style('fill', c.color)
          .style('cursor', 'grab')
          .attr('role', 'slider')
          .attr('aria-label', `event ${c.label} center`)
          .call(
            d3
              .drag<SVGCircleElement, unknown>()
              .on('drag', function (event) {
                const cx = xScale.invert(event.x);
                const cy = yScale.invert(event.y);
                updateCenter(idx, cx, cy);
              }),
          );
      });
    },
    [events, updateCenter],
  );

  // ── Right SVG: horizontal bar chart ─────────────────────────
  const rightRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const innerW = BARS_WIDTH - margin.left - margin.right;
      const innerH = BARS_HEIGHT - margin.top - margin.bottom;
      svg.attr('viewBox', `0 0 ${BARS_WIDTH} ${BARS_HEIGHT}`);

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const data: Array<{ label: string; value: number; color: string }> = [
        { label: 'P(⋃ Aᵢ) exact', value: overlap.exactUnion, color: COLOR_BAR_EXACT },
        { label: 'Σ P(Aᵢ)', value: overlap.sumMarginals, color: COLOR_BAR_SUM },
        { label: 'Bonferroni-2', value: overlap.bonferroniDepth2, color: COLOR_BAR_BONF },
      ];

      const maxX = Math.max(1, ...data.map((d) => d.value)) * 1.05;
      const xScale = d3.scaleLinear().domain([0, maxX]).range([0, innerW]);
      const yScale = d3
        .scaleBand<string>()
        .domain(data.map((d) => d.label))
        .range([0, innerH])
        .padding(0.25);

      // x-axis
      const xAxis = d3.axisBottom(xScale).ticks(5);
      const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis);
      xAxisG.selectAll('text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');
      xAxisG.selectAll('line').style('stroke', COLOR_AXIS).style('opacity', 0.4);
      xAxisG.selectAll('path').style('stroke', COLOR_AXIS);

      // y-axis
      const yAxis = d3.axisLeft(yScale);
      const yAxisG = g.append('g').call(yAxis);
      yAxisG.selectAll('text').style('fill', 'var(--color-text)').style('font-size', '11px');
      yAxisG.selectAll('line').style('stroke', COLOR_AXIS).style('opacity', 0.4);
      yAxisG.selectAll('path').style('stroke', COLOR_AXIS);

      // Reference line at y = 1 (probability ceiling).
      g.append('line')
        .attr('x1', xScale(1))
        .attr('x2', xScale(1))
        .attr('y1', 0)
        .attr('y2', innerH)
        .style('stroke', COLOR_AXIS)
        .style('stroke-dasharray', '3 3')
        .style('opacity', 0.5);
      g.append('text')
        .attr('x', xScale(1))
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('fill', COLOR_AXIS)
        .style('font-size', '10px')
        .text('1');

      // Bars.
      g.selectAll('rect.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.label) ?? 0)
        .attr('width', (d) => Math.max(0, xScale(d.value)))
        .attr('height', yScale.bandwidth())
        .style('fill', (d) => d.color)
        .style('fill-opacity', 0.85);

      // Value labels at the end of each bar.
      g.selectAll('text.value')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'value')
        .attr('x', (d) => Math.min(xScale(d.value) + 6, innerW - 4))
        .attr('y', (d) => (yScale(d.label) ?? 0) + yScale.bandwidth() / 2 + 4)
        .style('fill', 'var(--color-text)')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .text((d) => formatProb(d.value));
    },
    [overlap],
  );

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Events m =</span>
          {[2, 3, 4].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => applyPreset(preset, value as EventCount)}
              className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                m === value
                  ? 'bg-fuchsia-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              }`}
              aria-pressed={m === value}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Preset:</span>
          {(['disjoint', 'uniform-overlap', 'nested'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => applyPreset(id, m)}
              className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                preset === id
                  ? 'bg-fuchsia-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              }`}
              aria-pressed={preset === id}
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <svg
            ref={leftRef}
            width="100%"
            height={CANVAS_SIZE}
            style={{ maxWidth: CANVAS_SIZE, display: 'block' }}
            role="img"
            aria-label="Unit square with m draggable event circles"
          />
          <div className="mt-2 space-y-2">
            {events.map((c, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: c.color }}
                  aria-hidden="true"
                />
                <span className="font-mono font-semibold" style={{ color: c.color }}>
                  {c.label}
                </span>
                <span className="font-mono">P = {formatProb(overlap.marginals[idx], 3)}</span>
                <label className="flex flex-1 items-center gap-2">
                  <span className="text-gray-500">r</span>
                  <input
                    type="range"
                    min={0.05}
                    max={0.45}
                    step={0.01}
                    value={c.r}
                    onChange={(e) => updateRadius(idx, parseFloat(e.target.value))}
                    className="flex-1"
                    aria-label={`event ${c.label} radius`}
                  />
                  <span className="w-10 font-mono text-right text-gray-500">{c.r.toFixed(2)}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <svg
            ref={rightRef}
            width="100%"
            height={BARS_HEIGHT}
            style={{ maxWidth: BARS_WIDTH, display: 'block' }}
            role="img"
            aria-label="Bar chart comparing exact union, sum of marginals, and Bonferroni truncation"
          />
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <dt className="text-gray-500">Tightness ratio</dt>
            <dd className="font-mono font-semibold">{formatRatio(overlap.tightnessRatio)}</dd>
            <dt className="text-gray-500">Gap Σ − exact</dt>
            <dd className="font-mono font-semibold">
              {formatProb(overlap.sumMarginals - overlap.exactUnion)}
            </dd>
            <dt className="text-gray-500">Bonferroni-2 closer?</dt>
            <dd className="font-mono font-semibold">
              {overlap.bonferroniDepth2 < overlap.sumMarginals
                ? `yes (by ${formatProb(overlap.sumMarginals - overlap.bonferroniDepth2)})`
                : 'no'}
            </dd>
          </dl>
          <p className="mt-3 text-xs text-gray-500">
            The blue bar is the exact P(⋃ Aᵢ). The red bar is the union-bound estimate Σ P(Aᵢ).
            When the events are <em>disjoint</em>, the two bars coincide (ratio = 1). When the
            events <em>overlap</em>, Σ P(Aᵢ) overshoots and the gap measures the looseness.
          </p>
        </div>
      </div>
    </div>
  );
}
