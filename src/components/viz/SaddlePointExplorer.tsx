import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { HESSIAN_SURFACE_PRESETS } from '../../data/hessian-data';
import { generateWireframe, project3D, eigenvalues2x2 } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 16, bottom: 20, left: 16 };
/** Step size for gradient flow trajectory integration */
const TRAJECTORY_STEP_SIZE = 0.01;
/** Distance to perturb from saddle point along negative curvature direction */
const SADDLE_PERTURBATION_SCALE = 0.05;

export default function SaddlePointExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.6, 480);

  const [selectedIdx, setSelectedIdx] = useState(2); // multi-critical by default
  const [viewAngle, setViewAngle] = useState(35);
  const [selectedCP, setSelectedCP] = useState(0);
  const [showTrajectory, setShowTrajectory] = useState(false);

  const preset = HESSIAN_SURFACE_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setSelectedCP(0);
    setShowTrajectory(false);
  }, []);

  // Wireframe data
  const wireframe = useMemo(
    () => generateWireframe(
      (x, y) => preset.f(x, y),
      preset.xDomain,
      preset.yDomain,
      40,
    ),
    [selectedIdx],
  );

  // Gradient flow trajectory from selected critical point
  const trajectory = useMemo(() => {
    if (!showTrajectory || preset.criticalPoints.length === 0) return null;
    const cp = preset.criticalPoints[selectedCP];
    if (!cp || cp.type !== 'saddle') return null;

    // Find the negative eigenvalue direction
    const H = preset.hessian(cp.point[0], cp.point[1]);
    const { eigenvalues, eigenvectors } = eigenvalues2x2(H);
    const negIdx = eigenvalues[0] < eigenvalues[1] ? 0 : 1;
    const dir = eigenvectors[negIdx];

    // Perturb slightly along the negative curvature direction and flow downhill
    const eta = TRAJECTORY_STEP_SIZE;
    const steps = 200;
    const points: Array<[number, number, number]> = [];
    let x = cp.point[0] + dir[0] * SADDLE_PERTURBATION_SCALE;
    let y = cp.point[1] + dir[1] * SADDLE_PERTURBATION_SCALE;

    for (let k = 0; k < steps; k++) {
      const z = preset.f(x, y);
      points.push([x, y, z]);
      const g = preset.grad(x, y);
      x -= eta * g[0];
      y -= eta * g[1];
      // Stop if out of domain
      if (x < preset.xDomain[0] || x > preset.xDomain[1] ||
          y < preset.yDomain[0] || y > preset.yDomain[1]) break;
    }
    return points;
  }, [selectedIdx, selectedCP, showTrajectory]);

  // Selected critical point info
  const cpInfo = useMemo(() => {
    if (preset.criticalPoints.length === 0) return null;
    const cp = preset.criticalPoints[selectedCP];
    if (!cp) return null;
    const H = preset.hessian(cp.point[0], cp.point[1]);
    const { eigenvalues, eigenvectors } = eigenvalues2x2(H);
    return { ...cp, H, eigenvalues, eigenvectors };
  }, [selectedIdx, selectedCP]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || totalHeight <= 0) return;

      const panelW = width - margin.left - margin.right;
      const panelH = totalHeight - margin.top - margin.bottom;
      if (panelW <= 0 || panelH <= 0) return;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Project wireframe to 2D
      const angleRad = (viewAngle * Math.PI) / 180;
      const { xGrid, yGrid, zValues } = wireframe;

      // Project all grid points
      const projected: Array<Array<{ sx: number; sy: number; z: number }>> = [];
      let sxMin = Infinity, sxMax = -Infinity, syMin = Infinity, syMax = -Infinity;

      for (let i = 0; i < xGrid.length; i++) {
        projected[i] = [];
        for (let j = 0; j < yGrid.length; j++) {
          const z = zValues[i][j];
          const [sx, sy] = project3D(xGrid[i], yGrid[j], z, angleRad, 0.6);
          projected[i][j] = { sx, sy, z };
          if (isFinite(sx) && isFinite(sy)) {
            sxMin = Math.min(sxMin, sx);
            sxMax = Math.max(sxMax, sx);
            syMin = Math.min(syMin, sy);
            syMax = Math.max(syMax, sy);
          }
        }
      }

      if (!isFinite(sxMin)) return;

      const xScale = d3.scaleLinear().domain([sxMin, sxMax]).range([0, panelW]);
      const yScale = d3.scaleLinear().domain([syMin, syMax]).range([panelH, 0]);

      // z color scale
      const flatZ = zValues.flat().filter(isFinite);
      const zExtent = d3.extent(flatZ) as [number, number];
      const zColor = d3.scaleSequential(d3.interpolateViridis).domain(zExtent);

      // Draw wireframe — constant-x lines
      for (let i = 0; i < xGrid.length; i++) {
        for (let j = 0; j < yGrid.length - 1; j++) {
          const a = projected[i][j];
          const b = projected[i][j + 1];
          if (!isFinite(a.sx) || !isFinite(b.sx)) continue;
          g.append('line')
            .attr('x1', xScale(a.sx)).attr('y1', yScale(a.sy))
            .attr('x2', xScale(b.sx)).attr('y2', yScale(b.sy))
            .attr('stroke', zColor((a.z + b.z) / 2))
            .attr('stroke-width', 0.8)
            .attr('opacity', 0.5);
        }
      }
      // Constant-y lines
      for (let j = 0; j < yGrid.length; j++) {
        for (let i = 0; i < xGrid.length - 1; i++) {
          const a = projected[i][j];
          const b = projected[i + 1][j];
          if (!isFinite(a.sx) || !isFinite(b.sx)) continue;
          g.append('line')
            .attr('x1', xScale(a.sx)).attr('y1', yScale(a.sy))
            .attr('x2', xScale(b.sx)).attr('y2', yScale(b.sy))
            .attr('stroke', zColor((a.z + b.z) / 2))
            .attr('stroke-width', 0.8)
            .attr('opacity', 0.5);
        }
      }

      // Helper: project a 3D point to screen coordinates
      const toScreen = (wx: number, wy: number, wz: number): [number, number] => {
        const [sx, sy] = project3D(wx, wy, wz, angleRad, 0.6);
        return [xScale(sx), yScale(sy)];
      };

      // Draw critical points
      preset.criticalPoints.forEach((cp, i) => {
        const z = preset.f(cp.point[0], cp.point[1]);
        const [cx, cy] = toScreen(cp.point[0], cp.point[1], z);
        const color = cp.type === 'local-min' ? '#059669'
          : cp.type === 'local-max' ? '#DC2626'
          : cp.type === 'saddle' ? '#D97706'
          : '#6B7280';
        const isSelected = i === selectedCP;
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', isSelected ? 7 : 5)
          .attr('fill', color)
          .attr('stroke', isSelected ? '#fff' : 'none')
          .attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('click', () => setSelectedCP(i));
      });

      // Draw eigenvector directions at selected CP
      if (cpInfo && (cpInfo.type === 'saddle' || cpInfo.type === 'local-min' || cpInfo.type === 'local-max')) {
        const z = preset.f(cpInfo.point[0], cpInfo.point[1]);
        for (let k = 0; k < 2; k++) {
          const lam = cpInfo.eigenvalues[k];
          const [vx, vy] = cpInfo.eigenvectors[k];
          const color = lam > 1e-8 ? functionColors[0] : lam < -1e-8 ? '#DC2626' : '#6B7280';
          const sc = 0.5;
          for (const sign of [-1, 1]) {
            const ex = cpInfo.point[0] + sign * vx * sc;
            const ey = cpInfo.point[1] + sign * vy * sc;
            const ez = preset.f(ex, ey);
            const [s1x, s1y] = toScreen(cpInfo.point[0], cpInfo.point[1], z);
            const [s2x, s2y] = toScreen(ex, ey, ez);
            g.append('line')
              .attr('x1', s1x).attr('y1', s1y)
              .attr('x2', s2x).attr('y2', s2y)
              .attr('stroke', color)
              .attr('stroke-width', 2.5)
              .attr('opacity', 0.9);
          }
        }
      }

      // Draw trajectory
      if (trajectory && trajectory.length > 1) {
        for (let i = 0; i < trajectory.length - 1; i++) {
          const [x1, y1, z1] = trajectory[i];
          const [x2, y2, z2] = trajectory[i + 1];
          const [s1x, s1y] = toScreen(x1, y1, z1);
          const [s2x, s2y] = toScreen(x2, y2, z2);
          g.append('line')
            .attr('x1', s1x).attr('y1', s1y)
            .attr('x2', s2x).attr('y2', s2y)
            .attr('stroke', '#F59E0B')
            .attr('stroke-width', 2)
            .attr('opacity', Math.max(0.2, 1 - i / trajectory.length));
        }
      }
    },
    [width, totalHeight, selectedIdx, viewAngle, selectedCP, cpInfo, trajectory, wireframe],
  );

  const fmt = (n: number) => Math.abs(n) < 0.01 && n !== 0 ? n.toExponential(2) : n.toFixed(3);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center', fontSize: '0.85rem' }}>
        <label>
          Surface:{' '}
          <select value={selectedIdx} onChange={handlePresetChange} style={{ fontSize: '0.85rem' }}>
            {HESSIAN_SURFACE_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          View angle:
          <input
            type="range" min={10} max={70} value={viewAngle}
            onChange={(e) => setViewAngle(Number(e.target.value))}
            style={{ width: '80px' }}
          />
          {viewAngle}°
        </label>
        {cpInfo?.type === 'saddle' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input type="checkbox" checked={showTrajectory} onChange={() => setShowTrajectory(!showTrajectory)} />
            Show trajectory
          </label>
        )}
      </div>

      <svg ref={svgRef} style={{ width: '100%', height: totalHeight }} />

      {cpInfo && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.75rem',
          background: 'var(--color-bg-secondary, #F9FAFB)',
          borderRadius: '0.5rem',
          fontSize: '0.8rem',
          fontFamily: 'monospace',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.5rem',
        }}>
          <div>
            <strong>Critical point:</strong> ({fmt(cpInfo.point[0])}, {fmt(cpInfo.point[1])})
          </div>
          <div>
            <strong>Type:</strong>{' '}
            <span style={{
              color: cpInfo.type === 'local-min' ? '#059669'
                : cpInfo.type === 'local-max' ? '#DC2626'
                : cpInfo.type === 'saddle' ? '#D97706'
                : '#6B7280',
              fontWeight: 'bold',
            }}>
              {cpInfo.type}
            </span>
          </div>
          <div>
            <strong>λ₁ = {fmt(cpInfo.eigenvalues[0])}</strong>,{' '}
            <strong>λ₂ = {fmt(cpInfo.eigenvalues[1])}</strong>
          </div>
          <div>
            <strong>H:</strong> [{fmt(cpInfo.H[0][0])}, {fmt(cpInfo.H[0][1])}; {fmt(cpInfo.H[1][0])}, {fmt(cpInfo.H[1][1])}]
          </div>
        </div>
      )}
    </div>
  );
}
