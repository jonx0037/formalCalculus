import { useState } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  generateOpenCover,
  checkCoverage,
  findMinimalSubcover,
  type CoverInterval,
} from '../../data/completeness-compactness-data';

const margin = { top: 30, right: 30, bottom: 50, left: 30 };

const SET_OPTIONS = [
  { name: 'closed', label: '[0, 1]', left: 0, right: 1, isCompact: true },
  { name: 'open', label: '(0, 1)', left: 0, right: 1, isCompact: false },
] as const;

// Distinct colors for cover intervals
const coverColors = [
  '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED',
  '#0891B2', '#BE185D', '#4F46E5', '#EA580C', '#0D9488',
  '#9333EA', '#65A30D',
];

export default function HeineBorelExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.5, 380);

  const [setIdx, setSetIdx] = useState(0);
  const [seed, setSeed] = useState(7);
  const [intervals, setIntervals] = useState<CoverInterval[]>(() =>
    generateOpenCover(0, 1, true, 7, 12)
  );
  const [coverageResult, setCoverageResult] = useState<ReturnType<typeof checkCoverage> | null>(null);
  const [autoResult, setAutoResult] = useState<number[] | null>(null);
  const [autoAttempted, setAutoAttempted] = useState(false);

  const setOption = SET_OPTIONS[setIdx];

  const handleGenerateCover = () => {
    const newSeed = seed + 1;
    setSeed(newSeed);
    const newIntervals = generateOpenCover(setOption.left, setOption.right, setOption.isCompact, newSeed, 12);
    setIntervals(newIntervals);
    setCoverageResult(null);
    setAutoResult(null);
    setAutoAttempted(false);
  };

  const handleSetChange = (idx: number) => {
    setSetIdx(idx);
    const newIntervals = generateOpenCover(
      SET_OPTIONS[idx].left,
      SET_OPTIONS[idx].right,
      SET_OPTIONS[idx].isCompact,
      seed,
      12,
    );
    setIntervals(newIntervals);
    setCoverageResult(null);
    setAutoResult(null);
    setAutoAttempted(false);
  };

  const toggleInterval = (id: number) => {
    setIntervals((prev) =>
      prev.map((iv) => (iv.id === id ? { ...iv, selected: !iv.selected } : iv))
    );
    setCoverageResult(null);
    setAutoResult(null);
    setAutoAttempted(false);
  };

  const handleCheckCoverage = () => {
    const result = checkCoverage(setOption.left, setOption.right, intervals, setOption.isCompact);
    setCoverageResult(result);
  };

  const handleAutoSubcover = () => {
    const result = findMinimalSubcover(setOption.left, setOption.right, intervals);
    setAutoResult(result);
    setAutoAttempted(true);
    if (result) {
      setIntervals((prev) =>
        prev.map((iv) => ({ ...iv, selected: result.includes(iv.id) }))
      );
      const coverage = checkCoverage(
        setOption.left,
        setOption.right,
        intervals.map((iv) => ({ ...iv, selected: result.includes(iv.id) })),
        setOption.isCompact,
      );
      setCoverageResult(coverage);
    } else {
      setCoverageResult({ covered: false, coverageFraction: 0, uncoveredPoints: [] });
    }
  };

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Find extent of all intervals
      const allPts = intervals.flatMap((iv) => [iv.left, iv.right]);
      const minX = Math.min(setOption.left, ...allPts) - 0.15;
      const maxX = Math.max(setOption.right, ...allPts) + 0.15;

      const xScale = d3.scaleLinear().domain([minX, maxX]).range([0, innerW]);

      // Number line
      const axisY = innerH - 10;
      g.append('g')
        .attr('transform', `translate(0,${axisY})`)
        .call(d3.axisBottom(xScale).ticks(8))
        .selectAll('text')
        .style('font-size', '11px');

      // Draw the set
      const setLeft = xScale(setOption.left);
      const setRight = xScale(setOption.right);

      g.append('rect')
        .attr('x', setLeft)
        .attr('y', axisY - 8)
        .attr('width', setRight - setLeft)
        .attr('height', 16)
        .style('fill', '#1E3A5F')
        .style('fill-opacity', 0.15);

      g.append('line')
        .attr('x1', setLeft)
        .attr('x2', setRight)
        .attr('y1', axisY)
        .attr('y2', axisY)
        .style('stroke', '#1E3A5F')
        .style('stroke-width', 4);

      // Endpoint markers (filled = closed, hollow = open)
      [setOption.left, setOption.right].forEach((pt) => {
        const isClosed = setOption.isCompact;
        g.append('circle')
          .attr('cx', xScale(pt))
          .attr('cy', axisY)
          .attr('r', 5)
          .style('fill', isClosed ? '#1E3A5F' : '#FFF')
          .style('stroke', '#1E3A5F')
          .style('stroke-width', 2);
      });

      // Set label
      g.append('text')
        .attr('x', (setLeft + setRight) / 2)
        .attr('y', axisY + 28)
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .style('fill', '#1E3A5F')
        .text(setOption.label);

      // Draw cover intervals above the number line
      const intervalHeight = Math.max(6, Math.min(16, (axisY - 40) / intervals.length));
      const gap = 2;

      intervals.forEach((iv, i) => {
        const y = axisY - 20 - (i + 1) * (intervalHeight + gap);
        const x1 = xScale(iv.left);
        const x2 = xScale(iv.right);
        const color = coverColors[i % coverColors.length];

        // Interval bar
        g.append('rect')
          .attr('x', x1)
          .attr('y', y)
          .attr('width', Math.max(2, x2 - x1))
          .attr('height', intervalHeight)
          .style('fill', color)
          .style('fill-opacity', iv.selected ? 0.6 : 0.15)
          .style('stroke', color)
          .style('stroke-width', iv.selected ? 2 : 1)
          .style('stroke-opacity', iv.selected ? 1 : 0.4)
          .style('cursor', 'pointer')
          .attr('rx', 2)
          .on('click', () => toggleInterval(iv.id));

        // Open endpoint markers (small parentheses)
        if (iv.selected && x2 - x1 > 15) {
          g.append('circle')
            .attr('cx', x1)
            .attr('cy', y + intervalHeight / 2)
            .attr('r', 2.5)
            .style('fill', '#FFF')
            .style('stroke', color)
            .style('stroke-width', 1.5);
          g.append('circle')
            .attr('cx', x2)
            .attr('cy', y + intervalHeight / 2)
            .attr('r', 2.5)
            .style('fill', '#FFF')
            .style('stroke', color)
            .style('stroke-width', 1.5);
        }
      });

      // Show uncovered points
      if (coverageResult && !coverageResult.covered) {
        coverageResult.uncoveredPoints.forEach((pt) => {
          g.append('circle')
            .attr('cx', xScale(pt))
            .attr('cy', axisY)
            .attr('r', 3)
            .style('fill', '#DC2626')
            .style('fill-opacity', 0.7);
        });
      }
    },
    [width, height, intervals, setIdx, coverageResult],
  );

  return (
    <div className="my-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Set:</label>
        <select
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          value={setIdx}
          onChange={(e) => handleSetChange(Number(e.target.value))}
        >
          {SET_OPTIONS.map((s, i) => (
            <option key={s.name} value={i}>
              {s.label} — {s.isCompact ? 'compact' : 'not compact'}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
            onClick={handleGenerateCover}
          >
            Generate Cover
          </button>
          <button
            className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-700"
            onClick={handleCheckCoverage}
          >
            Check Coverage
          </button>
          <button
            className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700"
            onClick={handleAutoSubcover}
          >
            Auto Subcover
          </button>
        </div>
      </div>

      <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
        Click on individual cover intervals to toggle them on/off. Try to find a finite subcover that covers the set.
      </p>

      {coverageResult && (
        <div className={`mb-2 rounded px-3 py-2 text-sm ${coverageResult.covered
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {coverageResult.covered
            ? <>Selected intervals <strong>cover</strong> {setOption.label} — finite subcover found ({intervals.filter(iv => iv.selected).length} intervals).</>
            : autoAttempted
              ? <>No finite subcover exists for {setOption.label} — this set is <strong>not compact</strong>.</>
              : <>Selected intervals <strong>do not cover</strong> {setOption.label} — coverage: {(coverageResult.coverageFraction * 100).toFixed(1)}%. Try selecting more intervals.</>
          }
        </div>
      )}

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} width={width} height={height} />
      </div>
    </div>
  );
}
