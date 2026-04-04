/**
 * PotentialFunctionExplorer — 3D wireframe surface of a potential function φ
 * with the gradient field ∇φ projected onto the xy-plane below.
 * The height difference f(b) − f(a) equals the line integral ∫_C ∇f · dr.
 */
import { useState, useMemo, useId } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { POTENTIAL_PRESETS, asF } from '../../data/line-integrals-data';
import { generateWireframe, project3D, generateContours } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 20, bottom: 20, left: 20 };

export default function PotentialFunctionExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.65, 480);
  const uid = useId();

  const [presetIdx, setPresetIdx] = useState(0);
  const [viewAngle, setViewAngle] = useState(35);
  const [showGradient, setShowGradient] = useState(true);
  const [showContourLines, setShowContourLines] = useState(true);

  const preset = POTENTIAL_PRESETS[presetIdx];
  const xDomain: [number, number] = [-2, 2];
  const yDomain: [number, number] = [-2, 2];
  const gridSize = 30;

  // Generate wireframe
  const wireframe = useMemo(
    () => generateWireframe(preset.f, xDomain, yDomain, gridSize),
    [presetIdx],
  );

  // Generate contours
  const contours = useMemo(
    () => showContourLines ? generateContours(preset.f, xDomain, yDomain, 10, 60) : [],
    [presetIdx, showContourLines],
  );

  // Gradient field data
  const gradField = useMemo(() => {
    if (!showGradient) return [];
    const F = asF(preset.grad);
    const n = 8;
    const dx = (xDomain[1] - xDomain[0]) / n;
    const dy = (yDomain[1] - yDomain[0]) / n;
    const arrows: { x: number; y: number; fx: number; fy: number }[] = [];
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const x = xDomain[0] + i * dx;
        const y = yDomain[0] + j * dy;
        const [fx, fy] = F(x, y);
        arrows.push({ x, y, fx, fy });
      }
    }
    return arrows;
  }, [presetIdx, showGradient]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const azimuth = (viewAngle * Math.PI) / 180;
      const elevation = Math.PI / 7;
      const scale3D = Math.min(innerW, innerH) * 0.22;

      // Helper: project + scale
      const proj = (x: number, y: number, z: number): [number, number] => {
        const [sx, sy] = project3D(x, y, z, azimuth, elevation);
        return [sx * scale3D, sy * scale3D];
      };

      // Find z-extent for coloring
      let zMin = Infinity;
      let zMax = -Infinity;
      for (const row of wireframe.zValues) {
        for (const z of row) {
          if (z < zMin) zMin = z;
          if (z > zMax) zMax = z;
        }
      }
      if (!isFinite(zMin)) zMin = 0;
      if (!isFinite(zMax)) zMax = 1;
      const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([zMin, zMax]);

      // Project all wireframe points and find screen bounds
      const projected: { sx: number; sy: number }[][] = [];
      let sxMin = Infinity, sxMax = -Infinity, syMin = Infinity, syMax = -Infinity;

      for (let i = 0; i < wireframe.xGrid.length; i++) {
        projected[i] = [];
        for (let j = 0; j < wireframe.yGrid.length; j++) {
          const [sx, sy] = proj(wireframe.xGrid[i], wireframe.yGrid[j], wireframe.zValues[i][j]);
          projected[i][j] = { sx, sy };
          if (sx < sxMin) sxMin = sx;
          if (sx > sxMax) sxMax = sx;
          if (sy < syMin) syMin = sy;
          if (sy > syMax) syMax = sy;
        }
      }

      // Center in panel
      const cx = innerW / 2 - (sxMin + sxMax) / 2;
      const cy = innerH / 2 - (syMin + syMax) / 2;

      // Draw wireframe: constant-x lines
      for (let i = 0; i < wireframe.xGrid.length; i++) {
        const pts = projected[i].map((p) => `${p.sx + cx},${p.sy + cy}`);
        g.append('polyline')
          .attr('points', pts.join(' '))
          .attr('fill', 'none')
          .attr('stroke', colorScale(wireframe.zValues[i][Math.floor(wireframe.yGrid.length / 2)]))
          .attr('stroke-width', 0.8)
          .attr('stroke-opacity', 0.7);
      }

      // Draw wireframe: constant-y lines
      for (let j = 0; j < wireframe.yGrid.length; j++) {
        const pts: string[] = [];
        for (let i = 0; i < wireframe.xGrid.length; i++) {
          pts.push(`${projected[i][j].sx + cx},${projected[i][j].sy + cy}`);
        }
        g.append('polyline')
          .attr('points', pts.join(' '))
          .attr('fill', 'none')
          .attr('stroke', colorScale(wireframe.zValues[Math.floor(wireframe.xGrid.length / 2)][j]))
          .attr('stroke-width', 0.8)
          .attr('stroke-opacity', 0.7);
      }

      // Contour lines projected to floor
      if (showContourLines && contours.length > 0) {
        const floorZ = zMin - (zMax - zMin) * 0.3;
        contours.forEach((c) => {
          if (c.points.length < 2) return;
          const pts = c.points.map(([x, y]) => {
            const [sx, sy] = proj(x, y, floorZ);
            return `${sx + cx},${sy + cy}`;
          });
          g.append('polyline')
            .attr('points', pts.join(' '))
            .attr('fill', 'none')
            .attr('stroke', '#a1a1aa')
            .attr('stroke-width', 0.6)
            .attr('stroke-opacity', 0.5);
        });
      }

      // Gradient field arrows on floor
      if (showGradient && gradField.length > 0) {
        const floorZ = zMin - (zMax - zMin) * 0.3;
        let maxMag = 0;
        gradField.forEach((a) => {
          const mag = Math.sqrt(a.fx * a.fx + a.fy * a.fy);
          if (isFinite(mag) && mag > maxMag) maxMag = mag;
        });
        const arrowLen = 0.15 / (maxMag || 1);

        // Arrow marker
        svg.append('defs')
          .append('marker')
          .attr('id', `pot-arr-${uid}`)
          .attr('viewBox', '0 0 10 10')
          .attr('refX', 10)
          .attr('refY', 5)
          .attr('markerWidth', 3)
          .attr('markerHeight', 3)
          .attr('orient', 'auto')
          .append('path')
          .attr('d', 'M 0 0 L 10 5 L 0 10 z')
          .attr('fill', functionColors[1]);

        gradField.forEach((a) => {
          const mag = Math.sqrt(a.fx * a.fx + a.fy * a.fy);
          if (!isFinite(mag) || mag < 1e-10) return;
          const [sx1, sy1] = proj(a.x, a.y, floorZ);
          const [sx2, sy2] = proj(a.x + a.fx * arrowLen, a.y + a.fy * arrowLen, floorZ);
          g.append('line')
            .attr('x1', sx1 + cx)
            .attr('y1', sy1 + cy)
            .attr('x2', sx2 + cx)
            .attr('y2', sy2 + cy)
            .attr('stroke', functionColors[1])
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.7)
            .attr('marker-end', `url(#pot-arr-${uid})`);
        });
      }
    },
    [presetIdx, viewAngle, showGradient, showContourLines, width, height, uid],
  );

  return (
    <div ref={containerRef} className="my-8 w-full">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Potential:</span>
          <select
            value={presetIdx}
            onChange={(e) => setPresetIdx(Number(e.target.value))}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
          >
            {POTENTIAL_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">View angle:</span>
          <input
            type="range"
            min={0}
            max={360}
            value={viewAngle}
            onChange={(e) => setViewAngle(Number(e.target.value))}
            className="w-24"
          />
          <span className="w-8 text-right text-xs tabular-nums text-zinc-500">{viewAngle}°</span>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showGradient}
            onChange={(e) => setShowGradient(e.target.checked)}
            className="rounded"
          />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Gradient vectors</span>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showContourLines}
            onChange={(e) => setShowContourLines(e.target.checked)}
            className="rounded"
          />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Contours</span>
        </label>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      />

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        The surface shows φ(x, y). The gradient field ∇φ is projected onto the floor plane.
        For any curve C from point A to point B, the Gradient Theorem gives ∫<sub>C</sub> ∇φ · dr = φ(B) − φ(A).
      </p>
    </div>
  );
}
