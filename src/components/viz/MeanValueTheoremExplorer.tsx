import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  generateCurve,
  computeSecant,
  computeTangent,
  tangentLineAt,
  secantLineAt,
  findMVTPoint,
  findAllMVTPoints,
} from './shared/differentiation';
import { getMVTPresets } from '../../data/mean-value-taylor-data';
import { functionColors } from './shared/colorScales';

const presets = getMVTPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };

export default function MeanValueTheoremExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [a, setA] = useState(presets[0].defaultA);
  const [b, setB] = useState(presets[0].defaultB);
  const [showAllPoints, setShowAllPoints] = useState(false);

  const preset = presets[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setA(presets[idx].defaultA);
    setB(presets[idx].defaultB);
    setShowAllPoints(false);
  }, []);

  const handleAChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setA(Number(e.target.value));
  }, []);

  const handleBChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setB(Number(e.target.value));
  }, []);

  const handleShowAllChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setShowAllPoints(e.target.checked);
  }, []);

  // Generate function curve data
  const curveData = useMemo(() => {
    return generateCurve(preset.fn, preset.domain[0], preset.domain[1], 500);
  }, [selectedIdx]);

  // Compute secant line
  const secant = useMemo(() => {
    return computeSecant(preset.fn, a, b - a);
  }, [selectedIdx, a, b]);

  // Find MVT point(s)
  const mvtPoints = useMemo(() => {
    if (showAllPoints) {
      return findAllMVTPoints(preset.fn, preset.derivative, a, b);
    }
    const single = findMVTPoint(preset.fn, preset.derivative, a, b);
    return single ? [single] : [];
  }, [selectedIdx, a, b, showAllPoints]);

  // Secant slope
  const secantSlope = b !== a ? (preset.fn(b) - preset.fn(a)) / (b - a) : 0;

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Clipping rectangle
      g.append('defs')
        .append('clipPath')
        .attr('id', 'mvt-clip')
        .append('rect')
        .attr('width', innerW)
        .attr('height', innerH);

      const clipped = g.append('g').attr('clip-path', 'url(#mvt-clip)');

      // Scales
      const [xMin, xMax] = preset.domain;
      const yExtent = d3.extent(curveData, (d) => d.y);
      if (yExtent[0] === undefined || yExtent[1] === undefined) return;
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

      clipped.append('path')
        .datum(curveData.filter((d) => d.x >= xMin && d.x <= xMax))
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2)
        .attr('d', line);

      // Secant line (amber, dashed) — extend across domain
      const secY1 = secantLineAt(secant, xMin);
      const secY2 = secantLineAt(secant, xMax);
      clipped.append('line')
        .attr('x1', xScale(xMin))
        .attr('y1', yScale(secY1))
        .attr('x2', xScale(xMax))
        .attr('y2', yScale(secY2))
        .style('stroke', '#F59E0B')
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '6,4');

      // Endpoint markers at (a, f(a)) and (b, f(b))
      const fa = preset.fn(a);
      const fb = preset.fn(b);

      if (isFinite(fa)) {
        clipped.append('circle')
          .attr('cx', xScale(a))
          .attr('cy', yScale(fa))
          .attr('r', 5)
          .style('fill', '#F59E0B')
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      }
      if (isFinite(fb)) {
        clipped.append('circle')
          .attr('cx', xScale(b))
          .attr('cy', yScale(fb))
          .attr('r', 5)
          .style('fill', '#F59E0B')
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      }

      // MVT point(s): tangent lines, markers, vertical guidelines
      for (const mvt of mvtPoints) {
        const c = mvt.c;
        const fc = preset.fn(c);

        // Tangent line at c (red, dashed) — extends across domain
        const tan = computeTangent(preset.fn, preset.derivative, c);
        const tanY1 = tangentLineAt(tan, xMin);
        const tanY2 = tangentLineAt(tan, xMax);
        clipped.append('line')
          .attr('x1', xScale(xMin))
          .attr('y1', yScale(tanY1))
          .attr('x2', xScale(xMax))
          .attr('y2', yScale(tanY2))
          .style('stroke', functionColors[1])
          .style('stroke-width', 1.5)
          .style('stroke-dasharray', '4,3');

        // Vertical guideline from (c, 0) to (c, f(c))
        if (isFinite(fc)) {
          const yBase = Math.max(yMin, Math.min(yMax, 0));
          clipped.append('line')
            .attr('x1', xScale(c))
            .attr('y1', yScale(yBase))
            .attr('x2', xScale(c))
            .attr('y2', yScale(fc))
            .style('stroke', 'var(--color-text-muted)')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.4);
        }

        // Marker at (c, f(c)) — green
        if (isFinite(fc)) {
          clipped.append('circle')
            .attr('cx', xScale(c))
            .attr('cy', yScale(fc))
            .attr('r', 5)
            .style('fill', functionColors[2])
            .style('stroke', '#fff')
            .style('stroke-width', 1.5);
        }
      }

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .call((sel) => {
          sel.select('.domain').style('stroke', 'var(--color-border)');
          sel.selectAll('.tick line').style('stroke', 'var(--color-border)');
          sel.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .call((sel) => {
          sel.select('.domain').style('stroke', 'var(--color-border)');
          sel.selectAll('.tick line').style('stroke', 'var(--color-border)');
          sel.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
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
    [width, height, a, b, selectedIdx, showAllPoints],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Function:
          <select
            value={selectedIdx}
            onChange={handlePresetChange}
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
          a = {a.toFixed(2)}
          <input
            type="range"
            min={preset.domain[0]}
            max={b - 0.1}
            step={0.01}
            value={a}
            onChange={handleAChange}
            className="ml-2 w-28"
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          b = {b.toFixed(2)}
          <input
            type="range"
            min={a + 0.1}
            max={preset.domain[1]}
            step={0.01}
            value={b}
            onChange={handleBChange}
            className="ml-2 w-28"
          />
        </label>

        <label className="text-sm flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
          <input
            type="checkbox"
            checked={showAllPoints}
            onChange={handleShowAllChange}
          />
          Show all MVT points
        </label>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: functionColors[0] }}>&#9644;</span> f(x)
        </span>
        <span>
          <span style={{ color: '#F59E0B' }}>- -</span> Secant
        </span>
        <span>
          <span style={{ color: functionColors[1] }}>- -</span> Tangent
        </span>
        <span>
          <span style={{ color: functionColors[2] }}>&#9679;</span> MVT point
        </span>
      </div>

      <div className="mt-2 text-xs" style={{ color: 'var(--color-text)' }}>
        <span className="font-medium">
          Secant slope: {secantSlope.toFixed(4)}
        </span>
        {mvtPoints.length > 0 ? (
          mvtPoints.map((mvt, i) => (
            <span key={i} className="ml-4">
              c{mvtPoints.length > 1 ? <sub>{i + 1}</sub> : ''} = {mvt.c.toFixed(4)}
              {' · '}f&apos;(c{mvtPoints.length > 1 ? <sub>{i + 1}</sub> : ''}) = {mvt.fPrimeC.toFixed(4)}
            </span>
          ))
        ) : (
          <span className="ml-4 italic" style={{ color: 'var(--color-text-muted)' }}>
            No MVT point found
          </span>
        )}
      </div>
    </div>
  );
}
