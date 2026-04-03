import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { generateRegionBoundary } from './shared/integration';
import { REGION_PRESETS } from '../../data/multiple-integrals-data';
import { functionColors, regionColors } from './shared/colorScales';

const presets = REGION_PRESETS;
const margin = { top: 20, right: 20, bottom: 40, left: 55 };

type ViewMode = 'typeI' | 'typeII' | 'both';

export default function RegionExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const h = Math.min(width * 0.7, 420);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('typeI');
  const [slicePos, setSlicePos] = useState(0.5);

  const preset = presets[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setSlicePos(0.5);
  }, []);

  const boundary = useMemo(() => {
    return generateRegionBoundary(preset.typeI.xRange, preset.typeI.g1, preset.typeI.g2);
  }, [selectedIdx]);

  // Determine plot domain
  const allPts = [...boundary.typeI.lowerCurve, ...boundary.typeI.upperCurve];
  const xExtent = d3.extent(allPts, (p) => p.x) as [number, number];
  const yExtent = d3.extent(allPts, (p) => p.y) as [number, number];
  const pad = 0.15;
  const xPad = (xExtent[1] - xExtent[0]) * pad;
  const yPad = Math.max((yExtent[1] - yExtent[0]) * pad, 0.1);

  const svgRef = useD3<SVGSVGElement>((svg) => {
    svg.selectAll('*').remove();
    const w = width - margin.left - margin.right;
    const hInner = h - margin.top - margin.bottom;
    if (w <= 0 || hInner <= 0) return;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([xExtent[0] - xPad, xExtent[1] + xPad]).range([0, w]);
    const yScale = d3.scaleLinear().domain([yExtent[0] - yPad, yExtent[1] + yPad]).range([hInner, 0]);

    // Filled region
    g.append('path')
      .datum(boundary.points)
      .attr('fill', regionColors.integralFill)
      .attr('fill-opacity', 0.4)
      .attr('stroke', functionColors[0])
      .attr('stroke-width', 1.5)
      .attr('d', d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
      );

    // Type I curves
    if (viewMode === 'typeI' || viewMode === 'both') {
      // Lower curve
      g.append('path')
        .datum(boundary.typeI.lowerCurve)
        .attr('fill', 'none')
        .style('stroke', functionColors[0]).style('stroke-width', 2)
        .attr('d', d3.line<{ x: number; y: number }>().x((d) => xScale(d.x)).y((d) => yScale(d.y)));
      // Upper curve
      g.append('path')
        .datum(boundary.typeI.upperCurve)
        .attr('fill', 'none')
        .style('stroke', functionColors[1]).style('stroke-width', 2)
        .attr('d', d3.line<{ x: number; y: number }>().x((d) => xScale(d.x)).y((d) => yScale(d.y)));

      // Vertical slice
      const xSlice = xExtent[0] + slicePos * (xExtent[1] - xExtent[0]);
      const yLo = preset.typeI.g1(xSlice);
      const yHi = preset.typeI.g2(xSlice);
      g.append('line')
        .attr('x1', xScale(xSlice)).attr('x2', xScale(xSlice))
        .attr('y1', yScale(yLo)).attr('y2', yScale(yHi))
        .style('stroke', functionColors[0]).style('stroke-width', 3)
        .style('opacity', 0.8);

      // Labels
      g.append('text')
        .attr('x', xScale(xSlice) + 4).attr('y', yScale(yHi) - 4)
        .style('fill', functionColors[1]).style('font-size', '11px')
        .text(`y = g₂(${xSlice.toFixed(2)})`);
      g.append('text')
        .attr('x', xScale(xSlice) + 4).attr('y', yScale(yLo) + 14)
        .style('fill', functionColors[0]).style('font-size', '11px')
        .text(`y = g₁(${xSlice.toFixed(2)})`);
    }

    // Type II curves
    if (viewMode === 'typeII' || viewMode === 'both') {
      const { leftCurve, rightCurve, yRange } = boundary.typeII;

      g.append('path')
        .datum(leftCurve)
        .attr('fill', 'none')
        .style('stroke', '#7C3AED').style('stroke-width', 2)
        .attr('d', d3.line<{ x: number; y: number }>().x((d) => xScale(d.x)).y((d) => yScale(d.y)));
      g.append('path')
        .datum(rightCurve)
        .attr('fill', 'none')
        .style('stroke', '#D97706').style('stroke-width', 2)
        .attr('d', d3.line<{ x: number; y: number }>().x((d) => xScale(d.x)).y((d) => yScale(d.y)));

      // Horizontal slice
      const ySlice = yRange[0] + slicePos * (yRange[1] - yRange[0]);
      const xLo = preset.typeII.h1(ySlice);
      const xHi = preset.typeII.h2(ySlice);
      g.append('line')
        .attr('x1', xScale(xLo)).attr('x2', xScale(xHi))
        .attr('y1', yScale(ySlice)).attr('y2', yScale(ySlice))
        .style('stroke', '#7C3AED').style('stroke-width', 3)
        .style('opacity', 0.8);
    }

    // Axes
    g.append('g').attr('transform', `translate(0,${hInner})`).call(d3.axisBottom(xScale).ticks(5))
      .append('text').attr('x', w / 2).attr('y', 32)
      .style('fill', 'currentColor').style('font-size', '12px').style('text-anchor', 'middle').text('x');

    g.append('g').call(d3.axisLeft(yScale).ticks(5))
      .append('text').attr('transform', 'rotate(-90)').attr('x', -hInner / 2).attr('y', -40)
      .style('fill', 'currentColor').style('font-size', '12px').style('text-anchor', 'middle').text('y');

    // Title
    g.append('text')
      .attr('x', w / 2).attr('y', -5)
      .style('fill', 'currentColor').style('font-size', '13px').style('text-anchor', 'middle')
      .text(`Area = ${preset.area.toFixed(4)}`);
  }, [selectedIdx, viewMode, slicePos, width, h]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px', fontSize: '14px' }}>
        <label>
          Region:{' '}
          <select value={selectedIdx} onChange={handlePresetChange}>
            {presets.map((p, i) => <option key={p.name} value={i}>{p.label}</option>)}
          </select>
        </label>
        <label>
          View:{' '}
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
            <option value="typeI">Type I (vertical)</option>
            <option value="typeII">Type II (horizontal)</option>
            <option value="both">Both</option>
          </select>
        </label>
        <label>
          Slice:{' '}
          <input type="range" min={5} max={95} value={slicePos * 100}
            onChange={(e) => setSlicePos(Number(e.target.value) / 100)} />
        </label>
      </div>

      <svg ref={svgRef} width={width} height={h} />
    </div>
  );
}
