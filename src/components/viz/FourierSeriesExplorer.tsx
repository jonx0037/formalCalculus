import { useState, useMemo, useRef, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { functionColors } from './shared/colorScales';
import { getFourierPresets } from '../../data/fourier-series-data';

// ── Constants ─────────────────────────────────────────────────

const PRESETS = getFourierPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const PARTIAL_SUM_COLOR = '#F59E0B';
const GRID_PTS = 400;
const Y_CLAMP = 10;

/** Pi-multiple tick labels for the x-axis. */
const PI_TICKS: { value: number; label: string }[] = [
  { value: -3 * Math.PI, label: '-3\u03c0' },
  { value: -2 * Math.PI, label: '-2\u03c0' },
  { value: -Math.PI, label: '-\u03c0' },
  { value: 0, label: '0' },
  { value: Math.PI, label: '\u03c0' },
  { value: 2 * Math.PI, label: '2\u03c0' },
  { value: 3 * Math.PI, label: '3\u03c0' },
];

// ── Component ─────────────────────────────────────────────────

export default function FourierSeriesExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [n, setN] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [extended, setExtended] = useState(false);
  const [probeX, setProbeX] = useState<number | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const preset = PRESETS[selectedIdx];

  // ── Domain ────────────────────────────────────────────────

  const domain = useMemo<[number, number]>(
    () => (extended ? [-3 * Math.PI, 3 * Math.PI] : [-Math.PI, Math.PI]),
    [extended],
  );

  // ── Compute curves ────────────────────────────────────────

  const curves = useMemo(() => {
    const [xMin, xMax] = domain;
    const step = (xMax - xMin) / GRID_PTS;
    const targetPts: { x: number; y: number }[] = [];
    const partialPts: { x: number; y: number }[] = [];

    for (let i = 0; i <= GRID_PTS; i++) {
      const x = xMin + i * step;

      // Target function value
      const fVal = preset.f(x);

      // Fourier partial sum S_n(x) = a_0/2 + sum_{k=1}^{n} (a_k cos(kx) + b_k sin(kx))
      let sn = preset.an(0) / 2;
      for (let k = 1; k <= n; k++) {
        sn += preset.an(k) * Math.cos(k * x) + preset.bn(k) * Math.sin(k * x);
      }

      const clamp = (v: number) =>
        isFinite(v) && Math.abs(v) <= Y_CLAMP ? v : NaN;

      targetPts.push({ x, y: clamp(fVal) });
      partialPts.push({ x, y: clamp(sn) });
    }

    return { targetPts, partialPts };
  }, [preset, n, domain]);

  // ── Discontinuity markers ─────────────────────────────────

  const jumpMarkers = useMemo(() => {
    if (!preset.hasJumpDiscontinuity) return [];
    const [xMin, xMax] = domain;
    const markers: { x: number; yAbove: number; yBelow: number }[] = [];

    for (const jx of preset.jumpLocations) {
      // In extended mode, tile the jump locations across all periods
      const candidates = extended
        ? [-2 * Math.PI, 0, 2 * Math.PI].map((shift) => jx + shift)
        : [jx];

      for (const cx of candidates) {
        if (cx < xMin - 0.01 || cx > xMax + 0.01) continue;

        const eps = 1e-4;
        const yAbove = preset.f(cx + eps);
        const yBelow = preset.f(cx - eps);

        if (
          isFinite(yAbove) &&
          isFinite(yBelow) &&
          Math.abs(yAbove) <= Y_CLAMP &&
          Math.abs(yBelow) <= Y_CLAMP
        ) {
          markers.push({ x: cx, yAbove, yBelow });
        }
      }
    }
    return markers;
  }, [preset, domain, extended]);

  // ── Max error on smooth parts ─────────────────────────────

  const maxSmoothError = useMemo(() => {
    const [xMin, xMax] = domain;
    const step = (xMax - xMin) / GRID_PTS;
    let maxErr = 0;

    for (let i = 0; i <= GRID_PTS; i++) {
      const x = xMin + i * step;

      // Skip near jump discontinuities
      const nearJump = preset.jumpLocations.some((jx) => {
        const candidates = extended
          ? [-2 * Math.PI, 0, 2 * Math.PI].map((s) => jx + s)
          : [jx];
        return candidates.some((cx) => Math.abs(x - cx) < 0.15);
      });
      if (nearJump) continue;

      const fVal = preset.f(x);
      let sn = preset.an(0) / 2;
      for (let k = 1; k <= n; k++) {
        sn += preset.an(k) * Math.cos(k * x) + preset.bn(k) * Math.sin(k * x);
      }

      if (isFinite(fVal) && isFinite(sn)) {
        maxErr = Math.max(maxErr, Math.abs(fVal - sn));
      }
    }
    return maxErr;
  }, [preset, n, domain, extended]);

  // ── Probe values ──────────────────────────────────────────

  const probeValues = useMemo(() => {
    if (probeX === null) return null;
    const fVal = preset.f(probeX);
    let sn = preset.an(0) / 2;
    for (let k = 1; k <= n; k++) {
      sn += preset.an(k) * Math.cos(k * probeX) + preset.bn(k) * Math.sin(k * probeX);
    }
    return {
      x: probeX,
      fx: fVal,
      sn,
      error: Math.abs(fVal - sn),
    };
  }, [probeX, preset, n]);

  // ── Animation ─────────────────────────────────────────────

  useEffect(() => {
    if (!playing) {
      if (animRef.current) clearInterval(animRef.current);
      return;
    }
    animRef.current = setInterval(() => {
      setN((prev) => {
        if (prev >= 50) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 200);
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [playing]);

  // ── Handlers ──────────────────────────────────────────────

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setProbeX(null);
    setPlaying(false);
    setN(5);
  };

  // ── D3 rendering ──────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 50) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // ── Scales ────────────────────────────────────────────
      const [xMin, xMax] = domain;
      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);

      const allY = [...curves.targetPts, ...curves.partialPts]
        .map((d) => d.y)
        .filter((v) => isFinite(v));
      const yExtentRaw = d3.extent(allY);
      const yExtent = (
        yExtentRaw[0] !== undefined ? yExtentRaw : [-1, 1]
      ) as [number, number];
      const yPad = (yExtent[1] - yExtent[0]) * 0.1 || 1;
      const yScale = d3
        .scaleLinear()
        .domain([yExtent[0] - yPad, yExtent[1] + yPad])
        .range([innerH, 0]);

      // ── Zero lines ────────────────────────────────────────
      if (yScale.domain()[0] < 0 && yScale.domain()[1] > 0) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yScale(0))
          .attr('y2', yScale(0))
          .style('stroke', '#D1D5DB')
          .style('stroke-width', 0.5);
      }

      // ── Line generators ───────────────────────────────────
      const line = d3
        .line<{ x: number; y: number }>()
        .defined((d) => isFinite(d.y))
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));

      // Target function f(x)
      g.append('path')
        .datum(curves.targetPts)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', functionColors[0])
        .style('stroke-width', 2.5);

      // Partial sum S_n(x)
      g.append('path')
        .datum(curves.partialPts)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', PARTIAL_SUM_COLOR)
        .style('stroke-width', 2)
        .style('stroke-dasharray', '6 3');

      // ── Discontinuity markers ─────────────────────────────
      for (const jm of jumpMarkers) {
        const px = xScale(jm.x);
        if (px < 0 || px > innerW) continue;

        // Open circle at the "upper" value (approach from right)
        g.append('circle')
          .attr('cx', px)
          .attr('cy', yScale(jm.yAbove))
          .attr('r', 3.5)
          .style('fill', 'var(--color-bg, white)')
          .style('stroke', functionColors[0])
          .style('stroke-width', 1.5);

        // Closed circle at the "lower" value (approach from left)
        g.append('circle')
          .attr('cx', px)
          .attr('cy', yScale(jm.yBelow))
          .attr('r', 3.5)
          .style('fill', functionColors[0])
          .style('stroke', functionColors[0])
          .style('stroke-width', 1.5);
      }

      // ── Probe marker ──────────────────────────────────────
      if (probeX !== null && probeValues) {
        const px = xScale(probeX);

        g.append('line')
          .attr('x1', px)
          .attr('x2', px)
          .attr('y1', 0)
          .attr('y2', innerH)
          .style('stroke', '#6B7280')
          .style('stroke-dasharray', '2 2')
          .style('stroke-width', 0.8);

        if (isFinite(probeValues.fx) && Math.abs(probeValues.fx) <= Y_CLAMP) {
          g.append('circle')
            .attr('cx', px)
            .attr('cy', yScale(probeValues.fx))
            .attr('r', 4)
            .style('fill', functionColors[0]);
        }
        if (isFinite(probeValues.sn) && Math.abs(probeValues.sn) <= Y_CLAMP) {
          g.append('circle')
            .attr('cx', px)
            .attr('cy', yScale(probeValues.sn))
            .attr('r', 4)
            .style('fill', PARTIAL_SUM_COLOR);
        }
      }

      // ── Axes ──────────────────────────────────────────────

      // X-axis with pi-multiple labels
      const visibleTicks = PI_TICKS.filter(
        (t) => t.value >= xMin - 0.01 && t.value <= xMax + 0.01,
      );
      const xAxis = d3
        .axisBottom(xScale)
        .tickValues(visibleTicks.map((t) => t.value))
        .tickFormat((_d, i) => visibleTicks[i]?.label ?? '');

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(xAxis)
        .style('color', 'var(--color-text-muted)');

      // Y-axis
      const yAxis = d3
        .axisLeft(yScale)
        .ticks(Math.max(3, Math.floor(innerH / 60)));

      g.append('g').call(yAxis).style('color', 'var(--color-text-muted)');

      // ── Click handler for probe ───────────────────────────
      g.append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
        .style('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event: MouseEvent) => {
          const [mx] = d3.pointer(event);
          const xVal = xScale.invert(mx);
          setProbeX(xVal);
        });
    },
    [curves, width, height, domain, jumpMarkers, probeX, probeValues],
  );

  // ── JSX ───────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls row */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        {/* Preset dropdown */}
        <select
          className="border rounded px-2 py-1 text-sm"
          style={{
            color: 'var(--color-text)',
            backgroundColor: 'var(--color-bg)',
            borderColor: 'var(--color-border)',
          }}
          value={selectedIdx}
          onChange={handlePresetChange}
        >
          {PRESETS.map((p, i) => (
            <option key={p.name} value={i}>
              {p.label}
            </option>
          ))}
        </select>

        {/* n slider */}
        <label
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          n = {n}
          <input
            type="range"
            min="1"
            max="50"
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-28"
          />
        </label>

        {/* Play / Pause */}
        <button
          className="text-sm px-3 py-1 rounded border"
          style={{
            color: playing ? 'white' : 'var(--color-text)',
            backgroundColor: playing ? functionColors[0] : 'transparent',
            borderColor: 'var(--color-border)',
          }}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? '\u23f8 Pause' : '\u25b6 Play'}
        </button>

        {/* Period extension toggle */}
        <label
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <input
            type="checkbox"
            checked={extended}
            onChange={(e) => {
              setExtended(e.target.checked);
              setProbeX(null);
            }}
          />
          Extend to [-3\u03c0, 3\u03c0]
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} />

      {/* Legend + readout panel */}
      <div
        className="flex flex-wrap gap-4 mt-2 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span>
          <span style={{ color: functionColors[0] }}>\u2501</span> f(x)
        </span>
        <span>
          <span style={{ color: PARTIAL_SUM_COLOR }}>\u254c\u254c</span> S
          <sub>{n}</sub>(x)
        </span>
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
          n = {n} &middot; {preset.label.split('\u2014')[0].trim()} &middot; decay{' '}
          {preset.decayRate}
        </span>
        <span>
          max |error|<sub>smooth</sub> ={' '}
          {maxSmoothError < 1e-10
            ? '< 1e-10'
            : maxSmoothError.toExponential(2)}
        </span>
      </div>

      {/* Probe readout */}
      {probeValues && (
        <div
          className="mt-2 flex flex-wrap gap-4 text-xs rounded border px-3 py-2"
          style={{
            color: 'var(--color-text)',
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-muted, var(--color-bg))',
          }}
        >
          <span>x\u2080 = {probeValues.x.toFixed(3)}</span>
          <span>f(x\u2080) = {probeValues.fx.toFixed(6)}</span>
          <span>
            S<sub>{n}</sub>(x\u2080) ={' '}
            {isFinite(probeValues.sn)
              ? probeValues.sn.toFixed(6)
              : 'diverges'}
          </span>
          <span>
            |error| ={' '}
            {isFinite(probeValues.error)
              ? probeValues.error.toExponential(2)
              : '\u2014'}
          </span>
        </div>
      )}
      {!probeValues && (
        <div
          className="mt-2 text-xs"
          style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}
        >
          Click the chart to probe a point
        </div>
      )}
    </div>
  );
}
