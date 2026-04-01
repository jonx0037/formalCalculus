import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { SURFACE_PRESETS } from '../../data/gradient-data';
import { generateContours } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 20, bottom: 40, left: 50 };

export default function GradientFieldExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.75, 500);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [probePoint, setProbePoint] = useState<[number, number]>(SURFACE_PRESETS[0].defaultPoint);
  const [showField, setShowField] = useState(true);
  const [density, setDensity] = useState(12);

  const preset = SURFACE_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setProbePoint(SURFACE_PRESETS[idx].defaultPoint);
  }, []);

  // Generate contour data
  const contours = useMemo(
    () => generateContours(preset.f, preset.xDomain, preset.yDomain, 14, 80),
    [selectedIdx],
  );

  // Gradient field arrows at grid points
  const fieldArrows = useMemo(() => {
    if (!showField) return [];
    const arrows: Array<{ x: number; y: number; gx: number; gy: number; mag: number }> = [];
    const dx = (preset.xDomain[1] - preset.xDomain[0]) / density;
    const dy = (preset.yDomain[1] - preset.yDomain[0]) / density;
    for (let i = 1; i < density; i++) {
      for (let j = 1; j < density; j++) {
        const x = preset.xDomain[0] + i * dx;
        const y = preset.yDomain[0] + j * dy;
        const gx = preset.f_x(x, y);
        const gy = preset.f_y(x, y);
        const mag = Math.sqrt(gx * gx + gy * gy);
        if (isFinite(mag) && mag > 1e-8) {
          arrows.push({ x, y, gx, gy, mag });
        }
      }
    }
    return arrows;
  }, [selectedIdx, showField, density]);

  // Probe gradient
  const probeGrad = useMemo(() => {
    const gx = preset.f_x(probePoint[0], probePoint[1]);
    const gy = preset.f_y(probePoint[0], probePoint[1]);
    const mag = Math.sqrt(gx * gx + gy * gy);
    return { gx, gy, mag };
  }, [selectedIdx, probePoint]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain(preset.xDomain).range([0, innerW]);
      const yScale = d3.scaleLinear().domain(preset.yDomain).range([innerH, 0]);

      // Contour fill
      const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain(d3.extent(contours, (c) => c.level) as [number, number]);

      for (const contour of contours) {
        const pts = contour.points;
        for (let k = 0; k < pts.length - 1; k += 2) {
          g.append('line')
            .attr('x1', xScale(pts[k][0]))
            .attr('y1', yScale(pts[k][1]))
            .attr('x2', xScale(pts[k + 1][0]))
            .attr('y2', yScale(pts[k + 1][1]))
            .style('stroke', colorScale(contour.level))
            .style('stroke-width', 1)
            .style('opacity', 0.6);
        }
      }

      // Gradient field arrows
      if (showField && fieldArrows.length > 0) {
        const maxMag = d3.max(fieldArrows, (a) => a.mag) ?? 1;
        const arrowScale = Math.min(innerW, innerH) / (density * 2.5);

        // Arrow marker
        svg.append('defs')
          .append('marker')
          .attr('id', 'grad-arrow')
          .attr('viewBox', '0 -3 6 6')
          .attr('refX', 5)
          .attr('markerWidth', 4)
          .attr('markerHeight', 4)
          .attr('orient', 'auto')
          .append('path')
          .attr('d', 'M0,-3L6,0L0,3')
          .style('fill', functionColors[1]);

        for (const a of fieldArrows) {
          const scale = (a.mag / maxMag) * arrowScale;
          const nx = a.gx / a.mag;
          const ny = a.gy / a.mag;
          g.append('line')
            .attr('x1', xScale(a.x))
            .attr('y1', yScale(a.y))
            .attr('x2', xScale(a.x) + nx * scale)
            .attr('y2', yScale(a.y) - ny * scale)
            .style('stroke', functionColors[1])
            .style('stroke-width', 1.2)
            .style('opacity', 0.7)
            .attr('marker-end', 'url(#grad-arrow)');
        }
      }

      // Probe point gradient arrow (prominent)
      const { gx, gy, mag } = probeGrad;
      if (mag > 1e-8) {
        const probeArrowLen = Math.min(innerW, innerH) * 0.12;
        const nx = gx / mag;
        const ny = gy / mag;

        g.append('line')
          .attr('x1', xScale(probePoint[0]))
          .attr('y1', yScale(probePoint[1]))
          .attr('x2', xScale(probePoint[0]) + nx * probeArrowLen)
          .attr('y2', yScale(probePoint[1]) - ny * probeArrowLen)
          .style('stroke', functionColors[2])
          .style('stroke-width', 2.5)
          .attr('marker-end', 'url(#grad-arrow)');
      }

      // Probe point dot
      g.append('circle')
        .attr('cx', xScale(probePoint[0]))
        .attr('cy', yScale(probePoint[1]))
        .attr('r', 5)
        .style('fill', functionColors[2])
        .style('stroke', '#fff')
        .style('stroke-width', 1.5);

      // Drag behavior
      const dragBehavior = d3.drag<SVGRectElement, unknown>()
        .on('drag', (event) => {
          const [mx, my] = d3.pointer(event, g.node());
          const x = xScale.invert(mx);
          const y = yScale.invert(my);
          if (
            x >= preset.xDomain[0] && x <= preset.xDomain[1] &&
            y >= preset.yDomain[0] && y <= preset.yDomain[1]
          ) {
            setProbePoint([x, y]);
          }
        });

      g.append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
        .style('fill', 'transparent')
        .style('cursor', 'crosshair')
        .call(dragBehavior)
        .on('click', (event) => {
          const [mx, my] = d3.pointer(event, g.node());
          const x = xScale.invert(mx);
          const y = yScale.invert(my);
          setProbePoint([x, y]);
        });

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px');

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px');

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('x');

      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -35)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('y');
    },
    [contours, fieldArrows, probePoint, probeGrad, showField, width, height],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Function:
          <select
            className="ml-1 rounded px-1 py-0.5 text-sm"
            style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
            value={selectedIdx}
            onChange={handlePresetChange}
          >
            {SURFACE_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <input
            type="checkbox"
            className="mr-1"
            checked={showField}
            onChange={(e) => setShowField(e.target.checked)}
          />
          Show gradient field
        </label>

        {showField && (
          <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Density: {density}
            <input
              type="range"
              className="ml-2 w-20"
              min={5}
              max={20}
              step={1}
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
            />
          </label>
        )}
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap gap-6 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: functionColors[2] }}>●</span>{' '}
          Point ({probePoint[0].toFixed(2)}, {probePoint[1].toFixed(2)})
        </span>
        <span>
          ∇f = ({probeGrad.gx.toFixed(3)}, {probeGrad.gy.toFixed(3)})
        </span>
        <span>‖∇f‖ = {probeGrad.mag.toFixed(3)}</span>
        <span style={{ fontStyle: 'italic' }}>Click or drag to move the evaluation point</span>
      </div>
    </div>
  );
}
