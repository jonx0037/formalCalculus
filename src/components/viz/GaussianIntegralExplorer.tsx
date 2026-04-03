import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { errorFunction } from './shared/integration';
import { functionColors, regionColors } from './shared/colorScales';

const margin = { top: 20, right: 30, bottom: 40, left: 55 };
const GAP = 40;

interface GaussianIntegralExplorerProps {
  /** 'basic' (default, Topic 8) — sliders + heatmap. 'proof-steps' (Topic 14) — step-through proof. */
  mode?: 'basic' | 'proof-steps';
}

export default function GaussianIntegralExplorer({ mode = 'basic' }: GaussianIntegralExplorerProps) {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.85, 680);
  const topH = totalHeight * 0.5;
  const botH = totalHeight - topH - GAP;

  const [limitB, setLimitB] = useState(mode === 'proof-steps' ? 5 : 3);
  const [scaleA, setScaleA] = useState(1);
  const [showPolar, setShowPolar] = useState(mode !== 'proof-steps');
  const [showDensity, setShowDensity] = useState(false);
  const [proofStep, setProofStep] = useState(1);

  // 1D Gaussian curve
  const curveData = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const xMax = Math.max(limitB + 1, 4);
    for (let i = 0; i < 400; i++) {
      const x = -xMax + (i / 399) * 2 * xMax;
      pts.push({ x, y: Math.exp(-scaleA * x * x) });
    }
    return pts;
  }, [limitB, scaleA]);

  // Integral value from -b to b
  const integralValue = useMemo(() => {
    // integral of e^{-a*x^2} from -b to b = sqrt(pi/a) * erf(b*sqrt(a))
    return Math.sqrt(Math.PI / scaleA) * errorFunction(limitB * Math.sqrt(scaleA));
  }, [limitB, scaleA]);

  const exactValue = Math.sqrt(Math.PI / scaleA);

  // 2D heatmap data
  const heatmapData = useMemo(() => {
    const N = 40;
    const range = 3.5;
    const cells: { x: number; y: number; val: number }[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = -range + (i / (N - 1)) * 2 * range;
        const y = -range + (j / (N - 1)) * 2 * range;
        cells.push({ x, y, val: Math.exp(-(x * x + y * y)) });
      }
    }
    return { cells, N, range };
  }, []);

  // Top panel: 1D Gaussian with shaded area
  const topRef = useD3<SVGGElement>(
    (g) => {
      g.selectAll('*').remove();
      if (width < 50) return;

      const iw = width - margin.left - margin.right;
      const ih = topH - margin.top - margin.bottom;

      const xMax = Math.max(limitB + 1, 4);
      const xScale = d3.scaleLinear().domain([-xMax, xMax]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([0, 1.15]).range([ih, 0]);

      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8));
      g.append('g').call(d3.axisLeft(yScale).ticks(5));

      // Shaded area from -b to b
      const areaData = curveData.filter((d) => d.x >= -limitB && d.x <= limitB);
      if (areaData.length > 1) {
        const area = d3.area<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y0(yScale(0))
          .y1((d) => yScale(d.y));
        g.append('path').datum(areaData).attr('d', area)
          .style('fill', regionColors.integralFill).style('opacity', 0.5);
      }

      // Function curve
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));
      g.append('path').datum(curveData).attr('d', line)
        .style('fill', 'none').style('stroke', functionColors[0]).style('stroke-width', 2);

      // Gaussian density overlay
      if (showDensity) {
        const densityData = curveData.map((d) => ({
          x: d.x,
          y: Math.exp(-d.x * d.x / 2) / Math.sqrt(2 * Math.PI),
        }));
        g.append('path').datum(densityData).attr('d',
          d3.line<{ x: number; y: number }>()
            .x((d) => xScale(d.x))
            .y((d) => yScale(d.y)))
          .style('fill', 'none').style('stroke', functionColors[2]).style('stroke-width', 1.5)
          .style('stroke-dasharray', '4,3');
      }

      // Bound markers
      for (const bVal of [-limitB, limitB]) {
        g.append('line')
          .attr('x1', xScale(bVal)).attr('x2', xScale(bVal))
          .attr('y1', 0).attr('y2', ih)
          .style('stroke', functionColors[1]).style('stroke-width', 1.5).style('stroke-dasharray', '6,4');
      }

      // Labels
      g.append('text').attr('x', iw - 5).attr('y', 15)
        .style('text-anchor', 'end').style('font-size', '11px').style('fill', '#666')
        .text(scaleA === 1 ? 'e^{\u2212x\u00B2}' : `e^{\u2212${scaleA}x\u00B2}`);
    },
    [curveData, limitB, scaleA, showDensity, width, topH],
  );

  // Bottom panel: 2D heatmap with polar grid
  const botRef = useD3<SVGGElement>(
    (g) => {
      g.selectAll('*').remove();
      if (width < 50) return;

      const iw = width - margin.left - margin.right;
      const ih = botH - margin.top - margin.bottom;

      if (showPolar) {
        // 2D heatmap of e^{-(x^2+y^2)}
        const { cells, N, range } = heatmapData;
        const cellW = iw / N;
        const cellH = ih / N;

        const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 1]);

        const xScale = d3.scaleLinear().domain([-range, range]).range([0, iw]);
        const yScale = d3.scaleLinear().domain([-range, range]).range([ih, 0]);

        // Draw heatmap cells
        for (const cell of cells) {
          const cx = xScale(cell.x) - cellW / 2;
          const cy = yScale(cell.y) - cellH / 2;
          g.append('rect')
            .attr('x', cx).attr('y', cy)
            .attr('width', cellW + 0.5).attr('height', cellH + 0.5)
            .style('fill', colorScale(cell.val));
        }

        // Polar grid overlay
        const centerX = iw / 2;
        const centerY = ih / 2;
        const pixPerUnit = iw / (2 * range);

        for (const r of [1, 2, 3]) {
          g.append('circle')
            .attr('cx', centerX).attr('cy', centerY)
            .attr('r', r * pixPerUnit)
            .style('fill', 'none').style('stroke', 'rgba(255,255,255,0.5)')
            .style('stroke-width', 1);

          g.append('text')
            .attr('x', centerX + r * pixPerUnit + 3).attr('y', centerY - 3)
            .style('fill', 'rgba(255,255,255,0.7)').style('font-size', '10px')
            .text(`r=${r}`);
        }

        // Radial lines
        for (let angle = 0; angle < Math.PI; angle += Math.PI / 6) {
          const r = 3 * pixPerUnit;
          g.append('line')
            .attr('x1', centerX - r * Math.cos(angle))
            .attr('y1', centerY + r * Math.sin(angle))
            .attr('x2', centerX + r * Math.cos(angle))
            .attr('y2', centerY - r * Math.sin(angle))
            .style('stroke', 'rgba(255,255,255,0.2)').style('stroke-width', 0.5);
        }

        // Axes labels
        g.append('text').attr('x', iw / 2).attr('y', ih + 15)
          .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
          .text('x');
        g.append('text').attr('x', -10).attr('y', ih / 2)
          .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
          .text('y');

        g.append('text').attr('x', iw / 2).attr('y', ih + 30)
          .style('text-anchor', 'middle').style('font-size', '10px').style('fill', '#999')
          .text('e^{\u2212(x\u00B2+y\u00B2)} with polar coordinate grid');
      } else {
        // Alternative: convergence plot
        const traceData: { b: number; val: number }[] = [];
        for (let i = 0; i < 60; i++) {
          const b = 0.2 + (i / 59) * 7;
          const val = Math.sqrt(Math.PI / scaleA) * errorFunction(b * Math.sqrt(scaleA));
          traceData.push({ b, val });
        }

        const xScale = d3.scaleLinear().domain([0, 7.5]).range([0, iw]);
        const yScale = d3.scaleLinear().domain([0, exactValue * 1.1]).range([ih, 0]);

        g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(6));
        g.append('text').attr('x', iw / 2).attr('y', ih + 35)
          .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
          .text('Limit b');
        g.append('g').call(d3.axisLeft(yScale).ticks(5));

        const line = d3.line<{ b: number; val: number }>()
          .x((d) => xScale(d.b))
          .y((d) => yScale(d.val));
        g.append('path').datum(traceData).attr('d', line)
          .style('fill', 'none').style('stroke', functionColors[0]).style('stroke-width', 2);

        // Exact value line
        g.append('line')
          .attr('x1', 0).attr('x2', iw)
          .attr('y1', yScale(exactValue)).attr('y2', yScale(exactValue))
          .style('stroke', functionColors[1]).style('stroke-width', 1).style('stroke-dasharray', '4,4');
        g.append('text').attr('x', iw - 5).attr('y', yScale(exactValue) - 5)
          .style('text-anchor', 'end').style('fill', functionColors[1]).style('font-size', '10px')
          .text(`\u221A(\u03C0/${scaleA}) = ${exactValue.toFixed(4)}`);

        // Current b marker
        if (limitB <= 7.5) {
          g.append('circle').attr('cx', xScale(limitB)).attr('cy', yScale(integralValue)).attr('r', 5)
            .style('fill', functionColors[0]).style('stroke', '#fff').style('stroke-width', 1.5);
        }
      }
    },
    [limitB, scaleA, showPolar, heatmapData, integralValue, exactValue, width, botH],
  );

  const proofStepLabels = [
    'Step 1: The 1D integral I',
    'Step 2: Square it — I² as a double integral',
    'Step 3: Switch to polar coordinates',
    'Step 4: Evaluate — I = √π',
  ];

  const proofStepDescriptions = [
    'I = ∫e^{-x²}dx from -∞ to ∞. We cannot find a closed-form antiderivative.',
    'I² = (∫e^{-x²}dx)(∫e^{-y²}dy) = ∬e^{-(x²+y²)}dA by Fubini.',
    'In polar: x²+y² = r², dA = r dr dθ. The integral becomes ∫₀²π∫₀^∞ e^{-r²}r dr dθ.',
    'Inner integral: ∫₀^∞ re^{-r²}dr = ½. So I² = 2π·½ = π, giving I = √π.',
  ];

  if (mode === 'proof-steps') {
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
          {proofStepLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => {
                setProofStep(i + 1);
                if (i + 1 >= 3) setShowPolar(true);
                else setShowPolar(false);
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: proofStep === i + 1 ? '2px solid #2563EB' : '1px solid #CBD5E1',
                background: proofStep === i + 1 ? '#EFF6FF' : 'transparent',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: proofStep === i + 1 ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px', padding: '6px 10px', background: '#F8FAFC', borderRadius: '4px', borderLeft: '3px solid #2563EB' }}>
          {proofStepDescriptions[proofStep - 1]}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '8px' }}>
          Truncation R = {limitB.toFixed(1)}
          <input type="range" min={1} max={8} step={0.1} value={limitB}
            onChange={(e) => setLimitB(Number(e.target.value))}
            style={{ width: '140px' }} />
        </label>

        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', marginBottom: '8px', color: '#555' }}>
          <span>I_R = {integralValue.toFixed(6)}</span>
          <span>I² ≈ {(integralValue * integralValue).toFixed(6)}</span>
          <span style={{ color: '#059669' }}>
            √π = {Math.sqrt(Math.PI).toFixed(6)} | Error: {Math.abs(integralValue - Math.sqrt(Math.PI)).toExponential(2)}
          </span>
        </div>

        <svg width={width} height={totalHeight}>
          <g ref={topRef} transform={`translate(${margin.left},${margin.top})`} />
          <g ref={botRef} transform={`translate(${margin.left},${topH + GAP + margin.top})`} />
        </svg>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          b = {limitB.toFixed(1)}
          <input type="range" min={0.5} max={8} step={0.1} value={limitB}
            onChange={(e) => setLimitB(Number(e.target.value))}
            style={{ width: '120px' }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          a = {scaleA.toFixed(1)}
          <input type="range" min={0.2} max={3} step={0.1} value={scaleA}
            onChange={(e) => setScaleA(Number(e.target.value))}
            style={{ width: '100px' }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showPolar} onChange={(e) => setShowPolar(e.target.checked)} />
          2D polar proof
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showDensity} onChange={(e) => setShowDensity(e.target.checked)} />
          Gaussian density
        </label>
      </div>

      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', marginBottom: '8px', color: '#555' }}>
        <span>{'\u222B'} e^(-{scaleA === 1 ? '' : scaleA}x{'\u00B2'}) dx = {integralValue.toFixed(6)}</span>
        <span style={{ color: '#059669' }}>
          Exact \u221A(\u03C0/a) = {exactValue.toFixed(6)} | Error: {Math.abs(integralValue - exactValue).toExponential(2)}
        </span>
      </div>

      <svg width={width} height={totalHeight}>
        <g ref={topRef} transform={`translate(${margin.left},${margin.top})`} />
        <g ref={botRef} transform={`translate(${margin.left},${topH + GAP + margin.top})`} />
      </svg>
    </div>
  );
}
