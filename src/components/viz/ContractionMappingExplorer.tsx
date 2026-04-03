import { useState, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { functionColors } from './shared/colorScales';
import { contractionIteration } from './shared/multivariate';
import { CONTRACTION_PRESETS } from '../../data/inverse-implicit-data';
import type { ContractionPreset } from '../../data/inverse-implicit-data';

const margin = { top: 20, right: 20, bottom: 40, left: 50 };

interface CobwebSegment {
  x1: number; y1: number;
  x2: number; y2: number;
}

export default function ContractionMappingExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.75, 500);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [x0, setX0] = useState(CONTRACTION_PRESETS[0].domain[0] + 0.3);
  const [segments, setSegments] = useState<CobwebSegment[]>([]);
  const [iterCount, setIterCount] = useState(0);
  const [currentX, setCurrentX] = useState(CONTRACTION_PRESETS[0].domain[0] + 0.3);
  const animFrameRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const preset = CONTRACTION_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    const newX0 = CONTRACTION_PRESETS[idx].domain[0] + 0.3;
    setX0(newX0);
    setCurrentX(newX0);
    setSegments([]);
    setIterCount(0);
    stopAnimation();
  }, []);

  // Full iteration result for info display
  const iterationResult = useMemo(
    () => contractionIteration(preset.T, x0, 100, 1e-12),
    [selectedIdx, x0],
  );

  // Error bound at current iteration
  const errorBound = useMemo(() => {
    if (iterCount >= iterationResult.errorBounds.length) return 0;
    return iterationResult.errorBounds[iterCount];
  }, [iterationResult, iterCount]);

  const stopAnimation = useCallback(() => {
    runningRef.current = false;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // Perform one cobweb step
  const doStep = useCallback(() => {
    setCurrentX((prevX) => {
      const Tx = preset.T(prevX);
      // Vertical segment: (prevX, prevX) -> (prevX, T(prevX))
      const seg1: CobwebSegment = { x1: prevX, y1: prevX, x2: prevX, y2: Tx };
      // Horizontal segment: (prevX, T(prevX)) -> (T(prevX), T(prevX))
      const seg2: CobwebSegment = { x1: prevX, y1: Tx, x2: Tx, y2: Tx };
      setSegments((prev) => [...prev, seg1, seg2]);
      setIterCount((k) => k + 1);
      return Tx;
    });
  }, [preset]);

  // Run animation
  const handleRun = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const step = () => {
      if (!runningRef.current) return;
      doStep();
      // Check convergence by looking at iteration count
      setIterCount((k) => {
        if (k >= 30) {
          stopAnimation();
        }
        return k;
      });
      animFrameRef.current = window.setTimeout(() => {
        if (runningRef.current) {
          requestAnimationFrame(step);
        }
      }, 200) as unknown as number;
    };
    requestAnimationFrame(step);
  }, [doStep, stopAnimation]);

  const handleReset = useCallback(() => {
    stopAnimation();
    setSegments([]);
    setIterCount(0);
    setCurrentX(x0);
  }, [x0, stopAnimation]);

  // Curve samples for y = T(x)
  const curveSamples = useMemo(() => {
    const [a, b] = preset.domain;
    const n = 200;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= n; i++) {
      const x = a + (b - a) * i / n;
      pts.push([x, preset.T(x)]);
    }
    return pts;
  }, [selectedIdx]);

  // Click handler for setting x0
  const handlePlotClick = useCallback((xVal: number) => {
    stopAnimation();
    const clamped = Math.max(preset.domain[0], Math.min(preset.domain[1], xVal));
    setX0(clamped);
    setCurrentX(clamped);
    setSegments([]);
    setIterCount(0);
  }, [preset, stopAnimation]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const plotW = width - margin.left - margin.right;
      const plotH = height - margin.top - margin.bottom;
      if (plotW <= 0 || plotH <= 0) return;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const [domMin, domMax] = preset.domain;
      // Compute y range from T values
      let yMin = domMin;
      let yMax = domMax;
      for (const [, ty] of curveSamples) {
        if (ty < yMin) yMin = ty;
        if (ty > yMax) yMax = ty;
      }
      // Ensure y = x line is visible
      yMin = Math.min(yMin, domMin);
      yMax = Math.max(yMax, domMax);
      const yPad = (yMax - yMin) * 0.05;

      const xScale = d3.scaleLinear().domain([domMin, domMax]).range([0, plotW]);
      const yScale = d3.scaleLinear().domain([yMin - yPad, yMax + yPad]).range([plotH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${plotH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text').style('font-size', '10px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text').style('font-size', '10px');

      // Axis labels
      g.append('text')
        .attr('x', plotW / 2).attr('y', plotH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('x');
      g.append('text')
        .attr('x', -plotH / 2).attr('y', -36)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '12px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('y');

      // y = x diagonal (dashed gray)
      g.append('line')
        .attr('x1', xScale(domMin)).attr('y1', yScale(domMin))
        .attr('x2', xScale(domMax)).attr('y2', yScale(domMax))
        .attr('stroke', '#9ca3af')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0.8);

      // y = T(x) curve (solid blue)
      const line = d3.line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      g.append('path')
        .datum(curveSamples)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2);

      // Cobweb segments
      for (const seg of segments) {
        g.append('line')
          .attr('x1', xScale(seg.x1)).attr('y1', yScale(seg.y1))
          .attr('x2', xScale(seg.x2)).attr('y2', yScale(seg.y2))
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.75);
      }

      // Fixed point marker (gold dot)
      g.append('circle')
        .attr('cx', xScale(preset.fixedPoint))
        .attr('cy', yScale(preset.fixedPoint))
        .attr('r', 5)
        .attr('fill', '#EAB308')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      // Starting point (open circle on x-axis)
      g.append('circle')
        .attr('cx', xScale(x0))
        .attr('cy', yScale(x0))
        .attr('r', 5)
        .attr('fill', 'none')
        .attr('stroke', '#6b7280')
        .attr('stroke-width', 2);

      // Current iterate (green dot on x-axis level of y=x)
      if (iterCount > 0) {
        g.append('circle')
          .attr('cx', xScale(currentX))
          .attr('cy', yScale(currentX))
          .attr('r', 4)
          .attr('fill', '#059669')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5);
      }

      // Legend
      const legendX = plotW - 110;
      const legendY = 10;
      // y = x
      g.append('line')
        .attr('x1', legendX).attr('y1', legendY)
        .attr('x2', legendX + 18).attr('y2', legendY)
        .attr('stroke', '#9ca3af').attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3');
      g.append('text')
        .attr('x', legendX + 22).attr('y', legendY + 4)
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('y = x');
      // y = T(x)
      g.append('line')
        .attr('x1', legendX).attr('y1', legendY + 16)
        .attr('x2', legendX + 18).attr('y2', legendY + 16)
        .attr('stroke', functionColors[0]).attr('stroke-width', 2);
      g.append('text')
        .attr('x', legendX + 22).attr('y', legendY + 20)
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('y = T(x)');

      // Click handler to set x0
      g.append('rect')
        .attr('width', plotW)
        .attr('height', plotH)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx] = d3.pointer(event);
          handlePlotClick(xScale.invert(mx));
        });

      // Title
      g.append('text')
        .attr('x', plotW / 2).attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text('Cobweb Diagram: Contraction Mapping Iteration');
    },
    [width, height, selectedIdx, curveSamples, segments, x0, currentX, iterCount, handlePlotClick],
  );

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <span style={{ fontWeight: 500 }}>Preset:</span>
          <select value={selectedIdx} onChange={handlePresetChange}
            style={{ fontSize: '13px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
            {CONTRACTION_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <button onClick={doStep}
          style={{
            fontSize: '13px', padding: '4px 12px', borderRadius: '4px',
            border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer',
          }}>
          Step
        </button>
        <button onClick={handleRun}
          style={{
            fontSize: '13px', padding: '4px 12px', borderRadius: '4px',
            border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer',
          }}>
          Run
        </button>
        <button onClick={handleReset}
          style={{
            fontSize: '13px', padding: '4px 12px', borderRadius: '4px',
            border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer',
          }}>
          Reset
        </button>

        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #6b7280)' }}>
          {'Click plot to set x\u2080'}
        </span>
      </div>

      {/* SVG visualization */}
      <svg ref={svgRef} width={width} height={height}
        style={{ overflow: 'visible', background: 'var(--color-bg-surface, #fafafa)', borderRadius: '6px' }} />

      {/* Info panel */}
      <div style={{
        marginTop: '8px', padding: '10px 12px', fontSize: '13px',
        background: 'var(--color-bg-surface, #f9fafb)', borderRadius: '6px',
        border: '1px solid var(--color-border, #e5e7eb)',
        display: 'flex', flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <span style={{ fontWeight: 600 }}>Iteration k:</span> {iterCount}
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>{'x\u2096'}:</span>{' '}
          {currentX.toFixed(8)}
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>Fixed point:</span>{' '}
          {preset.fixedPoint.toFixed(8)}
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>Error bound:</span>{' '}
          {errorBound < 1e-14 ? '< 10\u207b\u00b9\u2074' : errorBound.toExponential(3)}
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>{'λ ≈'}</span>{' '}
          {iterationResult.contractionFactor.toFixed(4)}
        </div>
        <div style={{ color: 'var(--color-text-secondary, #6b7280)', fontStyle: 'italic' }}>
          {preset.description}
        </div>
      </div>
    </div>
  );
}
