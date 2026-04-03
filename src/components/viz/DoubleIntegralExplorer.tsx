import { useState, useMemo, useCallback, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { doubleRiemannSum } from './shared/integration';
import { DOUBLE_INTEGRAL_PRESETS } from '../../data/multiple-integrals-data';
import { functionColors } from './shared/colorScales';

const presets = DOUBLE_INTEGRAL_PRESETS;
const margin = { top: 20, right: 20, bottom: 40, left: 55 };
const GAP = 32;

type SampleRule = 'lower-left' | 'center' | 'random';

export default function DoubleIntegralExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.75, 600);
  const leftW = (width - GAP - margin.left - margin.right * 2) * 0.55;
  const rightW = width - leftW - GAP - margin.left - margin.right;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [n, setN] = useState(8);
  const [sampleRule, setSampleRule] = useState<SampleRule>('center');
  const [playing, setPlaying] = useState(false);

  const preset = presets[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setN(8);
    setPlaying(false);
  }, []);

  // Animation
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setN((prev) => {
        const next = prev < 20 ? prev + 1 : prev < 40 ? prev + 2 : prev + 5;
        if (next > 40) { setPlaying(false); return 40; }
        return next;
      });
    }, 200);
    return () => clearInterval(id);
  }, [playing]);

  // Riemann sum computation
  const rsResult = useMemo(() => {
    return doubleRiemannSum(preset.f, preset.domain.x, preset.domain.y, n, n, sampleRule);
  }, [selectedIdx, n, sampleRule]);

  // Convergence data: error vs n
  const convergenceData = useMemo(() => {
    if (preset.exactIntegral === null) return null;
    const exact = preset.exactIntegral;
    const nValues = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40];
    return nValues.map((nVal) => {
      const result = doubleRiemannSum(preset.f, preset.domain.x, preset.domain.y, nVal, nVal, 'center');
      const error = Math.abs(result.value - exact);
      return { n: nVal, error: Math.max(error, 1e-16) };
    });
  }, [selectedIdx]);

  const exact = preset.exactIntegral;
  const error = exact !== null ? Math.abs(rsResult.value - exact) : null;

  // ─── Heatmap SVG ────────────────────────────────────────
  const heatmapRef = useD3<SVGSVGElement>((svg) => {
    svg.selectAll('*').remove();
    if (leftW <= 0 || totalHeight <= 0) return;

    const w = leftW;
    const h = totalHeight - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const [xMin, xMax] = preset.domain.x;
    const [yMin, yMax] = preset.domain.y;
    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, w]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([h, 0]);

    // Color scale for f values
    const fValues = rsResult.cells.map((c) => c.fValue);
    const fMin = d3.min(fValues) ?? 0;
    const fMax = d3.max(fValues) ?? 1;
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([fMin, fMax]);

    // Draw cells
    g.selectAll('rect.cell')
      .data(rsResult.cells)
      .join('rect')
      .attr('class', 'cell')
      .attr('x', (d) => xScale(d.x))
      .attr('y', (d) => yScale(d.y + d.height))
      .attr('width', (d) => Math.max(1, xScale(d.x + d.width) - xScale(d.x) - 0.5))
      .attr('height', (d) => Math.max(1, yScale(d.y) - yScale(d.y + d.height) - 0.5))
      .style('fill', (d) => colorScale(d.fValue))
      .style('stroke', '#fff')
      .style('stroke-width', n <= 20 ? 0.5 : 0);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .append('text')
      .attr('x', w / 2).attr('y', 32)
      .style('fill', 'currentColor').style('font-size', '12px').style('text-anchor', 'middle')
      .text('x');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -h / 2).attr('y', -40)
      .style('fill', 'currentColor').style('font-size', '12px').style('text-anchor', 'middle')
      .text('y');

    // Title
    g.append('text')
      .attr('x', w / 2).attr('y', -5)
      .style('fill', 'currentColor').style('font-size', '13px').style('text-anchor', 'middle')
      .text(`${n}×${n} = ${n * n} sub-rectangles`);
  }, [selectedIdx, n, sampleRule, width, totalHeight]);

  // ─── Convergence SVG ─────────────────────────────────────
  const convRef = useD3<SVGSVGElement>((svg) => {
    svg.selectAll('*').remove();
    if (!convergenceData || rightW <= 0 || totalHeight <= 0) return;

    const w = rightW;
    const h = totalHeight - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLog().domain([2, 40]).range([0, w]);
    const yScale = d3.scaleLog()
      .domain([Math.max(1e-6, d3.min(convergenceData, (d) => d.error) ?? 1e-6), d3.max(convergenceData, (d) => d.error) ?? 1])
      .range([h, 0]);

    // Reference line: O(1/n²)
    const refData = convergenceData.map((d) => ({
      n: d.n,
      error: convergenceData[0].error * (convergenceData[0].n / d.n) ** 2,
    }));

    g.append('path')
      .datum(refData)
      .attr('fill', 'none')
      .style('stroke', '#9CA3AF')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '4,4')
      .attr('d', d3.line<{ n: number; error: number }>()
        .x((d) => xScale(d.n))
        .y((d) => yScale(Math.max(1e-16, d.error)))
      );

    // Error line
    g.append('path')
      .datum(convergenceData)
      .attr('fill', 'none')
      .style('stroke', functionColors[0])
      .style('stroke-width', 2)
      .attr('d', d3.line<{ n: number; error: number }>()
        .x((d) => xScale(d.n))
        .y((d) => yScale(d.error))
      );

    // Current n marker
    const currentError = error ?? 0;
    if (currentError > 0) {
      g.append('circle')
        .attr('cx', xScale(n))
        .attr('cy', yScale(Math.max(1e-16, currentError)))
        .attr('r', 5)
        .style('fill', functionColors[1]);
    }

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(5, '~s'))
      .append('text')
      .attr('x', w / 2).attr('y', 32)
      .style('fill', 'currentColor').style('font-size', '12px').style('text-anchor', 'middle')
      .text('n (subdivisions per axis)');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5, '.0e'))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -h / 2).attr('y', -45)
      .style('fill', 'currentColor').style('font-size', '12px').style('text-anchor', 'middle')
      .text('|error|');

    g.append('text')
      .attr('x', w / 2).attr('y', -5)
      .style('fill', 'currentColor').style('font-size', '13px').style('text-anchor', 'middle')
      .text('Convergence (log-log)');

    // Legend
    g.append('text')
      .attr('x', w - 10).attr('y', 20)
      .style('fill', '#9CA3AF').style('font-size', '10px').style('text-anchor', 'end')
      .text('-- O(1/n²)');
  }, [selectedIdx, n, width, totalHeight, convergenceData, error]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px', fontSize: '14px' }}>
        <label>
          Function:{' '}
          <select value={selectedIdx} onChange={handlePresetChange}>
            {presets.map((p, i) => <option key={p.name} value={i}>{p.label}</option>)}
          </select>
        </label>
        <label>
          n = {n}{' '}
          <input type="range" min={2} max={40} value={n} onChange={(e) => { setN(Number(e.target.value)); setPlaying(false); }} />
        </label>
        <label>
          Sample:{' '}
          <select value={sampleRule} onChange={(e) => setSampleRule(e.target.value as SampleRule)}>
            <option value="center">Center</option>
            <option value="lower-left">Lower-left</option>
            <option value="random">Random</option>
          </select>
        </label>
        <button onClick={() => { setN(2); setPlaying(true); }} style={{ cursor: 'pointer' }}>
          {playing ? '⏸ Pause' : '▶ Animate'}
        </button>
      </div>

      {/* Readout */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '8px', fontSize: '13px', fontFamily: 'var(--font-mono, monospace)' }}>
        <span>Boxes: {n * n}</span>
        <span>Sum: {rsResult.value.toFixed(6)}</span>
        {exact !== null && <span>Exact: {exact.toFixed(6)}</span>}
        {error !== null && <span>Error: {error.toExponential(2)}</span>}
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'flex', gap: `${GAP}px` }}>
        <svg ref={heatmapRef} width={leftW + margin.left + margin.right} height={totalHeight} />
        {convergenceData && (
          <svg ref={convRef} width={rightW + margin.left + margin.right} height={totalHeight} />
        )}
      </div>

      {preset.mlNote && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
          ML: {preset.mlNote}
        </div>
      )}
    </div>
  );
}
