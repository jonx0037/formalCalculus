import { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getBisectionTargets } from '../../data/completeness-compactness-data';
import { nestedIntervalBisection } from './shared/limits';
import { functionColors, regionColors } from './shared/colorScales';

const targets = getBisectionTargets();
const margin = { top: 20, right: 30, bottom: 50, left: 50 };

export default function NestedIntervalExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 420);

  const [targetIdx, setTargetIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef(false);

  const target = targets[targetIdx];

  // Compute all intervals up front
  const allIntervals = nestedIntervalBisection(
    target.interval[0],
    target.interval[1],
    target.checkFn,
    30,
  );

  const visibleIntervals = allIntervals.intervals.slice(0, step + 1);
  const current = visibleIntervals[visibleIntervals.length - 1];
  const currentWidth = current.b - current.a;

  // Reset on target change
  useEffect(() => {
    setStep(0);
    setIsPlaying(false);
    playRef.current = false;
  }, [targetIdx]);

  // Auto-play animation
  useEffect(() => {
    playRef.current = isPlaying;
    if (!isPlaying) return;

    const timer = setInterval(() => {
      if (!playRef.current) {
        clearInterval(timer);
        return;
      }
      setStep((s) => {
        const next = s + 1;
        if (next >= allIntervals.intervals.length - 1) {
          setIsPlaying(false);
          playRef.current = false;
          return allIntervals.intervals.length - 1;
        }
        return next;
      });
    }, 400);

    return () => clearInterval(timer);
  }, [isPlaying, allIntervals.intervals.length]);

  const bisectLeft = () => {
    if (step < allIntervals.intervals.length - 1) {
      setStep(step + 1);
    }
  };

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();

      if (width === 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const [a0, b0] = target.interval;
      const pad = (b0 - a0) * 0.1;
      const xScale = d3.scaleLinear().domain([a0 - pad, b0 + pad]).range([0, innerW]);
      const maxIntervals = Math.min(visibleIntervals.length, 20);

      // Number line
      const axisY = innerH - 30;
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', axisY)
        .attr('y2', axisY)
        .style('stroke', '#6B7280')
        .style('stroke-width', 1.5);

      // Tick marks
      const xAxis = d3.axisBottom(xScale).ticks(6);
      g.append('g')
        .attr('transform', `translate(0,${axisY})`)
        .call(xAxis)
        .selectAll('text')
        .style('font-size', '11px');

      // Target marker
      g.append('line')
        .attr('x1', xScale(target.value))
        .attr('x2', xScale(target.value))
        .attr('y1', 10)
        .attr('y2', axisY + 5)
        .style('stroke', '#DC2626')
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '4,3');

      g.append('text')
        .attr('x', xScale(target.value))
        .attr('y', 6)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#DC2626')
        .style('font-weight', '600')
        .text(target.label);

      // Draw intervals (stacked from bottom to top)
      const intervalHeight = Math.max(4, Math.min(14, (axisY - 25) / maxIntervals));
      const gap = 2;

      visibleIntervals.forEach((iv, i) => {
        if (i >= maxIntervals) return;
        const y = axisY - (i + 1) * (intervalHeight + gap);
        const x1 = xScale(iv.a);
        const x2 = xScale(iv.b);

        const isCurrent = i === visibleIntervals.length - 1;
        const opacity = isCurrent ? 0.7 : 0.25;
        const strokeOpacity = isCurrent ? 1 : 0.5;

        // Interval bar
        g.append('rect')
          .attr('x', x1)
          .attr('y', y)
          .attr('width', Math.max(1, x2 - x1))
          .attr('height', intervalHeight)
          .style('fill', functionColors[0])
          .style('fill-opacity', opacity)
          .style('stroke', functionColors[0])
          .style('stroke-opacity', strokeOpacity)
          .style('stroke-width', isCurrent ? 2 : 1)
          .attr('rx', 2);

        // Bracket endpoints
        if (isCurrent && x2 - x1 > 20) {
          g.append('text')
            .attr('x', x1 - 3)
            .attr('y', y + intervalHeight / 2 + 4)
            .attr('text-anchor', 'end')
            .style('font-size', '10px')
            .style('fill', '#374151')
            .text(`[${iv.a.toFixed(Math.min(8, step + 1))}`);

          g.append('text')
            .attr('x', x2 + 3)
            .attr('y', y + intervalHeight / 2 + 4)
            .attr('text-anchor', 'start')
            .style('font-size', '10px')
            .style('fill', '#374151')
            .text(`${iv.b.toFixed(Math.min(8, step + 1))}]`);
        }
      });
    },
    [width, height, visibleIntervals, targetIdx],
  );

  return (
    <div className="my-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Target:</label>
        <select
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          value={targetIdx}
          onChange={(e) => setTargetIdx(Number(e.target.value))}
        >
          {targets.map((t, i) => (
            <option key={t.name} value={i}>{t.label} in [{t.interval[0]}, {t.interval[1]}]</option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            onClick={bisectLeft}
            disabled={step >= allIntervals.intervals.length - 1 || isPlaying}
          >
            Bisect
          </button>
          <button
            className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={step >= allIntervals.intervals.length - 1}
          >
            {isPlaying ? 'Pause' : 'Auto'}
          </button>
          <button
            className="rounded bg-zinc-500 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-600"
            onClick={() => { setStep(0); setIsPlaying(false); playRef.current = false; }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span>Step: <strong className="text-zinc-900 dark:text-zinc-100">{step}</strong></span>
        <span>Interval: <strong className="text-zinc-900 dark:text-zinc-100">[{current.a.toFixed(8)}, {current.b.toFixed(8)}]</strong></span>
        <span>Width: <strong className="text-zinc-900 dark:text-zinc-100">{currentWidth.toExponential(2)}</strong></span>
      </div>

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} width={width} height={height} />
      </div>
    </div>
  );
}
