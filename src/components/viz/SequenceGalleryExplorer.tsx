import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getSequencePresets } from '../../data/sequences-limits-data';
import { generateSequence } from './shared/limits';
import { functionColors } from './shared/colorScales';

const presets = getSequencePresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };

export default function SequenceGalleryExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 420);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [maxN, setMaxN] = useState(50);

  const preset = presets[selectedIdx];

  const data = useMemo(
    () => generateSequence(preset.fn, 1, maxN),
    [selectedIdx, maxN],
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

      // Scales
      const xScale = d3.scaleLinear().domain([1, maxN]).range([0, innerW]);
      const yExtent = d3.extent(data, (d) => d.value) as [number, number];
      const yPad = (yExtent[1] - yExtent[0]) * 0.15 || 0.5;
      const yMin = Math.min(yExtent[0] - yPad, preset.limit - yPad);
      const yMax = Math.max(yExtent[1] + yPad, preset.limit + yPad);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Grid
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .call((axis) => {
          axis.select('.domain').style('stroke', 'var(--color-border)');
          axis.selectAll('.tick line').style('stroke', 'var(--color-border)');
          axis.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .call((axis) => {
          axis.select('.domain').style('stroke', 'var(--color-border)');
          axis.selectAll('.tick line').style('stroke', 'var(--color-border)');
          axis.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      // Limit line
      if (isFinite(preset.limit)) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yScale(preset.limit))
          .attr('y2', yScale(preset.limit))
          .style('stroke', functionColors[1])
          .style('stroke-dasharray', '6,4')
          .style('stroke-width', 1.5)
          .style('opacity', 0.7);

        g.append('text')
          .attr('x', innerW - 4)
          .attr('y', yScale(preset.limit) - 6)
          .attr('text-anchor', 'end')
          .style('fill', functionColors[1])
          .style('font-size', '11px')
          .text(`L = ${preset.limit === Math.E ? 'e ≈ 2.718' : preset.limit}`);
      }

      // Data points
      g.selectAll('.point')
        .data(data)
        .join('circle')
        .attr('cx', (d) => xScale(d.n))
        .attr('cy', (d) => yScale(d.value))
        .attr('r', maxN > 100 ? 2 : 3.5)
        .style('fill', functionColors[0])
        .style('opacity', 0.8);

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('n');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('aₙ');
    },
    [data, width, height, maxN, selectedIdx],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Sequence:
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
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Max n: {maxN}
          <input
            type="range"
            min={10}
            max={200}
            value={maxN}
            onChange={(e) => setMaxN(Number(e.target.value))}
            className="ml-2 w-32"
          />
        </label>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <p className="text-xs mt-2 italic" style={{ color: 'var(--color-text-muted)' }}>
        {preset.mlNote}
      </p>
    </div>
  );
}
