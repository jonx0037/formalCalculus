import { useState, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { project3D, surfaceNormal, surfaceIntegralFlux } from './shared/multivariate';
import { surfacePresets, vectorField3DPresets } from '../../data/surface-integrals-data';

const margin = { top: 10, right: 10, bottom: 10, left: 10 };

interface Face {
  corners: [number, number][];
  depth: number;
  value: number; // F · n̂
  worldCenter: [number, number, number];
}

export default function FluxExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.75, 500);

  const [surfaceIdx, setSurfaceIdx] = useState(0); // sphere
  const [fieldIdx, setFieldIdx] = useState(0); // radial
  const [azimuth, setAzimuth] = useState(-0.5);
  const [elevation, setElevation] = useState(0.45);
  const [showField, setShowField] = useState(true);
  const [showNormals, setShowNormals] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);

  const dragRef = useRef<{ startX: number; startY: number; startAz: number; startEl: number } | null>(null);

  const surface = surfacePresets[surfaceIdx];
  const field = vectorField3DPresets[fieldIdx];
  const nGrid = 20;

  // Compute surface mesh and face data
  const meshData = useMemo(() => {
    const { u: uDomain, v: vDomain } = surface.paramDomain;
    const du = (uDomain[1] - uDomain[0]) / nGrid;
    const dv = (vDomain[1] - vDomain[0]) / nGrid;

    // Generate grid vertices
    const vertices: [number, number, number][][] = [];
    for (let i = 0; i <= nGrid; i++) {
      const row: [number, number, number][] = [];
      const u = uDomain[0] + i * du;
      for (let j = 0; j <= nGrid; j++) {
        const v = vDomain[0] + j * dv;
        row.push(surface.r(u, v));
      }
      vertices.push(row);
    }

    // Generate faces with flux values
    const faces: Face[] = [];
    for (let i = 0; i < nGrid; i++) {
      for (let j = 0; j < nGrid; j++) {
        const c0 = vertices[i][j];
        const c1 = vertices[i + 1][j];
        const c2 = vertices[i + 1][j + 1];
        const c3 = vertices[i][j + 1];

        const center: [number, number, number] = [
          (c0[0] + c1[0] + c2[0] + c3[0]) / 4,
          (c0[1] + c1[1] + c2[1] + c3[1]) / 4,
          (c0[2] + c1[2] + c2[2] + c3[2]) / 4,
        ];

        // Compute normal at face center using tangent vectors
        const uMid = uDomain[0] + (i + 0.5) * du;
        const vMid = vDomain[0] + (j + 0.5) * dv;
        const ru = surface.r_u(uMid, vMid);
        const rv = surface.r_v(uMid, vMid);
        const { unitNormal } = surfaceNormal(ru, rv);

        // For closed surfaces, ensure outward-pointing normal
        let n = unitNormal;
        if (surface.isClosed) {
          const dot = center[0] * n[0] + center[1] * n[1] + center[2] * n[2];
          if (dot < 0) {
            n = [-n[0], -n[1], -n[2]] as [number, number, number];
          }
        }

        // F · n̂ at center
        const fVec = field.F(center[0], center[1], center[2]);
        const fDotN = fVec[0] * n[0] + fVec[1] * n[1] + fVec[2] * n[2];

        // Project corners
        const projCorners: [number, number][] = [
          project3D(c0[0], c0[1], c0[2], azimuth, elevation),
          project3D(c1[0], c1[1], c1[2], azimuth, elevation),
          project3D(c2[0], c2[1], c2[2], azimuth, elevation),
          project3D(c3[0], c3[1], c3[2], azimuth, elevation),
        ];

        const depth =
          c0[0] * Math.sin(azimuth) +
          c0[1] * Math.cos(azimuth) +
          c1[0] * Math.sin(azimuth) +
          c1[1] * Math.cos(azimuth) +
          c2[0] * Math.sin(azimuth) +
          c2[1] * Math.cos(azimuth) +
          c3[0] * Math.sin(azimuth) +
          c3[1] * Math.cos(azimuth);

        faces.push({
          corners: projCorners,
          depth,
          value: fDotN,
          worldCenter: center,
        });
      }
    }

    // Depth sort (painter's algorithm: back-to-front)
    faces.sort((a, b) => a.depth - b.depth);

    // Field arrows on sparse 3D grid
    const arrows: { from: [number, number]; to: [number, number]; depth: number }[] = [];
    const arrowGrid = 5;
    const arrowScale = 0.15;
    for (let i = 0; i < arrowGrid; i++) {
      for (let j = 0; j < arrowGrid; j++) {
        for (let k = 0; k < arrowGrid; k++) {
          const x = -1.5 + (3 * (i + 0.5)) / arrowGrid;
          const y = -1.5 + (3 * (j + 0.5)) / arrowGrid;
          const z = -1.5 + (3 * (k + 0.5)) / arrowGrid;
          const [fx, fy, fz] = field.F(x, y, z);
          const fMag = Math.sqrt(fx * fx + fy * fy + fz * fz);
          if (fMag < 1e-10) continue;
          const s = Math.min(arrowScale, arrowScale / fMag);
          const from = project3D(x, y, z, azimuth, elevation);
          const to = project3D(x + fx * s, y + fy * s, z + fz * s, azimuth, elevation);
          arrows.push({ from, to, depth: x * Math.sin(azimuth) + y * Math.cos(azimuth) });
        }
      }
    }
    arrows.sort((a, b) => a.depth - b.depth);

    // Normal arrows at mesh nodes (sparse: every 4th point)
    const normalArrows: { from: [number, number]; to: [number, number]; depth: number }[] = [];
    const normalLen = 0.2;
    for (let i = 0; i < nGrid; i += 4) {
      for (let j = 0; j < nGrid; j += 4) {
        const uMid = uDomain[0] + (i + 0.5) * du;
        const vMid = vDomain[0] + (j + 0.5) * dv;
        const pos = surface.r(uMid, vMid);
        const ru = surface.r_u(uMid, vMid);
        const rv = surface.r_v(uMid, vMid);
        let { unitNormal: n } = surfaceNormal(ru, rv);
        if (surface.isClosed) {
          const dot = pos[0] * n[0] + pos[1] * n[1] + pos[2] * n[2];
          if (dot < 0) n = [-n[0], -n[1], -n[2]] as [number, number, number];
        }
        const from = project3D(pos[0], pos[1], pos[2], azimuth, elevation);
        const to = project3D(
          pos[0] + n[0] * normalLen,
          pos[1] + n[1] * normalLen,
          pos[2] + n[2] * normalLen,
          azimuth, elevation,
        );
        normalArrows.push({
          from, to,
          depth: pos[0] * Math.sin(azimuth) + pos[1] * Math.cos(azimuth),
        });
      }
    }

    return { faces, arrows, normalArrows, vertices };
  }, [surface, field, azimuth, elevation, nGrid]);

  // Compute total flux, corrected for outward-normal convention
  const totalFlux = useMemo(() => {
    const rawFlux = surfaceIntegralFlux(
      field.F,
      surface.r,
      surface.r_u,
      surface.r_v,
      surface.paramDomain.u,
      surface.paramDomain.v,
    );
    return rawFlux * surface.outwardSign;
  }, [field, surface]);

  // Color scale for flux heatmap
  const colorScale = useMemo(() => {
    const maxAbs = Math.max(
      1e-6,
      ...meshData.faces.map((f) => Math.abs(f.value)),
    );
    return d3.scaleDiverging<string>(d3.interpolateRdYlGn).domain([-maxAbs, 0, maxAbs]);
  }, [meshData]);

  // Drag-to-rotate handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startAz: azimuth,
        startEl: elevation,
      };
    },
    [azimuth, elevation],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setAzimuth(dragRef.current.startAz + dx * 0.008);
    setElevation(Math.max(0.1, Math.min(1.3, dragRef.current.startEl + dy * 0.008)));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (!width || !height) return;

      const plotW = width - margin.left - margin.right;
      const plotH = height - margin.top - margin.bottom;
      const g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left + plotW / 2}, ${margin.top + plotH / 2})`);

      const scale = Math.min(plotW, plotH) * 0.35;

      // Draw faces
      meshData.faces.forEach((face) => {
        const points = face.corners
          .map(([px, py]) => `${px * scale},${-py * scale}`)
          .join(' ');

        g.append('polygon')
          .attr('points', points)
          .style('fill', showHeatmap ? colorScale(face.value) : '#e2e8f0')
          .style('fill-opacity', showHeatmap ? 0.85 : 0.4)
          .style('stroke', '#475569')
          .style('stroke-width', 0.3)
          .style('stroke-opacity', 0.5);
      });

      // Draw field arrows
      if (showField) {
        meshData.arrows.forEach((arrow) => {
          g.append('line')
            .attr('x1', arrow.from[0] * scale)
            .attr('y1', -arrow.from[1] * scale)
            .attr('x2', arrow.to[0] * scale)
            .attr('y2', -arrow.to[1] * scale)
            .style('stroke', '#2563EB')
            .style('stroke-width', 1)
            .style('stroke-opacity', 0.35);
        });
      }

      // Draw normal arrows
      if (showNormals) {
        meshData.normalArrows.forEach((arrow) => {
          g.append('line')
            .attr('x1', arrow.from[0] * scale)
            .attr('y1', -arrow.from[1] * scale)
            .attr('x2', arrow.to[0] * scale)
            .attr('y2', -arrow.to[1] * scale)
            .style('stroke', '#059669')
            .style('stroke-width', 1.5)
            .style('stroke-opacity', 0.7);
        });
      }

      // Draw axes
      const axisLen = 1.8;
      const axes = [
        { dir: [axisLen, 0, 0] as [number, number, number], label: 'x', color: '#ef4444' },
        { dir: [0, axisLen, 0] as [number, number, number], label: 'y', color: '#22c55e' },
        { dir: [0, 0, axisLen] as [number, number, number], label: 'z', color: '#3b82f6' },
      ];
      axes.forEach(({ dir, label, color }) => {
        const [px, py] = project3D(dir[0], dir[1], dir[2], azimuth, elevation);
        g.append('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', px * scale)
          .attr('y2', -py * scale)
          .style('stroke', color)
          .style('stroke-width', 1)
          .style('stroke-opacity', 0.4);
        g.append('text')
          .attr('x', px * scale + 5)
          .attr('y', -py * scale)
          .text(label)
          .style('font-size', '11px')
          .style('fill', color)
          .style('font-family', 'var(--font-mono, monospace)');
      });
    },
    [meshData, width, height, showField, showNormals, showHeatmap, colorScale, azimuth, elevation],
  );

  return (
    <div ref={containerRef} className="my-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600 dark:text-slate-400">Surface:</span>
          <select
            value={surfaceIdx}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSurfaceIdx(Number(e.target.value))}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {surfacePresets.map((s, i) => (
              <option key={s.name} value={i}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600 dark:text-slate-400">Field:</span>
          <select
            value={fieldIdx}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFieldIdx(Number(e.target.value))}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {vectorField3DPresets.map((f, i) => (
              <option key={f.name} value={i}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={showField}
            onChange={(e) => setShowField(e.target.checked)}
            className="rounded"
          />
          <span className="text-slate-600 dark:text-slate-400">Field arrows</span>
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={showNormals}
            onChange={(e) => setShowNormals(e.target.checked)}
            className="rounded"
          />
          <span className="text-slate-600 dark:text-slate-400">Normal vectors</span>
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={showHeatmap}
            onChange={(e) => setShowHeatmap(e.target.checked)}
            className="rounded"
          />
          <span className="text-slate-600 dark:text-slate-400">Flux heatmap</span>
        </label>
      </div>

      <div
        style={{ width, height, cursor: 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg ref={svgRef} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 rounded bg-slate-50 p-3 text-sm dark:bg-slate-800 sm:grid-cols-2">
        <div>
          <span className="font-medium text-slate-600 dark:text-slate-400">Total flux </span>
          <span className="font-mono text-slate-900 dark:text-slate-100">
            ∬<sub>S</sub> F · dS ≈ {totalFlux.toFixed(4)}
          </span>
        </div>
        <div>
          <span className="font-medium text-slate-600 dark:text-slate-400">Surface: </span>
          <span className="text-slate-700 dark:text-slate-300">{surface.description}</span>
        </div>
        <div>
          <span className="font-medium text-slate-600 dark:text-slate-400">Field: </span>
          <span className="text-slate-700 dark:text-slate-300">{field.description}</span>
        </div>
        {surface.isClosed && (
          <div>
            <span className="font-medium text-slate-600 dark:text-slate-400">Div thm: </span>
            <span className="font-mono text-slate-900 dark:text-slate-100">
              ∭<sub>E</sub> ∇·F dV (predicted)
            </span>
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-500">
        Drag to rotate. Green = positive flux (outward), Red = negative flux (inward).
      </p>
    </div>
  );
}
