import { useState, useMemo, useCallback, useId, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { CONTOUR_PRESETS } from '../../data/gradient-data';
import { generateContours, gradientFlow } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 20, bottom: 40, left: 50 };
const ARROW_GRID = 10;

export default function ContourGradientExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.75, 500);
  const markerId = useId().replace(/:/g, '');

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showFlow, setShowFlow] = useState(false);
  const [flowPaths, setFlowPaths] = useState<Array<Array<[number, number]>>>([]);

  const preset = CONTOUR_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setFlowPaths([]);
  }, []);

  const contours = useMemo(
    () => generateContours(preset.f, preset.xDomain, preset.yDomain, 14, 80),
    [selectedIdx],
  );

  // Gradient arrows at grid points along contour areas
  const gradArrows = useMemo(() => {
    const arrows: Array<{ x: number; y: number; gx: number; gy: number; mag: number }> = [];
    const dx = (preset.xDomain[1] - preset.xDomain[0]) / ARROW_GRID;
    const dy = (preset.yDomain[1] - preset.yDomain[0]) / ARROW_GRID;
    for (let i = 1; i < ARROW_GRID; i++) {
      for (let j = 1; j < ARROW_GRID; j++) {
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
  }, [selectedIdx]);

  const handleClick = useCallback(
    (x: number, y: number) => {
      if (!showFlow) return;
      const grad_f = (px: number, py: number): [number, number] => [
        preset.f_x(px, py),
        preset.f_y(px, py),
      ];
      const path = gradientFlow(grad_f, [x, y], 0.01, 500);
      setFlowPaths((prev) => [...prev, path]);
    },
    [showFlow, selectedIdx],
  );

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

      // Contour lines (unfilled)
      const colorScale = d3.scaleSequential(d3.interpolateGreys)
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
            .style('stroke-width', 1.2)
            .style('opacity', 0.7);
        }
      }

      // Arrow marker
      svg.append('defs')
        .append('marker')
        .attr('id', `contour-grad-arrow-${markerId}`)
        .attr('viewBox', '0 -3 6 6')
        .attr('refX', 5)
        .attr('markerWidth', 4)
        .attr('markerHeight', 4)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-3L6,0L0,3')
        .style('fill', functionColors[1]);

      // Gradient arrows at grid points
      const maxMag = d3.max(gradArrows, (a) => a.mag) ?? 1;
      const arrowScale = Math.min(innerW, innerH) / (ARROW_GRID * 2.5);

      for (const a of gradArrows) {
        const scale = (a.mag / maxMag) * arrowScale;
        const nx = a.gx / a.mag;
        const ny = a.gy / a.mag;
        g.append('line')
          .attr('x1', xScale(a.x))
          .attr('y1', yScale(a.y))
          .attr('x2', xScale(a.x) + nx * scale)
          .attr('y2', yScale(a.y) - ny * scale)
          .style('stroke', functionColors[1])
          .style('stroke-width', 1.5)
          .style('opacity', 0.7)
          .attr('marker-end', 'url(#contour-grad-arrow)');
      }

      // Gradient flow paths
      for (const path of flowPaths) {
        if (path.length < 2) continue;
        const lineGen = d3.line<[number, number]>()
          .x((d) => xScale(d[0]))
          .y((d) => yScale(d[1]));

        g.append('path')
          .datum(path)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .style('stroke', functionColors[2])
          .style('stroke-width', 2)
          .style('opacity', 0.8);

        // Start dot
        g.append('circle')
          .attr('cx', xScale(path[0][0]))
          .attr('cy', yScale(path[0][1]))
          .attr('r', 4)
          .style('fill', functionColors[2])
          .style('stroke', '#fff')
          .style('stroke-width', 1);
      }

      // Click overlay
      g.append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
        .style('fill', 'transparent')
        .style('cursor', showFlow ? 'crosshair' : 'default')
        .on('click', (event) => {
          const [mx, my] = d3.pointer(event, g.node());
          const x = xScale.invert(mx);
          const y = yScale.invert(my);
          handleClick(x, y);
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
    [contours, gradArrows, flowPaths, showFlow, handleClick, width, height],
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
            {CONTOUR_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <input
            type="checkbox"
            className="mr-1"
            checked={showFlow}
            onChange={(e) => setShowFlow(e.target.checked)}
          />
          Gradient flow mode
        </label>

        {showFlow && flowPaths.length > 0 && (
          <button
            className="text-sm px-2 py-0.5 rounded"
            style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
            onClick={() => setFlowPaths([])}
          >
            Clear paths
          </button>
        )}
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: functionColors[1] }}>●</span> Gradient arrows (perpendicular to contours)
        </span>
        {showFlow && (
          <span>
            <span style={{ color: functionColors[2] }}>●</span> Gradient flow (steepest ascent) — click to add paths
          </span>
        )}
      </div>
    </div>
  );
}
