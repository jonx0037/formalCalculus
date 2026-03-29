import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getSequencePresets } from '../../data/sequences-limits-data';
import { computeEpsilonN, generateSequence } from './shared/limits';
import { functionColors, regionColors } from './shared/colorScales';

const presets = getSequencePresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const MAX_TERMS = 200;

export default function EpsilonNExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [epsilonLog, setEpsilonLog] = useState(-1); // log10(epsilon)
  const [zoomed, setZoomed] = useState(false);

  const preset = presets[selectedIdx];
  const epsilon = Math.pow(10, epsilonLog);

  const data = useMemo(
    () => generateSequence(preset.fn, 1, MAX_TERMS),
    [selectedIdx],
  );

  const N = useMemo(
    () => computeEpsilonN(preset.fn, preset.limit, epsilon, MAX_TERMS),
    [selectedIdx, epsilon],
  );

  const handleEpsilonChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEpsilonLog(Number(e.target.value));
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

      // Compute y domain
      let yMin: number, yMax: number;
      if (zoomed && isFinite(preset.limit)) {
        const pad = epsilon * 3;
        yMin = preset.limit - pad;
        yMax = preset.limit + pad;
      } else {
        const yExtent = d3.extent(data, (d) => d.value) as [number, number];
        const yPad = (yExtent[1] - yExtent[0]) * 0.12 || 0.5;
        yMin = Math.min(yExtent[0] - yPad, preset.limit - epsilon - yPad);
        yMax = Math.max(yExtent[1] + yPad, preset.limit + epsilon + yPad);
      }

      const xScale = d3.scaleLinear().domain([1, MAX_TERMS]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Epsilon band
      const bandTop = yScale(preset.limit + epsilon);
      const bandBottom = yScale(preset.limit - epsilon);
      g.append('rect')
        .attr('x', 0)
        .attr('y', bandTop)
        .attr('width', innerW)
        .attr('height', Math.max(0, bandBottom - bandTop))
        .style('fill', regionColors.epsilonBand)
        .style('opacity', 0.35);

      // Limit line
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', yScale(preset.limit))
        .attr('y2', yScale(preset.limit))
        .style('stroke', functionColors[1])
        .style('stroke-dasharray', '6,4')
        .style('stroke-width', 1.5);

      // N marker
      if (N !== null) {
        const xN = xScale(N);
        g.append('line')
          .attr('x1', xN).attr('x2', xN)
          .attr('y1', 0).attr('y2', innerH)
          .style('stroke', functionColors[2])
          .style('stroke-dasharray', '4,3')
          .style('stroke-width', 1.5);

        g.append('text')
          .attr('x', xN + 4)
          .attr('y', 14)
          .style('fill', functionColors[2])
          .style('font-size', '11px')
          .style('font-weight', '600')
          .text(`N = ${N}`);
      }

      // Data points
      g.selectAll('.point')
        .data(data)
        .join('circle')
        .attr('cx', (d) => xScale(d.n))
        .attr('cy', (d) => yScale(d.value))
        .attr('r', 3)
        .style('fill', (d) => {
          const insideBand = Math.abs(d.value - preset.limit) < epsilon;
          const pastN = N !== null && d.n >= N;
          if (pastN && insideBand) return '#059669'; // green
          if (!insideBand) return '#D97706'; // amber
          return functionColors[0]; // blue — inside band but before N
        })
        .style('opacity', 0.85);

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

      // Labels
      g.append('text')
        .attr('x', innerW / 2).attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('n');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2).attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('aₙ');
    },
    [data, width, height, epsilon, N, zoomed, selectedIdx],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Sequence:
          <select
            value={selectedIdx}
            onChange={(e) => {
              setSelectedIdx(Number(e.target.value));
              setZoomed(false);
            }}
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
          ε = {epsilon.toFixed(epsilon < 0.01 ? 3 : 2)}
          <input
            type="range"
            min={-2}
            max={0}
            step={0.02}
            value={epsilonLog}
            onChange={handleEpsilonChange}
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
          {zoomed ? 'Zoom out' : 'Zoom to ε-band'}
        </button>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: '#059669' }}>●</span> Inside band (n ≥ N)
        </span>
        <span>
          <span style={{ color: '#D97706' }}>●</span> Outside band
        </span>
        <span>
          <span style={{ color: functionColors[0] }}>●</span> Inside band (n &lt; N)
        </span>
        {N !== null && (
          <span className="font-medium" style={{ color: 'var(--color-text)' }}>
            N = {N} for ε = {epsilon.toFixed(3)}
          </span>
        )}
        {N === null && (
          <span className="font-medium" style={{ color: '#D97706' }}>
            No valid N found within {MAX_TERMS} terms
          </span>
        )}
      </div>
    </div>
  );
}
