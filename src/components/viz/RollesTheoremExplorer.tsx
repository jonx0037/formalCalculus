import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { generateCurve, computeTangent, tangentLineAt } from './shared/differentiation';
import { getRollesPresets } from '../../data/mean-value-taylor-data';
import { functionColors, regionColors } from './shared/colorScales';

const allPresets = getRollesPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };

export default function RollesTheoremExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showFailures, setShowFailures] = useState(false);

  const currentPresets = useMemo(
    () => allPresets.filter((p) => p.isFailure === showFailures),
    [showFailures],
  );

  const preset = currentPresets[selectedIdx] ?? currentPresets[0];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
  }, []);

  // Generate function curve data
  const curveData = useMemo(() => {
    return generateCurve(preset.fn, preset.domain[0], preset.domain[1], 500);
  }, [preset.name]);

  // For the step-function failure case, split the curve at the discontinuity
  const curveSegments = useMemo(() => {
    if (preset.failureType === 'not-continuous') {
      const mid = 0.5; // discontinuity at x = 0.5 for the step function
      const left = curveData.filter((d) => d.x < mid - 0.001);
      const right = curveData.filter((d) => d.x > mid + 0.001);
      return [left, right];
    }
    return [curveData];
  }, [curveData, preset.failureType]);

  // Compute tangent lines at critical points
  const tangents = useMemo(() => {
    return preset.criticalPoints.map((c) =>
      computeTangent(preset.fn, preset.derivative, c),
    );
  }, [preset.name]);

  const fa = preset.fn(preset.a);
  const fb = preset.fn(preset.b);

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
      const [xMin, xMax] = preset.domain;
      const yExtent = d3.extent(curveData, (d) => d.y);
      if (yExtent[0] === undefined || yExtent[1] === undefined) return;
      const yPad = (yExtent[1] - yExtent[0]) * 0.1 || 0.5;
      const yMin = yExtent[0] - yPad;
      const yMax = yExtent[1] + yPad;

      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .defined((d) => d.x >= xMin && d.x <= xMax && isFinite(d.y));

      // Horizontal dashed line at y = f(a) (equal-value line)
      if (Math.abs(fa - fb) < 0.01) {
        g.append('line')
          .attr('x1', xScale(xMin))
          .attr('y1', yScale(fa))
          .attr('x2', xScale(xMax))
          .attr('y2', yScale(fa))
          .style('stroke', 'var(--color-text-muted)')
          .style('stroke-width', 1)
          .style('stroke-dasharray', '4,4')
          .style('opacity', 0.5);
      }

      // Function curve segments
      for (const segment of curveSegments) {
        g.append('path')
          .datum(segment.filter((d) => d.x >= xMin && d.x <= xMax))
          .attr('fill', 'none')
          .attr('stroke', functionColors[0])
          .attr('stroke-width', 2)
          .attr('d', line);
      }

      // Horizontal tangent lines at critical points (valid presets only)
      if (!preset.isFailure) {
        for (const tangent of tangents) {
          const ty1 = tangentLineAt(tangent, xMin);
          const ty2 = tangentLineAt(tangent, xMax);
          g.append('line')
            .attr('x1', xScale(xMin))
            .attr('y1', yScale(ty1))
            .attr('x2', xScale(xMax))
            .attr('y2', yScale(ty2))
            .style('stroke', functionColors[1])
            .style('stroke-width', 2)
            .style('stroke-dasharray', '6,4');
        }
      }

      // Endpoint markers at (a, f(a)) and (b, f(b))
      if (isFinite(fa)) {
        g.append('circle')
          .attr('cx', xScale(preset.a))
          .attr('cy', yScale(fa))
          .attr('r', 5)
          .style('fill', functionColors[0])
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      }

      if (isFinite(fb)) {
        g.append('circle')
          .attr('cx', xScale(preset.b))
          .attr('cy', yScale(fb))
          .attr('r', 5)
          .style('fill', functionColors[0])
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      }

      // Critical point markers (green)
      for (const c of preset.criticalPoints) {
        const fc = preset.fn(c);
        if (isFinite(fc)) {
          g.append('circle')
            .attr('cx', xScale(c))
            .attr('cy', yScale(fc))
            .attr('r', 5)
            .style('fill', functionColors[2])
            .style('stroke', '#fff')
            .style('stroke-width', 1.5);
        }
      }

      // Failure annotation text
      if (preset.isFailure) {
        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', 20)
          .attr('text-anchor', 'middle')
          .style('fill', functionColors[1])
          .style('font-size', '12px')
          .style('font-style', 'italic')
          .text(preset.explanation);
      }

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
    [curveData, curveSegments, tangents, width, height, preset.name],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text)' }}>
          Function:
          <select
            value={selectedIdx}
            onChange={handlePresetChange}
            className="ml-2 rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {currentPresets.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <input
            type="checkbox"
            checked={showFailures}
            onChange={() => {
              setShowFailures(!showFailures);
              setSelectedIdx(0);
            }}
          />
          Break hypotheses
        </label>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: functionColors[0] }}>&#9644;</span> f(x)
        </span>
        {!preset.isFailure && (
          <span>
            <span style={{ color: functionColors[1] }}>- -</span> f&apos;(c) = 0
          </span>
        )}
        <span>
          <span style={{ color: functionColors[0] }}>&#9679;</span> Endpoints
        </span>
        {preset.criticalPoints.length > 0 && (
          <span>
            <span style={{ color: functionColors[2] }}>&#9679;</span> Critical pts
          </span>
        )}
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
          f(a) = {fa.toFixed(4)}
          {' · '}f(b) = {fb.toFixed(4)}
          {preset.criticalPoints.length > 0 && (
            <>
              {' · '}c = {preset.criticalPoints.map((c) => c.toFixed(4)).join(', ')}
              {' · '}f&apos;(c) = {preset.criticalPoints.map((c) => preset.derivative(c).toFixed(4)).join(', ')}
            </>
          )}
        </span>
      </div>
      {!preset.isFailure && (
        <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {preset.explanation}
        </div>
      )}
    </div>
  );
}
