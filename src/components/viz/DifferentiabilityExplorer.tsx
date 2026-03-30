import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { generateCurve } from './shared/differentiation';
import { getDifferentiabilityPresets } from '../../data/derivative-data';
import { functionColors } from './shared/colorScales';

const presets = getDifferentiabilityPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };

export default function DifferentiabilityExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [activeTab, setActiveTab] = useState(0);
  const [hLog, setHLog] = useState(-0.3); // log10(h)
  const [zoomed, setZoomed] = useState(false);

  const preset = presets[activeTab];
  const h = Math.pow(10, hLog);

  // Generate function curve data
  const curveData = useMemo(() => {
    const isWeierstrass = preset.type === 'weierstrass';
    const numPoints = isWeierstrass ? 2000 : 500;
    const [xMin, xMax] = isWeierstrass ? [-1, 1] : [-2, 2];
    return generateCurve(preset.fn, xMin, xMax, numPoints);
  }, [activeTab]);

  // Compute slopes
  const leftSlope = useMemo(() => {
    const fa = preset.fn(preset.a);
    const fah = preset.fn(preset.a - h);
    return (fa - fah) / h;
  }, [activeTab, h]);

  const rightSlope = useMemo(() => {
    const fa = preset.fn(preset.a);
    const fah = preset.fn(preset.a + h);
    return (fah - fa) / h;
  }, [activeTab, h]);

  const handleHChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setHLog(Number(e.target.value));
  }, []);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const isWeierstrass = preset.type === 'weierstrass';
      const a = preset.a;
      const fa = preset.fn(a);

      // Compute domains
      let xMin: number, xMax: number;

      if (zoomed) {
        const pad = isWeierstrass ? 0.1 : 0.3;
        xMin = a - pad;
        xMax = a + pad;
      } else {
        if (isWeierstrass) {
          xMin = -1;
          xMax = 1;
        } else {
          xMin = -2;
          xMax = 2;
        }
      }

      // Generate zoomed curve data if needed
      const displayData = zoomed
        ? generateCurve(preset.fn, xMin, xMax, isWeierstrass ? 2000 : 500)
        : curveData.filter((d) => d.x >= xMin && d.x <= xMax);

      const yExtent = d3.extent(displayData, (d) => d.y) as [number, number];
      const yPad = (yExtent[1] - yExtent[0]) * 0.12 || 0.5;
      const yMin = yExtent[0] - yPad;
      const yMax = yExtent[1] + yPad;

      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Function curve
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .defined((d) => d.x >= xMin && d.x <= xMax && isFinite(d.y));

      g.append('path')
        .datum(displayData)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', isWeierstrass ? 1.2 : 2)
        .attr('d', line);

      // Left secant line: from (a-h, f(a-h)) to (a, f(a))
      const leftX = a - h;
      const leftY = preset.fn(leftX);
      // Extend the secant line slightly beyond the two points for visibility
      const secantExtend = h * 0.5;

      if (isFinite(leftY) && isFinite(fa)) {
        const lx1 = leftX - secantExtend;
        const ly1 = leftY + leftSlope * (lx1 - leftX);
        const lx2 = a + secantExtend;
        const ly2 = fa + leftSlope * (lx2 - a);

        g.append('line')
          .attr('x1', xScale(lx1))
          .attr('y1', yScale(ly1))
          .attr('x2', xScale(lx2))
          .attr('y2', yScale(ly2))
          .style('stroke', '#DC2626')
          .style('stroke-width', 2)
          .style('stroke-dasharray', '6,3')
          .style('opacity', 0.85);
      }

      // Right secant line: from (a, f(a)) to (a+h, f(a+h))
      const rightX = a + h;
      const rightY = preset.fn(rightX);

      if (isFinite(rightY) && isFinite(fa)) {
        const rx1 = a - secantExtend;
        const ry1 = fa + rightSlope * (rx1 - a);
        const rx2 = rightX + secantExtend;
        const ry2 = rightY + rightSlope * (rx2 - rightX);

        g.append('line')
          .attr('x1', xScale(rx1))
          .attr('y1', yScale(ry1))
          .attr('x2', xScale(rx2))
          .attr('y2', yScale(ry2))
          .style('stroke', '#059669')
          .style('stroke-width', 2)
          .style('stroke-dasharray', '6,3')
          .style('opacity', 0.85);
      }

      // Point at (a, f(a))
      if (isFinite(fa)) {
        g.append('circle')
          .attr('cx', xScale(a))
          .attr('cy', yScale(fa))
          .attr('r', 5)
          .style('fill', functionColors[0])
          .style('stroke', 'var(--color-surface)')
          .style('stroke-width', 2);
      }

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
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
    [curveData, width, height, h, zoomed, activeTab],
  );

  // Determine status message
  const slopeDiff = Math.abs(leftSlope - rightSlope);
  const bothFinite = isFinite(leftSlope) && isFinite(rightSlope);
  let status: string;
  if (!bothFinite) {
    status = 'Not differentiable: slope diverges to infinity';
  } else if (preset.type === 'weierstrass') {
    status = 'Not differentiable: slopes oscillate without settling';
  } else if (slopeDiff < 0.05) {
    status = 'Differentiable: slopes agree';
  } else {
    status = 'Not differentiable: slopes disagree';
  }

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Tab buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map((p, i) => (
          <button
            key={p.name}
            onClick={() => {
              setActiveTab(i);
              setZoomed(false);
            }}
            className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{
              background: activeTab === i ? 'var(--color-primary)' : 'var(--color-surface-alt)',
              color: activeTab === i ? '#fff' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          h = {h.toFixed(h < 0.01 ? 4 : 3)}
          <input
            type="range"
            min={-4}
            max={-0.3}
            step={0.02}
            value={hLog}
            onChange={handleHChange}
            className="ml-2 w-36"
          />
        </label>

        <button
          onClick={() => setZoomed((z) => !z)}
          className="px-3 py-1 rounded text-xs font-medium"
          style={{
            background: zoomed ? 'var(--color-primary)' : 'var(--color-surface-alt)',
            color: zoomed ? '#fff' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          {zoomed ? 'Zoom out' : 'Zoom to neighborhood'}
        </button>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      {/* Numerical readout */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>h = {h.toFixed(h < 0.001 ? 5 : 4)}</span>
        <span>
          <span style={{ color: '#DC2626' }}>●</span> Left slope: {isFinite(leftSlope) ? leftSlope.toFixed(4) : '±∞'}
        </span>
        <span>
          <span style={{ color: '#059669' }}>●</span> Right slope: {isFinite(rightSlope) ? rightSlope.toFixed(4) : '±∞'}
        </span>
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
          {status}
        </span>
      </div>

      {/* Explanation */}
      <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {preset.explanation}
      </p>
    </div>
  );
}
