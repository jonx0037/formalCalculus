/**
 * ProjectionExplorer — flagship viz for Topic 31 (Inner Product & Hilbert Spaces).
 *
 * Visualizes orthogonal projection onto a subspace in ℝ²:
 *  - Drag point x to see projection update in real time
 *  - Rotate subspace angle via slider
 *  - Toggle: orthogonal complement, Pythagorean decomposition
 *  - Readout: x, P_M(x), ‖x − P_M(x)‖, angle between x and M
 */

import { useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';

// ── Constants ─────────────────────────────────────────────────

const BLUE = '#2563EB';
const GREEN = '#059669';
const RED = '#DC2626';
const ORANGE = '#F97316';
const MUTED = '#6b7280';
const LIGHT_BLUE = '#93C5FD';
const LIGHT_GREEN = '#86EFAC';
const LIGHT_RED = '#FCA5A5';

const margin = { top: 24, right: 16, bottom: 32, left: 16 };
const extent = 3.5;

// ── Component ─────────────────────────────────────────────────

export default function ProjectionExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const width = containerWidth || 600;
  const height = Math.min(width * 0.7, 420);

  const [point, setPoint] = useState<[number, number]>([2.0, 2.5]);
  const [angle, setAngle] = useState(30); // degrees
  const [showComplement, setShowComplement] = useState(false);
  const [showPythagorean, setShowPythagorean] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Subspace direction vector from angle
  const subDir = useMemo<[number, number]>(() => {
    const rad = (angle * Math.PI) / 180;
    return [Math.cos(rad), Math.sin(rad)];
  }, [angle]);

  // Compute projection
  const projResult = useMemo(() => {
    const [dx, dy] = subDir;
    const [px, py] = point;
    const dot = px * dx + py * dy;
    const projX = dot * dx;
    const projY = dot * dy;
    const resX = px - projX;
    const resY = py - projY;
    const dist = Math.sqrt(resX * resX + resY * resY);
    const pointNorm = Math.sqrt(px * px + py * py);
    const projNorm = Math.sqrt(projX * projX + projY * projY);
    const angleToM = pointNorm > 1e-10
      ? Math.acos(Math.min(1, Math.abs(dot) / pointNorm)) * (180 / Math.PI)
      : 0;
    return {
      proj: [projX, projY] as [number, number],
      res: [resX, resY] as [number, number],
      dist,
      projNorm,
      pointNorm,
      angleToM,
    };
  }, [point, subDir]);

  // Drag handler
  const handleDrag = useCallback(
    (dataX: number, dataY: number) => {
      const clamp = (v: number) => Math.max(-extent, Math.min(extent, v));
      setPoint([clamp(dataX), clamp(dataY)]);
    },
    [],
  );

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const panelW = width - margin.left - margin.right;
      const panelH = height - margin.top - margin.bottom;

      const xScale = d3.scaleLinear().domain([-extent, extent]).range([0, panelW]);
      const yScale = d3.scaleLinear().domain([-extent, extent]).range([panelH, 0]);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Grid lines
      for (let v = -3; v <= 3; v++) {
        g.append('line')
          .attr('x1', xScale(-extent)).attr('y1', yScale(v))
          .attr('x2', xScale(extent)).attr('y2', yScale(v))
          .style('stroke', '#f3f4f6').style('stroke-width', 0.5);
        g.append('line')
          .attr('x1', xScale(v)).attr('y1', yScale(-extent))
          .attr('x2', xScale(v)).attr('y2', yScale(extent))
          .style('stroke', '#f3f4f6').style('stroke-width', 0.5);
      }

      // Axes
      g.append('line')
        .attr('x1', xScale(-extent)).attr('y1', yScale(0))
        .attr('x2', xScale(extent)).attr('y2', yScale(0))
        .style('stroke', '#d1d5db').style('stroke-width', 1);
      g.append('line')
        .attr('x1', xScale(0)).attr('y1', yScale(-extent))
        .attr('x2', xScale(0)).attr('y2', yScale(extent))
        .style('stroke', '#d1d5db').style('stroke-width', 1);

      // Orthogonal complement (perpendicular direction)
      if (showComplement) {
        const perpX = -subDir[1];
        const perpY = subDir[0];
        g.append('line')
          .attr('x1', xScale(-perpX * extent)).attr('y1', yScale(-perpY * extent))
          .attr('x2', xScale(perpX * extent)).attr('y2', yScale(perpY * extent))
          .style('stroke', ORANGE)
          .style('stroke-width', 1.5)
          .style('stroke-dasharray', '6,4')
          .style('opacity', 0.7);

        g.append('text')
          .attr('x', xScale(perpX * (extent - 0.3)))
          .attr('y', yScale(perpY * (extent - 0.3)) - 8)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px').style('fill', ORANGE).style('font-style', 'italic')
          .text('M⊥');
      }

      // Subspace line M
      g.append('line')
        .attr('x1', xScale(-subDir[0] * extent)).attr('y1', yScale(-subDir[1] * extent))
        .attr('x2', xScale(subDir[0] * extent)).attr('y2', yScale(subDir[1] * extent))
        .style('stroke', MUTED)
        .style('stroke-width', 2);

      g.append('text')
        .attr('x', xScale(subDir[0] * (extent - 0.3)))
        .attr('y', yScale(subDir[1] * (extent - 0.3)) - 8)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px').style('fill', MUTED).style('font-weight', '600')
        .text('M');

      // Pythagorean decomposition arcs
      if (showPythagorean && projResult.projNorm > 0.1 && projResult.dist > 0.1) {
        const pnSq = projResult.projNorm ** 2;
        const dSq = projResult.dist ** 2;
        const xnSq = projResult.pointNorm ** 2;
        const barY = yScale(-extent + 0.15);
        const barMaxW = panelW * 0.7;
        const scale = barMaxW / xnSq;

        const barX = xScale(-extent + 0.3);
        // ‖P_M x‖² bar
        g.append('rect')
          .attr('x', barX).attr('y', barY)
          .attr('width', pnSq * scale).attr('height', 12)
          .style('fill', LIGHT_GREEN).style('stroke', GREEN).style('stroke-width', 1);
        // ‖x − P_M x‖² bar
        g.append('rect')
          .attr('x', barX + pnSq * scale).attr('y', barY)
          .attr('width', dSq * scale).attr('height', 12)
          .style('fill', LIGHT_RED).style('stroke', RED).style('stroke-width', 1);
        // Label
        g.append('text')
          .attr('x', barX + xnSq * scale + 6).attr('y', barY + 10)
          .style('font-size', '10px').style('fill', '#374151')
          .text(`= ‖x‖² = ${xnSq.toFixed(2)}`);
      }

      // Residual line (dashed)
      g.append('line')
        .attr('x1', xScale(point[0])).attr('y1', yScale(point[1]))
        .attr('x2', xScale(projResult.proj[0])).attr('y2', yScale(projResult.proj[1]))
        .style('stroke', RED)
        .style('stroke-width', 2)
        .style('stroke-dasharray', '5,3');

      // Right-angle marker
      if (projResult.dist > 0.15) {
        const markerSize = 0.15;
        const [rx, ry] = projResult.res;
        const rn = projResult.dist;
        const ux = rx / rn;
        const uy = ry / rn;
        const corners = [
          [projResult.proj[0] + ux * markerSize, projResult.proj[1] + uy * markerSize],
          [projResult.proj[0] + ux * markerSize + subDir[0] * markerSize, projResult.proj[1] + uy * markerSize + subDir[1] * markerSize],
          [projResult.proj[0] + subDir[0] * markerSize, projResult.proj[1] + subDir[1] * markerSize],
        ];
        const markerPath = `M${xScale(corners[0][0])},${yScale(corners[0][1])} L${xScale(corners[1][0])},${yScale(corners[1][1])} L${xScale(corners[2][0])},${yScale(corners[2][1])}`;
        g.append('path')
          .attr('d', markerPath)
          .style('fill', 'none')
          .style('stroke', '#6b7280')
          .style('stroke-width', 1);
      }

      // Vector: origin → projection (green)
      g.append('line')
        .attr('x1', xScale(0)).attr('y1', yScale(0))
        .attr('x2', xScale(projResult.proj[0])).attr('y2', yScale(projResult.proj[1]))
        .style('stroke', GREEN)
        .style('stroke-width', 2.5);

      // Projection point
      g.append('circle')
        .attr('cx', xScale(projResult.proj[0])).attr('cy', yScale(projResult.proj[1]))
        .attr('r', 5)
        .style('fill', GREEN).style('stroke', '#fff').style('stroke-width', 1.5);

      // Vector: origin → x (blue)
      g.append('line')
        .attr('x1', xScale(0)).attr('y1', yScale(0))
        .attr('x2', xScale(point[0])).attr('y2', yScale(point[1]))
        .style('stroke', BLUE)
        .style('stroke-width', 2.5);

      // Point x (draggable)
      g.append('circle')
        .attr('cx', xScale(point[0])).attr('cy', yScale(point[1]))
        .attr('r', 7)
        .style('fill', BLUE).style('stroke', '#fff').style('stroke-width', 2)
        .style('cursor', 'grab');

      // Labels
      g.append('text')
        .attr('x', xScale(point[0]) + 10).attr('y', yScale(point[1]) - 8)
        .style('font-size', '12px').style('fill', BLUE).style('font-weight', '600')
        .text('x');

      g.append('text')
        .attr('x', xScale(projResult.proj[0]) + 10).attr('y', yScale(projResult.proj[1]) + 16)
        .style('font-size', '12px').style('fill', GREEN).style('font-weight', '600')
        .text('Pₘx');

      // Drag interaction area
      const dragRect = g.append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', panelW).attr('height', panelH)
        .style('fill', 'transparent')
        .style('cursor', isDragging ? 'grabbing' : 'default');

      dragRect.on('mousedown', () => setIsDragging(true));
      dragRect.on('mousemove', (event: MouseEvent) => {
        if (!isDragging) return;
        const [mx, my] = d3.pointer(event);
        handleDrag(xScale.invert(mx), yScale.invert(my));
      });
      dragRect.on('mouseup', () => setIsDragging(false));
      dragRect.on('mouseleave', () => setIsDragging(false));

      // Touch support
      dragRect.on('touchstart', (event: TouchEvent) => {
        event.preventDefault();
        setIsDragging(true);
      });
      dragRect.on('touchmove', (event: TouchEvent) => {
        event.preventDefault();
        const touch = event.touches[0];
        const svgEl = svg.node();
        if (!svgEl) return;
        const rect = svgEl.getBoundingClientRect();
        const mx = touch.clientX - rect.left - margin.left;
        const my = touch.clientY - rect.top - margin.top;
        handleDrag(xScale.invert(mx), yScale.invert(my));
      });
      dragRect.on('touchend', () => setIsDragging(false));
    },
    [width, height, point, subDir, projResult, showComplement, showPythagorean, isDragging, handleDrag],
  );

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-gray-600 dark:text-gray-400">Subspace angle:</span>
          <input
            type="range"
            min={0}
            max={180}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            className="w-28 accent-gray-600"
          />
          <span className="w-10 text-right font-mono text-gray-700 dark:text-gray-300">{angle}°</span>
        </label>

        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={showComplement}
            onChange={(e) => setShowComplement(e.target.checked)}
            className="accent-orange-500"
          />
          <span className="text-gray-600 dark:text-gray-400">Show M⊥</span>
        </label>

        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={showPythagorean}
            onChange={(e) => setShowPythagorean(e.target.checked)}
            className="accent-green-600"
          />
          <span className="text-gray-600 dark:text-gray-400">Pythagorean</span>
        </label>

        <span className="text-xs text-gray-500 dark:text-gray-400">
          Drag the blue point to explore
        </span>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} className="block" />

      {/* Info panel */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded bg-gray-50 p-3 text-sm dark:bg-gray-800 sm:grid-cols-4">
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">x = </span>
          <span className="font-mono text-blue-600 dark:text-blue-400">
            ({point[0].toFixed(2)}, {point[1].toFixed(2)})
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">P<sub>M</sub>x = </span>
          <span className="font-mono text-green-600 dark:text-green-400">
            ({projResult.proj[0].toFixed(2)}, {projResult.proj[1].toFixed(2)})
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">‖x − P<sub>M</sub>x‖ = </span>
          <span className="font-mono font-semibold text-red-600 dark:text-red-400">
            {projResult.dist.toFixed(4)}
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">∠(x, M) = </span>
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {projResult.angleToM.toFixed(1)}°
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        The projection P<sub>M</sub>x is the closest point in M to x. The residual x − P<sub>M</sub>x is perpendicular to M — this is the geometric content of the projection theorem.
      </p>
    </div>
  );
}
