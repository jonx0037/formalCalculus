import { useState, useMemo, useCallback, useId, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { functionColors } from './shared/colorScales';
import { implicitFunctionSlice } from './shared/multivariate';
import { IMPLICIT_CURVE_PRESETS } from '../../data/inverse-implicit-data';
import type { ImplicitCurvePreset } from '../../data/inverse-implicit-data';

const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const GRID_SIZE = 200;

/** Extract zero-level contour segments via marching squares. */
function extractZeroContour(
  F: (x: number, y: number) => number,
  xDomain: [number, number],
  yDomain: [number, number],
): Array<[number, number]> {
  const dx = (xDomain[1] - xDomain[0]) / (GRID_SIZE - 1);
  const dy = (yDomain[1] - yDomain[0]) / (GRID_SIZE - 1);
  const vals = new Float64Array(GRID_SIZE * GRID_SIZE);
  for (let j = 0; j < GRID_SIZE; j++) {
    for (let i = 0; i < GRID_SIZE; i++) {
      vals[j * GRID_SIZE + i] = F(xDomain[0] + i * dx, yDomain[0] + j * dy);
    }
  }

  const segments: Array<[number, number]> = [];
  const lerp = (a: number, b: number, va: number, vb: number) =>
    a + (0 - va) / (vb - va) * (b - a);

  for (let j = 0; j < GRID_SIZE - 1; j++) {
    for (let i = 0; i < GRID_SIZE - 1; i++) {
      const x0 = xDomain[0] + i * dx;
      const x1 = x0 + dx;
      const y0 = yDomain[0] + j * dy;
      const y1 = y0 + dy;

      const v00 = vals[j * GRID_SIZE + i];
      const v10 = vals[j * GRID_SIZE + i + 1];
      const v01 = vals[(j + 1) * GRID_SIZE + i];
      const v11 = vals[(j + 1) * GRID_SIZE + i + 1];

      const caseIdx =
        (v00 > 0 ? 8 : 0) | (v10 > 0 ? 4 : 0) | (v11 > 0 ? 2 : 0) | (v01 > 0 ? 1 : 0);

      if (caseIdx === 0 || caseIdx === 15) continue;

      // Edge midpoints interpolated to zero
      const top: [number, number] = [lerp(x0, x1, v00, v10), y0];
      const right: [number, number] = [x1, lerp(y0, y1, v10, v11)];
      const bottom: [number, number] = [lerp(x0, x1, v01, v11), y1];
      const left: [number, number] = [x0, lerp(y0, y1, v00, v01)];

      const addSeg = (a: [number, number], b: [number, number]) => {
        segments.push(a, b);
      };

      switch (caseIdx) {
        case 1: case 14: addSeg(left, bottom); break;
        case 2: case 13: addSeg(bottom, right); break;
        case 3: case 12: addSeg(left, right); break;
        case 4: case 11: addSeg(top, right); break;
        case 5: addSeg(top, left); addSeg(bottom, right); break;
        case 6: case 9: addSeg(top, bottom); break;
        case 7: case 8: addSeg(top, left); break;
        case 10: addSeg(top, right); addSeg(left, bottom); break;
      }
    }
  }
  return segments;
}

/** Snap a click to the closest point on the contour, then refine with Newton. */
function snapToContour(
  clickX: number,
  clickY: number,
  segments: Array<[number, number]>,
  F: (x: number, y: number) => number,
  Fy: (x: number, y: number) => number,
): [number, number] | null {
  if (segments.length === 0) return null;

  let bestDist = Infinity;
  let bestPt: [number, number] = [clickX, clickY];
  for (const pt of segments) {
    const d = (pt[0] - clickX) ** 2 + (pt[1] - clickY) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestPt = pt;
    }
  }

  // Newton refinement: fix x, iterate y until F(x, y) ~ 0
  let x = bestPt[0];
  let y = bestPt[1];
  for (let iter = 0; iter < 20; iter++) {
    const fVal = F(x, y);
    if (Math.abs(fVal) < 1e-12) break;
    const fyVal = Fy(x, y);
    if (Math.abs(fyVal) < 1e-14) break;
    y -= fVal / fyVal;
  }
  if (!isFinite(y) || Math.abs(F(x, y)) > 1e-4) return bestPt;
  return [x, y];
}

export default function ImplicitCurveExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.75, 500);
  const markerId = useId().replace(/:/g, '');

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [evalPt, setEvalPt] = useState<[number, number] | null>(null);
  const [showLocalGraph, setShowLocalGraph] = useState(false);
  const [showGradient, setShowGradient] = useState(true);

  const preset = IMPLICIT_CURVE_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setEvalPt(null);
  }, []);

  // Zero-contour segments
  const segments = useMemo(
    () => extractZeroContour(preset.F, preset.xDomain, preset.yDomain),
    [selectedIdx],
  );

  // Initialize evaluation point from preset default
  const activePoint = evalPt ?? preset.defaultPoint;

  // Compute derivatives at the evaluation point
  const analysis = useMemo(() => {
    const [px, py] = activePoint;
    const fx = preset.Fx(px, py);
    const fy = preset.Fy(px, py);
    const isSingular = Math.abs(fy) < 1e-8;
    const gPrime = isSingular ? null : -fx / fy;
    return { fx, fy, gPrime, isSingular };
  }, [activePoint[0], activePoint[1], selectedIdx]);

  // Implicit function slice for local graph
  const localSlice = useMemo(() => {
    if (!showLocalGraph || analysis.isSingular) return null;
    const halfWidth = (preset.xDomain[1] - preset.xDomain[0]) * 0.15;
    const xRange: [number, number] = [
      Math.max(preset.xDomain[0], activePoint[0] - halfWidth),
      Math.min(preset.xDomain[1], activePoint[0] + halfWidth),
    ];
    return implicitFunctionSlice(preset.F, preset.Fy, activePoint, xRange, 80);
  }, [showLocalGraph, activePoint[0], activePoint[1], selectedIdx, analysis.isSingular]);

  const handleClick = useCallback(
    (clickX: number, clickY: number) => {
      const pt = snapToContour(clickX, clickY, segments, preset.F, preset.Fy);
      if (pt) setEvalPt(pt);
    },
    [segments, selectedIdx],
  );

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain(preset.xDomain).range([0, innerW]);
      const yScale = d3.scaleLinear().domain(preset.yDomain).range([innerH, 0]);

      // Arrow marker for gradient
      svg.append('defs')
        .append('marker')
        .attr('id', `grad-arrow-${markerId}`)
        .attr('viewBox', '0 -3 6 6')
        .attr('refX', 5)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-3L6,0L0,3')
        .style('fill', functionColors[1]);

      // Draw zero-contour segments
      for (let k = 0; k < segments.length; k += 2) {
        const a = segments[k];
        const b = segments[k + 1];
        g.append('line')
          .attr('x1', xScale(a[0]))
          .attr('y1', yScale(a[1]))
          .attr('x2', xScale(b[0]))
          .attr('y2', yScale(b[1]))
          .style('stroke', functionColors[0])
          .style('stroke-width', 2)
          .style('opacity', 0.9);
      }

      // Local graph overlay
      if (showLocalGraph && localSlice) {
        const pts = localSlice.xValues
          .map((x, i) => (localSlice.valid[i] ? [x, localSlice.yValues[i]] as [number, number] : null))
          .filter((p): p is [number, number] => p !== null);
        if (pts.length >= 2) {
          const lineGen = d3.line<[number, number]>()
            .x((d) => xScale(d[0]))
            .y((d) => yScale(d[1]));
          g.append('path')
            .datum(pts)
            .attr('d', lineGen)
            .attr('fill', 'none')
            .style('stroke', '#F59E0B')
            .style('stroke-width', 4)
            .style('opacity', 0.8);
        }
      }

      // Singular points
      if (preset.singularPoints) {
        for (const sp of preset.singularPoints) {
          g.append('circle')
            .attr('cx', xScale(sp[0]))
            .attr('cy', yScale(sp[1]))
            .attr('r', 5)
            .style('fill', '#EF4444')
            .style('stroke', '#fff')
            .style('stroke-width', 1.5);
        }
      }

      // Evaluation point, tangent, and gradient
      const [px, py] = activePoint;
      const cpx = xScale(px);
      const cpy = yScale(py);

      // Tangent line
      if (!analysis.isSingular && analysis.gPrime !== null) {
        const tangentLen = 0.5;
        const tx1 = px - tangentLen;
        const ty1 = py - analysis.gPrime * tangentLen;
        const tx2 = px + tangentLen;
        const ty2 = py + analysis.gPrime * tangentLen;
        g.append('line')
          .attr('x1', xScale(tx1))
          .attr('y1', yScale(ty1))
          .attr('x2', xScale(tx2))
          .attr('y2', yScale(ty2))
          .style('stroke', functionColors[2])
          .style('stroke-width', 2)
          .style('stroke-dasharray', '6 3')
          .style('opacity', 0.9);
      }

      // Gradient arrow
      if (showGradient) {
        const gradMag = Math.sqrt(analysis.fx ** 2 + analysis.fy ** 2);
        if (gradMag > 1e-8) {
          const arrowLen = Math.min(
            (preset.xDomain[1] - preset.xDomain[0]) * 0.12,
            (preset.yDomain[1] - preset.yDomain[0]) * 0.12,
          );
          const nx = analysis.fx / gradMag;
          const ny = analysis.fy / gradMag;
          g.append('line')
            .attr('x1', cpx)
            .attr('y1', cpy)
            .attr('x2', xScale(px + nx * arrowLen))
            .attr('y2', yScale(py + ny * arrowLen))
            .style('stroke', functionColors[1])
            .style('stroke-width', 2)
            .attr('marker-end', `url(#grad-arrow-${markerId})`);
        }
      }

      // Evaluation point dot
      g.append('circle')
        .attr('cx', cpx)
        .attr('cy', cpy)
        .attr('r', 6)
        .style('fill', '#fff')
        .style('stroke', functionColors[0])
        .style('stroke-width', 2)
        .style('cursor', 'pointer');

      // Click overlay
      g.append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
        .style('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event) => {
          const [mx, my] = d3.pointer(event, g.node());
          handleClick(xScale.invert(mx), yScale.invert(my));
        });

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px');

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('x');

      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -35)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('y');
    },
    [segments, activePoint, analysis, showGradient, showLocalGraph, localSlice, handleClick, width, height, markerId],
  );

  const fmt = (v: number | null) => (v === null ? '—' : v.toFixed(4));

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Curve:
          <select
            className="ml-1 rounded px-1 py-0.5 text-sm"
            style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
            value={selectedIdx}
            onChange={handlePresetChange}
          >
            {IMPLICIT_CURVE_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <input
            type="checkbox"
            className="mr-1"
            checked={showGradient}
            onChange={(e) => setShowGradient(e.target.checked)}
          />
          Show ∇F
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <input
            type="checkbox"
            className="mr-1"
            checked={showLocalGraph}
            onChange={(e) => setShowLocalGraph(e.target.checked)}
          />
          Show local graph
        </label>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      {/* Info panel */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-xs font-mono"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span>F_x = {fmt(analysis.fx)}</span>
        <span>F_y = {fmt(analysis.fy)}</span>
        <span>
          g&prime;(x) = {analysis.isSingular
            ? <span style={{ color: '#EF4444' }}>undefined (F_y = 0)</span>
            : fmt(analysis.gPrime)}
        </span>
        <span>
          Tangent: y = {analysis.isSingular
            ? '—'
            : `${fmt(analysis.gPrime)}(x − ${activePoint[0].toFixed(2)}) + ${activePoint[1].toFixed(2)}`}
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span><span style={{ color: functionColors[0] }}>●</span> F(x, y) = 0</span>
        <span><span style={{ color: functionColors[2] }}>●</span> Tangent line</span>
        {showGradient && (
          <span><span style={{ color: functionColors[1] }}>●</span> ∇F (normal to curve)</span>
        )}
        {showLocalGraph && (
          <span><span style={{ color: '#F59E0B' }}>●</span> Local graph y = g(x)</span>
        )}
        {preset.singularPoints && (
          <span><span style={{ color: '#EF4444' }}>●</span> Singular (F_y = 0)</span>
        )}
      </div>

      {preset.description && (
        <p className="mt-2 text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
          {preset.description}
        </p>
      )}
    </div>
  );
}
