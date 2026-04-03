import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { marginalDensity } from './shared/multivariate';
import { DENSITY_PRESETS } from '../../data/multiple-integrals-data';
import { functionColors } from './shared/colorScales';

const presets = DENSITY_PRESETS;
const GRID_N = 60;
const MARGINAL_N = 80;

export default function MarginalDensityExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();

  // Layout: main heatmap square + bottom marginal strip + right marginal strip
  const mainSize = Math.min(width * 0.65, 400);
  const marginalH = 80;
  const gap = 4;
  const totalW = mainSize + gap + marginalH + 55; // right panel + left margin
  const totalH = mainSize + gap + marginalH + 40; // bottom panel + top margin

  const margin = { top: 10, right: 10, bottom: 0, left: 45 };

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sliceX, setSliceX] = useState(0.5); // as fraction of domain

  const preset = presets[selectedIdx];
  const [xMin, xMax] = preset.domain.x;
  const [yMin, yMax] = preset.domain.y;
  const currentX = xMin + sliceX * (xMax - xMin);

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setSliceX(0.5);
  }, []);

  // Compute heatmap grid
  const heatmapData = useMemo(() => {
    const cells: { ix: number; iy: number; x: number; y: number; density: number }[] = [];
    let maxD = 0;
    for (let ix = 0; ix < GRID_N; ix++) {
      for (let iy = 0; iy < GRID_N; iy++) {
        const x = xMin + (ix + 0.5) / GRID_N * (xMax - xMin);
        const y = yMin + (iy + 0.5) / GRID_N * (yMax - yMin);
        const d = preset.density(x, y);
        if (d > maxD) maxD = d;
        cells.push({ ix, iy, x, y, density: d });
      }
    }
    return { cells, maxD };
  }, [selectedIdx]);

  // Compute marginal p_X(x)
  const marginalX = useMemo(() => {
    const data: { x: number; pX: number }[] = [];
    for (let i = 0; i <= MARGINAL_N; i++) {
      const x = xMin + (i / MARGINAL_N) * (xMax - xMin);
      const pX = marginalDensity(preset.density, x, [yMin, yMax]);
      data.push({ x, pX });
    }
    return data;
  }, [selectedIdx]);

  // Compute marginal p_Y(y)
  const marginalY = useMemo(() => {
    const data: { y: number; pY: number }[] = [];
    for (let i = 0; i <= MARGINAL_N; i++) {
      const y = yMin + (i / MARGINAL_N) * (yMax - yMin);
      // p_Y(y) = ∫ p(x,y) dx — integrate over x
      const h = (xMax - xMin) / 200;
      let sum = (preset.density(xMin, y) + preset.density(xMax, y)) / 2;
      for (let j = 1; j < 200; j++) {
        sum += preset.density(xMin + j * h, y);
      }
      data.push({ y, pY: sum * h });
    }
    return data;
  }, [selectedIdx]);

  // Slice column density: p(sliceX, y) for each y
  const sliceColumn = useMemo(() => {
    const data: { y: number; density: number }[] = [];
    for (let i = 0; i <= MARGINAL_N; i++) {
      const y = yMin + (i / MARGINAL_N) * (yMax - yMin);
      data.push({ y, density: preset.density(currentX, y) });
    }
    return data;
  }, [selectedIdx, sliceX]);

  const currentMarginalX = marginalDensity(preset.density, currentX, [yMin, yMax]);

  const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, heatmapData.maxD]);

  const svgRef = useD3<SVGSVGElement>((svg) => {
    svg.selectAll('*').remove();
    const mW = mainSize;
    const mH = mainSize;
    if (mW <= 0 || mH <= 0) return;

    const cellW = mW / GRID_N;
    const cellH = mH / GRID_N;

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, mW]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([mH, 0]);

    // Main heatmap group
    const gMain = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Heatmap cells
    gMain.selectAll('rect.cell')
      .data(heatmapData.cells)
      .join('rect')
      .attr('x', (d) => d.ix * cellW)
      .attr('y', (d) => (GRID_N - 1 - d.iy) * cellH)
      .attr('width', cellW + 0.5)
      .attr('height', cellH + 0.5)
      .style('fill', (d) => colorScale(d.density));

    // Slice line
    const slicePx = xScale(currentX);
    gMain.append('line')
      .attr('x1', slicePx).attr('x2', slicePx)
      .attr('y1', 0).attr('y2', mH)
      .style('stroke', '#fff').style('stroke-width', 1.5)
      .style('opacity', 0.8);

    // Main axes
    gMain.append('g').attr('transform', `translate(0,${mH})`).call(d3.axisBottom(xScale).ticks(5));
    gMain.append('g').call(d3.axisLeft(yScale).ticks(5));

    // ── Bottom marginal: p_X(x) ──────────────────────────
    const gBot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top + mH + gap})`);
    const mxMax = d3.max(marginalX, (d) => d.pX) ?? 1;
    const myScale = d3.scaleLinear().domain([0, mxMax * 1.1]).range([marginalH, 0]);

    // Area fill
    gBot.append('path')
      .datum(marginalX)
      .attr('fill', functionColors[0])
      .attr('fill-opacity', 0.2)
      .attr('d', d3.area<typeof marginalX[0]>()
        .x((d) => xScale(d.x))
        .y0(marginalH)
        .y1((d) => myScale(d.pX))
      );

    // Curve
    gBot.append('path')
      .datum(marginalX)
      .attr('fill', 'none')
      .style('stroke', functionColors[0]).style('stroke-width', 1.5)
      .attr('d', d3.line<typeof marginalX[0]>()
        .x((d) => xScale(d.x))
        .y((d) => myScale(d.pX))
      );

    // Slice dot on marginal
    gBot.append('circle')
      .attr('cx', xScale(currentX))
      .attr('cy', myScale(currentMarginalX))
      .attr('r', 4)
      .style('fill', functionColors[1]);

    gBot.append('g').attr('transform', `translate(0,${marginalH})`).call(d3.axisBottom(xScale).ticks(5));
    gBot.append('text')
      .attr('x', mW / 2).attr('y', marginalH + 30)
      .style('fill', 'currentColor').style('font-size', '11px').style('text-anchor', 'middle')
      .text('p_X(x) — marginal density');

    // ── Right marginal: p_Y(y) ───────────────────────────
    const gRight = svg.append('g').attr('transform', `translate(${margin.left + mW + gap},${margin.top})`);
    const pyMax = d3.max(marginalY, (d) => d.pY) ?? 1;
    const pxScale = d3.scaleLinear().domain([0, pyMax * 1.1]).range([0, marginalH]);

    gRight.append('path')
      .datum(marginalY)
      .attr('fill', '#7C3AED')
      .attr('fill-opacity', 0.2)
      .attr('d', d3.area<typeof marginalY[0]>()
        .x0(0)
        .x1((d) => pxScale(d.pY))
        .y((d) => yScale(d.y))
      );

    gRight.append('path')
      .datum(marginalY)
      .attr('fill', 'none')
      .style('stroke', '#7C3AED').style('stroke-width', 1.5)
      .attr('d', d3.line<typeof marginalY[0]>()
        .x((d) => pxScale(d.pY))
        .y((d) => yScale(d.y))
      );

    // Slice column visualization
    gRight.append('path')
      .datum(sliceColumn)
      .attr('fill', 'none')
      .style('stroke', '#fff').style('stroke-width', 1).style('opacity', 0.6)
      .attr('d', d3.line<typeof sliceColumn[0]>()
        .x((d) => pxScale(d.density))
        .y((d) => yScale(d.y))
      );

    gRight.append('g').call(d3.axisBottom(pxScale).ticks(3));
    gRight.append('text')
      .attr('transform', 'rotate(90)')
      .attr('x', mH / 2).attr('y', -marginalH - 10)
      .style('fill', 'currentColor').style('font-size', '11px').style('text-anchor', 'middle')
      .text('p_Y(y)');
  }, [selectedIdx, sliceX, width, mainSize, heatmapData]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px', fontSize: '14px' }}>
        <label>
          Density:{' '}
          <select value={selectedIdx} onChange={handlePresetChange}>
            {presets.map((p, i) => <option key={p.name} value={i}>{p.label}</option>)}
          </select>
        </label>
        <label>
          x = {currentX.toFixed(2)}{' '}
          <input type="range" min={0} max={100} value={sliceX * 100}
            onChange={(e) => setSliceX(Number(e.target.value) / 100)} />
        </label>
      </div>

      <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono, monospace)', marginBottom: '8px' }}>
        <span style={{ color: functionColors[1] }}>
          p_X({currentX.toFixed(2)}) = ∫p(x,y)dy = {currentMarginalX.toFixed(4)}
        </span>
      </div>

      <svg ref={svgRef} width={Math.min(width, totalW)} height={totalH} />
    </div>
  );
}
