import { useState, useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  getIntegralPresets,
  getLebesgueIntegralSequence,
  type IntegralPreset,
} from '../../data/lebesgue-integral-data';

// ── Constants ─────────────────────────────────────────────────

const FUNCTION_COLOR = '#111827';
const SIMPLE_COLOR = '#4F46E5'; // indigo

const PRESETS: IntegralPreset[] = getIntegralPresets();
const MAX_LEVELS = 10;
const PLAY_INTERVAL_MS = 600;

// ── Main component ────────────────────────────────────────────

export default function LebesgueIntegralBuilder() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [presetIdx, setPresetIdx] = useState(0);
  const [nLevels, setNLevels] = useState(3);
  const [playing, setPlaying] = useState(false);

  const preset = PRESETS[presetIdx];

  // ── Auto-advance during play ──────────────────────────────

  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    playIntervalRef.current = setInterval(() => {
      setNLevels((prev) => {
        if (prev >= MAX_LEVELS) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => {
      if (playIntervalRef.current !== null) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [playing]);

  // ── Layout ────────────────────────────────────────────────

  const totalWidth = Math.min(containerWidth, 760);
  const totalHeight = Math.min(420, totalWidth * 0.55);
  const margin = { top: 24, right: 24, bottom: 38, left: 50 };

  // ── Compute integral sequence ─────────────────────────────

  const sequence = useMemo(
    () =>
      getLebesgueIntegralSequence(
        preset.f,
        MAX_LEVELS,
        preset.domain,
        preset.exactIntegral,
        preset.maxValue,
      ),
    [preset],
  );

  const currentStep = sequence[Math.min(nLevels, MAX_LEVELS) - 1];

  const curve = useMemo(() => {
    const N = 400;
    const [a, b] = preset.domain;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = a + (i / (N - 1)) * (b - a);
      const y = preset.f(x);
      pts.push([x, Math.min(y, preset.maxValue)]);
    }
    return pts;
  }, [preset]);

  // ── D3 render ─────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (totalWidth === 0) return;

      const innerW = totalWidth - margin.left - margin.right;
      const innerH = totalHeight - margin.top - margin.bottom;

      svg.attr('width', totalWidth).attr('height', totalHeight);
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleLinear()
        .domain([preset.domain[0], preset.domain[1]])
        .range([0, innerW]);
      const yScale = d3
        .scaleLinear()
        .domain([0, preset.maxValue * 1.05])
        .range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('x');
      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('font-size', '11px')
        .style('fill', 'var(--color-text-muted)')
        .text('f(x)');

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', SIMPLE_COLOR)
        .text(`Dyadic simple-function approximation — 2^${nLevels} = ${Math.pow(2, nLevels)} levels`);

      // Clip
      g.append('defs')
        .append('clipPath')
        .attr('id', 'lib-clip')
        .append('rect')
        .attr('width', innerW)
        .attr('height', innerH);
      const plot = g.append('g').attr('clip-path', 'url(#lib-clip)');

      // Lebesgue staircase: horizontal bars built from preimage sets
      for (const step of currentStep.approximation.steps) {
        const yVal = step.level;
        for (const iv of step.preimageSet) {
          plot
            .append('rect')
            .attr('x', xScale(iv.a))
            .attr('y', yScale(yVal))
            .attr('width', Math.max(0.5, xScale(iv.b) - xScale(iv.a)))
            .attr('height', Math.max(0.5, yScale(0) - yScale(yVal)))
            .style('fill', SIMPLE_COLOR)
            .style('fill-opacity', 0.32)
            .style('stroke', SIMPLE_COLOR)
            .style('stroke-width', 0.4);
        }
      }

      // Function curve on top
      const line = d3
        .line<[number, number]>()
        .defined(([, y]) => Number.isFinite(y))
        .x(([x]) => xScale(x))
        .y(([, y]) => yScale(y));

      plot
        .append('path')
        .datum(curve)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', FUNCTION_COLOR)
        .style('stroke-width', 1.8);
    },
    [
      currentStep,
      curve,
      preset,
      nLevels,
      totalWidth,
      totalHeight,
      margin.left,
      margin.right,
      margin.top,
      margin.bottom,
    ],
  );

  // ── Numeric readout ───────────────────────────────────────

  const integralApprox = currentStep.integralApprox;
  const exact = preset.exactIntegral;
  const error = Math.abs(integralApprox - exact);

  return (
    <div ref={containerRef} className="flex flex-col gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label
          className="flex items-center gap-1.5 font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Function:
          <select
            value={presetIdx}
            onChange={(e) => {
              setPresetIdx(parseInt(e.target.value));
              setPlaying(false);
            }}
            className="rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            aria-label="Choose target function"
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label
          className="flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          levels = 2^{nLevels} = {Math.pow(2, nLevels)}
          <input
            type="range"
            min={1}
            max={MAX_LEVELS}
            step={1}
            value={nLevels}
            onChange={(e) => {
              setNLevels(parseInt(e.target.value));
              setPlaying(false);
            }}
            className="w-40"
            aria-label="Number of dyadic levels (exponent)"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            if (nLevels >= MAX_LEVELS) setNLevels(1);
            setPlaying((p) => !p);
          }}
          className="px-3 py-1 text-xs rounded"
          style={{
            background: playing ? SIMPLE_COLOR : 'var(--color-surface-alt)',
            color: playing ? '#fff' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
          aria-pressed={playing}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        className="rounded"
        style={{
          border: '1px solid var(--color-border)',
          background: 'var(--color-viz-bg)',
        }}
        role="img"
        aria-label="Lebesgue integral builder: dyadic simple-function staircase climbing toward the target function"
      />

      {/* Numeric readout */}
      <div
        className="text-xs flex flex-wrap gap-x-4 gap-y-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span style={{ color: SIMPLE_COLOR }}>
          ∫ s_n dλ = {integralApprox.toFixed(5)}
        </span>
        <span>Exact ∫ f dλ = {exact.toFixed(5)}</span>
        <span>Error: {error.toExponential(2)}</span>
      </div>

      <p
        className="text-xs italic"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {preset.description} The simple function s_n is the largest dyadic
        staircase below f at this level — the supremum over all such staircases
        as n → ∞ is the Lebesgue integral ∫ f dλ.
      </p>
    </div>
  );
}
