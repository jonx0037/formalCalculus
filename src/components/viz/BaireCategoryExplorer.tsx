/**
 * BaireCategoryExplorer — viz for Topic 30 (Normed & Banach Spaces).
 *
 * Visualizes the nested-ball construction from the Baire Category Theorem proof:
 *  - Nowhere-dense sets are removed progressively from [0, 1]
 *  - Nested balls shrink toward a limit point x* in the residual set
 *  - Toggle: complete space (Baire succeeds) vs. rationals (Baire fails)
 */

import { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  getBaireScenario,
  computeNestedBalls,
  BAIRE_SCENARIO_IDS,
  type BaireScenarioId,
} from '../../data/banach-spaces-data';

// ── Constants ─────────────────────────────────────────────────

const LIGHT_RED = '#FCA5A5';
const LIGHT_GREEN = '#86EFAC';
const BLUE = '#2563EB';
const RED = '#DC2626';
const GRAY = '#9CA3AF';

const margin = { top: 28, right: 16, bottom: 40, left: 16 };
const BAR_HEIGHT = 28;
const BALL_TRACK_HEIGHT = 120;

// ── Component ─────────────────────────────────────────────────

export default function BaireCategoryExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const width = containerWidth || 600;
  const height = margin.top + BAR_HEIGHT + 20 + BALL_TRACK_HEIGHT + margin.bottom;

  const [scenarioId, setScenarioId] = useState<BaireScenarioId>('cantor-like');
  const [numSets, setNumSets] = useState(5);

  const scenario = useMemo(() => getBaireScenario(scenarioId), [scenarioId]);

  // Compute the nowhere-dense sets for each step
  const removedSets = useMemo(() => {
    const sets: Array<Array<{ start: number; end: number }>> = [];
    for (let n = 0; n < numSets; n++) {
      sets.push(scenario.getNowhereDenseSet(n));
    }
    return sets;
  }, [scenario, numSets]);

  // Compute cumulative removed intervals
  const cumulativeRemoved = useMemo(() => {
    const all: Array<{ start: number; end: number }> = [];
    for (const set of removedSets) {
      all.push(...set);
    }
    // Merge overlapping intervals
    if (all.length === 0) return [];
    const sorted = [...all].sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      if (sorted[i].start <= last.end) {
        last.end = Math.max(last.end, sorted[i].end);
      } else {
        merged.push(sorted[i]);
      }
    }
    return merged;
  }, [removedSets]);

  // Nested balls from the Baire proof construction
  const nestedBalls = useMemo(
    () => computeNestedBalls(removedSets, numSets),
    [removedSets, numSets],
  );

  // Limit point x*
  const limitPoint = nestedBalls.length > 0
    ? nestedBalls[nestedBalls.length - 1].center
    : 0.5;

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const plotW = width - margin.left - margin.right;
      const xScale = d3.scaleLinear().domain([0, 1]).range([0, plotW]);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // ── Interval bar: [0, 1] with removed sets ──
      // Background: green (the residual set)
      g.append('rect')
        .attr('x', xScale(0))
        .attr('y', 0)
        .attr('width', xScale(1) - xScale(0))
        .attr('height', BAR_HEIGHT)
        .attr('rx', 4)
        .style('fill', LIGHT_GREEN)
        .style('opacity', 0.6);

      // Removed intervals: red overlays
      for (const iv of cumulativeRemoved) {
        const x1 = xScale(Math.max(0, iv.start));
        const x2 = xScale(Math.min(1, iv.end));
        if (x2 - x1 < 0.3) continue; // skip sub-pixel
        g.append('rect')
          .attr('x', x1)
          .attr('y', 0)
          .attr('width', x2 - x1)
          .attr('height', BAR_HEIGHT)
          .style('fill', LIGHT_RED)
          .style('opacity', 0.7);
      }

      // Border
      g.append('rect')
        .attr('x', xScale(0))
        .attr('y', 0)
        .attr('width', xScale(1) - xScale(0))
        .attr('height', BAR_HEIGHT)
        .attr('rx', 4)
        .style('fill', 'none')
        .style('stroke', '#6B7280')
        .style('stroke-width', 1);

      // Labels
      g.append('text')
        .attr('x', xScale(0)).attr('y', BAR_HEIGHT + 14)
        .style('font-size', '10px').style('fill', GRAY).text('0');
      g.append('text')
        .attr('x', xScale(1)).attr('y', BAR_HEIGHT + 14)
        .attr('text-anchor', 'end')
        .style('font-size', '10px').style('fill', GRAY).text('1');
      g.append('text')
        .attr('x', plotW / 2).attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px').style('font-weight', '600').style('fill', '#374151')
        .text(scenario.isComplete ? 'Residual set (green) remains dense' : 'ℚ is meager — all rationals removed');

      // ── Nested balls below the bar ──
      const ballY0 = BAR_HEIGHT + 28;

      for (let i = 0; i < nestedBalls.length; i++) {
        const ball = nestedBalls[i];
        const cx = xScale(ball.center);
        const rPx = Math.max(1, xScale(ball.center + ball.radius) - xScale(ball.center));
        const opacity = 0.2 + 0.6 * (i / Math.max(1, nestedBalls.length - 1));
        const yOff = ballY0 + (i / Math.max(1, nestedBalls.length - 1)) * (BALL_TRACK_HEIGHT - 20);

        // Ball as a horizontal line segment with bracket ends
        g.append('line')
          .attr('x1', cx - rPx).attr('y1', yOff)
          .attr('x2', cx + rPx).attr('y2', yOff)
          .style('stroke', BLUE)
          .style('stroke-width', Math.max(1.5, 4 - i * 0.3))
          .style('opacity', opacity);

        // Center marker
        g.append('circle')
          .attr('cx', cx).attr('cy', yOff)
          .attr('r', 2)
          .style('fill', BLUE)
          .style('opacity', opacity);

        // Label
        if (i < 6 || i === nestedBalls.length - 1) {
          g.append('text')
            .attr('x', cx + rPx + 4).attr('y', yOff + 3)
            .style('font-size', '9px')
            .style('fill', BLUE)
            .style('opacity', Math.min(1, opacity + 0.2))
            .text(`r${i + 1} < 1/${i + 1}`);
        }
      }

      // Limit point x*
      if (nestedBalls.length > 0) {
        const lx = xScale(limitPoint);
        const ly = ballY0 + BALL_TRACK_HEIGHT - 10;

        g.append('circle')
          .attr('cx', lx).attr('cy', ly)
          .attr('r', 5)
          .style('fill', RED)
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);

        g.append('text')
          .attr('x', lx + 8).attr('y', ly + 4)
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', RED)
          .text(`x* ≈ ${limitPoint.toFixed(4)}`);
      }
    },
    [width, cumulativeRemoved, nestedBalls, limitPoint, scenario],
  );

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-gray-600 dark:text-gray-400">Scenario:</span>
          <select
            value={scenarioId}
            onChange={(e) => {
              setScenarioId(e.target.value as BaireScenarioId);
              setNumSets(5);
            }}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            {BAIRE_SCENARIO_IDS.map((id) => (
              <option key={id} value={id}>
                {getBaireScenario(id).label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="font-medium text-gray-600 dark:text-gray-400">
            Steps (n):
          </span>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={numSets}
            onChange={(e) => setNumSets(parseInt(e.target.value, 10))}
            className="h-1.5 w-32 cursor-pointer"
          />
          <span className="w-5 text-right font-mono text-gray-700 dark:text-gray-300">
            {numSets}
          </span>
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} className="block" />

      {/* Description */}
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {scenario.description}
      </p>
    </div>
  );
}
