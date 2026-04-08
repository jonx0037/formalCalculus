import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { finiteYMax } from './shared/plotting';
import { getBetaDensityData } from '../../data/radon-nikodym-data';

// ── Constants ─────────────────────────────────────────────────

const COLOR_P1 = '#2563EB'; // blue — distribution 1
const COLOR_P2 = '#DC2626'; // red — distribution 2
const INTERVAL_FILL_1 = 'rgba(37, 99, 235, 0.16)';
const INTERVAL_FILL_2 = 'rgba(220, 38, 38, 0.14)';
const HANDLE_COLOR = '#0F172A';

const ALPHA_BETA_MIN = 0.3;
const ALPHA_BETA_MAX = 5;
const N_GRID = 500;

// ── Main component ────────────────────────────────────────────

export default function DensityAsDerivativeExplorer() {
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const [alpha1, setAlpha1] = useState(2);
  const [beta1, setBeta1] = useState(5);
  const [alpha2, setAlpha2] = useState(5);
  const [beta2, setBeta2] = useState(2);
  const [intervalA, setIntervalA] = useState(0.1);
  const [intervalB, setIntervalB] = useState(0.4);

  // ── Computed data ─────────────────────────────────────────

  const data1 = useMemo(
    () => getBetaDensityData(alpha1, beta1, N_GRID),
    [alpha1, beta1],
  );
  const data2 = useMemo(
    () => getBetaDensityData(alpha2, beta2, N_GRID),
    [alpha2, beta2],
  );

  const integral1 = useMemo(
    () => data1.integralOnInterval(intervalA, intervalB),
    [data1, intervalA, intervalB],
  );
  const integral2 = useMemo(
    () => data2.integralOnInterval(intervalA, intervalB),
    [data2, intervalA, intervalB],
  );

  // CDF differences (independent verification of the integrals).
  const cdfDiff1 = useMemo(() => {
    // Linear interpolation of cdfCurve at intervalA and intervalB.
    const lookup = (curve: typeof data1.cdfCurve, x: number): number => {
      if (curve.length === 0) return 0;
      if (x <= curve[0][0]) return curve[0][1];
      if (x >= curve[curve.length - 1][0]) return curve[curve.length - 1][1];
      // Binary search
      let lo = 0;
      let hi = curve.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >>> 1;
        if (curve[mid][0] < x) lo = mid;
        else hi = mid;
      }
      const [x0, y0] = curve[lo];
      const [x1, y1] = curve[hi];
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    };
    return lookup(data1.cdfCurve, intervalB) - lookup(data1.cdfCurve, intervalA);
  }, [data1, intervalA, intervalB]);

  const cdfDiff2 = useMemo(() => {
    const lookup = (curve: typeof data2.cdfCurve, x: number): number => {
      if (curve.length === 0) return 0;
      if (x <= curve[0][0]) return curve[0][1];
      if (x >= curve[curve.length - 1][0]) return curve[curve.length - 1][1];
      let lo = 0;
      let hi = curve.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >>> 1;
        if (curve[mid][0] < x) lo = mid;
        else hi = mid;
      }
      const [x0, y0] = curve[lo];
      const [x1, y1] = curve[hi];
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    };
    return lookup(data2.cdfCurve, intervalB) - lookup(data2.cdfCurve, intervalA);
  }, [data2, intervalA, intervalB]);

  // ── Layout ────────────────────────────────────────────────

  // Two panels stacked vertically below ~640px, side-by-side above.
  const isStacked = (containerWidth || 0) < 640;
  const panelWidth = isStacked ? containerWidth || 0 : (containerWidth || 0) / 2;
  const panelHeight = 320;
  const margin = { top: 24, right: 24, bottom: 36, left: 44 };

  // Cap density y-axis using finiteYMax to avoid axis collapse for sharp Betas.
  const yMaxDensity = useMemo(
    () => Math.min(finiteYMax([data1.densityCurve, data2.densityCurve]), 8),
    [data1, data2],
  );

  // ── D3 render ─────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (!containerWidth || containerWidth === 0) return;

      const totalHeight = isStacked ? panelHeight * 2 + 16 : panelHeight;
      svg.attr('width', containerWidth).attr('height', totalHeight);

      const innerW = panelWidth - margin.left - margin.right;
      const innerH = panelHeight - margin.top - margin.bottom;

      const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
      const yDensityScale = d3
        .scaleLinear()
        .domain([0, yMaxDensity])
        .range([innerH, 0]);
      const yCdfScale = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

      // ── Panel 1: density overlay (left or top) ────────────

      const densityG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Title
      densityG
        .append('text')
        .attr('x', innerW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'var(--color-text)')
        .text('Densities (R-N derivatives dP/dλ)');

      // Axes
      densityG
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .call((g) => g.selectAll('text').style('fill', 'var(--color-text-muted)'));
      densityG
        .append('g')
        .call(d3.axisLeft(yDensityScale).ticks(4))
        .call((g) => g.selectAll('text').style('fill', 'var(--color-text-muted)'));

      // Interval shading (under both densities, so the shaded area shows what
      // ∫_a^b dP/dλ measures geometrically).
      const xA = xScale(intervalA);
      const xB = xScale(intervalB);

      // Build a clipped density area for each distribution restricted to [a, b].
      const areaGen = d3
        .area<[number, number]>()
        .x((d) => xScale(d[0]))
        .y0(yDensityScale(0))
        .y1((d) => yDensityScale(d[1]));

      const restrict = (curve: [number, number][]) =>
        curve.filter(([x]) => x >= intervalA && x <= intervalB);

      const restricted1 = restrict(data1.densityCurve);
      const restricted2 = restrict(data2.densityCurve);

      densityG
        .append('path')
        .attr('d', areaGen(restricted1) || '')
        .style('fill', INTERVAL_FILL_1)
        .style('stroke', 'none');
      densityG
        .append('path')
        .attr('d', areaGen(restricted2) || '')
        .style('fill', INTERVAL_FILL_2)
        .style('stroke', 'none');

      // Density lines
      const lineGen = d3
        .line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yDensityScale(Math.min(d[1], yMaxDensity)));

      densityG
        .append('path')
        .attr('d', lineGen(data1.densityCurve) || '')
        .style('fill', 'none')
        .style('stroke', COLOR_P1)
        .style('stroke-width', 2.0);
      densityG
        .append('path')
        .attr('d', lineGen(data2.densityCurve) || '')
        .style('fill', 'none')
        .style('stroke', COLOR_P2)
        .style('stroke-width', 2.0);

      // Interval bracket — vertical lines at a and b.
      [xA, xB].forEach((x) => {
        densityG
          .append('line')
          .attr('x1', x)
          .attr('y1', 0)
          .attr('x2', x)
          .attr('y2', innerH)
          .style('stroke', HANDLE_COLOR)
          .style('stroke-width', 1.2)
          .style('stroke-dasharray', '4,3')
          .style('opacity', 0.7);
      });

      // Draggable endpoint handles, anchored to the x-axis.
      const dragHandle = (which: 'a' | 'b') =>
        d3
          .drag<SVGCircleElement, unknown>()
          .on('drag', (event) => {
            const newX = Math.max(0, Math.min(1, xScale.invert(event.x)));
            if (which === 'a') {
              setIntervalA(Math.min(newX, intervalB - 0.01));
            } else {
              setIntervalB(Math.max(newX, intervalA + 0.01));
            }
          });

      densityG
        .append('circle')
        .attr('cx', xA)
        .attr('cy', innerH)
        .attr('r', 6)
        .style('fill', HANDLE_COLOR)
        .style('cursor', 'ew-resize')
        .call(dragHandle('a'));
      densityG
        .append('circle')
        .attr('cx', xB)
        .attr('cy', innerH)
        .attr('r', 6)
        .style('fill', HANDLE_COLOR)
        .style('cursor', 'ew-resize')
        .call(dragHandle('b'));

      // Endpoint labels
      densityG
        .append('text')
        .attr('x', xA)
        .attr('y', innerH + 18)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', 'var(--color-text-muted)')
        .text(`a = ${intervalA.toFixed(2)}`);
      densityG
        .append('text')
        .attr('x', xB)
        .attr('y', innerH + 18)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', 'var(--color-text-muted)')
        .text(`b = ${intervalB.toFixed(2)}`);

      // ── Panel 2: CDFs (right or bottom) ───────────────────

      const panel2X = isStacked ? margin.left : panelWidth + margin.left;
      const panel2Y = isStacked ? panelHeight + 16 + margin.top : margin.top;
      const cdfG = svg
        .append('g')
        .attr('transform', `translate(${panel2X},${panel2Y})`);

      cdfG
        .append('text')
        .attr('x', innerW / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'var(--color-text)')
        .text('CDFs F(x) = P((−∞, x])');

      cdfG
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .call((g) => g.selectAll('text').style('fill', 'var(--color-text-muted)'));
      cdfG
        .append('g')
        .call(d3.axisLeft(yCdfScale).ticks(4))
        .call((g) => g.selectAll('text').style('fill', 'var(--color-text-muted)'));

      const cdfLine = d3
        .line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yCdfScale(d[1]));

      // Shading between F(a) and F(b) on each CDF — visualizes the same integral.
      [xA, xB].forEach((x) => {
        cdfG
          .append('line')
          .attr('x1', x)
          .attr('y1', 0)
          .attr('x2', x)
          .attr('y2', innerH)
          .style('stroke', HANDLE_COLOR)
          .style('stroke-width', 1.2)
          .style('stroke-dasharray', '4,3')
          .style('opacity', 0.5);
      });

      cdfG
        .append('path')
        .attr('d', cdfLine(data1.cdfCurve) || '')
        .style('fill', 'none')
        .style('stroke', COLOR_P1)
        .style('stroke-width', 2.0);
      cdfG
        .append('path')
        .attr('d', cdfLine(data2.cdfCurve) || '')
        .style('fill', 'none')
        .style('stroke', COLOR_P2)
        .style('stroke-width', 2.0);
    },
    [
      data1,
      data2,
      intervalA,
      intervalB,
      yMaxDensity,
      containerWidth,
      isStacked,
      panelWidth,
    ],
  );

  // ── Numeric readout helper ─────────────────────────────────

  const fmt = (x: number) => x.toFixed(4);

  return (
    <div ref={containerRef} className="flex flex-col items-stretch gap-3 my-6">
      {/* Sliders */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm max-w-2xl mx-auto w-full">
        {/* Distribution 1 */}
        <div className="flex flex-col gap-1" style={{ color: COLOR_P1 }}>
          <span className="font-semibold">Distribution 1: Beta(α₁, β₁)</span>
          <label className="flex items-center justify-between gap-2">
            <span>α₁ = {alpha1.toFixed(1)}</span>
            <input
              type="range"
              min={ALPHA_BETA_MIN}
              max={ALPHA_BETA_MAX}
              step={0.1}
              value={alpha1}
              onChange={(e) => setAlpha1(parseFloat(e.target.value))}
              className="flex-1"
              aria-label="DensityAsDerivativeExplorer: alpha for distribution 1"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span>β₁ = {beta1.toFixed(1)}</span>
            <input
              type="range"
              min={ALPHA_BETA_MIN}
              max={ALPHA_BETA_MAX}
              step={0.1}
              value={beta1}
              onChange={(e) => setBeta1(parseFloat(e.target.value))}
              className="flex-1"
              aria-label="DensityAsDerivativeExplorer: beta for distribution 1"
            />
          </label>
        </div>

        {/* Distribution 2 */}
        <div className="flex flex-col gap-1" style={{ color: COLOR_P2 }}>
          <span className="font-semibold">Distribution 2: Beta(α₂, β₂)</span>
          <label className="flex items-center justify-between gap-2">
            <span>α₂ = {alpha2.toFixed(1)}</span>
            <input
              type="range"
              min={ALPHA_BETA_MIN}
              max={ALPHA_BETA_MAX}
              step={0.1}
              value={alpha2}
              onChange={(e) => setAlpha2(parseFloat(e.target.value))}
              className="flex-1"
              aria-label="DensityAsDerivativeExplorer: alpha for distribution 2"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span>β₂ = {beta2.toFixed(1)}</span>
            <input
              type="range"
              min={ALPHA_BETA_MIN}
              max={ALPHA_BETA_MAX}
              step={0.1}
              value={beta2}
              onChange={(e) => setBeta2(parseFloat(e.target.value))}
              className="flex-1"
              aria-label="DensityAsDerivativeExplorer: beta for distribution 2"
            />
          </label>
        </div>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        className="rounded w-full"
        style={{
          border: '1px solid var(--color-border)',
          background: 'var(--color-viz-bg)',
        }}
        role="img"
        aria-label={`Beta densities and CDFs with adjustable interval [${intervalA.toFixed(2)}, ${intervalB.toFixed(2)}]`}
      />

      {/* Verification strip */}
      <div
        className="text-xs text-center px-2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        For A = [{intervalA.toFixed(2)}, {intervalB.toFixed(2)}]:&nbsp;
        <span style={{ color: COLOR_P1 }}>
          P₁(A) = ∫ₐᵇ (dP₁/dλ) dλ = {fmt(integral1)}
        </span>
        {' '}vs{' '}
        <span style={{ color: COLOR_P1 }}>F₁(b) − F₁(a) = {fmt(cdfDiff1)}</span>
        ;&nbsp;
        <span style={{ color: COLOR_P2 }}>
          P₂(A) = {fmt(integral2)}
        </span>
        {' '}vs{' '}
        <span style={{ color: COLOR_P2 }}>F₂(b) − F₂(a) = {fmt(cdfDiff2)}</span>
      </div>

      <p
        className="text-xs italic max-w-2xl mx-auto text-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Drag the endpoint handles on the density panel to change the interval A
        = [a, b]. The R-N derivative dP/dλ is the density curve on the left;
        integrating it over A recovers the probability P(A), which equals the
        difference of CDF values F(b) − F(a) on the right. The two computations
        agree to numerical precision — that&apos;s exactly what the
        Radon-Nikodym theorem guarantees.
      </p>
    </div>
  );
}
