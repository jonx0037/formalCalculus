import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { HESSIAN_SURFACE_PRESETS } from '../../data/hessian-data';
import { eigenvalues2x2 } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 60, bottom: 36, left: 42 };
const SINGULARITY_TOL = 1e-14;
const DEFINITENESS_TOL = 1e-8;

type HeatmapQuantity = 'kappa' | 'lambda_min' | 'lambda_max' | 'det' | 'trace';

const QUANTITY_OPTIONS: Array<{ value: HeatmapQuantity; label: string }> = [
  { value: 'kappa', label: 'Condition number κ' },
  { value: 'lambda_min', label: 'Min eigenvalue λ₁' },
  { value: 'lambda_max', label: 'Max eigenvalue λ₂' },
  { value: 'det', label: 'Determinant det H' },
  { value: 'trace', label: 'Trace tr H' },
];

function computeQuantity(
  H: [[number, number], [number, number]],
  quantity: HeatmapQuantity,
): number {
  const { eigenvalues } = eigenvalues2x2(H);
  const [lam1, lam2] = eigenvalues;
  switch (quantity) {
    case 'kappa': {
      const absMin = Math.min(Math.abs(lam1), Math.abs(lam2));
      if (absMin < SINGULARITY_TOL) return 1000; // cap for visualization
      return Math.max(Math.abs(lam1), Math.abs(lam2)) / absMin;
    }
    case 'lambda_min':
      return lam1;
    case 'lambda_max':
      return lam2;
    case 'det':
      return H[0][0] * H[1][1] - H[0][1] * H[1][0];
    case 'trace':
      return H[0][0] + H[1][1];
  }
}

export default function CurvatureHeatmapExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.55, 460);

  const [selectedIdx, setSelectedIdx] = useState(3); // Rosenbrock by default
  const [quantity, setQuantity] = useState<HeatmapQuantity>('kappa');
  const [useLogScale, setUseLogScale] = useState(true);
  const [clickedPoint, setClickedPoint] = useState<[number, number] | null>(null);

  const preset = HESSIAN_SURFACE_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setClickedPoint(null);
  }, []);

  // Compute heatmap grid
  const GRID_RES = 60;
  const heatmapData = useMemo(() => {
    const data: Array<{ x: number; y: number; val: number }> = [];
    const [xMin, xMax] = preset.xDomain;
    const [yMin, yMax] = preset.yDomain;
    for (let i = 0; i < GRID_RES; i++) {
      for (let j = 0; j < GRID_RES; j++) {
        const x = xMin + ((xMax - xMin) * (i + 0.5)) / GRID_RES;
        const y = yMin + ((yMax - yMin) * (j + 0.5)) / GRID_RES;
        const H = preset.hessian(x, y);
        const val = computeQuantity(H, quantity);
        data.push({ x, y, val: isFinite(val) ? val : 0 });
      }
    }
    return data;
  }, [selectedIdx, quantity]);

  // Clicked point analysis
  const clickedInfo = useMemo(() => {
    if (!clickedPoint) return null;
    const [px, py] = clickedPoint;
    const H = preset.hessian(px, py);
    const { eigenvalues, eigenvectors } = eigenvalues2x2(H);
    const det = H[0][0] * H[1][1] - H[0][1] * H[1][0];
    const trace = H[0][0] + H[1][1];
    const absMin = Math.min(...eigenvalues.map(Math.abs));
    const kappa = absMin < SINGULARITY_TOL ? Infinity : Math.max(...eigenvalues.map(Math.abs)) / absMin;

    let classification: string;
    if (eigenvalues[0] > DEFINITENESS_TOL && eigenvalues[1] > DEFINITENESS_TOL) classification = 'Positive definite';
    else if (eigenvalues[0] < -DEFINITENESS_TOL && eigenvalues[1] < -DEFINITENESS_TOL) classification = 'Negative definite';
    else if (eigenvalues[0] < -DEFINITENESS_TOL && eigenvalues[1] > DEFINITENESS_TOL) classification = 'Indefinite';
    else classification = 'Semidefinite';

    return { H, eigenvalues, eigenvectors, det, trace, kappa, classification };
  }, [selectedIdx, clickedPoint]);

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

      const xScale = d3.scaleLinear().domain(preset.xDomain).range([0, panelW]);
      const yScale = d3.scaleLinear().domain(preset.yDomain).range([panelH, 0]);

      // Value extent
      const vals = heatmapData.map((d) => d.val);
      const vMin = Math.min(...vals);
      const vMax = Math.max(...vals);

      // Color scale
      let colorScale: (val: number) => string;
      if (quantity === 'kappa') {
        // Warm = high condition number (bad for GD)
        const logMax = Math.log10(Math.max(vMax, 1.1));
        if (useLogScale) {
          const logScale = d3.scaleSequential(d3.interpolateInferno)
            .domain([0, logMax]);
          colorScale = (v: number) => logScale(Math.log10(Math.max(v, 1)));
        } else {
          const linScale = d3.scaleSequential(d3.interpolateInferno)
            .domain([1, vMax]);
          colorScale = (v: number) => linScale(v);
        }
      } else if (quantity === 'lambda_min' || quantity === 'lambda_max' || quantity === 'det' || quantity === 'trace') {
        // Diverging: blue (negative) — white (zero) — red (positive)
        const absMax = Math.max(Math.abs(vMin), Math.abs(vMax), 0.1);
        const divScale = d3.scaleSequential(d3.interpolateRdBu)
          .domain([absMax, -absMax]);
        colorScale = (v: number) => divScale(v);
      } else {
        colorScale = () => '#ccc';
      }

      // Draw heatmap cells
      const cellW = panelW / GRID_RES + 0.5;
      const cellH = panelH / GRID_RES + 0.5;
      for (const d of heatmapData) {
        g.append('rect')
          .attr('x', xScale(d.x) - cellW / 2)
          .attr('y', yScale(d.y) - cellH / 2)
          .attr('width', cellW)
          .attr('height', cellH)
          .attr('fill', colorScale(d.val));
      }

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text').style('font-size', '10px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text').style('font-size', '10px');

      // Critical points
      for (const cp of preset.criticalPoints) {
        const markerColor = cp.type === 'local-min' ? '#059669'
          : cp.type === 'local-max' ? '#DC2626'
          : cp.type === 'saddle' ? '#D97706'
          : '#6B7280';
        g.append('circle')
          .attr('cx', xScale(cp.point[0]))
          .attr('cy', yScale(cp.point[1]))
          .attr('r', 5)
          .attr('fill', 'none')
          .attr('stroke', markerColor)
          .attr('stroke-width', 2);
        g.append('circle')
          .attr('cx', xScale(cp.point[0]))
          .attr('cy', yScale(cp.point[1]))
          .attr('r', 2)
          .attr('fill', markerColor);
      }

      // Clicked point marker
      if (clickedPoint) {
        g.append('circle')
          .attr('cx', xScale(clickedPoint[0]))
          .attr('cy', yScale(clickedPoint[1]))
          .attr('r', 7)
          .attr('fill', 'none')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2.5);
        g.append('circle')
          .attr('cx', xScale(clickedPoint[0]))
          .attr('cy', yScale(clickedPoint[1]))
          .attr('r', 4)
          .attr('fill', functionColors[0]);
      }

      // Click handler
      g.append('rect')
        .attr('width', panelW)
        .attr('height', panelH)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx, my] = d3.pointer(event);
          setClickedPoint([
            Math.max(preset.xDomain[0], Math.min(preset.xDomain[1], xScale.invert(mx))),
            Math.max(preset.yDomain[0], Math.min(preset.yDomain[1], yScale.invert(my))),
          ]);
        });

      // Color bar legend
      const barW = 12;
      const barH = panelH;
      const barX = panelW + 10;
      const barG = g.append('g').attr('transform', `translate(${barX},0)`);

      const nColors = 50;
      for (let i = 0; i < nColors; i++) {
        const t = i / (nColors - 1);
        let val: number;
        if (quantity === 'kappa') {
          val = useLogScale
            ? Math.pow(10, t * Math.log10(Math.max(vMax, 1.1)))
            : 1 + t * (vMax - 1);
        } else {
          const absMax = Math.max(Math.abs(vMin), Math.abs(vMax), 0.1);
          val = -absMax + 2 * absMax * t;
        }
        barG.append('rect')
          .attr('x', 0)
          .attr('y', barH - (barH * (i + 1)) / nColors)
          .attr('width', barW)
          .attr('height', barH / nColors + 0.5)
          .attr('fill', colorScale(val));
      }

      // Bar labels
      barG.append('text').attr('x', barW + 4).attr('y', 10)
        .style('font-size', '9px').style('fill', 'var(--color-text-secondary, #6B7280)')
        .text(quantity === 'kappa' ? (useLogScale ? `10^${Math.log10(Math.max(vMax, 1.1)).toFixed(1)}` : vMax.toFixed(0)) : vMax.toFixed(1));
      barG.append('text').attr('x', barW + 4).attr('y', barH)
        .style('font-size', '9px').style('fill', 'var(--color-text-secondary, #6B7280)')
        .text(quantity === 'kappa' ? '1' : vMin.toFixed(1));

      // Title
      g.append('text')
        .attr('x', panelW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-secondary, #6B7280)')
        .text(`${QUANTITY_OPTIONS.find((o) => o.value === quantity)?.label} — click to inspect`);
    },
    [width, totalHeight, selectedIdx, quantity, useLogScale, heatmapData, clickedPoint],
  );

  const fmt = (n: number) => {
    if (!isFinite(n)) return '∞';
    return Math.abs(n) < 0.01 && n !== 0 ? n.toExponential(2) : n.toFixed(3);
  };

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
        <label>
          Quantity:{' '}
          <select
            value={quantity}
            onChange={(e) => { setQuantity(e.target.value as HeatmapQuantity); setClickedPoint(null); }}
            style={{ fontSize: '0.85rem' }}
          >
            {QUANTITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        {quantity === 'kappa' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input type="checkbox" checked={useLogScale} onChange={() => setUseLogScale(!useLogScale)} />
            Log scale
          </label>
        )}
      </div>

      <svg ref={svgRef} style={{ width: '100%', height: totalHeight }} />

      {clickedInfo && (
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
          <div><strong>Point:</strong> ({fmt(clickedPoint![0])}, {fmt(clickedPoint![1])})</div>
          <div><strong>H:</strong> [{fmt(clickedInfo.H[0][0])}, {fmt(clickedInfo.H[0][1])}; {fmt(clickedInfo.H[1][0])}, {fmt(clickedInfo.H[1][1])}]</div>
          <div>
            <strong>λ₁ = {fmt(clickedInfo.eigenvalues[0])}</strong>,{' '}
            <strong>λ₂ = {fmt(clickedInfo.eigenvalues[1])}</strong>
          </div>
          <div><strong>κ:</strong> {fmt(clickedInfo.kappa)} | <strong>det:</strong> {fmt(clickedInfo.det)} | <strong>tr:</strong> {fmt(clickedInfo.trace)}</div>
          <div style={{ gridColumn: '1 / -1' }}><strong>{clickedInfo.classification}</strong></div>
        </div>
      )}
    </div>
  );
}
