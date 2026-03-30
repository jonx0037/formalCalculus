import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getSetPresets } from '../../data/completeness-compactness-data';
import { seededRandom, extractConvergentSubsequence } from './shared/limits';
import { functionColors, regionColors } from './shared/colorScales';

const presets = getSetPresets();
const margin = { top: 30, right: 30, bottom: 50, left: 50 };
const SEQ_LENGTH = 40;

export default function SequentialCompactnessExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 420);

  const [presetIdx, setPresetIdx] = useState(0);
  const [seed, setSeed] = useState(42);
  const [showSubsequence, setShowSubsequence] = useState(false);

  const preset = presets[presetIdx];

  // Generate sequence
  const sequence = useMemo(() => {
    const rng = seededRandom(seed);
    return Array.from({ length: SEQ_LENGTH }, (_, n) => ({
      n,
      value: preset.sampleSequence(n, rng),
    }));
  }, [presetIdx, seed]);

  // Generate escaping sequence for non-compact sets
  const escapingSeq = useMemo(() => {
    if (!preset.escapingSequence) return null;
    return Array.from({ length: SEQ_LENGTH }, (_, n) => ({
      n,
      value: preset.escapingSequence!(n),
    }));
  }, [presetIdx]);

  // Extract convergent subsequence
  const subseqResult = useMemo(() => {
    const values = sequence.map((s) => s.value);
    return extractConvergentSubsequence(values);
  }, [sequence]);

  const limitInSet = subseqResult.limit !== null && preset.contains(subseqResult.limit);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const [xMin, xMax] = preset.domain;
      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([0, SEQ_LENGTH]).range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text')
        .style('font-size', '11px');

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(8))
        .selectAll('text')
        .style('font-size', '11px');

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 38)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#6B7280')
        .text('Value');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#6B7280')
        .text('Index n');

      // Shade the set region
      if (preset.name === 'closed-unit' || preset.name === 'open-unit') {
        const left = preset.name === 'closed-unit' ? 0 : 0;
        const right = 1;
        g.append('rect')
          .attr('x', xScale(left))
          .attr('y', 0)
          .attr('width', xScale(right) - xScale(left))
          .attr('height', innerH)
          .style('fill', regionColors.integralFill)
          .style('fill-opacity', 0.3);
      } else if (preset.name === 'disconnected') {
        [[0, 1], [2, 3]].forEach(([a, b]) => {
          g.append('rect')
            .attr('x', xScale(a))
            .attr('y', 0)
            .attr('width', xScale(b) - xScale(a))
            .attr('height', innerH)
            .style('fill', regionColors.integralFill)
            .style('fill-opacity', 0.3);
        });
      } else if (preset.name === 'half-line') {
        g.append('rect')
          .attr('x', xScale(0))
          .attr('y', 0)
          .attr('width', innerW - xScale(0))
          .attr('height', innerH)
          .style('fill', regionColors.integralFill)
          .style('fill-opacity', 0.15);
      }

      // Plot all sequence points
      sequence.forEach((pt) => {
        const isInSubseq = showSubsequence && subseqResult.indices.includes(pt.n);
        g.append('circle')
          .attr('cx', xScale(pt.value))
          .attr('cy', yScale(pt.n))
          .attr('r', isInSubseq ? 5 : 3)
          .style('fill', isInSubseq ? '#059669' : functionColors[0])
          .style('fill-opacity', isInSubseq ? 1 : 0.5)
          .style('stroke', isInSubseq ? '#065F46' : 'none')
          .style('stroke-width', isInSubseq ? 1.5 : 0);
      });

      // Draw subsequence connecting line
      if (showSubsequence && subseqResult.indices.length > 1) {
        const lineData = subseqResult.indices.map((i) => ({
          x: xScale(sequence[i].value),
          y: yScale(i),
        }));

        const line = d3.line<{ x: number; y: number }>()
          .x((d) => d.x)
          .y((d) => d.y);

        g.append('path')
          .datum(lineData)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', '#059669')
          .style('stroke-width', 1.5)
          .style('stroke-opacity', 0.5)
          .style('stroke-dasharray', '4,3');
      }

      // Draw limit marker
      if (showSubsequence && subseqResult.limit !== null) {
        const lx = xScale(subseqResult.limit);
        g.append('line')
          .attr('x1', lx)
          .attr('x2', lx)
          .attr('y1', 0)
          .attr('y2', innerH)
          .style('stroke', limitInSet ? '#059669' : '#DC2626')
          .style('stroke-width', 2)
          .style('stroke-dasharray', '6,3');

        g.append('text')
          .attr('x', lx + 5)
          .attr('y', 15)
          .style('font-size', '11px')
          .style('fill', limitInSet ? '#059669' : '#DC2626')
          .style('font-weight', '600')
          .text(`L ≈ ${subseqResult.limit.toFixed(4)}`);
      }
    },
    [width, height, sequence, showSubsequence, subseqResult, presetIdx],
  );

  return (
    <div className="my-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Set:</label>
        <select
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          value={presetIdx}
          onChange={(e) => { setPresetIdx(Number(e.target.value)); setShowSubsequence(false); }}
        >
          {presets.map((p, i) => (
            <option key={p.name} value={i}>
              {p.label} — {p.isCompact ? 'compact' : 'not compact'}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => { setSeed((s) => s + 1); setShowSubsequence(false); }}
          >
            Generate Sequence
          </button>
          <button
            className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            onClick={() => setShowSubsequence(true)}
            disabled={showSubsequence}
          >
            Extract Subsequence
          </button>
        </div>
      </div>

      {showSubsequence && subseqResult.limit !== null && (
        <div className={`mb-2 rounded px-3 py-2 text-sm ${limitInSet
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {limitInSet
            ? <>Subsequential limit <strong>L ≈ {subseqResult.limit.toFixed(4)}</strong> is in {preset.label} — the set keeps its limits (compact).</>
            : <>Subsequential limit <strong>L ≈ {subseqResult.limit.toFixed(4)}</strong> is <strong>not</strong> in {preset.label} — the limit escapes (not compact).</>
          }
        </div>
      )}

      <div className="mb-2 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span>Compact: <strong>{preset.isCompact ? 'Yes' : 'No'}</strong></span>
        <span>Closed: <strong>{preset.isClosed ? 'Yes' : 'No'}</strong></span>
        <span>Bounded: <strong>{preset.isBounded ? 'Yes' : 'No'}</strong></span>
      </div>

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} width={width} height={height} />
      </div>
    </div>
  );
}
