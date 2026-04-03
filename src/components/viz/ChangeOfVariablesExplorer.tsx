import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { COORDINATE_TRANSFORM_PRESETS } from '../../data/change-of-variables-data';
import { coordinateTransformGrid } from './shared/integration';

const margin = { top: 20, right: 16, bottom: 36, left: 42 };
const GAP = 24;

export default function ChangeOfVariablesExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.5, 440);

  const [selectedIdx, setSelectedIdx] = useState(1); // start on polar
  const [gridResolution, setGridResolution] = useState(12);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showVectors, setShowVectors] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  const preset = COORDINATE_TRANSFORM_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setHoveredCell(null);
  }, []);

  // Generate grid cells
  const cells = useMemo(
    () =>
      coordinateTransformGrid(
        preset.phi,
        preset.paramDomain.u,
        preset.paramDomain.v,
        gridResolution,
        gridResolution,
      ),
    [selectedIdx, gridResolution],
  );

  // Compute output domain bounds
  const outputBounds = useMemo(() => {
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    for (const cell of cells) {
      for (const c of cell.corners) {
        if (isFinite(c.x) && isFinite(c.y)) {
          xMin = Math.min(xMin, c.x);
          xMax = Math.max(xMax, c.x);
          yMin = Math.min(yMin, c.y);
          yMax = Math.max(yMax, c.y);
        }
      }
    }
    const pad = 0.1 * Math.max(xMax - xMin, yMax - yMin, 1);
    return {
      x: [xMin - pad, xMax + pad] as [number, number],
      y: [yMin - pad, yMax + pad] as [number, number],
    };
  }, [cells]);

  // Jacobian determinant range for color scale
  const detJRange = useMemo(() => {
    let min = Infinity, max = -Infinity;
    for (const cell of cells) {
      min = Math.min(min, cell.detJ);
      max = Math.max(max, cell.detJ);
    }
    return [min, max] as [number, number];
  }, [cells]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      if (width < 100) return;
      svg.selectAll('*').remove();

      const panelW = (width - GAP) / 2 - margin.left - margin.right;
      const panelH = totalHeight - margin.top - margin.bottom;
      if (panelW < 50 || panelH < 50) return;

      // --- Left panel: parameter space (uniform grid) ---
      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScaleL = d3.scaleLinear().domain(preset.paramDomain.u).range([0, panelW]);
      const yScaleL = d3.scaleLinear().domain(preset.paramDomain.v).range([panelH, 0]);

      gLeft.append('g').attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xScaleL).ticks(5))
        .selectAll('text').style('font-size', '10px');
      gLeft.append('g')
        .call(d3.axisLeft(yScaleL).ticks(5))
        .selectAll('text').style('font-size', '10px');

      // Axis labels
      gLeft.append('text')
        .attr('x', panelW / 2).attr('y', panelH + 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px').style('fill', 'var(--color-text-secondary)')
        .text('u');
      gLeft.append('text')
        .attr('x', -panelH / 2).attr('y', -30)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px').style('fill', 'var(--color-text-secondary)')
        .text('v');

      // Panel title
      gLeft.append('text')
        .attr('x', panelW / 2).attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600')
        .style('fill', 'var(--color-text-primary)')
        .text('Parameter space (u, v)');

      // Color scale for |det J|
      const colorScale = d3.scaleSequential(d3.interpolateRdBu)
        .domain([detJRange[1], detJRange[0]]); // reversed so blue=low, red=high

      const du = (preset.paramDomain.u[1] - preset.paramDomain.u[0]) / gridResolution;
      const dv = (preset.paramDomain.v[1] - preset.paramDomain.v[0]) / gridResolution;

      // Draw uniform cells in parameter space
      cells.forEach((cell, idx) => {
        const uLo = cell.uCenter - du / 2;
        const vLo = cell.vCenter - dv / 2;
        const rect = gLeft.append('rect')
          .attr('x', xScaleL(uLo))
          .attr('y', yScaleL(vLo + dv))
          .attr('width', Math.abs(xScaleL(uLo + du) - xScaleL(uLo)))
          .attr('height', Math.abs(yScaleL(vLo) - yScaleL(vLo + dv)))
          .style('stroke', '#94A3B8')
          .style('stroke-width', 0.5)
          .style('cursor', 'pointer');

        if (showHeatmap) {
          rect.style('fill', colorScale(cell.detJ)).style('opacity', 0.7);
        } else {
          rect.style('fill', 'transparent');
        }

        if (idx === hoveredCell) {
          rect.style('stroke', '#F59E0B').style('stroke-width', 2);
        }
      });

      // --- Right panel: image space (deformed grid) ---
      const gRight = svg
        .append('g')
        .attr('transform', `translate(${margin.left + panelW + GAP + margin.right + margin.left},${margin.top})`);

      const xScaleR = d3.scaleLinear().domain(outputBounds.x).range([0, panelW]);
      const yScaleR = d3.scaleLinear().domain(outputBounds.y).range([panelH, 0]);

      gRight.append('g').attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xScaleR).ticks(5))
        .selectAll('text').style('font-size', '10px');
      gRight.append('g')
        .call(d3.axisLeft(yScaleR).ticks(5))
        .selectAll('text').style('font-size', '10px');

      gRight.append('text')
        .attr('x', panelW / 2).attr('y', panelH + 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px').style('fill', 'var(--color-text-secondary)')
        .text('x');
      gRight.append('text')
        .attr('x', -panelH / 2).attr('y', -30)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px').style('fill', 'var(--color-text-secondary)')
        .text('y');

      gRight.append('text')
        .attr('x', panelW / 2).attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600')
        .style('fill', 'var(--color-text-primary)')
        .text('Image space (x, y)');

      // Draw deformed quadrilateral cells
      cells.forEach((cell, idx) => {
        const pathData = cell.corners
          .map((c, i) => `${i === 0 ? 'M' : 'L'}${xScaleR(c.x)},${yScaleR(c.y)}`)
          .join(' ') + ' Z';

        const path = gRight.append('path')
          .attr('d', pathData)
          .style('stroke', '#94A3B8')
          .style('stroke-width', 0.5)
          .style('cursor', 'pointer');

        if (showHeatmap) {
          path.style('fill', colorScale(cell.detJ)).style('opacity', 0.7);
        } else {
          path.style('fill', 'transparent');
        }

        if (idx === hoveredCell) {
          path.style('stroke', '#F59E0B').style('stroke-width', 2);
        }

        // Show area element vectors at hovered cell
        if (showVectors && idx === hoveredCell) {
          const [cx, cy] = preset.phi(cell.uCenter, cell.vCenter);
          const J = preset.jacobian(cell.uCenter, cell.vCenter);
          const vecScale = du * 0.8;

          // Column 1 of J (∂φ/∂u)
          gRight.append('line')
            .attr('x1', xScaleR(cx)).attr('y1', yScaleR(cy))
            .attr('x2', xScaleR(cx + J[0][0] * vecScale))
            .attr('y2', yScaleR(cy + J[1][0] * vecScale))
            .style('stroke', '#DC2626').style('stroke-width', 2)
            .attr('marker-end', 'url(#arrowRed)');

          // Column 2 of J (∂φ/∂v)
          gRight.append('line')
            .attr('x1', xScaleR(cx)).attr('y1', yScaleR(cy))
            .attr('x2', xScaleR(cx + J[0][1] * vecScale))
            .attr('y2', yScaleR(cy + J[1][1] * vecScale))
            .style('stroke', '#2563EB').style('stroke-width', 2)
            .attr('marker-end', 'url(#arrowBlue)');
        }
      });

      // Arrow markers for vectors
      const defs = svg.append('defs');
      for (const [id, color] of [['arrowRed', '#DC2626'], ['arrowBlue', '#2563EB']]) {
        defs.append('marker')
          .attr('id', id).attr('viewBox', '0 0 10 10')
          .attr('refX', 10).attr('refY', 5)
          .attr('markerWidth', 6).attr('markerHeight', 6)
          .attr('orient', 'auto')
          .append('path')
          .attr('d', 'M 0 0 L 10 5 L 0 10 z')
          .style('fill', color);
      }
    },
    [width, totalHeight, cells, selectedIdx, showHeatmap, showVectors, hoveredCell, outputBounds, detJRange, gridResolution],
  );

  const hoveredInfo = hoveredCell !== null ? cells[hoveredCell] : null;

  return (
    <div ref={containerRef} className="viz-container">
      <div className="viz-controls">
        <label>
          Transform:{' '}
          <select value={selectedIdx} onChange={handlePresetChange}>
            {COORDINATE_TRANSFORM_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <label>
          Grid:{' '}
          <input
            type="range" min={5} max={30} value={gridResolution}
            onChange={(e) => { setGridResolution(Number(e.target.value)); setHoveredCell(null); }}
          />
          <span className="viz-value">{gridResolution}×{gridResolution}</span>
        </label>
        <label>
          <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} />
          {' '}|det J| heatmap
        </label>
        <label>
          <input type="checkbox" checked={showVectors} onChange={(e) => setShowVectors(e.target.checked)} />
          {' '}Jacobian columns
        </label>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={totalHeight}
        onMouseMove={(e) => {
          if (cells.length === 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - rect.left - margin.left;
          const my = e.clientY - rect.top - margin.top;
          const panelW = (width - GAP) / 2 - margin.left - margin.right;
          const panelH = totalHeight - margin.top - margin.bottom;

          // Check if mouse is in left panel (parameter space)
          if (mx >= 0 && mx <= panelW && my >= 0 && my <= panelH) {
            const u = preset.paramDomain.u[0] + (mx / panelW) * (preset.paramDomain.u[1] - preset.paramDomain.u[0]);
            const v = preset.paramDomain.v[0] + (1 - my / panelH) * (preset.paramDomain.v[1] - preset.paramDomain.v[0]);
            const du = (preset.paramDomain.u[1] - preset.paramDomain.u[0]) / gridResolution;
            const dv = (preset.paramDomain.v[1] - preset.paramDomain.v[0]) / gridResolution;
            const col = Math.floor((u - preset.paramDomain.u[0]) / du);
            const row = Math.floor((v - preset.paramDomain.v[0]) / dv);
            if (col >= 0 && col < gridResolution && row >= 0 && row < gridResolution) {
              setHoveredCell(col * gridResolution + row);
            } else {
              setHoveredCell(null);
            }
          } else {
            setHoveredCell(null);
          }
        }}
        onMouseLeave={() => setHoveredCell(null)}
      />

      <div className="viz-readout">
        <p className="viz-description">{preset.description}</p>
        {hoveredInfo && (
          <p>
            Cell ({hoveredInfo.uCenter.toFixed(2)}, {hoveredInfo.vCenter.toFixed(2)}) →
            |det J| = <strong>{hoveredInfo.detJ.toFixed(4)}</strong>,
            area ≈ {hoveredInfo.area.toFixed(4)}
          </p>
        )}
        <p>|det J| range: [{detJRange[0].toFixed(3)}, {detJRange[1].toFixed(3)}]</p>
      </div>
    </div>
  );
}
