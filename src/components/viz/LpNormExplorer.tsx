import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computeLpNorm } from './shared/measure';
import { getLpNormCurve } from '../../data/lp-spaces-data';

// ── Constants ─────────────────────────────────────────────────

const F_COLOR = '#4F46E5'; // indigo — |f(x)|
const POWER_COLOR = '#DC2626'; // red — |f(x)|^p (the "mass" being integrated)
const NORM_CURVE_COLOR = '#0891B2'; // cyan-blue — ||f||_p as a function of p
const MARKER_COLOR = '#DC2626'; // red — current p marker on the norm curve

interface PresetOption {
  id: string;
  label: string;
  f: (x: number) => number;
  domain: [number, number];
  description: string;
}

const PRESETS: PresetOption[] = [
  {
    id: 'sin',
    label: 'sin(πx)',
    f: (x) => Math.sin(Math.PI * x),
    domain: [0, 1],
    description: 'A smooth half-cycle of a sine wave on [0, 1].',
  },
  {
    id: 'parabola',
    label: 'x(1−x)',
    f: (x) => x * (1 - x),
    domain: [0, 1],
    description: 'A symmetric parabola peaking at x = 1/2.',
  },
  {
    id: 'step',
    label: 'Two-level step',
    f: (x) => (x < 0.25 ? 2 : 1),
    domain: [0, 1],
    description:
      'A step function: height 2 on [0, 1/4], height 1 on [1/4, 1]. The mass shifts dramatically as p grows.',
  },
  {
    id: 'gaussian',
    label: 'Gaussian bump',
    f: (x) => Math.exp(-10 * (x - 0.5) * (x - 0.5)),
    domain: [0, 1],
    description: 'A Gaussian bump centered at x = 1/2.',
  },
];

const P_MIN = 0.5;
const P_MAX = 20.0;

// ── Main component ────────────────────────────────────────────

export default function LpNormExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [presetIdx, setPresetIdx] = useState(0);
  const [p, setP] = useState(2);

  const preset = PRESETS[presetIdx];

  // ── Layout ────────────────────────────────────────────────

  const stacked = containerWidth > 0 && containerWidth < 720;
  const totalWidth = Math.min(containerWidth || 0, 920);
  const totalHeight = stacked ? 580 : 360;
  const leftW = stacked ? totalWidth : Math.floor(totalWidth * 0.55);
  const rightW = stacked ? totalWidth : totalWidth - leftW;
  const panelH = stacked ? 270 : totalHeight - 40;
  const margin = { top: 30, right: 16, bottom: 32, left: 44 };

  // ── Curves ────────────────────────────────────────────────

  const fCurve = useMemo(() => {
    const N = 250;
    const [a, b] = preset.domain;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = a + (i / (N - 1)) * (b - a);
      pts.push([x, Math.abs(preset.f(x))]);
    }
    return pts;
  }, [preset]);

  const fPowerCurve = useMemo(() => {
    const N = 250;
    const [a, b] = preset.domain;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      const x = a + (i / (N - 1)) * (b - a);
      pts.push([x, Math.pow(Math.abs(preset.f(x)), p)]);
    }
    return pts;
  }, [preset, p]);

  // The norm curve p ↦ ||f||_p — memoized per preset since p sweeps it.
  const normCurve = useMemo(
    () => getLpNormCurve(preset.f, preset.domain),
    [preset],
  );

  // Current ||f||_p for the readout (computed directly to match the slider).
  const currentNorm = useMemo(
    () => computeLpNorm(preset.f, p, preset.domain).norm,
    [preset, p],
  );

  // y-axis maxima
  const fyMax = useMemo(() => {
    let m = 0;
    for (const [, y] of fCurve) if (Number.isFinite(y) && y > m) m = y;
    for (const [, y] of fPowerCurve) if (Number.isFinite(y) && y > m) m = y;
    return Math.max(m * 1.15, 0.2);
  }, [fCurve, fPowerCurve]);

  const normYMax = useMemo(() => {
    let m = 0;
    for (const { norm } of normCurve)
      if (Number.isFinite(norm) && norm > m) m = norm;
    return Math.max(m * 1.15, 0.2);
  }, [normCurve]);

  // ── D3 render ─────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (totalWidth === 0) return;

      svg.attr('width', totalWidth).attr('height', totalHeight);

      // ── Panel 1: |f(x)| and |f(x)|^p ──
      {
        const ox = 0;
        const oy = 0;
        const innerW = leftW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr(
            'transform',
            `translate(${ox + margin.left},${oy + margin.top})`,
          );

        const xScale = d3
          .scaleLinear()
          .domain([preset.domain[0], preset.domain[1]])
          .range([0, innerW]);
        const yScale = d3.scaleLinear().domain([0, fyMax]).range([innerH, 0]);

        // Title
        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -12)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text(`|f| (blue) and |f|^${p.toFixed(1)} (red, shaded)`);

        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(d3.axisBottom(xScale).ticks(5))
          .selectAll('text')
          .style('font-size', '9px');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');

        const line = d3
          .line<[number, number]>()
          .defined(([, y]) => Number.isFinite(y))
          .x(([x]) => xScale(x))
          .y(([, y]) => yScale(y));

        const area = d3
          .area<[number, number]>()
          .defined(([, y]) => Number.isFinite(y))
          .x(([x]) => xScale(x))
          .y0(yScale(0))
          .y1(([, y]) => yScale(y));

        // Shaded |f|^p
        g.append('path')
          .datum(fPowerCurve)
          .attr('d', area)
          .style('fill', POWER_COLOR)
          .style('fill-opacity', 0.22);

        // |f|^p outline
        g.append('path')
          .datum(fPowerCurve)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', POWER_COLOR)
          .style('stroke-width', 1.4)
          .style('stroke-dasharray', '4,2');

        // |f|
        g.append('path')
          .datum(fCurve)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', F_COLOR)
          .style('stroke-width', 1.8);
      }

      // ── Panel 2: ||f||_p as a function of p ──
      {
        const ox = stacked ? 0 : leftW;
        const oy = stacked ? panelH + 40 : 0;
        const innerW = rightW - margin.left - margin.right;
        const innerH = panelH - margin.top - margin.bottom;
        const g = svg
          .append('g')
          .attr(
            'transform',
            `translate(${ox + margin.left},${oy + margin.top})`,
          );

        const xScale = d3
          .scaleLinear()
          .domain([P_MIN, P_MAX])
          .range([0, innerW]);
        const yScale = d3.scaleLinear().domain([0, normYMax]).range([innerH, 0]);

        // Title
        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', -12)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', 'var(--color-text)')
          .text('||f||_p as a function of p');

        // Axes
        g.append('g')
          .attr('transform', `translate(0,${innerH})`)
          .call(
            d3.axisBottom(xScale).ticks(5).tickFormat((d) => `${d}`),
          )
          .selectAll('text')
          .style('font-size', '9px');
        g.append('g')
          .call(d3.axisLeft(yScale).ticks(4))
          .selectAll('text')
          .style('font-size', '9px');

        // x-axis label
        g.append('text')
          .attr('x', innerW / 2)
          .attr('y', innerH + 26)
          .attr('text-anchor', 'middle')
          .style('font-size', '9px')
          .style('fill', 'var(--color-text-muted)')
          .text('p');

        const line = d3
          .line<{ p: number; norm: number }>()
          .defined((d) => Number.isFinite(d.norm))
          .x((d) => xScale(d.p))
          .y((d) => yScale(d.norm));

        // The norm curve
        g.append('path')
          .datum(normCurve)
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', NORM_CURVE_COLOR)
          .style('stroke-width', 1.8);

        // Marker dot at the current p
        g.append('circle')
          .attr('cx', xScale(p))
          .attr('cy', yScale(currentNorm))
          .attr('r', 5)
          .style('fill', MARKER_COLOR)
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);

        // Vertical guide line down to x-axis
        g.append('line')
          .attr('x1', xScale(p))
          .attr('y1', yScale(currentNorm))
          .attr('x2', xScale(p))
          .attr('y2', innerH)
          .style('stroke', MARKER_COLOR)
          .style('stroke-width', 0.8)
          .style('stroke-dasharray', '3,3')
          .style('opacity', 0.6);

        // Norm value label next to the dot
        g.append('text')
          .attr('x', xScale(p) + 8)
          .attr('y', yScale(currentNorm) - 6)
          .attr('text-anchor', 'start')
          .style('font-size', '10px')
          .style('font-weight', '600')
          .style('fill', MARKER_COLOR)
          .text(`||f||_${p.toFixed(1)} = ${currentNorm.toFixed(3)}`);
      }
    },
    [
      preset,
      presetIdx,
      p,
      fCurve,
      fPowerCurve,
      normCurve,
      currentNorm,
      fyMax,
      normYMax,
      totalWidth,
      totalHeight,
      leftW,
      rightW,
      panelH,
      stacked,
      margin.top,
      margin.right,
      margin.bottom,
      margin.left,
    ],
  );

  // ── JSX ───────────────────────────────────────────────────

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
            onChange={(e) => setPresetIdx(parseInt(e.target.value))}
            className="rounded px-2 py-1 text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            aria-label="Choose target function"
          >
            {PRESETS.map((p, i) => (
              <option key={p.id} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label
          className="flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          p = {p.toFixed(2)}
          <input
            type="range"
            min={P_MIN}
            max={P_MAX}
            step={0.1}
            value={p}
            onChange={(e) => setP(parseFloat(e.target.value))}
            className="w-40"
            aria-label="Lp exponent p"
          />
        </label>
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
        aria-label={`Lp norm explorer: |f| with shaded |f|^${p.toFixed(1)} mass and the curve ||f||_p as a function of p, with current value ${currentNorm.toFixed(3)}`}
      />

      {/* Numeric readout */}
      <div
        className="text-xs flex flex-wrap gap-x-4 gap-y-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span style={{ color: F_COLOR }}>function: |f(x)| (blue)</span>
        <span style={{ color: POWER_COLOR }}>
          mass: |f(x)|^{p.toFixed(1)} (red, shaded)
        </span>
        <span style={{ color: NORM_CURVE_COLOR }}>
          curve: ||f||_p vs. p (cyan)
        </span>
      </div>

      <p
        className="text-xs italic"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {preset.description} As p grows, |f|^p concentrates where |f| is
        largest — for large p the integrand is dominated by the peak, and
        ||f||_p approaches the essential supremum (||f||_∞).
      </p>
    </div>
  );
}
