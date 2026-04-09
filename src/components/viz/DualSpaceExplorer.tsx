/**
 * DualSpaceExplorer — viz for Topic 30 (Normed & Banach Spaces).
 *
 * Shows primal and dual unit balls side-by-side:
 *  - Norm selector: p = 1, 2, ∞ (dual is q = ∞, 2, 1)
 *  - Click a point y in the dual panel to see the hyperplane {x: ⟨y,x⟩ = ‖y‖*}
 *  - Info panel shows dual norm and supremum-attaining point
 */

import { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  createLpNorm,
  computeDualNorm,
  conjugateExponent,
  dualMaximizer,
} from './shared/functional-analysis';

// ── Constants ─────────────────────────────────────────────────

const NORM_OPTIONS = [
  { value: 1, label: 'p = 1 (diamond → square)' },
  { value: 2, label: 'p = 2 (circle → circle)' },
  { value: Infinity, label: 'p = ∞ (square → diamond)' },
] as const;

const LIGHT_BLUE = '#93C5FD';
const LIGHT_GREEN = '#86EFAC';
const ORANGE = '#F97316';
const RED = '#DC2626';
const BLUE_STROKE = '#2563EB';
const GREEN_STROKE = '#059669';

const margin = { top: 20, right: 16, bottom: 32, left: 16 };
const GAP = 24;
const extent = 1.6;

// ── Component ─────────────────────────────────────────────────

export default function DualSpaceExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const width = containerWidth || 600;
  const height = Math.min(width * 0.5, 360);

  const [normP, setNormP] = useState<number>(2);
  const [selectedY, setSelectedY] = useState<[number, number] | null>(null);

  const q = conjugateExponent(normP);
  const primalNorm = useMemo(() => createLpNorm(normP), [normP]);
  const dualNorm = useMemo(() => createLpNorm(q), [q]);

  const primalBall = useMemo(() => primalNorm.sampleUnitBall(500), [primalNorm]);
  const dualBall = useMemo(() => dualNorm.sampleUnitBall(500), [dualNorm]);

  // Dual maximizer for the selected y
  const maximizerResult = useMemo(() => {
    if (!selectedY) return null;
    return dualMaximizer(selectedY, normP);
  }, [selectedY, normP]);

  const selectedDualNorm = useMemo(() => {
    if (!selectedY) return 0;
    return computeDualNorm(selectedY, normP);
  }, [selectedY, normP]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const panelW = (width - margin.left - margin.right - GAP) / 2;
      const panelH = height - margin.top - margin.bottom;

      // Scales — left panel (primal)
      const xL = d3.scaleLinear().domain([-extent, extent]).range([0, panelW]);
      const yL = d3.scaleLinear().domain([-extent, extent]).range([panelH, 0]);

      // Scales — right panel (dual)
      const xR = d3.scaleLinear().domain([-extent, extent]).range([0, panelW]);
      const yR = d3.scaleLinear().domain([-extent, extent]).range([panelH, 0]);

      const ballLine = d3.line<{ x: number; y: number }>()
        .x((d) => xL(d.x))
        .y((d) => yL(d.y))
        .curve(d3.curveLinearClosed);

      // ── Left panel: Primal ──
      const gL = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Axes
      gL.append('line')
        .attr('x1', xL(-extent)).attr('y1', yL(0))
        .attr('x2', xL(extent)).attr('y2', yL(0))
        .style('stroke', '#e5e7eb').style('stroke-width', 1);
      gL.append('line')
        .attr('x1', xL(0)).attr('y1', yL(-extent))
        .attr('x2', xL(0)).attr('y2', yL(extent))
        .style('stroke', '#e5e7eb').style('stroke-width', 1);

      // Primal unit ball
      gL.append('path')
        .datum(primalBall)
        .attr('d', ballLine)
        .style('fill', LIGHT_BLUE)
        .style('fill-opacity', 0.4)
        .style('stroke', BLUE_STROKE)
        .style('stroke-width', 1.5);

      // Hyperplane and maximizer if y is selected
      if (selectedY && maximizerResult && selectedDualNorm > 1e-6) {
        const { point: xStar, value } = maximizerResult;

        // Hyperplane: {x : ⟨y, x⟩ = ‖y‖*}
        // Line direction is perpendicular to y
        const perpX = -selectedY[1];
        const perpY = selectedY[0];
        const perpNorm = Math.sqrt(perpX * perpX + perpY * perpY);
        if (perpNorm > 1e-10) {
          const dx = (perpX / perpNorm) * extent * 2;
          const dy = (perpY / perpNorm) * extent * 2;
          // Point on the hyperplane: scale y to get ⟨y, p⟩ = value
          const yNormSq = selectedY[0] * selectedY[0] + selectedY[1] * selectedY[1];
          const px = (selectedY[0] * value) / yNormSq;
          const py = (selectedY[1] * value) / yNormSq;

          gL.append('line')
            .attr('x1', xL(px - dx)).attr('y1', yL(py - dy))
            .attr('x2', xL(px + dx)).attr('y2', yL(py + dy))
            .style('stroke', ORANGE)
            .style('stroke-width', 2)
            .style('stroke-dasharray', '6,3')
            .style('opacity', 0.8);
        }

        // Supremum-attaining point x*
        gL.append('circle')
          .attr('cx', xL(xStar[0])).attr('cy', yL(xStar[1]))
          .attr('r', 5)
          .style('fill', RED)
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      }

      gL.append('text')
        .attr('x', panelW / 2).attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text(`Primal: ℓ${normP === Infinity ? '∞' : normP} unit ball`);

      // ── Right panel: Dual ──
      const gR = svg.append('g')
        .attr('transform', `translate(${margin.left + panelW + GAP},${margin.top})`);

      // Axes
      gR.append('line')
        .attr('x1', xR(-extent)).attr('y1', yR(0))
        .attr('x2', xR(extent)).attr('y2', yR(0))
        .style('stroke', '#e5e7eb').style('stroke-width', 1);
      gR.append('line')
        .attr('x1', xR(0)).attr('y1', yR(-extent))
        .attr('x2', xR(0)).attr('y2', yR(extent))
        .style('stroke', '#e5e7eb').style('stroke-width', 1);

      // Dual unit ball
      const dualBallLine = d3.line<{ x: number; y: number }>()
        .x((d) => xR(d.x))
        .y((d) => yR(d.y))
        .curve(d3.curveLinearClosed);

      gR.append('path')
        .datum(dualBall)
        .attr('d', dualBallLine)
        .style('fill', LIGHT_GREEN)
        .style('fill-opacity', 0.4)
        .style('stroke', GREEN_STROKE)
        .style('stroke-width', 1.5);

      // Selected y point
      if (selectedY) {
        gR.append('circle')
          .attr('cx', xR(selectedY[0])).attr('cy', yR(selectedY[1]))
          .attr('r', 5)
          .style('fill', ORANGE)
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      }

      gR.append('text')
        .attr('x', panelW / 2).attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text(`Dual: ℓ${q === Infinity ? '∞' : Number.isFinite(q) ? q.toFixed(q === 2 ? 0 : 1) : '∞'} unit ball`);

      // Click handler on the dual panel
      const clickRect = gR.append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', panelW).attr('height', panelH)
        .style('fill', 'transparent')
        .style('cursor', 'crosshair');

      clickRect.on('click', (event: MouseEvent) => {
        const [mx, my] = d3.pointer(event);
        const dataX = xR.invert(mx);
        const dataY = yR.invert(my);
        setSelectedY([dataX, dataY]);
      });
    },
    [width, height, primalBall, dualBall, selectedY, maximizerResult, selectedDualNorm, normP, q],
  );

  const qLabel = q === Infinity ? '∞' : Number.isFinite(q) ? (q === 2 ? '2' : q.toFixed(2)) : '∞';

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-gray-600 dark:text-gray-400">Norm:</span>
          <select
            value={normP}
            onChange={(e) => {
              setNormP(Number(e.target.value));
              setSelectedY(null);
            }}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            {NORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <span className="text-xs text-gray-500 dark:text-gray-400">
          Click in the dual panel to select a functional y
        </span>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} className="block" />

      {/* Info panel */}
      {selectedY && (
        <div className="mt-3 rounded bg-gray-50 p-3 text-sm dark:bg-gray-800">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            <div>
              <span className="font-medium text-gray-500 dark:text-gray-400">y = </span>
              <span className="font-mono text-gray-700 dark:text-gray-300">
                ({selectedY[0].toFixed(3)}, {selectedY[1].toFixed(3)})
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-500 dark:text-gray-400">‖y‖_{qLabel} = </span>
              <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                {selectedDualNorm.toFixed(4)}
              </span>
            </div>
            {maximizerResult && (
              <div>
                <span className="font-medium text-gray-500 dark:text-gray-400">x* = </span>
                <span className="font-mono text-red-600 dark:text-red-400">
                  ({maximizerResult.point[0].toFixed(3)}, {maximizerResult.point[1].toFixed(3)})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        The dual of ℓ{normP === Infinity ? '∞' : normP} is ℓ{qLabel}: the diamond (p = 1) pairs with the square (q = ∞), and the circle (p = 2) is self-dual.
      </p>
    </div>
  );
}
