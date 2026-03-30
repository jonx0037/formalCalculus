import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getFunctionPresets } from '../../data/epsilon-delta-data';
import { computeEpsilonDelta } from './shared/limits';
import { functionColors, regionColors } from './shared/colorScales';

const presets = getFunctionPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const SAMPLE_PTS = 500;

export default function EpsilonDeltaExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [epsilonLog, setEpsilonLog] = useState(-0.5); // log10(epsilon)
  const [zoomed, setZoomed] = useState(false);

  const preset = presets[selectedIdx];
  const epsilon = Math.pow(10, epsilonLog);

  // Use preset's exact delta formula when available, fall back to numerical
  const delta = useMemo(() => {
    const exact = preset.computeDelta(epsilon);
    if (exact > 0 && isFinite(exact)) return exact;
    const result = computeEpsilonDelta(preset.fn, preset.a, preset.L, epsilon);
    return result ? result.delta : epsilon * 0.1;
  }, [selectedIdx, epsilon]);

  // Generate function curve data
  const curveData = useMemo(() => {
    const [xMin, xMax] = preset.domain;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= SAMPLE_PTS; i++) {
      const x = xMin + (xMax - xMin) * (i / SAMPLE_PTS);
      const y = preset.fn(x);
      if (isFinite(y)) pts.push({ x, y });
    }
    return pts;
  }, [selectedIdx]);

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

      // Compute domains
      let xMin: number, xMax: number, yMin: number, yMax: number;

      if (zoomed) {
        const pad = delta * 3;
        xMin = preset.a - pad;
        xMax = preset.a + pad;
        const yPad = epsilon * 3;
        yMin = preset.L - yPad;
        yMax = preset.L + yPad;
      } else {
        [xMin, xMax] = preset.domain;
        const yExtent = d3.extent(curveData, (d) => d.y) as [number, number];
        const yPad = (yExtent[1] - yExtent[0]) * 0.12 || 0.5;
        yMin = Math.min(yExtent[0] - yPad, preset.L - epsilon - yPad);
        yMax = Math.max(yExtent[1] + yPad, preset.L + epsilon + yPad);
      }

      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Epsilon band (horizontal, around L)
      const bandTop = yScale(preset.L + epsilon);
      const bandBottom = yScale(preset.L - epsilon);
      g.append('rect')
        .attr('x', 0)
        .attr('y', Math.max(0, bandTop))
        .attr('width', innerW)
        .attr('height', Math.max(0, Math.min(innerH, bandBottom) - Math.max(0, bandTop)))
        .style('fill', regionColors.epsilonBand)
        .style('opacity', 0.3);

      // Delta band (vertical, around a)
      const deltaLeft = xScale(preset.a - delta);
      const deltaRight = xScale(preset.a + delta);
      g.append('rect')
        .attr('x', Math.max(0, deltaLeft))
        .attr('y', 0)
        .attr('width', Math.max(0, Math.min(innerW, deltaRight) - Math.max(0, deltaLeft)))
        .attr('height', innerH)
        .style('fill', regionColors.deltaBand)
        .style('opacity', 0.25);

      // Limit line (horizontal dashed)
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', yScale(preset.L))
        .attr('y2', yScale(preset.L))
        .style('stroke', functionColors[1])
        .style('stroke-dasharray', '6,4')
        .style('stroke-width', 1.5);

      // Point a marker (vertical dashed)
      g.append('line')
        .attr('x1', xScale(preset.a)).attr('x2', xScale(preset.a))
        .attr('y1', 0).attr('y2', innerH)
        .style('stroke', functionColors[2])
        .style('stroke-dasharray', '4,3')
        .style('stroke-width', 1.5);

      // Function curve — split into inside-box and outside-box segments
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .defined((d) => d.x >= xMin && d.x <= xMax && isFinite(d.y));

      // All curve (faded)
      g.append('path')
        .datum(curveData.filter((d) => d.x >= xMin && d.x <= xMax))
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2)
        .attr('opacity', 0.3)
        .attr('d', line);

      // Helper: split filtered points into contiguous x-segments so D3
      // doesn't draw artificial straight lines across disjoint regions.
      const splitContiguous = (
        points: { x: number; y: number }[],
        maxGap: number,
      ): { x: number; y: number }[][] => {
        const segments: { x: number; y: number }[][] = [];
        if (points.length === 0) return segments;
        let seg: { x: number; y: number }[] = [points[0]];
        for (let i = 1; i < points.length; i++) {
          if (points[i].x - points[i - 1].x <= maxGap) {
            seg.push(points[i]);
          } else {
            if (seg.length > 1) segments.push(seg);
            seg = [points[i]];
          }
        }
        if (seg.length > 1) segments.push(seg);
        return segments;
      };

      const samplingStep =
        curveData.length > 1
          ? (curveData[1].x - curveData[0].x) * 1.5
          : Infinity;

      // Inside box curve (bright green)
      const insideBox = curveData.filter(
        (d) =>
          d.x >= xMin && d.x <= xMax &&
          Math.abs(d.x - preset.a) <= delta &&
          d.x !== preset.a &&
          Math.abs(d.y - preset.L) < epsilon,
      );
      for (const seg of splitContiguous(insideBox, samplingStep)) {
        g.append('path')
          .datum(seg)
          .attr('fill', 'none')
          .attr('stroke', '#059669')
          .attr('stroke-width', 3)
          .attr('d', line);
      }

      // Inside delta band but outside epsilon band (amber)
      const outsideEps = curveData.filter(
        (d) =>
          d.x >= xMin && d.x <= xMax &&
          Math.abs(d.x - preset.a) <= delta &&
          d.x !== preset.a &&
          Math.abs(d.y - preset.L) >= epsilon,
      );
      for (const seg of splitContiguous(outsideEps, samplingStep)) {
        g.append('path')
          .datum(seg)
          .attr('fill', 'none')
          .attr('stroke', '#D97706')
          .attr('stroke-width', 3)
          .attr('d', line);
      }

      // Open circle at x = a if f(a) ≠ L (removable singularity)
      if (!preset.continuousAtA) {
        g.append('circle')
          .attr('cx', xScale(preset.a))
          .attr('cy', yScale(preset.L))
          .attr('r', 5)
          .style('fill', 'var(--color-surface)')
          .style('stroke', functionColors[0])
          .style('stroke-width', 2);
      }

      // Labels
      g.append('text')
        .attr('x', xScale(preset.a) + 6)
        .attr('y', innerH - 4)
        .style('fill', functionColors[2])
        .style('font-size', '11px')
        .style('font-weight', '600')
        .text('a');

      g.append('text')
        .attr('x', innerW - 2)
        .attr('y', yScale(preset.L) - 6)
        .attr('text-anchor', 'end')
        .style('fill', functionColors[1])
        .style('font-size', '11px')
        .style('font-weight', '600')
        .text('L');

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
    [curveData, width, height, epsilon, delta, zoomed, selectedIdx],
  );

  const deltaEpsRatio = epsilon > 0 ? (delta / epsilon).toFixed(3) : '—';

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Function:
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
            max={0.3}
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
          {zoomed ? 'Zoom out' : 'Zoom to neighborhood'}
        </button>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: '#059669' }}>●</span> Inside ε-δ box
        </span>
        <span>
          <span style={{ color: '#D97706' }}>●</span> Outside ε-band
        </span>
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
          ε = {epsilon.toFixed(3)} · δ = {delta.toFixed(4)} · δ/ε = {deltaEpsRatio}
          {preset.deltaFormula && ` (δ = ${preset.deltaFormula})`}
        </span>
      </div>
    </div>
  );
}
