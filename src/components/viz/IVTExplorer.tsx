import { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getIVTPresets } from '../../data/epsilon-delta-data';
import { bisection } from './shared/limits';
import { functionColors, regionColors } from './shared/colorScales';

const presets = getIVTPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const SAMPLE_PTS = 500;

export default function IVTExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [targetY, setTargetY] = useState(0);
  const [bisectionMode, setBisectionMode] = useState(false);
  const [bisectionStep, setBisectionStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef(false);

  const preset = presets[selectedIdx];
  const [xMin, xMax] = preset.domain;
  const fA = preset.fn(xMin);
  const fB = preset.fn(xMax);
  const yLo = Math.min(fA, fB);
  const yHi = Math.max(fA, fB);

  // Initialize target Y to midpoint of range
  useEffect(() => {
    setTargetY((yLo + yHi) / 2);
    setBisectionStep(0);
    setIsPlaying(false);
    playRef.current = false;
  }, [selectedIdx]);

  // Generate curve data
  const curveData = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= SAMPLE_PTS; i++) {
      const x = xMin + (xMax - xMin) * (i / SAMPLE_PTS);
      pts.push({ x, y: preset.fn(x) });
    }
    return pts;
  }, [selectedIdx]);

  // Find intersection points where f(c) ≈ targetY
  const intersections = useMemo(() => {
    const crossings: number[] = [];
    for (let i = 0; i < curveData.length - 1; i++) {
      const y1 = curveData[i].y - targetY;
      const y2 = curveData[i + 1].y - targetY;
      if (y1 * y2 <= 0 && (y1 !== 0 || y2 !== 0)) {
        // Linear interpolation
        const t = Math.abs(y1) / (Math.abs(y1) + Math.abs(y2) + 1e-15);
        crossings.push(curveData[i].x + t * (curveData[i + 1].x - curveData[i].x));
      }
    }
    return crossings;
  }, [curveData, targetY]);

  // Bisection data (for the first root)
  const bisectionData = useMemo(() => {
    if (!bisectionMode || intersections.length === 0) return null;
    // Find an interval where f changes sign around targetY
    const g = (x: number) => preset.fn(x) - targetY;
    // Try the full domain first
    if (g(xMin) * g(xMax) < 0) {
      return bisection(g, xMin, xMax, 1e-10, 30);
    }
    // Try subintervals
    for (let i = 0; i < curveData.length - 1; i++) {
      const ga = g(curveData[i].x);
      const gb = g(curveData[i + 1].x);
      if (ga * gb < 0) {
        return bisection(g, curveData[i].x, curveData[i + 1].x, 1e-10, 30);
      }
    }
    return null;
  }, [bisectionMode, selectedIdx, targetY]);

  // Play animation
  useEffect(() => {
    if (!isPlaying || !bisectionData) return;
    playRef.current = true;

    const interval = setInterval(() => {
      if (!playRef.current) { clearInterval(interval); return; }
      setBisectionStep((prev) => {
        if (prev >= bisectionData.steps.length - 1) {
          playRef.current = false;
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600);

    return () => { clearInterval(interval); playRef.current = false; };
  }, [isPlaying, bisectionData]);

  // Use ref for targetY setter to avoid stale closure in drag
  const targetYRef = useRef(setTargetY);
  targetYRef.current = setTargetY;

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const yExtent = d3.extent(curveData, (d) => d.y) as [number, number];
      const yPad = (yExtent[1] - yExtent[0]) * 0.1 || 0.5;

      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yExtent[0] - yPad, yExtent[1] + yPad]).range([innerH, 0]);

      // Function curve
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));

      g.append('path')
        .datum(curveData)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2.5)
        .attr('d', line);

      // Target y line (draggable)
      const yTarget = yScale(targetY);

      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', yTarget).attr('y2', yTarget)
        .style('stroke', functionColors[1])
        .style('stroke-width', 2)
        .style('stroke-dasharray', '8,4')
        .style('cursor', 'ns-resize')
        .call(
          d3.drag<SVGLineElement, unknown>()
            .on('drag', (event) => {
              const newY = yScale.invert(event.y - margin.top);
              const clamped = Math.max(yExtent[0], Math.min(yExtent[1], newY));
              targetYRef.current(clamped);
            }) as any,
        );

      // "y = target" label
      g.append('text')
        .attr('x', innerW - 4)
        .attr('y', yTarget - 6)
        .attr('text-anchor', 'end')
        .style('fill', functionColors[1])
        .style('font-size', '11px')
        .style('font-weight', '600')
        .text(`y = ${targetY.toFixed(2)}`);

      // Intersection points
      for (const cx of intersections) {
        g.append('circle')
          .attr('cx', xScale(cx))
          .attr('cy', yScale(targetY))
          .attr('r', 6)
          .style('fill', '#059669')
          .style('stroke', '#fff')
          .style('stroke-width', 2);

        g.append('line')
          .attr('x1', xScale(cx)).attr('x2', xScale(cx))
          .attr('y1', yScale(targetY)).attr('y2', innerH)
          .style('stroke', '#059669')
          .style('stroke-dasharray', '3,3')
          .style('stroke-width', 1);
      }

      // Bisection interval shading
      if (bisectionMode && bisectionData && bisectionStep < bisectionData.steps.length) {
        const step = bisectionData.steps[bisectionStep];
        const x1 = xScale(step.a);
        const x2 = xScale(step.b);
        g.append('rect')
          .attr('x', x1)
          .attr('y', 0)
          .attr('width', x2 - x1)
          .attr('height', innerH)
          .style('fill', regionColors.integralFill)
          .style('opacity', 0.3);

        // Midpoint marker
        g.append('circle')
          .attr('cx', xScale(step.mid))
          .attr('cy', yScale(preset.fn(step.mid)))
          .attr('r', 5)
          .style('fill', '#D97706')
          .style('stroke', '#fff')
          .style('stroke-width', 2);
      }

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
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
    [curveData, width, height, targetY, intersections, bisectionMode, bisectionStep, bisectionData, selectedIdx],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Function:
          <select
            value={selectedIdx}
            onChange={(e) => {
              setSelectedIdx(Number(e.target.value));
              setBisectionMode(false);
              setBisectionStep(0);
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

        <button
          onClick={() => {
            setBisectionMode((m) => !m);
            setBisectionStep(0);
            setIsPlaying(false);
            playRef.current = false;
          }}
          className="px-3 py-1 rounded text-xs font-medium"
          style={{
            background: bisectionMode ? 'var(--color-primary)' : 'var(--color-surface-alt)',
            color: bisectionMode ? '#fff' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          {bisectionMode ? 'Exit bisection' : 'Bisection mode'}
        </button>

        {bisectionMode && bisectionData && (
          <>
            <button
              onClick={() => {
                setBisectionStep(0);
                setIsPlaying(true);
              }}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{
                background: 'var(--color-surface-alt)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            >
              {isPlaying ? 'Playing...' : 'Play'}
            </button>
            <button
              onClick={() => setBisectionStep((s) => Math.min(s + 1, bisectionData.steps.length - 1))}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{
                background: 'var(--color-surface-alt)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            >
              Step →
            </button>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Step {bisectionStep + 1}/{bisectionData.steps.length}
            </span>
          </>
        )}
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: '#059669' }}>●</span> Intersection (c where f(c) = y)
        </span>
        <span>Drag the dashed red line to change the target y value</span>
        {intersections.length > 0 && (
          <span className="font-medium" style={{ color: 'var(--color-text)' }}>
            {intersections.length} crossing{intersections.length > 1 ? 's' : ''} found
          </span>
        )}
      </div>
    </div>
  );
}
