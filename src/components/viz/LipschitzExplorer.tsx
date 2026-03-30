import { useState, useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getLipschitzPresets } from '../../data/epsilon-delta-data';
import { functionColors } from './shared/colorScales';

const presets = getLipschitzPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const SAMPLE_PTS = 500;

export default function LipschitzExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [lipschitzK, setLipschitzK] = useState(1);
  const [coneX, setConeX] = useState(0);

  const preset = presets[selectedIdx];
  const [xMin, xMax] = preset.domain;

  // Reset K and cone position when the preset changes
  useEffect(() => {
    setLipschitzK(preset.K ?? 2);
    setConeX((xMin + xMax) / 2);
  }, [selectedIdx]);

  // Generate curve data
  const curveData = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= SAMPLE_PTS; i++) {
      const x = xMin + (xMax - xMin) * (i / SAMPLE_PTS);
      const y = preset.fn(x);
      if (isFinite(y)) pts.push({ x, y });
    }
    return pts;
  }, [selectedIdx]);

  // Check if function stays inside cone
  const isInsideCone = useMemo(() => {
    const fCenter = preset.fn(coneX);
    if (!isFinite(fCenter)) return false;
    for (const pt of curveData) {
      const dist = Math.abs(pt.x - coneX);
      if (dist < 1e-10) continue;
      const maxDev = lipschitzK * dist;
      if (Math.abs(pt.y - fCenter) > maxDev + 0.01) return false;
    }
    return true;
  }, [curveData, coneX, lipschitzK]);

  // Use ref for setConeX to avoid stale closure in drag
  const coneXRef = useRef(setConeX);
  coneXRef.current = setConeX;

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const yExtent = d3.extent(curveData, (d) => d.y) as [number, number];
      const yPad = (yExtent[1] - yExtent[0]) * 0.2 || 0.5;
      const yMin = yExtent[0] - yPad;
      const yMax = yExtent[1] + yPad;

      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      const fCenter = preset.fn(coneX);

      // Draw Lipschitz cone (two lines from center point)
      if (isFinite(fCenter)) {
        const coneColor = isInsideCone ? 'rgba(5, 150, 105, 0.25)' : 'rgba(220, 38, 38, 0.2)';

        // Cone as a filled polygon
        const conePoints: [number, number][] = [];
        // Upper line: y = fCenter + K*(x - coneX)  and  y = fCenter - K*(x - coneX)
        const steps = 100;
        for (let i = 0; i <= steps; i++) {
          const x = xMin + (xMax - xMin) * (i / steps);
          const yUp = fCenter + lipschitzK * (x - coneX);
          conePoints.push([xScale(x), yScale(yUp)]);
        }
        for (let i = steps; i >= 0; i--) {
          const x = xMin + (xMax - xMin) * (i / steps);
          const yDown = fCenter - lipschitzK * (x - coneX);
          conePoints.push([xScale(x), yScale(yDown)]);
        }

        g.append('polygon')
          .attr('points', conePoints.map((p) => p.join(',')).join(' '))
          .style('fill', coneColor)
          .style('stroke', 'none');

        // Cone boundary lines
        const boundaryColor = isInsideCone ? '#059669' : '#DC2626';
        g.append('line')
          .attr('x1', xScale(xMin)).attr('x2', xScale(xMax))
          .attr('y1', yScale(fCenter + lipschitzK * (xMin - coneX)))
          .attr('y2', yScale(fCenter + lipschitzK * (xMax - coneX)))
          .style('stroke', boundaryColor).style('stroke-width', 1.5)
          .style('stroke-dasharray', '6,3');

        g.append('line')
          .attr('x1', xScale(xMin)).attr('x2', xScale(xMax))
          .attr('y1', yScale(fCenter - lipschitzK * (xMin - coneX)))
          .attr('y2', yScale(fCenter - lipschitzK * (xMax - coneX)))
          .style('stroke', boundaryColor).style('stroke-width', 1.5)
          .style('stroke-dasharray', '6,3');
      }

      // Function curve
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));

      g.append('path')
        .datum(curveData)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2.5)
        .attr('d', line);

      // Cone center point (draggable)
      if (isFinite(fCenter)) {
        g.append('circle')
          .attr('cx', xScale(coneX))
          .attr('cy', yScale(fCenter))
          .attr('r', 7)
          .style('fill', '#D97706')
          .style('stroke', '#fff')
          .style('stroke-width', 2)
          .style('cursor', 'ew-resize')
          .call(
            d3.drag<SVGCircleElement, unknown>()
              .on('drag', (event) => {
                const newX = xScale.invert(event.x - margin.left);
                const clamped = Math.max(xMin, Math.min(xMax, newX));
                coneXRef.current(clamped);
              }) as any,
          );
      }

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2).attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('x');
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2).attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('f(x)');
    },
    [curveData, width, height, coneX, lipschitzK, isInsideCone, selectedIdx],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Function:
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="ml-2 px-2 py-1 rounded text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {presets.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          K = {lipschitzK.toFixed(1)}
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={lipschitzK}
            onChange={(e) => setLipschitzK(Number(e.target.value))}
            className="ml-2 w-32"
          />
        </label>

        <span
          className="px-2 py-0.5 rounded text-xs font-semibold"
          style={{
            background: isInsideCone ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)',
            color: isInsideCone ? '#059669' : '#DC2626',
            border: `1px solid ${isInsideCone ? '#059669' : '#DC2626'}`,
          }}
        >
          {isInsideCone ? '✓ Inside cone' : '✗ Outside cone'}
        </span>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: '#D97706' }}>●</span> Drag point to reposition cone
        </span>
        <span>
          {preset.isLipschitz
            ? `This function is ${preset.K}-Lipschitz on its domain`
            : 'This function is NOT Lipschitz (slope → ∞)'}
        </span>
      </div>
    </div>
  );
}
