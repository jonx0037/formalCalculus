import { useState, useMemo, useCallback, useRef, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  project3D,
  surfaceNormal,
  curl3D,
  surfaceIntegralFlux,
} from './shared/multivariate';
import { stokesSurfacePresets, stokesFieldPresets } from '../../data/surface-integrals-data';

const margin = { top: 10, right: 10, bottom: 10, left: 10 };

export default function StokesTheoremExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 400);

  const [surfaceIdx, setSurfaceIdx] = useState(0); // hemisphere
  const [fieldIdx, setFieldIdx] = useState(0); // rotation
  const [azimuth, setAzimuth] = useState(-0.5);
  const [elevation, setElevation] = useState(0.45);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showCurlHeatmap, setShowCurlHeatmap] = useState(true);

  const animRef = useRef<number>(0);
  const dragRef = useRef<{ startX: number; startY: number; startAz: number; startEl: number } | null>(null);

  const surface = stokesSurfacePresets[surfaceIdx];
  const field = stokesFieldPresets[fieldIdx];
  const nGrid = 16;

  // Animation
  useEffect(() => {
    if (!playing) return;
    let lastTime = performance.now();
    const step = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      setProgress((p) => {
        const next = p + dt * 0.3;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  // Determine if we need to flip the normal for Stokes' orientation.
  // For Stokes' theorem with CCW boundary, the normal should point "upward"
  // (right-hand rule). Check by sampling the normal at the center of the domain.
  const orientationSign = useMemo(() => {
    const { u: uDom, v: vDom } = surface.paramDomain;
    const uMid = (uDom[0] + uDom[1]) / 2;
    const vMid = (vDom[0] + vDom[1]) / 2;
    const ru = surface.r_u(uMid, vMid);
    const rv = surface.r_v(uMid, vMid);
    const { unitNormal } = surfaceNormal(ru, rv);
    // For surfaces with boundary in the xy-plane, the right-hand rule
    // with CCW boundary means n̂ should have positive z-component
    return unitNormal[2] >= 0 ? 1 : -1;
  }, [surface]);

  // Compute curl flux through surface (right side of Stokes')
  const curlFlux = useMemo(() => {
    const curlField = (x: number, y: number, z: number): [number, number, number] =>
      curl3D(field.F, x, y, z);
    const rawFlux = surfaceIntegralFlux(
      curlField,
      surface.r,
      surface.r_u,
      surface.r_v,
      surface.paramDomain.u,
      surface.paramDomain.v,
    );
    return rawFlux * orientationSign;
  }, [field, surface, orientationSign]);

  // Compute line integral around boundary (left side of Stokes')
  const lineIntegral = useMemo(() => {
    if (!surface.boundary) return 0;
    const { r: br, rPrime: brP, domain: bDom } = surface.boundary;
    const nPts = 200;
    const dt = (bDom[1] - bDom[0]) / nPts;
    let total = 0;
    for (let i = 0; i < nPts; i++) {
      const t = bDom[0] + (i + 0.5) * dt;
      const pos = br(t);
      const vel = brP(t);
      const fVec = field.F(pos[0], pos[1], pos[2]);
      total += (fVec[0] * vel[0] + fVec[1] * vel[1] + fVec[2] * vel[2]) * dt;
    }
    return total;
  }, [field, surface]);

  // Partial line integral for animation
  const partialLineIntegral = useMemo(() => {
    if (!surface.boundary || progress === 0) return 0;
    const { r: br, rPrime: brP, domain: bDom } = surface.boundary;
    const nPts = Math.max(1, Math.round(200 * progress));
    const tEnd = bDom[0] + progress * (bDom[1] - bDom[0]);
    const dt = (tEnd - bDom[0]) / nPts;
    let total = 0;
    for (let i = 0; i < nPts; i++) {
      const t = bDom[0] + (i + 0.5) * dt;
      const pos = br(t);
      const vel = brP(t);
      const fVec = field.F(pos[0], pos[1], pos[2]);
      total += (fVec[0] * vel[0] + fVec[1] * vel[1] + fVec[2] * vel[2]) * dt;
    }
    return total;
  }, [field, surface, progress]);

  // Surface mesh data
  const meshData = useMemo(() => {
    const { u: uDom, v: vDom } = surface.paramDomain;
    const du = (uDom[1] - uDom[0]) / nGrid;
    const dv = (vDom[1] - vDom[0]) / nGrid;

    const faces: { corners: [number, number][]; depth: number; curlDotN: number }[] = [];

    for (let i = 0; i < nGrid; i++) {
      for (let j = 0; j < nGrid; j++) {
        const corners3D: [number, number, number][] = [];
        for (const [di, dj] of [[0, 0], [1, 0], [1, 1], [0, 1]] as const) {
          const u = uDom[0] + (i + di) * du;
          const v = vDom[0] + (j + dj) * dv;
          corners3D.push(surface.r(u, v));
        }

        const center: [number, number, number] = [
          corners3D.reduce((s, c) => s + c[0], 0) / 4,
          corners3D.reduce((s, c) => s + c[1], 0) / 4,
          corners3D.reduce((s, c) => s + c[2], 0) / 4,
        ];

        const uMid = uDom[0] + (i + 0.5) * du;
        const vMid = vDom[0] + (j + 0.5) * dv;
        const ru = surface.r_u(uMid, vMid);
        const rv = surface.r_v(uMid, vMid);
        const { unitNormal } = surfaceNormal(ru, rv);

        const curlF = curl3D(field.F, center[0], center[1], center[2]);
        const curlDotN = (curlF[0] * unitNormal[0] + curlF[1] * unitNormal[1] + curlF[2] * unitNormal[2]) * orientationSign;

        const projCorners = corners3D.map(
          (c) => project3D(c[0], c[1], c[2], azimuth, elevation) as [number, number],
        );

        const depth = corners3D.reduce(
          (s, c) => s + c[0] * Math.sin(azimuth) + c[1] * Math.cos(azimuth),
          0,
        );

        faces.push({ corners: projCorners, depth, curlDotN });
      }
    }

    faces.sort((a, b) => a.depth - b.depth);

    // Boundary curve points
    const boundaryCurve: [number, number][] = [];
    if (surface.boundary) {
      const { r: br, domain: bDom } = surface.boundary;
      const nPts = 100;
      for (let i = 0; i <= nPts; i++) {
        const t = bDom[0] + (i / nPts) * (bDom[1] - bDom[0]);
        const pos = br(t);
        boundaryCurve.push(project3D(pos[0], pos[1], pos[2], azimuth, elevation));
      }
    }

    // Animated particle position
    let particlePos: [number, number] | null = null;
    if (surface.boundary && progress > 0) {
      const { r: br, domain: bDom } = surface.boundary;
      const t = bDom[0] + progress * (bDom[1] - bDom[0]);
      const pos = br(t);
      particlePos = project3D(pos[0], pos[1], pos[2], azimuth, elevation);
    }

    return { faces, boundaryCurve, particlePos };
  }, [surface, field, azimuth, elevation, nGrid, progress, orientationSign]);

  const curlColorScale = useMemo(() => {
    const maxAbs = Math.max(1e-6, ...meshData.faces.map((f) => Math.abs(f.curlDotN)));
    return d3.scaleDiverging<string>(d3.interpolateRdYlGn).domain([-maxAbs, 0, maxAbs]);
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

      const scale = Math.min(plotW, plotH) * 0.4;

      // Draw surface faces
      meshData.faces.forEach((face) => {
        const points = face.corners.map(([px, py]) => `${px * scale},${-py * scale}`).join(' ');
        g.append('polygon')
          .attr('points', points)
          .style('fill', showCurlHeatmap ? curlColorScale(face.curlDotN) : '#e2e8f0')
          .style('fill-opacity', showCurlHeatmap ? 0.8 : 0.3)
          .style('stroke', '#475569')
          .style('stroke-width', 0.3)
          .style('stroke-opacity', 0.4);
      });

      // Draw boundary curve
      if (meshData.boundaryCurve.length > 1) {
        const line = d3.line<[number, number]>()
          .x(([px]) => px * scale)
          .y(([, py]) => -py * scale);
        g.append('path')
          .datum(meshData.boundaryCurve)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', '#2563EB')
          .style('stroke-width', 2.5)
          .style('stroke-opacity', 0.9);

        // Traversed portion
        if (progress > 0) {
          const traversedPts = meshData.boundaryCurve.slice(
            0,
            Math.max(2, Math.round(progress * meshData.boundaryCurve.length)),
          );
          g.append('path')
            .datum(traversedPts)
            .attr('d', line)
            .style('fill', 'none')
            .style('stroke', '#f59e0b')
            .style('stroke-width', 3.5)
            .style('stroke-opacity', 0.9);
        }
      }

      // Draw particle
      if (meshData.particlePos) {
        g.append('circle')
          .attr('cx', meshData.particlePos[0] * scale)
          .attr('cy', -meshData.particlePos[1] * scale)
          .attr('r', 5)
          .style('fill', '#f59e0b')
          .style('stroke', '#fff')
          .style('stroke-width', 2);
      }

      // Axes
      const axisLen = 1.4;
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
    [meshData, width, height, showCurlHeatmap, curlColorScale, azimuth, elevation, progress],
  );

  return (
    <div ref={containerRef} className="my-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600 dark:text-slate-400">Surface:</span>
          <select
            value={surfaceIdx}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              setSurfaceIdx(Number(e.target.value));
              setProgress(0);
              setPlaying(false);
            }}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {stokesSurfacePresets.map((s, i) => (
              <option key={s.name} value={i}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600 dark:text-slate-400">Field:</span>
          <select
            value={fieldIdx}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              setFieldIdx(Number(e.target.value));
              setProgress(0);
              setPlaying(false);
            }}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {stokesFieldPresets.map((f, i) => (
              <option key={f.name} value={i}>{f.label}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() => {
            if (progress >= 1) setProgress(0);
            setPlaying(!playing);
          }}
          className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
        >
          {playing ? 'Pause' : progress >= 1 ? 'Replay' : 'Animate'}
        </button>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={showCurlHeatmap}
            onChange={(e) => setShowCurlHeatmap(e.target.checked)}
            className="rounded"
          />
          <span className="text-slate-600 dark:text-slate-400">Curl heatmap</span>
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
          <span className="font-medium text-slate-600 dark:text-slate-400">Line integral </span>
          <span className="font-mono text-slate-900 dark:text-slate-100">
            ∮<sub>C</sub> F·dr ≈ {(progress >= 1 ? lineIntegral : partialLineIntegral).toFixed(4)}
          </span>
        </div>
        <div>
          <span className="font-medium text-slate-600 dark:text-slate-400">Curl flux </span>
          <span className="font-mono text-slate-900 dark:text-slate-100">
            ∬<sub>S</sub> (∇×F)·dS ≈ {curlFlux.toFixed(4)}
          </span>
        </div>
        <div>
          <span className="font-medium text-slate-600 dark:text-slate-400">Difference </span>
          <span className="font-mono text-slate-900 dark:text-slate-100">
            {Math.abs(lineIntegral - curlFlux).toFixed(6)}
          </span>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-slate-500">
        Stokes' theorem: ∮<sub>C</sub> F·dr = ∬<sub>S</sub> (∇×F)·dS. Drag to rotate.
      </p>
    </div>
  );
}
