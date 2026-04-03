import { useState, useMemo, useCallback, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { simpsonRule } from './shared/integration';
import { FUBINI_PRESETS } from '../../data/multiple-integrals-data';
import { functionColors } from './shared/colorScales';

const presets = FUBINI_PRESETS;
const margin = { top: 20, right: 20, bottom: 40, left: 55 };
const GAP = 24;
const N_QUAD = 100;

export default function FubiniOrderExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const panelW = (width - GAP) / 2 - margin.left - margin.right;
  const panelH = Math.min(panelW * 0.9, 300);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [slicePos, setSlicePos] = useState(0.5);
  const [playing, setPlaying] = useState(false);

  const preset = presets[selectedIdx];
  const [xMin, xMax] = preset.domain.x;
  const [yMin, yMax] = preset.domain.y;

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setSlicePos(0.5);
    setPlaying(false);
  }, []);

  // Animate slice sweep
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setSlicePos((prev) => {
        const next = prev + 0.02;
        if (next > 1) { setPlaying(false); return 0; }
        return next;
      });
    }, 50);
    return () => clearInterval(id);
  }, [playing]);

  // Current slice values
  const currentX = xMin + slicePos * (xMax - xMin);
  const currentY = yMin + slicePos * (yMax - yMin);
  const currentAx = simpsonRule((y: number) => preset.f(currentX, y), yMin, yMax, N_QUAD).value;
  const currentBy = simpsonRule((x: number) => preset.f(x, currentY), xMin, xMax, N_QUAD).value;

  // Heatmap data for both panels
  const heatmapData = useMemo(() => {
    const nGrid = 40;
    const cells: { x: number; y: number; f: number }[] = [];
    for (let i = 0; i < nGrid; i++) {
      for (let j = 0; j < nGrid; j++) {
        const x = xMin + (i + 0.5) / nGrid * (xMax - xMin);
        const y = yMin + (j + 0.5) / nGrid * (yMax - yMin);
        cells.push({ x, y, f: preset.f(x, y) });
      }
    }
    return cells;
  }, [selectedIdx]);

  const fExtent = d3.extent(heatmapData, (d) => d.f) as [number, number];
  const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain(fExtent);

  // Panel renderer
  const renderPanel = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    order: 'xy' | 'yx',
  ) => {
    svg.selectAll('*').remove();
    if (panelW <= 0 || panelH <= 0) return;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, panelW]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([panelH, 0]);
    const cellW = panelW / 40;
    const cellH = panelH / 40;

    // Heatmap
    g.selectAll('rect.cell')
      .data(heatmapData)
      .join('rect')
      .attr('x', (d) => xScale(d.x) - cellW / 2)
      .attr('y', (d) => yScale(d.y) - cellH / 2)
      .attr('width', cellW)
      .attr('height', cellH)
      .style('fill', (d) => colorScale(d.f))
      .style('opacity', 0.7);

    // Slice line
    if (order === 'xy') {
      const xPx = xScale(currentX);
      g.append('line')
        .attr('x1', xPx).attr('x2', xPx)
        .attr('y1', 0).attr('y2', panelH)
        .style('stroke', functionColors[0]).style('stroke-width', 2.5)
        .style('stroke-dasharray', '6,3');
    } else {
      const yPx = yScale(currentY);
      g.append('line')
        .attr('x1', 0).attr('x2', panelW)
        .attr('y1', yPx).attr('y2', yPx)
        .style('stroke', functionColors[1]).style('stroke-width', 2.5)
        .style('stroke-dasharray', '6,3');
    }

    // Axes
    g.append('g').attr('transform', `translate(0,${panelH})`).call(d3.axisBottom(xScale).ticks(4));
    g.append('g').call(d3.axisLeft(yScale).ticks(4));

    // Title
    g.append('text')
      .attr('x', panelW / 2).attr('y', -5)
      .style('fill', 'currentColor').style('font-size', '12px').style('text-anchor', 'middle')
      .text(order === 'xy' ? '∫dy then ∫dx (vertical slices)' : '∫dx then ∫dy (horizontal slices)');
  };

  const leftRef = useD3<SVGSVGElement>((svg) => renderPanel(svg, 'xy'),
    [selectedIdx, slicePos, width, panelH, heatmapData]);
  const rightRef = useD3<SVGSVGElement>((svg) => renderPanel(svg, 'yx'),
    [selectedIdx, slicePos, width, panelH, heatmapData]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px', fontSize: '14px' }}>
        <label>
          Function:{' '}
          <select value={selectedIdx} onChange={handlePresetChange}>
            {presets.map((p, i) => <option key={p.name} value={i}>{p.label}</option>)}
          </select>
        </label>
        <label>
          Slice: {(slicePos * 100).toFixed(0)}%{' '}
          <input type="range" min={0} max={100} value={slicePos * 100}
            onChange={(e) => { setSlicePos(Number(e.target.value) / 100); setPlaying(false); }} />
        </label>
        <button onClick={() => { setSlicePos(0); setPlaying(true); }} style={{ cursor: 'pointer' }}>
          {playing ? '⏸ Pause' : '▶ Sweep'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '8px', fontSize: '13px', fontFamily: 'var(--font-mono, monospace)' }}>
        <span style={{ color: functionColors[0] }}>A(x={currentX.toFixed(2)}) = {currentAx.toFixed(4)}</span>
        <span style={{ color: functionColors[1] }}>B(y={currentY.toFixed(2)}) = {currentBy.toFixed(4)}</span>
        <span>Exact: {preset.exactIntegral.toFixed(4)}</span>
      </div>

      <div style={{ display: 'flex', gap: `${GAP}px` }}>
        <svg ref={leftRef} width={panelW + margin.left + margin.right} height={panelH + margin.top + margin.bottom} />
        <svg ref={rightRef} width={panelW + margin.left + margin.right} height={panelH + margin.top + margin.bottom} />
      </div>
    </div>
  );
}
