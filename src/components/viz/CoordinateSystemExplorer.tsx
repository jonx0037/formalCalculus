import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { COORDINATE_SYSTEM_3D_PRESETS } from '../../data/change-of-variables-data';
import { project3D } from './shared/multivariate';

const margin = { top: 10, right: 10, bottom: 30, left: 10 };

export default function CoordinateSystemExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.7, 520);

  const [systemIdx, setSystemIdx] = useState(1); // start on spherical
  const [p1, setP1] = useState(1.0);
  const [p2, setP2] = useState(Math.PI / 3);
  const [p3, setP3] = useState(Math.PI / 4);
  const [azimuth, setAzimuth] = useState(-0.5);
  const [elevation, setElevation] = useState(0.45);
  const [showSurfaces, setShowSurfaces] = useState(true);
  const [showVolElement, setShowVolElement] = useState(true);

  const preset = COORDINATE_SYSTEM_3D_PRESETS[systemIdx];

  const handleSystemChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSystemIdx(idx);
    const p = COORDINATE_SYSTEM_3D_PRESETS[idx];
    setP1((p.paramRanges.p1[0] + p.paramRanges.p1[1]) / 2);
    setP2((p.paramRanges.p2[0] + p.paramRanges.p2[1]) / 2);
    setP3((p.paramRanges.p3[0] + p.paramRanges.p3[1]) / 2);
  }, []);

  // Generate wireframe lines for coordinate surfaces
  const wireframeData = useMemo(() => {
    const lines: Array<{ from: [number, number]; to: [number, number]; depth: number; type: string }> = [];
    const nLines = 12;
    const nPts = 20;

    if (!showSurfaces) return lines;

    const { paramRanges } = preset;

    // Surface of constant p1 (constant r or ρ)
    for (let j = 0; j <= nLines; j++) {
      const t2 = paramRanges.p2[0] + (j / nLines) * (paramRanges.p2[1] - paramRanges.p2[0]);
      for (let k = 0; k < nPts; k++) {
        const t3a = paramRanges.p3[0] + (k / nPts) * (paramRanges.p3[1] - paramRanges.p3[0]);
        const t3b = paramRanges.p3[0] + ((k + 1) / nPts) * (paramRanges.p3[1] - paramRanges.p3[0]);
        const [x1, y1, z1] = preset.phi(p1, t2, t3a);
        const [x2, y2, z2] = preset.phi(p1, t2, t3b);
        const from = project3D(x1, y1, z1, azimuth, elevation);
        const to = project3D(x2, y2, z2, azimuth, elevation);
        lines.push({ from, to, depth: (z1 + z2) / 2, type: 'p1' });
      }
    }

    // Surface of constant p2 (constant θ)
    for (let k = 0; k <= nLines; k++) {
      const t3 = paramRanges.p3[0] + (k / nLines) * (paramRanges.p3[1] - paramRanges.p3[0]);
      for (let i = 0; i < nPts; i++) {
        const t1a = paramRanges.p1[0] + (i / nPts) * (paramRanges.p1[1] - paramRanges.p1[0]);
        const t1b = paramRanges.p1[0] + ((i + 1) / nPts) * (paramRanges.p1[1] - paramRanges.p1[0]);
        const [x1, y1, z1] = preset.phi(t1a, p2, t3);
        const [x2, y2, z2] = preset.phi(t1b, p2, t3);
        const from = project3D(x1, y1, z1, azimuth, elevation);
        const to = project3D(x2, y2, z2, azimuth, elevation);
        lines.push({ from, to, depth: (z1 + z2) / 2, type: 'p2' });
      }
    }

    // Surface of constant p3 (constant z or φ)
    for (let i = 0; i <= nLines; i++) {
      const t1 = paramRanges.p1[0] + (i / nLines) * (paramRanges.p1[1] - paramRanges.p1[0]);
      for (let j = 0; j < nPts; j++) {
        const t2a = paramRanges.p2[0] + (j / nPts) * (paramRanges.p2[1] - paramRanges.p2[0]);
        const t2b = paramRanges.p2[0] + ((j + 1) / nPts) * (paramRanges.p2[1] - paramRanges.p2[0]);
        const [x1, y1, z1] = preset.phi(t1, t2a, p3);
        const [x2, y2, z2] = preset.phi(t1, t2b, p3);
        const from = project3D(x1, y1, z1, azimuth, elevation);
        const to = project3D(x2, y2, z2, azimuth, elevation);
        lines.push({ from, to, depth: (z1 + z2) / 2, type: 'p3' });
      }
    }

    // Sort back-to-front for proper depth ordering
    lines.sort((a, b) => a.depth - b.depth);
    return lines;
  }, [systemIdx, p1, p2, p3, azimuth, elevation, showSurfaces]);

  // Volume element box at the selected point
  const volElementData = useMemo(() => {
    if (!showVolElement) return null;
    const dp = 0.15;
    const corners3D: [number, number, number][] = [];

    // 8 corners of the volume element
    for (const d1 of [-dp, dp]) {
      for (const d2 of [-dp, dp]) {
        for (const d3 of [-dp, dp]) {
          corners3D.push(preset.phi(p1 + d1, p2 + d2, p3 + d3));
        }
      }
    }

    // Project and return edges (12 edges of a cuboid)
    const projected = corners3D.map(([x, y, z]) => project3D(x, y, z, azimuth, elevation));
    const edges: [number, number][] = [
      [0, 1], [2, 3], [4, 5], [6, 7], // along p3
      [0, 2], [1, 3], [4, 6], [5, 7], // along p2
      [0, 4], [1, 5], [2, 6], [3, 7], // along p1
    ];

    return { projected, edges };
  }, [systemIdx, p1, p2, p3, azimuth, elevation, showVolElement]);

  // The selected point
  const selectedPoint = useMemo(() => {
    const [x, y, z] = preset.phi(p1, p2, p3);
    return project3D(x, y, z, azimuth, elevation);
  }, [systemIdx, p1, p2, p3, azimuth, elevation]);

  const detJVal = preset.detJ(p1, p2, p3);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      if (width < 100) return;
      svg.selectAll('*').remove();

      const iw = width - margin.left - margin.right;
      const ih = totalHeight - margin.top - margin.bottom;

      const g = svg.append('g').attr('transform', `translate(${margin.left + iw / 2},${margin.top + ih / 2})`);

      // Scale to fit
      const allPts = wireframeData.flatMap(l => [l.from, l.to]);
      if (selectedPoint) allPts.push(selectedPoint);
      if (allPts.length === 0) return;

      let maxExtent = 0;
      for (const pt of allPts) {
        maxExtent = Math.max(maxExtent, Math.abs(pt[0]), Math.abs(pt[1]));
      }
      const scale = Math.min(iw, ih) / (2 * (maxExtent + 0.5));

      // Draw axes
      const axisLen = 2.2;
      const axes = [
        { dir: [1, 0, 0] as [number, number, number], label: 'x', color: '#94A3B8' },
        { dir: [0, 1, 0] as [number, number, number], label: 'y', color: '#94A3B8' },
        { dir: [0, 0, 1] as [number, number, number], label: 'z', color: '#94A3B8' },
      ];
      for (const axis of axes) {
        const [sx, sy] = project3D(axis.dir[0] * axisLen, axis.dir[1] * axisLen, axis.dir[2] * axisLen, azimuth, elevation);
        g.append('line')
          .attr('x1', 0).attr('y1', 0)
          .attr('x2', sx * scale).attr('y2', -sy * scale)
          .style('stroke', axis.color).style('stroke-width', 1).style('stroke-dasharray', '3,3');
        g.append('text')
          .attr('x', sx * scale + 5).attr('y', -sy * scale + 4)
          .style('font-size', '11px').style('fill', axis.color)
          .text(axis.label);
      }

      // Surface type colors
      const surfaceColors: Record<string, string> = {
        p1: '#DC2626',  // constant r/ρ — red
        p2: '#2563EB',  // constant θ — blue
        p3: '#059669',  // constant z/φ — green
      };

      // Draw wireframe lines
      for (const line of wireframeData) {
        g.append('line')
          .attr('x1', line.from[0] * scale).attr('y1', -line.from[1] * scale)
          .attr('x2', line.to[0] * scale).attr('y2', -line.to[1] * scale)
          .style('stroke', surfaceColors[line.type] || '#94A3B8')
          .style('stroke-width', 0.8)
          .style('opacity', 0.6);
      }

      // Draw volume element box
      if (volElementData) {
        for (const [i, j] of volElementData.edges) {
          const a = volElementData.projected[i];
          const b = volElementData.projected[j];
          g.append('line')
            .attr('x1', a[0] * scale).attr('y1', -a[1] * scale)
            .attr('x2', b[0] * scale).attr('y2', -b[1] * scale)
            .style('stroke', '#F59E0B')
            .style('stroke-width', 2)
            .style('opacity', 0.8);
        }
      }

      // Draw selected point
      g.append('circle')
        .attr('cx', selectedPoint[0] * scale)
        .attr('cy', -selectedPoint[1] * scale)
        .attr('r', 5)
        .style('fill', '#F59E0B').style('stroke', '#fff').style('stroke-width', 1.5);
    },
    [width, totalHeight, wireframeData, volElementData, selectedPoint, azimuth, elevation],
  );

  return (
    <div ref={containerRef} className="viz-container">
      <div className="viz-controls">
        <label>
          System:{' '}
          <select value={systemIdx} onChange={handleSystemChange}>
            {COORDINATE_SYSTEM_3D_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <label>
          {preset.paramLabels[0]}:{' '}
          <input type="range" min={preset.paramRanges.p1[0]} max={preset.paramRanges.p1[1]} step={0.05} value={p1}
            onChange={(e) => setP1(Number(e.target.value))} />
          <span className="viz-value">{p1.toFixed(2)}</span>
        </label>
        <label>
          {preset.paramLabels[1]}:{' '}
          <input type="range" min={preset.paramRanges.p2[0]} max={preset.paramRanges.p2[1]} step={0.05} value={p2}
            onChange={(e) => setP2(Number(e.target.value))} />
          <span className="viz-value">{p2.toFixed(2)}</span>
        </label>
        <label>
          {preset.paramLabels[2]}:{' '}
          <input type="range" min={preset.paramRanges.p3[0]} max={preset.paramRanges.p3[1]} step={0.05} value={p3}
            onChange={(e) => setP3(Number(e.target.value))} />
          <span className="viz-value">{p3.toFixed(2)}</span>
        </label>
      </div>

      <div className="viz-controls">
        <label>
          Azimuth:{' '}
          <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={azimuth}
            onChange={(e) => setAzimuth(Number(e.target.value))} />
        </label>
        <label>
          Elevation:{' '}
          <input type="range" min={0.1} max={1.4} step={0.05} value={elevation}
            onChange={(e) => setElevation(Number(e.target.value))} />
        </label>
        <label>
          <input type="checkbox" checked={showSurfaces} onChange={(e) => setShowSurfaces(e.target.checked)} />
          {' '}Coordinate surfaces
        </label>
        <label>
          <input type="checkbox" checked={showVolElement} onChange={(e) => setShowVolElement(e.target.checked)} />
          {' '}Volume element
        </label>
      </div>

      <svg ref={svgRef} width={width} height={totalHeight} />

      <div className="viz-readout">
        <p>
          ({preset.paramLabels[0]}, {preset.paramLabels[1]}, {preset.paramLabels[2]}) =
          ({p1.toFixed(2)}, {p2.toFixed(2)}, {p3.toFixed(2)})
          {' '}|{' '}|det J| = <strong>{detJVal.toFixed(4)}</strong>
        </p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          <span style={{ color: '#DC2626' }}>■</span> const-{preset.paramLabels[0]}{' '}
          <span style={{ color: '#2563EB' }}>■</span> const-{preset.paramLabels[1]}{' '}
          <span style={{ color: '#059669' }}>■</span> const-{preset.paramLabels[2]}
          {showVolElement && <>{' '}<span style={{ color: '#F59E0B' }}>■</span> volume element</>}
        </p>
      </div>
    </div>
  );
}
