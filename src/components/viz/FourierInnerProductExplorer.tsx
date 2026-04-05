import { useState, useMemo, useRef, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { functionColors } from './shared/colorScales';

// ── Constants ─────────────────────────────────────────────────

const margin = { top: 15, right: 20, bottom: 30, left: 50 };
const GRID_PTS = 400;
const PHI_N_COLOR = '#F59E0B';
const PRODUCT_COLOR = '#7C3AED';
const POS_FILL = '#BBF7D0';
const NEG_FILL = '#FECACA';

type PairType = 'cos-cos' | 'sin-sin' | 'cos-sin';

const PI_TICKS: { value: number; label: string }[] = [
  { value: -Math.PI, label: '-\u03c0' },
  { value: 0, label: '0' },
  { value: Math.PI, label: '\u03c0' },
];

// ── Basis function ───────────────────────────────────────────

function basisFn(type: 'cos' | 'sin', freq: number, x: number): number {
  if (freq === 0 && type === 'cos') return 1 / Math.sqrt(2);
  if (freq === 0 && type === 'sin') return 0;
  return type === 'cos' ? Math.cos(freq * x) : Math.sin(freq * x);
}

// ── Component ────────────────────────────────────────────────

export default function FourierInnerProductExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.85, 550);

  const [m, setM] = useState(2);
  const [n, setN] = useState(3);
  const [pairType, setPairType] = useState<PairType>('cos-cos');
  const [animating, setAnimating] = useState(false);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derive types from pair selector ────────────────────────

  const [typeM, typeN] = useMemo<['cos' | 'sin', 'cos' | 'sin']>(() => {
    switch (pairType) {
      case 'cos-cos':
        return ['cos', 'cos'];
      case 'sin-sin':
        return ['sin', 'sin'];
      case 'cos-sin':
        return ['cos', 'sin'];
    }
  }, [pairType]);

  // ── Curve data ─────────────────────────────────────────────

  const curveData = useMemo(() => {
    const pts: { x: number; phiM: number; phiN: number; product: number }[] = [];
    const step = (2 * Math.PI) / GRID_PTS;

    for (let i = 0; i <= GRID_PTS; i++) {
      const x = -Math.PI + i * step;
      const phiM = basisFn(typeM, m, x);
      const phiN = basisFn(typeN, n, x);
      pts.push({ x, phiM, phiN, product: phiM * phiN });
    }
    return pts;
  }, [m, n, typeM, typeN]);

  // ── Inner product via trapezoidal rule ─────────────────────

  const innerProduct = useMemo(() => {
    const N = 1000;
    const h = (2 * Math.PI) / N;
    let sum = 0;
    for (let i = 0; i <= N; i++) {
      const x = -Math.PI + i * h;
      const w = i === 0 || i === N ? 0.5 : 1;
      sum += w * basisFn(typeM, m, x) * basisFn(typeN, n, x);
    }
    return (sum * h) / Math.PI;
  }, [m, n, typeM, typeN]);

  // ── Animation ──────────────────────────────────────────────

  useEffect(() => {
    if (!animating) {
      if (animRef.current) clearInterval(animRef.current);
      return;
    }
    animRef.current = setInterval(() => {
      setN((prev) => {
        if (prev >= 8) {
          setAnimating(false);
          return 8;
        }
        return prev + 1;
      });
    }, 600);
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [animating]);

  const handleAnimate = () => {
    setN(0);
    setAnimating(true);
  };

  // ── Label helpers ──────────────────────────────────────────

  const labelM = typeM === 'cos' ? `cos(${m}x)` : `sin(${m}x)`;
  const labelN = typeN === 'cos' ? `cos(${n}x)` : `sin(${n}x)`;

  // Special label for freq-0 cos (normalized constant)
  const displayLabelM =
    m === 0 && typeM === 'cos' ? '1/\u221a2' : labelM;
  const displayLabelN =
    n === 0 && typeN === 'cos' ? '1/\u221a2' : labelN;
  // sin(0x) = 0 always
  const displayLabelMFull =
    m === 0 && typeM === 'sin' ? '0' : displayLabelM;
  const displayLabelNFull =
    n === 0 && typeN === 'sin' ? '0' : displayLabelN;

  // ── Readout styling ────────────────────────────────────────

  const isOrthogonal = Math.abs(innerProduct) < 1e-6;
  const isNormalized = Math.abs(innerProduct - 1) < 1e-6;

  // ── D3 rendering ───────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 50) return;

      const panelGap = 20;
      const innerW = width - margin.left - margin.right;
      const totalInner = height - margin.top - margin.bottom;
      const panelH = (totalInner - panelGap) / 2;

      // ── Top panel: two basis functions overlaid ─────────────

      const gTop = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleLinear()
        .domain([-Math.PI, Math.PI])
        .range([0, innerW]);

      // Y extent for basis functions
      const basisYVals = curveData.flatMap((d) => [d.phiM, d.phiN]);
      const basisExtent = d3.extent(basisYVals) as [number, number];
      const basisPad = (basisExtent[1] - basisExtent[0]) * 0.12 || 0.5;
      const yScaleTop = d3
        .scaleLinear()
        .domain([basisExtent[0] - basisPad, basisExtent[1] + basisPad])
        .range([panelH, 0]);

      // Zero line (top panel)
      if (yScaleTop.domain()[0] < 0 && yScaleTop.domain()[1] > 0) {
        gTop
          .append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', yScaleTop(0))
          .attr('y2', yScaleTop(0))
          .style('stroke', '#D1D5DB')
          .style('stroke-width', 0.5);
      }

      // φ_m curve
      const lineM = d3
        .line<(typeof curveData)[0]>()
        .x((d) => xScale(d.x))
        .y((d) => yScaleTop(d.phiM));

      gTop
        .append('path')
        .datum(curveData)
        .attr('d', lineM)
        .style('fill', 'none')
        .style('stroke', functionColors[0])
        .style('stroke-width', 2);

      // φ_n curve
      const lineN = d3
        .line<(typeof curveData)[0]>()
        .x((d) => xScale(d.x))
        .y((d) => yScaleTop(d.phiN));

      gTop
        .append('path')
        .datum(curveData)
        .attr('d', lineN)
        .style('fill', 'none')
        .style('stroke', PHI_N_COLOR)
        .style('stroke-width', 2);

      // Top panel labels
      gTop
        .append('text')
        .attr('x', innerW - 4)
        .attr('y', 14)
        .attr('text-anchor', 'end')
        .style('font-size', '11px')
        .style('fill', functionColors[0])
        .text(`\u03c6\u2098 = ${displayLabelMFull}`);

      gTop
        .append('text')
        .attr('x', innerW - 4)
        .attr('y', 28)
        .attr('text-anchor', 'end')
        .style('font-size', '11px')
        .style('fill', PHI_N_COLOR)
        .text(`\u03c6\u2099 = ${displayLabelNFull}`);

      // Top panel axes
      const xAxisTop = d3
        .axisBottom(xScale)
        .tickValues(PI_TICKS.map((t) => t.value))
        .tickFormat((_d, i) => PI_TICKS[i]?.label ?? '');

      gTop
        .append('g')
        .attr('transform', `translate(0,${panelH})`)
        .call(xAxisTop)
        .style('color', 'var(--color-text-muted)');

      gTop
        .append('g')
        .call(d3.axisLeft(yScaleTop).ticks(Math.max(3, Math.floor(panelH / 50))))
        .style('color', 'var(--color-text-muted)');

      // ── Bottom panel: product with shaded integral ──────────

      const gBot = svg
        .append('g')
        .attr(
          'transform',
          `translate(${margin.left},${margin.top + panelH + panelGap})`,
        );

      // Y extent for product
      const prodYVals = curveData.map((d) => d.product);
      const prodExtent = d3.extent(prodYVals) as [number, number];
      const prodPad = (prodExtent[1] - prodExtent[0]) * 0.12 || 0.5;
      const yScaleBot = d3
        .scaleLinear()
        .domain([prodExtent[0] - prodPad, prodExtent[1] + prodPad])
        .range([panelH, 0]);

      // Positive area fill
      const areaPos = d3
        .area<(typeof curveData)[0]>()
        .x((d) => xScale(d.x))
        .y0(yScaleBot(0))
        .y1((d) => yScaleBot(Math.max(d.product, 0)))
        .curve(d3.curveLinear);

      gBot
        .append('path')
        .datum(curveData)
        .attr('d', areaPos)
        .style('fill', POS_FILL)
        .style('fill-opacity', 0.7)
        .style('stroke', 'none');

      // Negative area fill
      const areaNeg = d3
        .area<(typeof curveData)[0]>()
        .x((d) => xScale(d.x))
        .y0(yScaleBot(0))
        .y1((d) => yScaleBot(Math.min(d.product, 0)))
        .curve(d3.curveLinear);

      gBot
        .append('path')
        .datum(curveData)
        .attr('d', areaNeg)
        .style('fill', NEG_FILL)
        .style('fill-opacity', 0.7)
        .style('stroke', 'none');

      // Dashed zero line
      gBot
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', yScaleBot(0))
        .attr('y2', yScaleBot(0))
        .style('stroke', '#9CA3AF')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '4 3');

      // Product curve
      const lineProd = d3
        .line<(typeof curveData)[0]>()
        .x((d) => xScale(d.x))
        .y((d) => yScaleBot(d.product));

      gBot
        .append('path')
        .datum(curveData)
        .attr('d', lineProd)
        .style('fill', 'none')
        .style('stroke', PRODUCT_COLOR)
        .style('stroke-width', 1.5);

      // Bottom panel label
      gBot
        .append('text')
        .attr('x', innerW - 4)
        .attr('y', 14)
        .attr('text-anchor', 'end')
        .style('font-size', '11px')
        .style('fill', PRODUCT_COLOR)
        .text(`\u03c6\u2098 \u00b7 \u03c6\u2099`);

      // Bottom panel axes
      const xAxisBot = d3
        .axisBottom(xScale)
        .tickValues(PI_TICKS.map((t) => t.value))
        .tickFormat((_d, i) => PI_TICKS[i]?.label ?? '');

      gBot
        .append('g')
        .attr('transform', `translate(0,${panelH})`)
        .call(xAxisBot)
        .style('color', 'var(--color-text-muted)');

      gBot
        .append('g')
        .call(d3.axisLeft(yScaleBot).ticks(Math.max(3, Math.floor(panelH / 50))))
        .style('color', 'var(--color-text-muted)');
    },
    [curveData, width, height],
  );

  // ── JSX ────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls row */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        {/* Pair type selector */}
        <select
          className="border rounded px-2 py-1 text-sm"
          style={{
            color: 'var(--color-text)',
            backgroundColor: 'var(--color-bg)',
            borderColor: 'var(--color-border)',
          }}
          value={pairType}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setPairType(e.target.value as PairType)
          }
        >
          <option value="cos-cos">cos &ndash; cos</option>
          <option value="sin-sin">sin &ndash; sin</option>
          <option value="cos-sin">cos &ndash; sin</option>
        </select>

        {/* m slider */}
        <label
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          m = {m}
          <input
            type="range"
            min="0"
            max="8"
            value={m}
            onChange={(e) => setM(Number(e.target.value))}
            className="w-24"
          />
        </label>

        {/* n slider */}
        <label
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          n = {n}
          <input
            type="range"
            min="0"
            max="8"
            value={n}
            onChange={(e) => {
              setN(Number(e.target.value));
              setAnimating(false);
            }}
            className="w-24"
          />
        </label>

        {/* Animate button */}
        <button
          className="text-sm px-3 py-1 rounded border"
          style={{
            color: animating ? 'white' : 'var(--color-text)',
            backgroundColor: animating ? functionColors[0] : 'transparent',
            borderColor: 'var(--color-border)',
          }}
          onClick={handleAnimate}
          disabled={animating}
        >
          {animating ? 'Sweeping\u2026' : '\u25b6 Sweep n'}
        </button>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} />

      {/* Inner product readout */}
      <div
        className="mt-2 text-center font-mono text-lg"
        style={{
          color: isNormalized
            ? '#059669'
            : isOrthogonal
              ? '#6B7280'
              : 'var(--color-text)',
          fontWeight: isNormalized || isOrthogonal ? 600 : 400,
          transition: 'color 0.3s ease',
        }}
      >
        &lang;&phi;<sub>{m}</sub>, &phi;<sub>{n}</sub>&rang; ={' '}
        {isOrthogonal ? '0' : isNormalized ? '1' : innerProduct.toFixed(4)}
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap gap-4 mt-1 text-xs justify-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span>
          <span style={{ color: functionColors[0] }}>{'\u2501'}</span>{' '}
          {displayLabelMFull}
        </span>
        <span>
          <span style={{ color: PHI_N_COLOR }}>{'\u2501'}</span>{' '}
          {displayLabelNFull}
        </span>
        <span>
          <span style={{ color: PRODUCT_COLOR }}>{'\u2501'}</span> product
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              backgroundColor: POS_FILL,
              border: '1px solid #BBF7D0',
              verticalAlign: 'middle',
              marginRight: 2,
            }}
          />
          positive area
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              backgroundColor: NEG_FILL,
              border: '1px solid #FECACA',
              verticalAlign: 'middle',
              marginRight: 2,
            }}
          />
          negative area
        </span>
      </div>
    </div>
  );
}
