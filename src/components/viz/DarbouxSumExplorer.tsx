import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { uniformPartition, refinePartition, darbouxSums } from './shared/integration';
import { getDarbouxPresets } from '../../data/riemann-integral-data';
import { functionColors, regionColors } from './shared/colorScales';

const presets = getDarbouxPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 55 };
const CURVE_PTS = 400;

export default function DarbouxSumExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 400);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [partState, setPartState] = useState(() => uniformPartition(presets[0].domain[0], presets[0].domain[1], 4));
  const [showGap, setShowGap] = useState(true);

  const preset = presets[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    const p = presets[idx];
    setPartState(uniformPartition(p.domain[0], p.domain[1], 4));
  }, []);

  const handleRefine = useCallback(() => {
    setPartState((prev) => {
      // Find widest subinterval and split at its midpoint
      let maxW = 0;
      let maxI = 0;
      for (let i = 0; i < prev.widths.length; i++) {
        if (prev.widths[i] > maxW) { maxW = prev.widths[i]; maxI = i; }
      }
      const mid = (prev.points[maxI] + prev.points[maxI + 1]) / 2;
      return refinePartition(prev, mid);
    });
  }, []);

  const handleReset = useCallback(() => {
    setPartState(uniformPartition(preset.domain[0], preset.domain[1], 4));
  }, [selectedIdx]);

  // Function curve
  const curveData = useMemo(() => {
    const [a, b] = preset.domain;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < CURVE_PTS; i++) {
      const x = a + (i / (CURVE_PTS - 1)) * (b - a);
      pts.push({ x, y: preset.f(x) });
    }
    return pts;
  }, [selectedIdx]);

  // Darboux sums
  const dResult = useMemo(() => {
    return darbouxSums(preset.f, partState);
  }, [selectedIdx, partState]);

  const exact = useMemo(() => {
    const [a, b] = preset.domain;
    return preset.exactIntegral(a, b);
  }, [selectedIdx]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 50) return;

      const iw = width - margin.left - margin.right;
      const ih = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const [a, b] = preset.domain;
      const yVals = curveData.map((d) => d.y);
      const yMin = Math.min(d3.min(yVals) ?? 0, 0);
      const yMax = (d3.max(yVals) ?? 1) * 1.15;

      const xScale = d3.scaleLinear().domain([a, b]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([ih, 0]);

      // Axes
      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.append('g').call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.selectAll('.domain, .tick line').style('stroke', 'var(--color-border)');

      // Lower sum rectangles (green)
      for (const iv of dResult.intervals) {
        const barH = Math.max(0, yScale(0) - yScale(iv.infimum));
        g.append('rect')
          .attr('x', xScale(iv.x))
          .attr('y', yScale(Math.max(iv.infimum, 0)))
          .attr('width', Math.max(0, xScale(iv.x + iv.width) - xScale(iv.x)))
          .attr('height', barH)
          .style('fill', regionColors.integralFill)
          .style('fill-opacity', 0.4)
          .style('stroke', functionColors[2])
          .style('stroke-width', 0.6);
      }

      // Upper sum rectangles (red)
      for (const iv of dResult.intervals) {
        const barH = Math.max(0, yScale(0) - yScale(iv.supremum));
        g.append('rect')
          .attr('x', xScale(iv.x))
          .attr('y', yScale(Math.max(iv.supremum, 0)))
          .attr('width', Math.max(0, xScale(iv.x + iv.width) - xScale(iv.x)))
          .attr('height', barH)
          .style('fill', regionColors.errorFill)
          .style('fill-opacity', 0.25)
          .style('stroke', functionColors[1])
          .style('stroke-width', 0.6);
      }

      // Gap shading (between upper and lower)
      if (showGap) {
        for (const iv of dResult.intervals) {
          const gapH = Math.abs(yScale(iv.infimum) - yScale(iv.supremum));
          g.append('rect')
            .attr('x', xScale(iv.x))
            .attr('y', yScale(iv.supremum))
            .attr('width', Math.max(0, xScale(iv.x + iv.width) - xScale(iv.x)))
            .attr('height', gapH)
            .style('fill', '#FBBF24')
            .style('fill-opacity', 0.3);
        }
      }

      // Function curve
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));
      g.append('path')
        .datum(curveData)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', functionColors[0])
        .style('stroke-width', 2.5);

      // Label
      g.append('text')
        .attr('x', iw / 2).attr('y', -4)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '13px')
        .text(`Darboux Sums  —  ${preset.label}, n = ${partState.n}`);
    },
    [width, selectedIdx, partState, showGap, curveData, dResult],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span style={{ color: 'var(--color-text-muted)' }}>Function:</span>
          <select
            value={selectedIdx}
            onChange={handlePresetChange}
            className="rounded border px-2 py-1"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
          >
            {presets.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <button
          onClick={handleRefine}
          className="px-3 py-0.5 rounded text-xs border"
          style={{ borderColor: functionColors[0], background: functionColors[0], color: '#fff' }}
        >
          + Refine
        </button>

        <button
          onClick={handleReset}
          className="px-3 py-0.5 rounded text-xs border"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
        >
          Reset (n=4)
        </button>

        <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <input type="checkbox" checked={showGap} onChange={(e) => setShowGap(e.target.checked)} />
          Show gap
        </label>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      {/* Readout */}
      <div
        className="flex flex-wrap gap-4 px-3 py-2 rounded text-sm mt-2"
        style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
      >
        <span>L(f, P) = <strong>{dResult.lowerSum.toFixed(6)}</strong></span>
        <span>U(f, P) = <strong>{dResult.upperSum.toFixed(6)}</strong></span>
        <span>Gap = <strong>{dResult.gap.toExponential(3)}</strong></span>
        <span>Exact = <strong>{exact.toFixed(6)}</strong></span>
        <span>Mesh = <strong>{partState.mesh.toFixed(4)}</strong></span>
      </div>
    </div>
  );
}
