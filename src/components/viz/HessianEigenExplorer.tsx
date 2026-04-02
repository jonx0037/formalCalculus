import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { HESSIAN_SURFACE_PRESETS } from '../../data/hessian-data';
import { generateContours, eigenvalues2x2, quadraticForm } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 16, bottom: 36, left: 42 };
const GAP = 24;
/** Tolerance for classifying eigenvalues as positive/negative vs zero */
const DEFINITENESS_TOL = 1e-8;
/** Tolerance for detecting singular matrices when computing condition number */
const SINGULARITY_TOL = 1e-14;

export default function HessianEigenExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.55, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [probePoint, setProbePoint] = useState<[number, number]>([0, 0]);
  const [showEigenvectors, setShowEigenvectors] = useState(true);
  const [showQuadForm, setShowQuadForm] = useState(true);

  const preset = HESSIAN_SURFACE_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setProbePoint([0, 0]);
  }, []);

  // Contour data
  const contours = useMemo(
    () => generateContours(
      (x, y) => preset.f(x, y),
      preset.xDomain,
      preset.yDomain,
      15,
      60,
    ),
    [selectedIdx],
  );

  // Hessian analysis at probe point
  const hessianInfo = useMemo(() => {
    const [px, py] = probePoint;
    const H = preset.hessian(px, py);
    const { eigenvalues, eigenvectors } = eigenvalues2x2(H);
    const det = H[0][0] * H[1][1] - H[0][1] * H[1][0];
    const trace = H[0][0] + H[1][1];
    const kappa = Math.min(...eigenvalues.map(Math.abs)) < SINGULARITY_TOL
      ? Infinity
      : Math.max(...eigenvalues.map(Math.abs)) / Math.min(...eigenvalues.map(Math.abs));

    let classification: string;
    if (eigenvalues[0] > DEFINITENESS_TOL && eigenvalues[1] > DEFINITENESS_TOL) classification = 'Positive definite (local min)';
    else if (eigenvalues[0] < -DEFINITENESS_TOL && eigenvalues[1] < -DEFINITENESS_TOL) classification = 'Negative definite (local max)';
    else if (eigenvalues[0] < -DEFINITENESS_TOL && eigenvalues[1] > DEFINITENESS_TOL) classification = 'Indefinite (saddle)';
    else classification = 'Semidefinite (inconclusive)';

    return { H, eigenvalues, eigenvectors, det, trace, kappa, classification };
  }, [selectedIdx, probePoint]);

  // Quadratic form grid for right panel
  const quadFormGrid = useMemo(() => {
    if (!showQuadForm) return null;
    const H = hessianInfo.H;
    const size = 2;
    const steps = 40;
    const points: Array<{ hx: number; hy: number; val: number }> = [];
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const hx = -size + (2 * size * i) / steps;
        const hy = -size + (2 * size * j) / steps;
        const val = quadraticForm(H, [hx, hy]);
        points.push({ hx, hy, val });
      }
    }
    return { points, size, steps };
  }, [hessianInfo, showQuadForm]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || totalHeight <= 0) return;

      const panels = showQuadForm ? 2 : 1;
      const panelW = (width - GAP * (panels - 1)) / panels - margin.left - margin.right;
      const panelH = totalHeight - margin.top - margin.bottom;
      if (panelW <= 0 || panelH <= 0) return;

      // ── Left panel: contour plot ──
      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain(preset.xDomain).range([0, panelW]);
      const yScale = d3.scaleLinear().domain(preset.yDomain).range([panelH, 0]);

      // Axes
      gLeft.append('g')
        .attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text').style('font-size', '10px');
      gLeft.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text').style('font-size', '10px');

      // Contour lines
      const colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
        .domain(d3.extent(contours, (c) => c.level) as [number, number]);

      for (const contour of contours) {
        const pts = contour.points;
        for (let k = 0; k < pts.length - 1; k += 2) {
          gLeft.append('line')
            .attr('x1', xScale(pts[k][0]))
            .attr('y1', yScale(pts[k][1]))
            .attr('x2', xScale(pts[k + 1][0]))
            .attr('y2', yScale(pts[k + 1][1]))
            .attr('stroke', colorScale(contour.level))
            .attr('stroke-width', 1)
            .attr('opacity', 0.6);
        }
      }

      // Critical points
      for (const cp of preset.criticalPoints) {
        const color = cp.type === 'local-min' ? '#059669'
          : cp.type === 'local-max' ? '#DC2626'
          : cp.type === 'saddle' ? '#D97706'
          : '#6B7280';
        gLeft.append('circle')
          .attr('cx', xScale(cp.point[0]))
          .attr('cy', yScale(cp.point[1]))
          .attr('r', 4)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5);
      }

      // Eigenvector arrows at probe point
      if (showEigenvectors) {
        const { eigenvalues, eigenvectors } = hessianInfo;
        const arrowScale = 0.3;
        for (let k = 0; k < 2; k++) {
          const lam = eigenvalues[k];
          const [vx, vy] = eigenvectors[k];
          const color = lam > DEFINITENESS_TOL ? functionColors[0] : lam < -DEFINITENESS_TOL ? '#DC2626' : '#6B7280';
          const len = Math.min(Math.abs(lam) * arrowScale, 1.5);
          // Draw bidirectional arrow
          for (const sign of [-1, 1]) {
            const dx = sign * vx * len;
            const dy = sign * vy * len;
            gLeft.append('line')
              .attr('x1', xScale(probePoint[0]))
              .attr('y1', yScale(probePoint[1]))
              .attr('x2', xScale(probePoint[0] + dx))
              .attr('y2', yScale(probePoint[1] + dy))
              .attr('stroke', color)
              .attr('stroke-width', 2.5)
              .attr('opacity', 0.85);
          }
        }
      }

      // Probe point marker (click the plot to reposition)
      gLeft.append('circle')
        .attr('cx', xScale(probePoint[0]))
        .attr('cy', yScale(probePoint[1]))
        .attr('r', 6)
        .attr('fill', functionColors[0])
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'crosshair');

      // Click handler on left panel
      gLeft.append('rect')
        .attr('width', panelW)
        .attr('height', panelH)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx, my] = d3.pointer(event);
          const x = xScale.invert(mx);
          const y = yScale.invert(my);
          setProbePoint([
            Math.max(preset.xDomain[0], Math.min(preset.xDomain[1], x)),
            Math.max(preset.yDomain[0], Math.min(preset.yDomain[1], y)),
          ]);
        });

      // Panel label
      gLeft.append('text')
        .attr('x', panelW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-secondary, #6B7280)')
        .text('Contour Plot — click to evaluate Hessian');

      // ── Right panel: quadratic form h^T H h ──
      if (showQuadForm && quadFormGrid) {
        const offsetX = panelW + margin.left + margin.right + GAP;
        const gRight = svg
          .append('g')
          .attr('transform', `translate(${offsetX + margin.left},${margin.top})`);

        const qfSize = quadFormGrid.size;
        const xScaleQ = d3.scaleLinear().domain([-qfSize, qfSize]).range([0, panelW]);
        const yScaleQ = d3.scaleLinear().domain([-qfSize, qfSize]).range([panelH, 0]);

        // Axes
        gRight.append('g')
          .attr('transform', `translate(0,${panelH})`)
          .call(d3.axisBottom(xScaleQ).ticks(5))
          .selectAll('text').style('font-size', '10px');
        gRight.append('g')
          .call(d3.axisLeft(yScaleQ).ticks(5))
          .selectAll('text').style('font-size', '10px');

        // Compute contour levels for the quadratic form
        const vals = quadFormGrid.points.map((p) => p.val);
        const vMin = Math.min(...vals);
        const vMax = Math.max(...vals);
        const range = Math.max(Math.abs(vMin), Math.abs(vMax), 0.1);
        const nLevels = 12;
        const levels: number[] = [];
        for (let i = 0; i <= nLevels; i++) {
          levels.push(-range + (2 * range * i) / nLevels);
        }

        const qColorScale = d3.scaleSequential(d3.interpolateRdBu)
          .domain([range, -range]);

        // Draw as a heatmap grid
        const cellW = panelW / quadFormGrid.steps;
        const cellH = panelH / quadFormGrid.steps;
        const steps = quadFormGrid.steps;
        for (let i = 0; i < steps; i++) {
          for (let j = 0; j < steps; j++) {
            const idx = i * (steps + 1) + j;
            const p = quadFormGrid.points[idx];
            if (!p) continue;
            gRight.append('rect')
              .attr('x', xScaleQ(-qfSize + (2 * qfSize * j) / steps))
              .attr('y', yScaleQ(-qfSize + (2 * qfSize * (i + 1)) / steps))
              .attr('width', cellW + 0.5)
              .attr('height', cellH + 0.5)
              .attr('fill', qColorScale(p.val))
              .attr('opacity', 0.7);
          }
        }

        // Zero contour (white line)
        gRight.append('line')
          .attr('x1', 0).attr('x2', panelW)
          .attr('y1', yScaleQ(0)).attr('y2', yScaleQ(0))
          .attr('stroke', '#fff').attr('stroke-width', 0.5).attr('opacity', 0.5);
        gRight.append('line')
          .attr('x1', xScaleQ(0)).attr('x2', xScaleQ(0))
          .attr('y1', 0).attr('y2', panelH)
          .attr('stroke', '#fff').attr('stroke-width', 0.5).attr('opacity', 0.5);

        gRight.append('text')
          .attr('x', panelW / 2)
          .attr('y', -6)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('fill', 'var(--color-text-secondary, #6B7280)')
          .text('Quadratic Form: h\u1D40 H h');
      }
    },
    [width, totalHeight, selectedIdx, probePoint, showEigenvectors, showQuadForm, contours, hessianInfo, quadFormGrid],
  );

  // Format number
  const fmt = (n: number) => {
    if (!isFinite(n)) return '∞';
    return Math.abs(n) < 0.01 && n !== 0 ? n.toExponential(2) : n.toFixed(3);
  };

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Controls */}
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
          <input type="checkbox" checked={showEigenvectors} onChange={() => setShowEigenvectors(!showEigenvectors)} />
          Eigenvectors
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <input type="checkbox" checked={showQuadForm} onChange={() => setShowQuadForm(!showQuadForm)} />
          Quadratic form
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} style={{ width: '100%', height: totalHeight }} />

      {/* Readout panel */}
      <div style={{
        marginTop: '0.5rem',
        padding: '0.75rem',
        background: 'var(--color-bg-secondary, #F9FAFB)',
        borderRadius: '0.5rem',
        fontSize: '0.8rem',
        fontFamily: 'monospace',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.5rem',
      }}>
        <div>
          <strong>Point:</strong> ({fmt(probePoint[0])}, {fmt(probePoint[1])})
        </div>
        <div>
          <strong>H_f:</strong> [{fmt(hessianInfo.H[0][0])}, {fmt(hessianInfo.H[0][1])}; {fmt(hessianInfo.H[1][0])}, {fmt(hessianInfo.H[1][1])}]
        </div>
        <div>
          <strong style={{ color: hessianInfo.eigenvalues[0] > 0 ? functionColors[0] : '#DC2626' }}>
            λ₁ = {fmt(hessianInfo.eigenvalues[0])}
          </strong>,{' '}
          <strong style={{ color: hessianInfo.eigenvalues[1] > 0 ? functionColors[0] : '#DC2626' }}>
            λ₂ = {fmt(hessianInfo.eigenvalues[1])}
          </strong>
        </div>
        <div>
          <strong>det H:</strong> {fmt(hessianInfo.det)} | <strong>tr H:</strong> {fmt(hessianInfo.trace)} | <strong>κ:</strong> {fmt(hessianInfo.kappa)}
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <strong>Classification:</strong> {hessianInfo.classification}
        </div>
      </div>
    </div>
  );
}
