import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { generateContours } from './shared/multivariate';
import { functionColors } from './shared/colorScales';
import { LAGRANGE_PRESETS } from '../../data/inverse-implicit-data';
import type { LagrangePreset } from '../../data/inverse-implicit-data';

const margin = { top: 20, right: 20, bottom: 40, left: 50 };

export default function LagrangeMultiplierExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.75, 500);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [cValue, setCValue] = useState(LAGRANGE_PRESETS[0].cDefault);
  const [showGradients, setShowGradients] = useState(true);
  const [showLambda, setShowLambda] = useState(true);

  const preset = LAGRANGE_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setCValue(LAGRANGE_PRESETS[idx].cDefault);
  }, []);

  // Contour data for the objective f(x,y)
  const contours = useMemo(
    () => generateContours(preset.f, preset.xDomain, preset.yDomain, 15, 80),
    [selectedIdx],
  );

  // Constraint curve: sample g(x,y) = c using marching squares via d3.contours
  const constraintPath = useMemo(() => {
    const gridSize = 120;
    const [xMin, xMax] = preset.xDomain;
    const [yMin, yMax] = preset.yDomain;
    const dx = (xMax - xMin) / (gridSize - 1);
    const dy = (yMax - yMin) / (gridSize - 1);

    const values = new Float64Array(gridSize * gridSize);
    for (let j = 0; j < gridSize; j++) {
      for (let i = 0; i < gridSize; i++) {
        const x = xMin + i * dx;
        const y = yMin + j * dy;
        values[j * gridSize + i] = preset.g(x, y);
      }
    }

    const contourGen = d3.contours().size([gridSize, gridSize]).thresholds([cValue]);
    const geoContours = contourGen(Array.from(values));

    // Convert grid coordinates back to domain coordinates
    const paths: Array<Array<[number, number]>> = [];
    for (const feature of geoContours) {
      for (const ring of feature.coordinates) {
        for (const coords of ring) {
          const domainCoords = coords.map(([gi, gj]: [number, number]) => [
            xMin + gi * dx,
            yMin + gj * dy,
          ] as [number, number]);
          paths.push(domainCoords);
        }
      }
    }
    return paths;
  }, [selectedIdx, cValue]);

  // Constrained optimum and lambda
  const optimumInfo = useMemo(() => {
    const opt = preset.optimum(cValue);
    const fVal = preset.f(opt[0], opt[1]);
    const gf = preset.gradf(opt[0], opt[1]);
    const gg = preset.gradg(opt[0], opt[1]);
    const ggNormSq = gg[0] * gg[0] + gg[1] * gg[1];
    const lambdaVal = ggNormSq > 1e-12
      ? (gf[0] * gg[0] + gf[1] * gg[1]) / ggNormSq
      : preset.lambda(cValue);
    return { opt, fVal, gf, gg, lambda: lambdaVal };
  }, [selectedIdx, cValue]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const plotW = width - margin.left - margin.right;
      const plotH = height - margin.top - margin.bottom;
      if (plotW <= 0 || plotH <= 0) return;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain(preset.xDomain).range([0, plotW]);
      const yScale = d3.scaleLinear().domain(preset.yDomain).range([plotH, 0]);

      // Clip path for plot area — keeps arrows/contours inside
      svg.append('defs')
        .append('clipPath')
        .attr('id', 'lagrange-clip')
        .append('rect')
        .attr('width', plotW)
        .attr('height', plotH);

      const plotGroup = g.append('g').attr('clip-path', 'url(#lagrange-clip)');

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${plotH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text').style('font-size', '10px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text').style('font-size', '10px');

      // Axis labels
      g.append('text')
        .attr('x', plotW / 2).attr('y', plotH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('x');
      g.append('text')
        .attr('x', -plotH / 2).attr('y', -36)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '12px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('y');

      // Contour lines for f(x,y)
      const colorScale = d3.scaleSequential(d3.interpolatePurples)
        .domain(d3.extent(contours, (c) => c.level) as [number, number]);

      for (const contour of contours) {
        const pts = contour.points;
        for (let k = 0; k < pts.length - 1; k += 2) {
          plotGroup.append('line')
            .attr('x1', xScale(pts[k][0]))
            .attr('y1', yScale(pts[k][1]))
            .attr('x2', xScale(pts[k + 1][0]))
            .attr('y2', yScale(pts[k + 1][1]))
            .attr('stroke', colorScale(contour.level))
            .attr('stroke-width', 1)
            .attr('opacity', 0.5);
        }
      }

      // Constraint curve g(x,y) = c
      const line = d3.line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      for (const path of constraintPath) {
        plotGroup.append('path')
          .datum(path)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', '#f97316')
          .attr('stroke-width', 2.5)
          .attr('opacity', 0.9);
      }

      // Arrowhead marker definition
      if (showGradients) {
        const defs = svg.append('defs');
        const addMarker = (id: string, color: string) => {
          defs.append('marker')
            .attr('id', id)
            .attr('viewBox', '0 0 10 10')
            .attr('refX', 9).attr('refY', 5)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .attr('orient', 'auto-start-reverse')
            .append('path')
            .attr('d', 'M 0 0 L 10 5 L 0 10 z')
            .attr('fill', color);
        };
        addMarker('arrowBlue', functionColors[0]);
        addMarker('arrowRed', '#DC2626');
      }

      // Gradient arrows at optimum
      if (showGradients) {
        const { opt, gf, gg } = optimumInfo;
        const ox = xScale(opt[0]);
        const oy = yScale(opt[1]);

        // Scale arrows for visibility — normalize to a visual length
        const arrowLen = Math.min(plotW, plotH) * 0.15;
        const drawArrow = (grad: [number, number], markerId: string, color: string) => {
          const mag = Math.sqrt(grad[0] * grad[0] + grad[1] * grad[1]);
          if (mag < 1e-10) return;
          const scale = arrowLen / mag;
          const dx = grad[0] * scale;
          const dy = grad[1] * scale;
          // In screen coords, y is inverted
          const sx = xScale(opt[0] + dx) - ox;
          const sy = yScale(opt[1] + dy) - oy;
          plotGroup.append('line')
            .attr('x1', ox).attr('y1', oy)
            .attr('x2', ox + sx).attr('y2', oy + sy)
            .attr('stroke', color)
            .attr('stroke-width', 2.5)
            .attr('marker-end', `url(#${markerId})`);
        };

        drawArrow(gf, 'arrowBlue', functionColors[0]);
        drawArrow(gg, 'arrowRed', '#DC2626');

        // Legend for arrows
        const legendY = 14;
        g.append('line')
          .attr('x1', plotW - 100).attr('y1', legendY)
          .attr('x2', plotW - 80).attr('y2', legendY)
          .attr('stroke', functionColors[0]).attr('stroke-width', 2);
        g.append('text')
          .attr('x', plotW - 76).attr('y', legendY + 4)
          .style('font-size', '11px')
          .style('fill', 'var(--color-text-secondary, #6b7280)')
          .text('\u2207f');
        g.append('line')
          .attr('x1', plotW - 52).attr('y1', legendY)
          .attr('x2', plotW - 32).attr('y2', legendY)
          .attr('stroke', '#DC2626').attr('stroke-width', 2);
        g.append('text')
          .attr('x', plotW - 28).attr('y', legendY + 4)
          .style('font-size', '11px')
          .style('fill', 'var(--color-text-secondary, #6b7280)')
          .text('\u2207g');
      }

      // Optimum marker — gold diamond
      const { opt } = optimumInfo;
      const diamondSize = 8;
      const cx = xScale(opt[0]);
      const cy = yScale(opt[1]);
      plotGroup.append('polygon')
        .attr('points', [
          `${cx},${cy - diamondSize}`,
          `${cx + diamondSize},${cy}`,
          `${cx},${cy + diamondSize}`,
          `${cx - diamondSize},${cy}`,
        ].join(' '))
        .attr('fill', '#EAB308')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      // Panel title
      g.append('text')
        .attr('x', plotW / 2).attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text('Constrained Optimization: Lagrange Condition');
    },
    [width, height, selectedIdx, cValue, contours, constraintPath, optimumInfo, showGradients],
  );

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <span style={{ fontWeight: 500 }}>Preset:</span>
          <select value={selectedIdx} onChange={handlePresetChange}
            style={{ fontSize: '13px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
            {LAGRANGE_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <span style={{ fontWeight: 500 }}>c = {cValue.toFixed(2)}:</span>
          <input type="range"
            min={preset.cDomain[0]} max={preset.cDomain[1]}
            step={(preset.cDomain[1] - preset.cDomain[0]) / 200}
            value={cValue}
            onChange={(e) => setCValue(Number(e.target.value))}
            style={{ width: '120px' }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showGradients}
            onChange={() => setShowGradients((v) => !v)} />
          Show gradients
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showLambda}
            onChange={() => setShowLambda((v) => !v)} />
          Show λ value
        </label>
      </div>

      {/* SVG visualization */}
      <svg ref={svgRef} width={width} height={height}
        style={{ overflow: 'visible', background: 'var(--color-bg-surface, #fafafa)', borderRadius: '6px' }} />

      {/* Info panel */}
      <div style={{
        marginTop: '8px', padding: '10px 12px', fontSize: '13px',
        background: 'var(--color-bg-surface, #f9fafb)', borderRadius: '6px',
        border: '1px solid var(--color-border, #e5e7eb)',
        display: 'flex', flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <span style={{ fontWeight: 600 }}>Optimum:</span>{' '}
          ({optimumInfo.opt[0].toFixed(4)}, {optimumInfo.opt[1].toFixed(4)})
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>f(x*, y*):</span>{' '}
          {optimumInfo.fVal.toFixed(4)}
        </div>
        {showLambda && (
          <div>
            <span style={{ fontWeight: 600 }}>λ:</span>{' '}
            {optimumInfo.lambda.toFixed(4)}
          </div>
        )}
        <div style={{ color: 'var(--color-text-secondary, #6b7280)', fontStyle: 'italic' }}>
          {preset.description}
        </div>
      </div>
    </div>
  );
}
