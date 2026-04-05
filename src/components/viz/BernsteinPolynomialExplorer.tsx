import { useState, useMemo, useRef, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { functionColors } from './shared/colorScales';
import { bernsteinPolynomial, bernsteinBasis } from './shared/series';
import { getApproximationPresets } from '../../data/approximation-theory-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getApproximationPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const BERNSTEIN_COLOR = '#F59E0B'; // orange
const ERROR_FILL = 'rgba(239, 68, 68, 0.15)'; // light red
const BASIS_COLOR = 'rgba(147, 51, 234, 0.3)'; // light purple
const GRID_PTS = 400;

// ── Component ─────────────────────────────────────────────────

export default function BernsteinPolynomialExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [n, setN] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [showBasis, setShowBasis] = useState(false);
  const [probeX, setProbeX] = useState<number | null>(null);
  const animRef = useRef<number | null>(null);

  const preset = PRESETS[selectedIdx];
  const [a, b] = preset.domain;

  // Map preset function to [0, 1] for Bernstein evaluation
  const g = useMemo(() => (t: number) => preset.f(a + t * (b - a)), [preset, a, b]);

  // ── Compute curves ────────────────────────────────────────

  const curves = useMemo(() => {
    const step = (b - a) / GRID_PTS;
    const targetPts: { x: number; y: number }[] = [];
    const bernsteinPts: { x: number; y: number }[] = [];
    const errorPts: { x: number; yTop: number; yBot: number }[] = [];

    for (let i = 0; i <= GRID_PTS; i++) {
      const x = a + i * step;
      const t = (x - a) / (b - a);
      const fVal = preset.f(x);
      const bVal = bernsteinPolynomial(g, n, t);

      targetPts.push({ x, y: fVal });
      bernsteinPts.push({ x, y: bVal });
      errorPts.push({
        x,
        yTop: Math.max(fVal, bVal),
        yBot: Math.min(fVal, bVal),
      });
    }

    return { targetPts, bernsteinPts, errorPts };
  }, [preset, g, n, a, b]);

  // ── Basis functions ───────────────────────────────────────

  const basisCurves = useMemo(() => {
    if (!showBasis) return [];
    const step = 1 / GRID_PTS;
    const allCurves: { k: number; pts: { x: number; y: number }[] }[] = [];

    for (let k = 0; k <= n; k++) {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= GRID_PTS; i++) {
        const t = i * step;
        const x = a + t * (b - a);
        pts.push({ x, y: bernsteinBasis(k, n, t) });
      }
      allCurves.push({ k, pts });
    }

    return allCurves;
  }, [showBasis, n, a, b]);

  // ── Max error ─────────────────────────────────────────────

  const maxError = useMemo(() => {
    let maxErr = 0;
    for (let i = 0; i <= 1000; i++) {
      const t = i / 1000;
      const x = a + t * (b - a);
      const err = Math.abs(preset.f(x) - bernsteinPolynomial(g, n, t));
      maxErr = Math.max(maxErr, err);
    }
    return maxErr;
  }, [preset, g, n, a, b]);

  // ── Probe values ──────────────────────────────────────────

  const probeValues = useMemo(() => {
    if (probeX === null) return null;
    const t = (probeX - a) / (b - a);
    const fVal = preset.f(probeX);
    const bVal = bernsteinPolynomial(g, n, t);
    return { x: probeX, fx: fVal, bn: bVal, error: Math.abs(fVal - bVal) };
  }, [probeX, preset, g, n, a, b]);

  // ── Animation ─────────────────────────────────────────────

  useEffect(() => {
    if (!playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    let lastStep = performance.now();
    const step = (now: number) => {
      if (now - lastStep >= 150) {
        lastStep = now;
        setN((prev) => {
          if (prev >= 100) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [playing]);

  // ── Handlers ──────────────────────────────────────────────

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setProbeX(null);
    setPlaying(false);
    setN(5);
    setShowBasis(false);
  };

  // ── D3 rendering ──────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 50) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g2 = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const allYVals = [
        ...curves.targetPts.map((p) => p.y),
        ...curves.bernsteinPts.map((p) => p.y),
      ];
      const yMin = Math.min(0, d3.min(allYVals) ?? 0) - 0.1;
      const yMax = (d3.max(allYVals) ?? 1) + 0.1;

      const xScale = d3.scaleLinear().domain([a, b]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Axes
      g2.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '11px');

      g2.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('font-size', '11px');

      // Error shading
      const areaGen = d3
        .area<{ x: number; yTop: number; yBot: number }>()
        .x((d) => xScale(d.x))
        .y0((d) => yScale(d.yBot))
        .y1((d) => yScale(d.yTop));

      g2.append('path')
        .datum(curves.errorPts)
        .attr('d', areaGen)
        .attr('fill', ERROR_FILL)
        .attr('stroke', 'none');

      // Basis functions (if toggled)
      if (showBasis) {
        const basisLine = d3
          .line<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y));

        for (const curve of basisCurves) {
          g2.append('path')
            .datum(curve.pts)
            .attr('d', basisLine)
            .attr('fill', 'none')
            .attr('stroke', BASIS_COLOR)
            .attr('stroke-width', 1);
        }
      }

      // Target function
      const lineGen = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));

      g2.append('path')
        .datum(curves.targetPts)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', functionColors.primary)
        .attr('stroke-width', 2.5);

      // Bernstein polynomial
      g2.append('path')
        .datum(curves.bernsteinPts)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', BERNSTEIN_COLOR)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', n <= 10 ? '6,3' : 'none');

      // Probe line
      if (probeValues) {
        const px = xScale(probeValues.x);
        g2.append('line')
          .attr('x1', px)
          .attr('x2', px)
          .attr('y1', yScale(yMin))
          .attr('y2', yScale(yMax))
          .attr('stroke', '#9CA3AF')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,3');

        g2.append('circle')
          .attr('cx', px)
          .attr('cy', yScale(probeValues.fx))
          .attr('r', 4)
          .attr('fill', functionColors.primary);

        g2.append('circle')
          .attr('cx', px)
          .attr('cy', yScale(probeValues.bn))
          .attr('r', 4)
          .attr('fill', BERNSTEIN_COLOR);
      }

      // Mouse interaction
      svg.on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event, g2.node());
        const xVal = xScale.invert(mx);
        if (xVal >= a && xVal <= b) {
          setProbeX(xVal);
        }
      });

      svg.on('mouseleave', () => setProbeX(null));
    },
    [width, height, curves, basisCurves, probeValues, a, b, showBasis, n],
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '14px',
        }}
      >
        <label>
          Function:{' '}
          <select value={selectedIdx} onChange={handlePresetChange}>
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <em>n</em> = {n}{' '}
          <input
            type="range"
            min={1}
            max={100}
            value={n}
            onChange={(e) => {
              setN(Number(e.target.value));
              setPlaying(false);
            }}
            style={{ width: '120px', verticalAlign: 'middle' }}
          />
        </label>

        <button
          onClick={() => setPlaying((p) => !p)}
          style={{
            padding: '2px 10px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>

        <label style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showBasis}
            onChange={(e) => setShowBasis(e.target.checked)}
          />{' '}
          Show basis
        </label>
      </div>

      {/* Plot */}
      <svg ref={svgRef} />

      {/* Readout */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '13px',
          color: '#6B7280',
          marginTop: '4px',
        }}
      >
        <span>
          <strong style={{ color: functionColors.primary }}>f</strong>{' '}
          <strong style={{ color: BERNSTEIN_COLOR }}>
            B<sub>{n}</sub>(f)
          </strong>
        </span>
        <span>Max error: {maxError.toFixed(6)}</span>
        <span>Rate: {preset.expectedBernsteinRate}</span>
        {probeValues && (
          <span>
            x = {probeValues.x.toFixed(3)}: f = {probeValues.fx.toFixed(4)}, B
            <sub>{n}</sub> = {probeValues.bn.toFixed(4)}, |err| ={' '}
            {probeValues.error.toFixed(6)}
          </span>
        )}
      </div>
    </div>
  );
}
