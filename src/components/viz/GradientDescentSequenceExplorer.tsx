import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { functionColors, convergenceColors } from './shared/colorScales';

const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const MAX_STEPS = 50;

function computeGDPath(x0: number, eta: number, maxSteps: number): number[] {
  const path = [x0];
  let x = x0;
  for (let i = 0; i < maxSteps; i++) {
    x = x - eta * 2 * x; // f(x) = x^2, f'(x) = 2x
    path.push(x);
    if (Math.abs(x) > 100) break; // divergence guard
  }
  return path;
}

export default function GradientDescentSequenceExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 420);

  const [eta, setEta] = useState(0.3);
  const [x0, setX0] = useState(3.0);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(MAX_STEPS);
  const animRef = useRef<number>(0);

  const path = useMemo(() => computeGDPath(x0, eta, MAX_STEPS), [x0, eta]);
  const visiblePath = path.slice(0, step + 1);

  // Animation
  useEffect(() => {
    if (!playing) return;
    setStep(0);
    let current = 0;
    const tick = () => {
      current++;
      if (current > path.length - 1) {
        setPlaying(false);
        return;
      }
      setStep(current);
      animRef.current = requestAnimationFrame(tick);
    };
    // Slow down: one step every ~120ms
    const interval = setInterval(() => {
      tick();
    }, 120);
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animRef.current);
    };
  }, [playing, path.length]);

  const handlePlayPause = useCallback(() => {
    if (playing) {
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  }, [playing]);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // X domain: show f(x) = x^2
      const xDomain = 5;
      const xScale = d3.scaleLinear().domain([-xDomain, xDomain]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([0, xDomain * xDomain]).range([innerH, 0]);

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
        .call(d3.axisLeft(yScale).ticks(5))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      // Draw f(x) = x^2
      const nPoints = 200;
      const curveData: [number, number][] = [];
      for (let i = 0; i <= nPoints; i++) {
        const x = -xDomain + (2 * xDomain * i) / nPoints;
        curveData.push([x, x * x]);
      }

      const line = d3.line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      g.append('path')
        .datum(curveData)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', 'var(--color-border-strong)')
        .style('stroke-width', 2);

      // GD path — arrows and points
      const clampedPath = visiblePath.filter((x) => Math.abs(x) <= xDomain);

      if (clampedPath.length > 1) {
        // Draw path on curve
        for (let i = 0; i < clampedPath.length - 1; i++) {
          const x1 = clampedPath[i];
          const x2 = clampedPath[i + 1];

          // Vertical drop from (x1, f(x1)) to (x1, 0) — skip, just show on curve
          // Arrow from (x1, f(x1)) to (x2, f(x2))
          g.append('line')
            .attr('x1', xScale(x1)).attr('y1', yScale(x1 * x1))
            .attr('x2', xScale(x2)).attr('y2', yScale(x2 * x2))
            .style('stroke', functionColors[0])
            .style('stroke-width', 1.5)
            .style('opacity', 0.5);
        }

        // Points on curve
        clampedPath.forEach((x, i) => {
          g.append('circle')
            .attr('cx', xScale(x))
            .attr('cy', yScale(x * x))
            .attr('r', i === clampedPath.length - 1 ? 5 : 3)
            .style('fill', i === 0 ? '#D97706' : functionColors[0])
            .style('stroke', i === clampedPath.length - 1 ? '#fff' : 'none')
            .style('stroke-width', 1.5);
        });
      }

      // Labels
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
        .text('f(x) = x²');
    },
    [visiblePath, width, height],
  );

  // Determine convergence status
  const lastX = visiblePath[visiblePath.length - 1];
  const converges = Math.abs(lastX) < 100;
  const rate = Math.abs(1 - 2 * eta);

  return (
    <div ref={containerRef} className="w-full my-6">
      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap items-center gap-4 mt-2">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          η = {eta.toFixed(2)}
          <input
            type="range"
            min={0.05}
            max={1.0}
            step={0.05}
            value={eta}
            onChange={(e) => {
              setEta(Number(e.target.value));
              setStep(MAX_STEPS);
              setPlaying(false);
            }}
            className="ml-2 w-28"
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          x₀ = {x0.toFixed(1)}
          <input
            type="range"
            min={-4}
            max={4}
            step={0.5}
            value={x0}
            onChange={(e) => {
              setX0(Number(e.target.value));
              setStep(MAX_STEPS);
              setPlaying(false);
            }}
            className="ml-2 w-28"
          />
        </label>

        <button
          onClick={handlePlayPause}
          className="px-3 py-1 rounded text-xs font-medium"
          style={{
            background: 'var(--color-surface-alt)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>Step: {Math.min(step, path.length - 1)}</span>
        <span>xₜ = {lastX.toFixed(4)}</span>
        <span>|xₜ| = {Math.abs(lastX).toFixed(4)}</span>
        <span style={{ color: converges ? convergenceColors.linear : '#D97706' }}>
          {converges ? `Converges (r = |1−2η| = ${rate.toFixed(2)})` : 'Diverges!'}
        </span>
      </div>
    </div>
  );
}
