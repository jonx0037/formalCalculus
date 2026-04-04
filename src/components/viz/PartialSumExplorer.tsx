import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computePartialSums, computeEpsilonN } from './shared/series';
import { getSeriesPresets } from '../../data/series-convergence-data';
import { functionColors, regionColors } from './shared/colorScales';

const presets = getSeriesPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };

export default function PartialSumExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [maxN, setMaxN] = useState(100);
  const [epsilonLog, setEpsilonLog] = useState(-1);
  const [showTerms, setShowTerms] = useState(true);

  const preset = presets[selectedIdx];
  const epsilon = Math.pow(10, epsilonLog);

  const data = useMemo(
    () => computePartialSums(preset.term, maxN, preset.exactSum ?? undefined),
    [selectedIdx, maxN],
  );

  // For convergent series with known sum, compute N for epsilon-band
  const N = useMemo(() => {
    if (!preset.converges || preset.exactSum === null) return null;
    // Use partial sum sequence as the "sequence" for epsilon-N
    const partialSumFn = (n: number): number => {
      let s = 0;
      for (let k = 1; k <= n; k++) s += preset.term(k);
      return s;
    };
    return computeEpsilonN(partialSumFn, preset.exactSum, epsilon, maxN);
  }, [selectedIdx, epsilon, maxN]);

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
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

      // X scale: term index
      const xScale = d3.scaleLinear().domain([1, maxN]).range([0, innerW]);

      // Y scale: from partial sums (and terms if shown)
      const snValues = data.map((d) => d.Sn);
      const allValues = showTerms ? [...snValues, ...data.map((d) => d.an)] : snValues;
      if (preset.exactSum !== null) allValues.push(preset.exactSum);

      const yExtent = d3.extent(allValues.filter((v) => isFinite(v))) as [number, number];
      const yRange = yExtent[1] - yExtent[0];
      const yPad = (yRange * 0.12) || 0.5;
      const yMin = yExtent[0] - yPad;
      const yMax = yExtent[1] + yPad;
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Epsilon band (only for convergent series with known sum)
      if (preset.converges && preset.exactSum !== null) {
        const bandTop = yScale(preset.exactSum + epsilon);
        const bandBottom = yScale(preset.exactSum - epsilon);
        g.append('rect')
          .attr('x', 0)
          .attr('y', Math.max(0, bandTop))
          .attr('width', innerW)
          .attr('height', Math.max(0, Math.min(innerH, bandBottom) - Math.max(0, bandTop)))
          .style('fill', regionColors.epsilonBand)
          .style('opacity', 0.35);

        // Sum line
        g.append('line')
          .attr('x1', 0).attr('x2', innerW)
          .attr('y1', yScale(preset.exactSum))
          .attr('y2', yScale(preset.exactSum))
          .style('stroke', '#059669')
          .style('stroke-dasharray', '6,4')
          .style('stroke-width', 1.5);
      }

      // N marker
      if (N !== null) {
        const xN = xScale(N);
        g.append('line')
          .attr('x1', xN).attr('x2', xN)
          .attr('y1', 0).attr('y2', innerH)
          .style('stroke', '#059669')
          .style('stroke-dasharray', '4,3')
          .style('stroke-width', 1.5);

        g.append('text')
          .attr('x', xN + 4)
          .attr('y', 14)
          .style('fill', '#059669')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .text(`N = ${N}`);
      }

      // Partial sum line
      const line = d3.line<{ n: number; Sn: number }>()
        .x((d) => xScale(d.n))
        .y((d) => yScale(d.Sn))
        .defined((d) => isFinite(d.Sn));

      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2)
        .attr('d', line as any);

      // Term scatter (toggleable)
      if (showTerms) {
        g.selectAll('.term-point')
          .data(data)
          .join('circle')
          .attr('class', 'term-point')
          .attr('cx', (d) => xScale(d.n))
          .attr('cy', (d) => yScale(d.an))
          .attr('r', 2)
          .style('fill', 'var(--color-text-muted)')
          .style('opacity', 0.5);
      }

      // Color partial-sum points by convergence status
      if (preset.converges && preset.exactSum !== null) {
        g.selectAll('.sum-point')
          .data(data)
          .join('circle')
          .attr('class', 'sum-point')
          .attr('cx', (d) => xScale(d.n))
          .attr('cy', (d) => yScale(d.Sn))
          .attr('r', 2.5)
          .style('fill', (d) => {
            const inside = Math.abs(d.Sn - preset.exactSum!) < epsilon;
            const pastN = N !== null && d.n >= N;
            if (pastN && inside) return '#059669';
            if (!inside) return '#D97706';
            return functionColors[0];
          })
          .style('opacity', 0.8);
      }

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(Math.min(8, Math.floor(innerW / 60))))
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
        .text('n');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2).attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '12px')
        .text('Sₙ');
    },
    [data, width, height, epsilon, N, showTerms, selectedIdx, maxN],
  );

  const lastS = data.length > 0 ? data[data.length - 1].Sn : 0;
  const errorStr = preset.exactSum !== null
    ? Math.abs(lastS - preset.exactSum).toExponential(3)
    : '—';

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Series:
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
          Terms: {maxN}
          <input
            type="range" min={5} max={500} step={5} value={maxN}
            onChange={(e) => setMaxN(Number(e.target.value))}
            className="ml-2 w-28"
          />
        </label>

        {preset.converges && preset.exactSum !== null && (
          <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            ε = {epsilon.toFixed(epsilon < 0.01 ? 3 : 2)}
            <input
              type="range" min={-3} max={0} step={0.05} value={epsilonLog}
              onChange={(e) => setEpsilonLog(Number(e.target.value))}
              className="ml-2 w-28"
            />
          </label>
        )}

        <label className="text-sm flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
          <input
            type="checkbox" checked={showTerms}
            onChange={(e) => setShowTerms(e.target.checked)}
          />
          Show aₙ
        </label>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span><span style={{ color: functionColors[0] }}>─</span> Sₙ (partial sums)</span>
        {showTerms && <span><span style={{ color: 'var(--color-text-muted)' }}>●</span> aₙ (terms)</span>}
        {preset.converges && preset.exactSum !== null && (
          <>
            <span><span style={{ color: '#059669' }}>─ ─</span> S = {preset.exactSum.toFixed(4)}</span>
            {N !== null && <span><span style={{ color: '#059669' }}>│</span> N = {N} for ε = {epsilon.toFixed(3)}</span>}
          </>
        )}
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
          S_{maxN} = {lastS.toFixed(6)} · |error| = {errorStr}
        </span>
      </div>
    </div>
  );
}
