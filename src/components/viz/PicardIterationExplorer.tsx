import { useState, useMemo, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { picardIteration } from './shared/odes';
import { getPicardPresets } from '../../data/first-order-odes-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getPicardPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const BLUE = '#2563EB';
const LIGHT_RED = 'rgba(239, 68, 68, 0.2)';
const RED = '#DC2626';
const NUM_PTS = 200;

/** Graduated purple palette for iterates (lighter → darker). */
function iterateColor(k: number, maxK: number): string {
  const lightness = 80 - (k / Math.max(maxK, 1)) * 45;
  return `hsl(270, 60%, ${lightness}%)`;
}

// ── Component ─────────────────────────────────────────────────

export default function PicardIterationExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 420);
  const errorH = 100;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [n, setN] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [showExact, setShowExact] = useState(true);
  const [showError, setShowError] = useState(false);

  const preset = PRESETS[selectedIdx];

  // ── Animation ──────────────────────────────────────────────

  useEffect(() => {
    if (!playing) return;
    const maxN = preset.maxN;
    const interval = setInterval(() => {
      setN((prev) => {
        if (prev >= maxN) {
          setPlaying(false);
          return maxN;
        }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [playing, preset.maxN]);

  // ── Compute Picard iterates ────────────────────────────────

  const tRange: [number, number] = useMemo(() => {
    // Pick a reasonable range around t0
    if (preset.name === 'blowup') return [-0.5, 0.85];
    return [preset.t0 - 1.5, preset.t0 + 2.5];
  }, [preset]);

  const iterates = useMemo(() => {
    // Use closed-form iterates from preset if available, otherwise numerical
    const maxAvailable = preset.iterates.length - 1;
    const usePrecomputed = n <= maxAvailable;

    if (usePrecomputed) {
      // Build from preset closed-form iterates
      const dt = (tRange[1] - tRange[0]) / NUM_PTS;
      return Array.from({ length: n + 1 }, (_, k) => ({
        n: k,
        values: Array.from({ length: NUM_PTS + 1 }, (_, i) => {
          const t = tRange[0] + i * dt;
          return { t, y: preset.iterates[k](t) };
        }),
        maxError:
          Math.max(
            ...Array.from({ length: NUM_PTS + 1 }, (_, i) => {
              const t = tRange[0] + i * dt;
              return Math.abs(preset.iterates[k](t) - preset.exactSolution(t));
            }),
          ),
      }));
    }

    // Fall back to numerical Picard iteration
    return picardIteration(
      preset.f,
      preset.t0,
      preset.y0,
      n,
      tRange,
      NUM_PTS + 1,
      preset.exactSolution,
    );
  }, [preset, n, tRange]);

  // ── Exact solution curve ───────────────────────────────────

  const exactPts = useMemo(() => {
    const dt = (tRange[1] - tRange[0]) / NUM_PTS;
    return Array.from({ length: NUM_PTS + 1 }, (_, i) => {
      const t = tRange[0] + i * dt;
      return { t, y: preset.exactSolution(t) };
    });
  }, [preset, tRange]);

  // ── D3 rendering ──────────────────────────────────────────

  const totalH = showError ? height + errorH + 20 : height;

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      svg.attr('width', width).attr('height', totalH);

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Y range: fit exact + iterates
      const allYs = [
        ...exactPts.map((d) => d.y),
        ...iterates.flatMap((it) => it.values.map((v) => v.y)),
      ].filter((v) => isFinite(v) && Math.abs(v) < 100);
      const yMinVal = d3.min(allYs) ?? -1;
      const yMaxVal = d3.max(allYs) ?? 2;
      const yPad = (yMaxVal - yMinVal) * 0.1 || 0.5;

      const xScale = d3.scaleLinear().domain(tRange).range([0, innerW]);
      const yScale = d3
        .scaleLinear()
        .domain([yMinVal - yPad, yMaxVal + yPad])
        .range([innerH, 0]);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(8))
        .selectAll('text')
        .style('font-size', '10px');

      g.call(d3.axisLeft(yScale).ticks(6)).selectAll('text').style('font-size', '10px');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#374151')
        .text('t');

      // Line generator
      const line = d3
        .line<{ t: number; y: number }>()
        .x((d) => xScale(d.t))
        .y((d) => yScale(d.y))
        .defined((d) => isFinite(d.y) && Math.abs(d.y) < 100);

      // Picard iterates (graduated purple)
      iterates.forEach((it) => {
        g.append('path')
          .datum(it.values)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', iterateColor(it.n, n))
          .style('stroke-width', it.n === n ? 2 : 1.2)
          .style('stroke-opacity', 0.4 + (it.n / Math.max(n, 1)) * 0.6);
      });

      // Exact solution (bold blue)
      if (showExact) {
        g.append('path')
          .datum(exactPts)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', BLUE)
          .style('stroke-width', 2.5);
      }

      // Initial condition dot
      g.append('circle')
        .attr('cx', xScale(preset.t0))
        .attr('cy', yScale(preset.y0))
        .attr('r', 4)
        .style('fill', BLUE)
        .style('stroke', '#fff')
        .style('stroke-width', 1.5);

      // ── Error sub-panel ────────────────────────────────────

      if (showError && iterates.length > 0) {
        const gErr = svg
          .append('g')
          .attr('transform', `translate(${margin.left},${height + 10})`);

        const errors = iterates
          .filter((it) => it.maxError != null && it.maxError > 0)
          .map((it) => ({ n: it.n, err: it.maxError! }));

        if (errors.length > 0) {
          const errMax = d3.max(errors, (d) => d.err) ?? 1;
          const xErr = d3
            .scaleLinear()
            .domain([0, n])
            .range([0, innerW]);
          const yErr = d3
            .scaleLog()
            .domain([Math.max(1e-12, errMax * 1e-3), errMax * 2])
            .range([errorH - 20, 0]);

          gErr
            .append('g')
            .attr('transform', `translate(0,${errorH - 20})`)
            .call(d3.axisBottom(xErr).ticks(n).tickFormat(d3.format('d')))
            .selectAll('text')
            .style('font-size', '10px');

          gErr
            .call(d3.axisLeft(yErr).ticks(3, '.0e'))
            .selectAll('text')
            .style('font-size', '9px');

          gErr
            .append('text')
            .attr('x', innerW / 2)
            .attr('y', errorH - 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', '#6b7280')
            .text('iteration n');

          // Error area
          const areaFn = d3
            .area<{ n: number; err: number }>()
            .x((d) => xErr(d.n))
            .y0(errorH - 20)
            .y1((d) => yErr(Math.max(d.err, 1e-12)));

          gErr
            .append('path')
            .datum(errors)
            .attr('d', areaFn)
            .style('fill', LIGHT_RED);

          // Error line + dots
          const errLine = d3
            .line<{ n: number; err: number }>()
            .x((d) => xErr(d.n))
            .y((d) => yErr(Math.max(d.err, 1e-12)));

          gErr
            .append('path')
            .datum(errors)
            .attr('d', errLine)
            .style('fill', 'none')
            .style('stroke', RED)
            .style('stroke-width', 1.5);

          errors.forEach((d) => {
            gErr
              .append('circle')
              .attr('cx', xErr(d.n))
              .attr('cy', yErr(Math.max(d.err, 1e-12)))
              .attr('r', 3)
              .style('fill', RED);
          });
        }
      }
    },
    [width, totalH, height, iterates, exactPts, showExact, showError, n, preset, tRange],
  );

  // Current error readout
  const currentError = iterates[n]?.maxError;

  // ── JSX ────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 780 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: 10 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>
          ODE:&nbsp;
          <select
            value={selectedIdx}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              setSelectedIdx(Number(e.target.value));
              setN(0);
              setPlaying(false);
            }}
            style={{ fontSize: 13, padding: '2px 6px' }}
          >
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 13, color: '#374151' }}>
          n =&nbsp;
          <input
            type="range"
            min={0}
            max={preset.maxN}
            value={n}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setN(Number(e.target.value));
              setPlaying(false);
            }}
            style={{ width: 120, verticalAlign: 'middle' }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 4 }}>{n}</span>
        </label>

        <button
          onClick={() => {
            if (n >= preset.maxN) setN(0);
            setPlaying(!playing);
          }}
          style={{
            fontSize: 12,
            padding: '3px 10px',
            background: playing ? '#FEE2E2' : '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>

        <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showExact}
            onChange={() => setShowExact(!showExact)}
            style={{ marginRight: 4, verticalAlign: 'middle' }}
          />
          Exact
        </label>

        <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showError}
            onChange={() => setShowError(!showError)}
            style={{ marginRight: 4, verticalAlign: 'middle' }}
          />
          Error
        </label>
      </div>

      <svg ref={svgRef} />

      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
        Picard iterate y_{n} &nbsp;|&nbsp; n = {n}
        {currentError != null && (
          <span>
            &nbsp;|&nbsp; max error = {currentError < 0.001 ? currentError.toExponential(2) : currentError.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}
