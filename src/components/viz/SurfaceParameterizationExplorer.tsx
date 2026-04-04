import { useState, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { project3D, surfaceNormal } from './shared/multivariate';
import { surfaceAreaElement } from './shared/integration';
import { surfacePresets } from '../../data/surface-integrals-data';

const margin = { top: 10, right: 10, bottom: 10, left: 10 };

// Use a subset of presets good for parameterization exploration
const paramPresets = surfacePresets.filter((s) =>
  ['sphere', 'cylinder', 'torus', 'saddle-graph', 'paraboloid-cap'].includes(s.name),
);

export default function SurfaceParameterizationExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const halfWidth = Math.max(200, (width - 24) / 2);
  const height = Math.min(halfWidth * 0.9, 350);
  const [presetIdx, setPresetIdx] = useState(0);
  const [selectedU, setSelectedU] = useState(0.5);
  const [selectedV, setSelectedV] = useState(0.5);
  const [azimuth, setAzimuth] = useState(-0.5);
  const [elevation, setElevation] = useState(0.45);
  const [showAreaHeatmap, setShowAreaHeatmap] = useState(true);
  const [showNormals, setShowNormals] = useState(false);

  const dragRef = useRef<{ startX: number; startY: number; startAz: number; startEl: number } | null>(null);

  const surface = paramPresets[presetIdx];
  const nGrid = 16;

  // Normalized parameter values to actual domain values
  const uActual = surface.paramDomain.u[0] + selectedU * (surface.paramDomain.u[1] - surface.paramDomain.u[0]);
  const vActual = surface.paramDomain.v[0] + selectedV * (surface.paramDomain.v[1] - surface.paramDomain.v[0]);

  // Tangent frame at selected point
  const tangentFrame = useMemo(() => {
    const pos = surface.r(uActual, vActual);
    const ru = surface.r_u(uActual, vActual);
    const rv = surface.r_v(uActual, vActual);
    const { normal, magnitude, unitNormal } = surfaceNormal(ru, rv);
    return { pos, ru, rv, normal, magnitude, unitNormal };
  }, [surface, uActual, vActual]);

  // 3D surface mesh data
  const mesh3D = useMemo(() => {
    const { u: uDom, v: vDom } = surface.paramDomain;
    const du = (uDom[1] - uDom[0]) / nGrid;
    const dv = (vDom[1] - vDom[0]) / nGrid;

    const faces: { corners: [number, number][]; depth: number; areaElement: number }[] = [];

    for (let i = 0; i < nGrid; i++) {
      for (let j = 0; j < nGrid; j++) {
        const corners3D: [number, number, number][] = [];
        for (const [di, dj] of [[0, 0], [1, 0], [1, 1], [0, 1]] as const) {
          corners3D.push(surface.r(uDom[0] + (i + di) * du, vDom[0] + (j + dj) * dv));
        }

        const uMid = uDom[0] + (i + 0.5) * du;
        const vMid = vDom[0] + (j + 0.5) * dv;
        const ru = surface.r_u(uMid, vMid);
        const rv = surface.r_v(uMid, vMid);
        const ae = surfaceAreaElement(ru, rv);

        const projCorners = corners3D.map(
          (c) => project3D(c[0], c[1], c[2], azimuth, elevation) as [number, number],
        );
        const depth = corners3D.reduce(
          (s, c) => s + c[0] * Math.sin(azimuth) + c[1] * Math.cos(azimuth), 0,
        );

        faces.push({ corners: projCorners, depth, areaElement: ae });
      }
    }

    faces.sort((a, b) => a.depth - b.depth);

    // Normal arrows at grid nodes (sparse)
    const normalArrows: { from: [number, number]; to: [number, number] }[] = [];
    if (showNormals) {
      for (let i = 0; i < nGrid; i += 3) {
        for (let j = 0; j < nGrid; j += 3) {
          const u = uDom[0] + (i + 0.5) * du;
          const v = vDom[0] + (j + 0.5) * dv;
          const pos = surface.r(u, v);
          const ru = surface.r_u(u, v);
          const rv = surface.r_v(u, v);
          const { unitNormal } = surfaceNormal(ru, rv);
          const len = 0.2;
          normalArrows.push({
            from: project3D(pos[0], pos[1], pos[2], azimuth, elevation),
            to: project3D(pos[0] + unitNormal[0] * len, pos[1] + unitNormal[1] * len, pos[2] + unitNormal[2] * len, azimuth, elevation),
          });
        }
      }
    }

    return { faces, normalArrows };
  }, [surface, azimuth, elevation, nGrid, showNormals]);

  // Color scale for area element heatmap
  const areaColorScale = useMemo(() => {
    const maxAE = Math.max(1e-6, ...mesh3D.faces.map((f) => f.areaElement));
    return d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxAE]);
  }, [mesh3D]);

  // Drag handlers for 3D panel
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = { startX: e.clientX, startY: e.clientY, startAz: azimuth, startEl: elevation };
    },
    [azimuth, elevation],
  );
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setAzimuth(dragRef.current.startAz + (e.clientX - dragRef.current.startX) * 0.008);
    setElevation(Math.max(0.1, Math.min(1.3, dragRef.current.startEl + (e.clientY - dragRef.current.startY) * 0.008)));
  }, []);
  const handleMouseUp = useCallback(() => { dragRef.current = null; }, []);

  // 2D parameter domain rendering
  const paramSvgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const w = halfWidth;
      const h = height;
      svg.attr('width', w).attr('height', h);

      const plotW = w - 40;
      const plotH = h - 40;
      const g = svg.append('g').attr('transform', `translate(20, 20)`);

      // Background
      g.append('rect')
        .attr('width', plotW)
        .attr('height', plotH)
        .style('fill', '#f8fafc')
        .style('stroke', '#e2e8f0')
        .style('stroke-width', 1);

      // Grid lines
      for (let i = 0; i <= nGrid; i++) {
        const x = (i / nGrid) * plotW;
        const y = (i / nGrid) * plotH;
        g.append('line')
          .attr('x1', x).attr('y1', 0)
          .attr('x2', x).attr('y2', plotH)
          .style('stroke', '#cbd5e1').style('stroke-width', 0.5);
        g.append('line')
          .attr('x1', 0).attr('y1', y)
          .attr('x2', plotW).attr('y2', y)
          .style('stroke', '#cbd5e1').style('stroke-width', 0.5);
      }

      // Selected point
      g.append('circle')
        .attr('cx', selectedU * plotW)
        .attr('cy', selectedV * plotH)
        .attr('r', 6)
        .style('fill', '#f59e0b')
        .style('stroke', '#fff')
        .style('stroke-width', 2);

      // Click handler
      g.append('rect')
        .attr('width', plotW)
        .attr('height', plotH)
        .style('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const rect = (event.target as SVGElement).getBoundingClientRect();
          const nx = (event.clientX - rect.left) / plotW;
          const ny = (event.clientY - rect.top) / plotH;
          setSelectedU(Math.max(0.01, Math.min(0.99, nx)));
          setSelectedV(Math.max(0.01, Math.min(0.99, ny)));
        });

      // Labels
      const { u: uDom, v: vDom } = surface.paramDomain;
      g.append('text').attr('x', plotW / 2).attr('y', plotH + 16)
        .text(`u ∈ [${uDom[0].toFixed(1)}, ${uDom[1].toFixed(2)}]`)
        .style('text-anchor', 'middle').style('font-size', '10px').style('fill', '#64748b');
      g.append('text').attr('x', -8).attr('y', plotH / 2)
        .text('v')
        .style('text-anchor', 'middle').style('font-size', '10px').style('fill', '#64748b')
        .attr('transform', `rotate(-90, -8, ${plotH / 2})`);
      g.append('text').attr('x', plotW / 2).attr('y', -6)
        .text('Parameter domain D*')
        .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#475569').style('font-weight', '500');
    },
    [halfWidth, height, selectedU, selectedV, nGrid, surface],
  );

  // 3D surface rendering
  const surfSvgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const w = halfWidth;
      const h = height;
      svg.attr('width', w).attr('height', h);

      const plotW = w - margin.left - margin.right;
      const plotH = h - margin.top - margin.bottom;
      const g = svg.append('g')
        .attr('transform', `translate(${margin.left + plotW / 2}, ${margin.top + plotH / 2})`);

      const scale = Math.min(plotW, plotH) * 0.35;

      // Draw faces
      mesh3D.faces.forEach((face) => {
        const points = face.corners.map(([px, py]) => `${px * scale},${-py * scale}`).join(' ');
        g.append('polygon')
          .attr('points', points)
          .style('fill', showAreaHeatmap ? areaColorScale(face.areaElement) : '#e2e8f0')
          .style('fill-opacity', showAreaHeatmap ? 0.8 : 0.4)
          .style('stroke', '#475569')
          .style('stroke-width', 0.3)
          .style('stroke-opacity', 0.5);
      });

      // Draw normal arrows
      mesh3D.normalArrows.forEach((arrow) => {
        g.append('line')
          .attr('x1', arrow.from[0] * scale).attr('y1', -arrow.from[1] * scale)
          .attr('x2', arrow.to[0] * scale).attr('y2', -arrow.to[1] * scale)
          .style('stroke', '#059669').style('stroke-width', 1.5).style('stroke-opacity', 0.6);
      });

      // Selected point tangent frame
      const pos3D = project3D(
        tangentFrame.pos[0], tangentFrame.pos[1], tangentFrame.pos[2], azimuth, elevation,
      );
      g.append('circle')
        .attr('cx', pos3D[0] * scale)
        .attr('cy', -pos3D[1] * scale)
        .attr('r', 5)
        .style('fill', '#f59e0b')
        .style('stroke', '#fff')
        .style('stroke-width', 2);

      // Tangent vectors
      const vecScale = 0.3;
      const vectors = [
        { vec: tangentFrame.ru, color: '#ef4444', label: 'r_u' },
        { vec: tangentFrame.rv, color: '#22c55e', label: 'r_v' },
        { vec: tangentFrame.unitNormal, color: '#3b82f6', label: 'n̂' },
      ];
      vectors.forEach(({ vec, color }) => {
        const tip = project3D(
          tangentFrame.pos[0] + vec[0] * vecScale,
          tangentFrame.pos[1] + vec[1] * vecScale,
          tangentFrame.pos[2] + vec[2] * vecScale,
          azimuth, elevation,
        );
        g.append('line')
          .attr('x1', pos3D[0] * scale).attr('y1', -pos3D[1] * scale)
          .attr('x2', tip[0] * scale).attr('y2', -tip[1] * scale)
          .style('stroke', color).style('stroke-width', 2).style('stroke-opacity', 0.8);
        g.append('circle')
          .attr('cx', tip[0] * scale).attr('cy', -tip[1] * scale)
          .attr('r', 3)
          .style('fill', color);
      });

      // Axes
      const axisLen = 1.5;
      [
        { dir: [axisLen, 0, 0] as [number, number, number], label: 'x', color: '#ef4444' },
        { dir: [0, axisLen, 0] as [number, number, number], label: 'y', color: '#22c55e' },
        { dir: [0, 0, axisLen] as [number, number, number], label: 'z', color: '#3b82f6' },
      ].forEach(({ dir, label, color }) => {
        const [px, py] = project3D(dir[0], dir[1], dir[2], azimuth, elevation);
        g.append('line')
          .attr('x1', 0).attr('y1', 0)
          .attr('x2', px * scale).attr('y2', -py * scale)
          .style('stroke', color).style('stroke-width', 1).style('stroke-opacity', 0.3);
        g.append('text')
          .attr('x', px * scale + 4).attr('y', -py * scale)
          .text(label)
          .style('font-size', '10px').style('fill', color).style('font-family', 'var(--font-mono, monospace)');
      });

      // Title
      g.append('text').attr('x', 0).attr('y', -plotH / 2 + 10)
        .text('Surface S in ℝ³')
        .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#475569').style('font-weight', '500');
    },
    [mesh3D, tangentFrame, halfWidth, height, showAreaHeatmap, areaColorScale, showNormals, azimuth, elevation],
  );

  const fmt = (v: number) => v.toFixed(3);

  return (
    <div ref={containerRef} className="my-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600 dark:text-slate-400">Surface:</span>
          <select
            value={presetIdx}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setPresetIdx(Number(e.target.value))}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {paramPresets.map((s, i) => (
              <option key={s.name} value={i}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={showAreaHeatmap} onChange={(e) => setShowAreaHeatmap(e.target.checked)} className="rounded" />
          <span className="text-slate-600 dark:text-slate-400">Area element heatmap</span>
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={showNormals} onChange={(e) => setShowNormals(e.target.checked)} className="rounded" />
          <span className="text-slate-600 dark:text-slate-400">Normal vectors</span>
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div style={{ width: halfWidth, height }}>
          <svg ref={paramSvgRef} />
        </div>
        <div
          style={{ width: halfWidth, height, cursor: 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg ref={surfSvgRef} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded bg-slate-50 p-3 text-xs dark:bg-slate-800 sm:grid-cols-3">
        <div>
          <span className="font-medium text-slate-500">Selected (u, v):</span>{' '}
          <span className="font-mono">({fmt(uActual)}, {fmt(vActual)})</span>
        </div>
        <div>
          <span className="font-medium text-slate-500">r(u,v):</span>{' '}
          <span className="font-mono">({fmt(tangentFrame.pos[0])}, {fmt(tangentFrame.pos[1])}, {fmt(tangentFrame.pos[2])})</span>
        </div>
        <div>
          <span className="font-medium text-slate-500">‖r_u × r_v‖:</span>{' '}
          <span className="font-mono">{fmt(tangentFrame.magnitude)}</span>
        </div>
        <div>
          <span className="font-medium text-red-500">r_u:</span>{' '}
          <span className="font-mono">({fmt(tangentFrame.ru[0])}, {fmt(tangentFrame.ru[1])}, {fmt(tangentFrame.ru[2])})</span>
        </div>
        <div>
          <span className="font-medium text-green-600">r_v:</span>{' '}
          <span className="font-mono">({fmt(tangentFrame.rv[0])}, {fmt(tangentFrame.rv[1])}, {fmt(tangentFrame.rv[2])})</span>
        </div>
        <div>
          <span className="font-medium text-blue-500">n̂:</span>{' '}
          <span className="font-mono">({fmt(tangentFrame.unitNormal[0])}, {fmt(tangentFrame.unitNormal[1])}, {fmt(tangentFrame.unitNormal[2])})</span>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-slate-500">
        Click on the parameter domain (left) to select a point. Drag to rotate the 3D view (right).
      </p>
    </div>
  );
}
