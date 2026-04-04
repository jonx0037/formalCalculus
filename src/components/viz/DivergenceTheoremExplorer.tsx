import { useState, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  project3D,
  surfaceNormal,
  surfaceIntegralFlux,
} from './shared/multivariate';
import { volumeIntegralDivergence } from './shared/integration';
import { volumePresets, vectorField3DPresets } from '../../data/surface-integrals-data';

const margin = { top: 10, right: 10, bottom: 10, left: 10 };

export default function DivergenceTheoremExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.65, 440);

  const [volumeIdx, setVolumeIdx] = useState(1); // sphere
  const [fieldIdx, setFieldIdx] = useState(0); // radial
  const [meshRes, setMeshRes] = useState(12);
  const [azimuth, setAzimuth] = useState(-0.5);
  const [elevation, setElevation] = useState(0.45);
  const [showCrossSection, setShowCrossSection] = useState(true);

  const dragRef = useRef<{ startX: number; startY: number; startAz: number; startEl: number } | null>(null);

  const volume = volumePresets[volumeIdx];
  const field = vectorField3DPresets[fieldIdx];

  // Surface flux (left side of divergence theorem)
  const surfaceFlux = useMemo(() => {
    const surf = volume.boundary;
    const flux = surfaceIntegralFlux(
      field.F,
      surf.r,
      surf.r_u,
      surf.r_v,
      surf.paramDomain.u,
      surf.paramDomain.v,
      40,
      40,
    );
    // Apply the preset's orientation sign for outward-normal convention
    return flux * surf.outwardSign;
  }, [field, volume]);

  // Volume divergence integral (right side)
  const volumeDiv = useMemo(() => {
    return volumeIntegralDivergence(
      (x, y, z) => field.divergence(x, y, z),
      volume.bounds,
      meshRes * 2,
      meshRes * 2,
      meshRes * 2,
    );
  }, [field, volume, meshRes]);

  // Surface mesh for visualization
  const meshData = useMemo(() => {
    const surf = volume.boundary;
    const { u: uDom, v: vDom } = surf.paramDomain;
    const du = (uDom[1] - uDom[0]) / meshRes;
    const dv = (vDom[1] - vDom[0]) / meshRes;

    const faces: { corners: [number, number][]; depth: number; fluxVal: number }[] = [];

    for (let i = 0; i < meshRes; i++) {
      for (let j = 0; j < meshRes; j++) {
        const corners3D: [number, number, number][] = [];
        for (const [di, dj] of [[0, 0], [1, 0], [1, 1], [0, 1]] as const) {
          const u = uDom[0] + (i + di) * du;
          const v = vDom[0] + (j + dj) * dv;
          corners3D.push(surf.r(u, v));
        }

        const center: [number, number, number] = [
          corners3D.reduce((s, c) => s + c[0], 0) / 4,
          corners3D.reduce((s, c) => s + c[1], 0) / 4,
          corners3D.reduce((s, c) => s + c[2], 0) / 4,
        ];

        const uMid = uDom[0] + (i + 0.5) * du;
        const vMid = vDom[0] + (j + 0.5) * dv;
        const ru = surf.r_u(uMid, vMid);
        const rv = surf.r_v(uMid, vMid);
        let { unitNormal: n } = surfaceNormal(ru, rv);

        // Ensure outward-pointing
        if (surf.isClosed) {
          const dot = center[0] * n[0] + center[1] * n[1] + center[2] * n[2];
          if (dot < 0) n = [-n[0], -n[1], -n[2]] as [number, number, number];
        }

        const fVec = field.F(center[0], center[1], center[2]);
        const fluxVal = fVec[0] * n[0] + fVec[1] * n[1] + fVec[2] * n[2];

        const projCorners = corners3D.map(
          (c) => project3D(c[0], c[1], c[2], azimuth, elevation) as [number, number],
        );
        const depth = corners3D.reduce(
          (s, c) => s + c[0] * Math.sin(azimuth) + c[1] * Math.cos(azimuth),
          0,
        );

        faces.push({ corners: projCorners, depth, fluxVal });
      }
    }

    faces.sort((a, b) => a.depth - b.depth);

    // Divergence dots for cross-section
    const divDots: { pos: [number, number]; divVal: number; depth: number }[] = [];
    if (showCrossSection) {
      const nDots = 8;
      const { xRange } = volume.bounds;
      const dx = (xRange[1] - xRange[0]) / nDots;
      for (let i = 0; i < nDots; i++) {
        const x = xRange[0] + (i + 0.5) * dx;
        const yB = typeof volume.bounds.yRange === 'function'
          ? volume.bounds.yRange(x)
          : volume.bounds.yRange;
        const dy = (yB[1] - yB[0]) / nDots;
        for (let j = 0; j < nDots; j++) {
          const y = yB[0] + (j + 0.5) * dy;
          const zB = typeof volume.bounds.zRange === 'function'
            ? volume.bounds.zRange(x, y)
            : volume.bounds.zRange;
          if (zB[1] - zB[0] < 1e-8) continue;
          const dz = (zB[1] - zB[0]) / nDots;
          for (let k = 0; k < nDots; k++) {
            const z = zB[0] + (k + 0.5) * dz;
            const dv = field.divergence(x, y, z);
            if (!isFinite(dv)) continue;
            const proj = project3D(x, y, z, azimuth, elevation);
            divDots.push({
              pos: proj,
              divVal: dv,
              depth: x * Math.sin(azimuth) + y * Math.cos(azimuth),
            });
          }
        }
      }
      divDots.sort((a, b) => a.depth - b.depth);
    }

    return { faces, divDots };
  }, [volume, field, azimuth, elevation, meshRes, showCrossSection]);

  const fluxColorScale = useMemo(() => {
    const maxAbs = Math.max(1e-6, ...meshData.faces.map((f) => Math.abs(f.fluxVal)));
    return d3.scaleDiverging<string>(d3.interpolateRdYlGn).domain([-maxAbs, 0, maxAbs]);
  }, [meshData]);

  const divColorScale = useMemo(() => {
    if (meshData.divDots.length === 0) return d3.scaleDiverging<string>(d3.interpolateRdYlGn).domain([-1, 0, 1]);
    const maxAbs = Math.max(1e-6, ...meshData.divDots.map((d) => Math.abs(d.divVal)));
    return d3.scaleDiverging<string>(d3.interpolateRdYlBu).domain([-maxAbs, 0, maxAbs]);
  }, [meshData]);

  // Drag handlers
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

      const scale = Math.min(plotW, plotH) * 0.38;

      // Draw divergence dots (behind surface)
      if (showCrossSection) {
        meshData.divDots.forEach((dot) => {
          g.append('circle')
            .attr('cx', dot.pos[0] * scale)
            .attr('cy', -dot.pos[1] * scale)
            .attr('r', 2.5)
            .style('fill', divColorScale(dot.divVal))
            .style('fill-opacity', 0.6)
            .style('stroke', 'none');
        });
      }

      // Draw surface faces
      meshData.faces.forEach((face) => {
        const points = face.corners.map(([px, py]) => `${px * scale},${-py * scale}`).join(' ');
        g.append('polygon')
          .attr('points', points)
          .style('fill', fluxColorScale(face.fluxVal))
          .style('fill-opacity', showCrossSection ? 0.55 : 0.85)
          .style('stroke', '#475569')
          .style('stroke-width', 0.3)
          .style('stroke-opacity', 0.4);
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
          .style('stroke', color).style('stroke-width', 1).style('stroke-opacity', 0.35);
        g.append('text')
          .attr('x', px * scale + 4).attr('y', -py * scale)
          .text(label)
          .style('font-size', '10px').style('fill', color).style('font-family', 'var(--font-mono, monospace)');
      });
    },
    [meshData, width, height, showCrossSection, fluxColorScale, divColorScale, azimuth, elevation],
  );

  return (
    <div ref={containerRef} className="my-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600 dark:text-slate-400">Volume:</span>
          <select
            value={volumeIdx}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setVolumeIdx(Number(e.target.value))}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {volumePresets.map((v, i) => (
              <option key={v.name} value={i}>{v.label}</option>
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
              <option key={f.name} value={i}>{f.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600 dark:text-slate-400">Resolution:</span>
          <input
            type="range"
            min={4}
            max={20}
            step={2}
            value={meshRes}
            onChange={(e) => setMeshRes(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-xs text-slate-500">{meshRes}</span>
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={showCrossSection}
            onChange={(e) => setShowCrossSection(e.target.checked)}
            className="rounded"
          />
          <span className="text-slate-600 dark:text-slate-400">Cross-section</span>
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

      <div className="mt-3 grid grid-cols-1 gap-2 rounded bg-slate-50 p-3 text-sm dark:bg-slate-800 sm:grid-cols-3">
        <div>
          <span className="font-medium text-slate-600 dark:text-slate-400">Surface flux </span>
          <span className="font-mono text-slate-900 dark:text-slate-100">
            ∬<sub>S</sub> F·dS ≈ {surfaceFlux.toFixed(4)}
          </span>
        </div>
        <div>
          <span className="font-medium text-slate-600 dark:text-slate-400">Volume integral </span>
          <span className="font-mono text-slate-900 dark:text-slate-100">
            ∭<sub>E</sub> ∇·F dV ≈ {volumeDiv.toFixed(4)}
          </span>
        </div>
        <div>
          <span className="font-medium text-slate-600 dark:text-slate-400">Difference </span>
          <span className="font-mono text-slate-900 dark:text-slate-100">
            {Math.abs(surfaceFlux - volumeDiv).toFixed(4)}
          </span>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-slate-500">
        Divergence theorem: ∬<sub>S</sub> F·dS = ∭<sub>E</sub> ∇·F dV. Drag to rotate.
      </p>
    </div>
  );
}
