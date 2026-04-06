import { useState, useMemo, useEffect } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { matrixExponential2x2 } from './shared/odes';
import type { Matrix2x2 } from './shared/odes';

// ── Constants ─────────────────────────────────────────────────

const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const NUM_T_PTS = 100;
const MAX_N = 20;
const T_MAX = 3;

/** Colors for the four matrix entries [0][0], [0][1], [1][0], [1][1]. */
const ENTRY_COLORS = ['#2563EB', '#DC2626', '#16A34A', '#EA580C'] as const;
const ENTRY_LABELS = ['[1,1]', '[1,2]', '[2,1]', '[2,2]'] as const;

// ── Component ─────────────────────────────────────────────────

export default function MatrixExponentialExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();

  // ── State ──────────────────────────────────────────────────

  const [a11, setA11] = useState(0);
  const [a12, setA12] = useState(-1);
  const [a21, setA21] = useState(1);
  const [a22, setA22] = useState(0);
  const [tVal, setTVal] = useState(2);
  const [nTerms, setNTerms] = useState(MAX_N);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Animation ─────────────────────────────────────────────

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setNTerms((currentN) => {
        if (currentN >= MAX_N) {
          setIsPlaying(false);
          return MAX_N;
        }
        return currentN + 1;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (nTerms >= MAX_N) {
        setNTerms(0);
      }
      setIsPlaying(true);
    }
  };

  // ── Computed data ─────────────────────────────────────────

  const A: Matrix2x2 = useMemo(
    () => ({ a11, a12, a21, a22 }),
    [a11, a12, a21, a22],
  );

  const tGrid = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= NUM_T_PTS; i++) {
      pts.push((i / NUM_T_PTS) * T_MAX);
    }
    return pts;
  }, []);

  /**
   * Exact curves: for each entry [i][j], the exact value of e^{At}
   * evaluated across tGrid.
   */
  const exactCurves = useMemo(() => {
    // curves[entryIdx] = Array<{ t, value }>
    const curves: Array<Array<{ t: number; value: number }>> = [[], [], [], []];
    for (const t of tGrid) {
      const result = matrixExponential2x2(A, t);
      const m = result.matrix;
      curves[0].push({ t, value: m[0][0] });
      curves[1].push({ t, value: m[0][1] });
      curves[2].push({ t, value: m[1][0] });
      curves[3].push({ t, value: m[1][1] });
    }
    return curves;
  }, [A, tGrid]);

  /**
   * Partial sum curves: for the current N, compute partial sum values
   * at same t points.
   */
  const partialCurves = useMemo(() => {
    const curves: Array<Array<{ t: number; value: number }>> = [[], [], [], []];
    for (const t of tGrid) {
      const result = matrixExponential2x2(A, t, {
        numTerms: nTerms,
        returnPartialSums: true,
      });
      // partialSums[k] is the partial sum S_k; we want S_{nTerms}
      const sums = result.partialSums;
      const m = sums && sums.length > nTerms ? sums[nTerms] : result.matrix;
      curves[0].push({ t, value: m[0][0] });
      curves[1].push({ t, value: m[0][1] });
      curves[2].push({ t, value: m[1][0] });
      curves[3].push({ t, value: m[1][1] });
    }
    return curves;
  }, [A, tGrid, nTerms]);

  /**
   * Error data: for each N from 0 to 20, compute the max absolute entry-wise
   * error at t = tVal.
   */
  const errorData = useMemo(() => {
    const exact = matrixExponential2x2(A, tVal);
    const em = exact.matrix;

    const data: Array<{ n: number; error: number }> = [];
    for (let k = 0; k <= MAX_N; k++) {
      const partial = matrixExponential2x2(A, tVal, {
        numTerms: k,
        returnPartialSums: true,
      });
      const sums = partial.partialSums;
      const pm = sums && sums.length > k ? sums[k] : partial.matrix;

      let maxErr = 0;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          maxErr = Math.max(maxErr, Math.abs(pm[i][j] - em[i][j]));
        }
      }
      // Clamp tiny errors to a small positive number for log scale
      data.push({ n: k, error: Math.max(maxErr, 1e-16) });
    }
    return data;
  }, [A, tVal]);

  // ── Layout dimensions ─────────────────────────────────────

  const leftW = Math.max(200, (width - 12) * 0.55);
  const rightW = Math.max(160, (width - 12) * 0.45);
  const chartH = Math.min(width * 0.45, 340);

  // ── Left panel: partial sums convergence ──────────────────

  const leftSvgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (leftW < 80 || chartH < 60) return;

      svg.attr('width', leftW).attr('height', chartH);

      const innerW = leftW - margin.left - margin.right;
      const innerH = chartH - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Compute y-range across all exact curves
      let yMin = Infinity;
      let yMax = -Infinity;
      for (const curve of exactCurves) {
        for (const pt of curve) {
          if (isFinite(pt.value)) {
            yMin = Math.min(yMin, pt.value);
            yMax = Math.max(yMax, pt.value);
          }
        }
      }
      for (const curve of partialCurves) {
        for (const pt of curve) {
          if (isFinite(pt.value)) {
            yMin = Math.min(yMin, pt.value);
            yMax = Math.max(yMax, pt.value);
          }
        }
      }
      const yPad = (yMax - yMin) * 0.1 || 1;
      yMin -= yPad;
      yMax += yPad;

      const xScale = d3.scaleLinear().domain([0, T_MAX]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Clip path
      const clipId = 'clip-left-matexp';
      const defs = svg.append('defs');
      defs
        .append('clipPath')
        .attr('id', clipId)
        .append('rect')
        .attr('width', innerW)
        .attr('height', innerH);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');

      // Style axis domain lines
      g.selectAll('.domain')
        .style('stroke', 'var(--color-text-secondary, #9ca3af)');
      g.selectAll('.tick line')
        .style('stroke', 'var(--color-text-secondary, #d1d5db)');

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '11px')
        .text('t');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '11px')
        .text('Entry value');

      const plotG = g.append('g').attr('clip-path', `url(#${clipId})`);

      // Draw exact curves (solid)
      for (let idx = 0; idx < 4; idx++) {
        const line = d3
          .line<{ t: number; value: number }>()
          .x((d) => xScale(d.t))
          .y((d) => yScale(d.value))
          .defined((d) => isFinite(d.value));

        plotG
          .append('path')
          .datum(exactCurves[idx])
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', ENTRY_COLORS[idx])
          .attr('stroke-width', 2.5)
          .attr('opacity', 0.9);
      }

      // Draw partial sum curves (dashed)
      for (let idx = 0; idx < 4; idx++) {
        const line = d3
          .line<{ t: number; value: number }>()
          .x((d) => xScale(d.t))
          .y((d) => yScale(d.value))
          .defined((d) => isFinite(d.value));

        plotG
          .append('path')
          .datum(partialCurves[idx])
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', ENTRY_COLORS[idx])
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '6,4')
          .attr('opacity', 0.8);
      }

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-primary, #374151)')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .text(`Partial sums (N = ${nTerms})`);
    },
    [leftW, chartH, exactCurves, partialCurves, nTerms],
  );

  // ── Right panel: error vs N ───────────────────────────────

  const rightSvgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (rightW < 60 || chartH < 60) return;

      svg.attr('width', rightW).attr('height', chartH);

      const innerW = rightW - margin.left - margin.right;
      const innerH = chartH - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const xScale = d3.scaleLinear().domain([0, MAX_N]).range([0, innerW]);

      // Compute log-scale y domain
      const errors = errorData.map((d) => d.error);
      const minErr = Math.max(d3.min(errors) ?? 1e-16, 1e-16);
      const maxErr = Math.max(d3.max(errors) ?? 1, minErr * 10);

      const yScale = d3
        .scaleLog()
        .domain([minErr * 0.5, maxErr * 2])
        .range([innerH, 0])
        .clamp(true);

      // Clip path
      const clipId = 'clip-right-matexp';
      const defs = svg.append('defs');
      defs
        .append('clipPath')
        .attr('id', clipId)
        .append('rect')
        .attr('width', innerW)
        .attr('height', innerH);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('d')))
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');
      g.append('g')
        .call(
          d3
            .axisLeft(yScale)
            .ticks(5, '.0e')
        )
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');

      // Style axis domain lines
      g.selectAll('.domain')
        .style('stroke', 'var(--color-text-secondary, #9ca3af)');
      g.selectAll('.tick line')
        .style('stroke', 'var(--color-text-secondary, #d1d5db)');

      // Axis labels
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '11px')
        .text('N (terms)');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '11px')
        .text('Max error');

      const plotG = g.append('g').attr('clip-path', `url(#${clipId})`);

      // Connected line
      const line = d3
        .line<{ n: number; error: number }>()
        .x((d) => xScale(d.n))
        .y((d) => yScale(d.error));

      plotG
        .append('path')
        .datum(errorData)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', '#6366F1')
        .attr('stroke-width', 2);

      // Dots
      plotG
        .selectAll('circle')
        .data(errorData)
        .join('circle')
        .attr('cx', (d) => xScale(d.n))
        .attr('cy', (d) => yScale(d.error))
        .attr('r', 3.5)
        .attr('fill', (d) => (d.n === nTerms ? '#4F46E5' : '#A5B4FC'))
        .attr('stroke', '#4F46E5')
        .attr('stroke-width', 1);

      // Highlight current N with a larger dot
      const currentErr = errorData.find((d) => d.n === nTerms);
      if (currentErr) {
        plotG
          .append('circle')
          .attr('cx', xScale(currentErr.n))
          .attr('cy', yScale(currentErr.error))
          .attr('r', 5.5)
          .attr('fill', '#4F46E5')
          .attr('stroke', '#312E81')
          .attr('stroke-width', 1.5);
      }

      // Title
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-primary, #374151)')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .text(`Error at t = ${tVal.toFixed(2)}`);
    },
    [rightW, chartH, errorData, nTerms, tVal],
  );

  // ── Slider helper ─────────────────────────────────────────

  const sliderStyle: React.CSSProperties = {
    width: 80,
    accentColor: '#6366F1',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--color-text-secondary, #6b7280)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    whiteSpace: 'nowrap' as const,
  };

  // ── JSX ───────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 860 }}>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: 10,
          alignItems: 'center',
        }}
      >
        {/* Matrix entry sliders */}
        <label style={labelStyle}>
          a<sub>11</sub>={a11.toFixed(1)}
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={a11}
            onChange={(e) => setA11(Number(e.target.value))}
            style={sliderStyle}
          />
        </label>
        <label style={labelStyle}>
          a<sub>12</sub>={a12.toFixed(1)}
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={a12}
            onChange={(e) => setA12(Number(e.target.value))}
            style={sliderStyle}
          />
        </label>
        <label style={labelStyle}>
          a<sub>21</sub>={a21.toFixed(1)}
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={a21}
            onChange={(e) => setA21(Number(e.target.value))}
            style={sliderStyle}
          />
        </label>
        <label style={labelStyle}>
          a<sub>22</sub>={a22.toFixed(1)}
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={a22}
            onChange={(e) => setA22(Number(e.target.value))}
            style={sliderStyle}
          />
        </label>

        {/* t slider */}
        <label style={labelStyle}>
          t={tVal.toFixed(2)}
          <input
            type="range"
            min={0}
            max={T_MAX}
            step={0.05}
            value={tVal}
            onChange={(e) => setTVal(Number(e.target.value))}
            style={sliderStyle}
          />
        </label>

        {/* N slider */}
        <label style={labelStyle}>
          N={nTerms}
          <input
            type="range"
            min={0}
            max={MAX_N}
            step={1}
            value={nTerms}
            onChange={(e) => {
              setNTerms(Number(e.target.value));
              setIsPlaying(false);
            }}
            style={sliderStyle}
          />
        </label>

        {/* Play/Stop button */}
        <button
          onClick={handlePlayToggle}
          style={{
            padding: '3px 10px',
            fontSize: 12,
            borderRadius: 4,
            border: '1px solid var(--color-border, #d1d5db)',
            background: isPlaying
              ? 'var(--color-bg-danger, #FEE2E2)'
              : 'var(--color-bg-secondary, #F3F4F6)',
            color: 'var(--color-text-primary, #374151)',
            cursor: 'pointer',
          }}
        >
          {isPlaying ? 'Stop \u25A0' : 'Play \u25B6'}
        </button>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <svg ref={leftSvgRef} style={{ flex: '1 1 380px' }} />
        <svg ref={rightSvgRef} style={{ flex: '1 1 280px' }} />
      </div>

      {/* Legend */}
      <div
        style={{
          fontSize: 12,
          color: '#6b7280',
          marginTop: 6,
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {ENTRY_COLORS.map((color, idx) => (
          <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width={28} height={10}>
              <line
                x1={0}
                y1={5}
                x2={12}
                y2={5}
                stroke={color}
                strokeWidth={2.5}
              />
              <line
                x1={16}
                y1={5}
                x2={28}
                y2={5}
                stroke={color}
                strokeWidth={2}
                strokeDasharray="4,2"
              />
            </svg>
            {ENTRY_LABELS[idx]}
            <span style={{ color: '#9ca3af', fontSize: 10 }}>
              (solid = exact, dashed = partial sum)
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
