import { useState, useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getLpBallPoints } from '../../data/lp-spaces-data';

// ── Constants ─────────────────────────────────────────────────

const BALL_COLOR = '#4F46E5'; // indigo — Lp unit ball outline + fill
const REFERENCE_COLOR = '#14B8A6'; // teal — reference unit circle (p = 2)
const AXIS_COLOR = '#9CA3AF'; // gray — coordinate axes
const N_BOUNDARY = 360; // boundary sample count

const P_MIN = 0.5;
const P_MAX = 20.0;
const PLAY_INTERVAL_MS = 50; // 20 fps
const PLAY_FRAMES = 80; // 80 frames × 50ms = 4s sweep
const PLAY_STEP = (P_MAX - P_MIN) / PLAY_FRAMES;

// Reference circle points (computed once at module load — these never change).
// Used as the dashed reference outline at p = 2.
const REFERENCE_CIRCLE = Array.from({ length: N_BOUNDARY }, (_, i) => {
  const theta = (2 * Math.PI * i) / N_BOUNDARY;
  return { x: Math.cos(theta), y: Math.sin(theta) };
});

// ── Main component ────────────────────────────────────────────

export default function LpBallExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [p, setP] = useState(2);
  const [isInfinite, setIsInfinite] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Effective p value: ∞ when toggled, otherwise the slider value.
  const effectiveP = isInfinite ? Infinity : p;

  // ── Auto-sweep during play ────────────────────────────────

  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    playIntervalRef.current = setInterval(() => {
      setP((prev) => {
        const next = prev + PLAY_STEP;
        if (next >= P_MAX) {
          setPlaying(false);
          return P_MAX;
        }
        return next;
      });
    }, PLAY_INTERVAL_MS);
    return () => {
      if (playIntervalRef.current !== null) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [playing]);

  // Disable the play button while ∞ is toggled (the slider is paused).
  useEffect(() => {
    if (isInfinite && playing) setPlaying(false);
  }, [isInfinite, playing]);

  // ── Layout ────────────────────────────────────────────────

  const size = Math.min(containerWidth || 0, 440);
  const margin = { top: 20, right: 20, bottom: 28, left: 28 };
  const innerSize = Math.max(0, size - margin.left - margin.right);

  // ── Compute boundary points ───────────────────────────────

  const ballData = useMemo(
    () => getLpBallPoints(effectiveP, N_BOUNDARY),
    [effectiveP],
  );

  // Padded data range so the ball never touches the SVG edge.
  // The Lp ball with p > 2 has corners at (±1, 0), (0, ±1) but bulges out
  // diagonally up to (1, 1) for p → ∞. We use [-1.15, 1.15] as the data
  // domain so the square ball still has a small margin.
  const dataRange = 1.15;

  // ── D3 render ─────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (size === 0) return;

      svg.attr('width', size).attr('height', size);
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleLinear()
        .domain([-dataRange, dataRange])
        .range([0, innerSize]);
      const yScale = d3
        .scaleLinear()
        .domain([-dataRange, dataRange])
        .range([innerSize, 0]); // y-axis flipped (SVG convention)

      // Coordinate axes through the origin.
      const x0 = xScale(0);
      const y0 = yScale(0);

      // x-axis
      g.append('line')
        .attr('x1', 0)
        .attr('y1', y0)
        .attr('x2', innerSize)
        .attr('y2', y0)
        .style('stroke', AXIS_COLOR)
        .style('stroke-width', 0.8);

      // y-axis
      g.append('line')
        .attr('x1', x0)
        .attr('y1', 0)
        .attr('x2', x0)
        .attr('y2', innerSize)
        .style('stroke', AXIS_COLOR)
        .style('stroke-width', 0.8);

      // Tick marks at -1, 1 on each axis.
      const tickPositions = [-1, 1];
      for (const t of tickPositions) {
        // x-axis ticks
        g.append('line')
          .attr('x1', xScale(t))
          .attr('y1', y0 - 4)
          .attr('x2', xScale(t))
          .attr('y2', y0 + 4)
          .style('stroke', AXIS_COLOR)
          .style('stroke-width', 0.8);
        g.append('text')
          .attr('x', xScale(t))
          .attr('y', y0 + 16)
          .attr('text-anchor', 'middle')
          .style('font-size', '10px')
          .style('fill', 'var(--color-text-muted)')
          .text(t === 1 ? '1' : '−1');

        // y-axis ticks
        g.append('line')
          .attr('x1', x0 - 4)
          .attr('y1', yScale(t))
          .attr('x2', x0 + 4)
          .attr('y2', yScale(t))
          .style('stroke', AXIS_COLOR)
          .style('stroke-width', 0.8);
        g.append('text')
          .attr('x', x0 - 8)
          .attr('y', yScale(t) + 4)
          .attr('text-anchor', 'end')
          .style('font-size', '10px')
          .style('fill', 'var(--color-text-muted)')
          .text(t === 1 ? '1' : '−1');
      }

      // Closed-path line generator for the Lp ball boundary.
      const linePath = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .curve(d3.curveLinearClosed);

      // Reference unit circle (dashed teal, always visible).
      g.append('path')
        .attr('d', linePath(REFERENCE_CIRCLE))
        .style('fill', 'none')
        .style('stroke', REFERENCE_COLOR)
        .style('stroke-width', 1.0)
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.7);

      // The Lp unit ball — filled and stroked.
      g.append('path')
        .attr('d', linePath(ballData.boundary))
        .style('fill', BALL_COLOR)
        .style('fill-opacity', 0.18)
        .style('stroke', BALL_COLOR)
        .style('stroke-width', 2.0);
    },
    [ballData, size, innerSize, margin.left, margin.top],
  );

  // ── Numeric readout ───────────────────────────────────────

  const pLabel = isInfinite
    ? '∞'
    : Number.isInteger(p)
      ? p.toFixed(0)
      : p.toFixed(2);
  const areaLabel = ballData.area.toFixed(4);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-3 my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm w-full max-w-md">
        <label
          className="flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          p = {pLabel}
          <input
            type="range"
            min={P_MIN}
            max={P_MAX}
            step={0.1}
            value={p}
            disabled={isInfinite}
            onChange={(e) => {
              setP(parseFloat(e.target.value));
              setPlaying(false);
            }}
            className="w-40"
            aria-label="Lp ball: exponent p"
          />
        </label>

        <label
          className="flex items-center gap-1.5 cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <input
            type="checkbox"
            checked={isInfinite}
            onChange={(e) => {
              setIsInfinite(e.target.checked);
              setPlaying(false);
            }}
            aria-label="Toggle p = infinity"
          />
          p = ∞
        </label>

        <button
          type="button"
          onClick={() => {
            if (isInfinite) return;
            if (p >= P_MAX) setP(P_MIN);
            setPlaying((prev) => !prev);
          }}
          disabled={isInfinite}
          className="px-3 py-1 text-xs rounded"
          style={{
            background: playing ? BALL_COLOR : 'var(--color-surface-alt)',
            color: playing ? '#fff' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
            opacity: isInfinite ? 0.5 : 1,
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
        aria-label={`L^p unit ball at p = ${pLabel}, shape ${ballData.shapeName}, area ${areaLabel}`}
      />

      {/* Numeric readout */}
      <div
        className="text-xs flex flex-wrap justify-center gap-x-4 gap-y-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span style={{ color: BALL_COLOR }}>
          {ballData.shapeName} — area = {areaLabel}
        </span>
        <span style={{ color: REFERENCE_COLOR }}>
          dashed: unit circle (p = 2)
        </span>
      </div>

      <p
        className="text-xs italic max-w-md text-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Slide p from 0.5 to 20 (or toggle p = ∞) to watch the unit ball morph
        from a non-convex star (p &lt; 1) through a diamond (p = 1), to a
        circle (p = 2), to a square (p = ∞). The corners at p = 1 are exactly
        why L¹ regularization (Lasso) produces sparse solutions.
      </p>
    </div>
  );
}
