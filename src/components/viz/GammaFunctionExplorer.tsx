import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { gammaFunction } from './shared/integration';
import { GAMMA_FACTORIAL_POINTS } from '../../data/improper-integrals-data';
import { functionColors, regionColors } from './shared/colorScales';

const margin = { top: 20, right: 30, bottom: 40, left: 55 };
const GAP = 30;

export default function GammaFunctionExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.9, 700);
  const topH = totalHeight * 0.52;
  const botH = totalHeight - topH - GAP;

  const [selectedS, setSelectedS] = useState(3);
  const [showLogGamma, setShowLogGamma] = useState(false);
  const [showNegative, setShowNegative] = useState(false);

  // Gamma curve data
  const gammaCurve = useMemo(() => {
    const pts: { s: number; value: number }[] = [];
    const sMin = showNegative ? -3.8 : 0.05;
    const sMax = 5.5;
    const nPts = 800;

    for (let i = 0; i < nPts; i++) {
      const s = sMin + (i / (nPts - 1)) * (sMax - sMin);
      // Skip near poles (non-positive integers)
      if (s <= 0 && Math.abs(s - Math.round(s)) < 0.02) continue;

      const result = gammaFunction(s);
      const val = showLogGamma ? result.logValue : result.value;
      if (isFinite(val) && Math.abs(val) < (showLogGamma ? 20 : 30)) {
        pts.push({ s, value: val });
      }
    }
    return pts;
  }, [showLogGamma, showNegative]);

  // Integrand data for selected s
  const integrandData = useMemo(() => {
    const pts: { t: number; y: number }[] = [];
    const tMax = Math.max(selectedS * 3, 8);
    const nPts = 300;

    for (let i = 0; i < nPts; i++) {
      const t = 0.01 + (i / (nPts - 1)) * tMax;
      const y = Math.pow(t, selectedS - 1) * Math.exp(-t);
      if (isFinite(y)) {
        pts.push({ t, y });
      }
    }
    return pts;
  }, [selectedS]);

  const gammaAtS = useMemo(() => gammaFunction(selectedS), [selectedS]);

  // Top panel: Gamma(s) curve with factorial dots
  const topRef = useD3<SVGGElement>(
    (g) => {
      g.selectAll('*').remove();
      if (width < 50 || gammaCurve.length < 2) return;

      const iw = width - margin.left - margin.right;
      const ih = topH - margin.top - margin.bottom;

      const xDomain = d3.extent(gammaCurve, (d) => d.s) as [number, number];
      const yDomain = d3.extent(gammaCurve, (d) => d.value) as [number, number];
      const yPad = (yDomain[1] - yDomain[0]) * 0.05;

      const xScale = d3.scaleLinear().domain(xDomain).range([0, iw]);
      const yScale = d3.scaleLinear().domain([yDomain[0] - yPad, yDomain[1] + yPad]).range([ih, 0]);

      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8));
      g.append('text').attr('x', iw / 2).attr('y', ih + 35)
        .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
        .text('s');
      g.append('g').call(d3.axisLeft(yScale).ticks(6));
      g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -42)
        .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
        .text(showLogGamma ? 'log \u0393(s)' : '\u0393(s)');

      // Vertical asymptotes at non-positive integers
      if (showNegative) {
        for (let n = 0; n >= -4; n--) {
          if (n >= xDomain[0] && n <= xDomain[1]) {
            g.append('line')
              .attr('x1', xScale(n)).attr('x2', xScale(n))
              .attr('y1', 0).attr('y2', ih)
              .style('stroke', '#ccc').style('stroke-width', 1).style('stroke-dasharray', '4,4');
          }
        }
      }

      // Zero line
      if (yDomain[0] < 0) {
        g.append('line')
          .attr('x1', 0).attr('x2', iw)
          .attr('y1', yScale(0)).attr('y2', yScale(0))
          .style('stroke', '#ddd').style('stroke-width', 1);
      }

      // Gamma curve — split at discontinuities
      const segments: { s: number; value: number }[][] = [[]];
      for (let i = 0; i < gammaCurve.length; i++) {
        const curr = gammaCurve[i];
        if (i > 0) {
          const prev = gammaCurve[i - 1];
          if (Math.abs(curr.s - prev.s) > 0.2 || Math.abs(curr.value - prev.value) > 15) {
            segments.push([]);
          }
        }
        segments[segments.length - 1].push(curr);
      }

      const line = d3.line<{ s: number; value: number }>()
        .x((d) => xScale(d.s))
        .y((d) => yScale(d.value));

      for (const seg of segments) {
        if (seg.length > 1) {
          g.append('path').datum(seg).attr('d', line)
            .style('fill', 'none').style('stroke', functionColors[0]).style('stroke-width', 2);
        }
      }

      // Factorial dots
      for (const pt of GAMMA_FACTORIAL_POINTS) {
        const val = showLogGamma ? Math.log(pt.exactValue) : pt.exactValue;
        if (pt.s >= xDomain[0] && pt.s <= xDomain[1] && val >= yDomain[0] && val <= yDomain[1]) {
          g.append('circle')
            .attr('cx', xScale(pt.s)).attr('cy', yScale(val)).attr('r', 5)
            .style('fill', pt.isFactorial ? functionColors[1] : functionColors[2])
            .style('stroke', '#fff').style('stroke-width', 1.5);
        }
      }

      // Current s marker
      const gammaVal = showLogGamma ? gammaAtS.logValue : gammaAtS.value;
      if (selectedS >= xDomain[0] && selectedS <= xDomain[1] &&
          isFinite(gammaVal) && gammaVal >= yDomain[0] && gammaVal <= yDomain[1]) {
        g.append('circle')
          .attr('cx', xScale(selectedS)).attr('cy', yScale(gammaVal)).attr('r', 7)
          .style('fill', 'none').style('stroke', functionColors[0]).style('stroke-width', 2);
        g.append('line')
          .attr('x1', xScale(selectedS)).attr('x2', xScale(selectedS))
          .attr('y1', 0).attr('y2', ih)
          .style('stroke', functionColors[0]).style('stroke-width', 1).style('stroke-dasharray', '3,3')
          .style('opacity', 0.4);
      }
    },
    [gammaCurve, selectedS, gammaAtS, showLogGamma, showNegative, width, topH],
  );

  // Bottom panel: integrand t^{s-1}e^{-t} with shaded area
  const botRef = useD3<SVGGElement>(
    (g) => {
      g.selectAll('*').remove();
      if (width < 50 || integrandData.length < 2) return;

      const iw = width - margin.left - margin.right;
      const ih = botH - margin.top - margin.bottom;

      const xDomain = d3.extent(integrandData, (d) => d.t) as [number, number];
      const yMax = d3.max(integrandData, (d) => d.y) ?? 1;

      const xScale = d3.scaleLinear().domain(xDomain).range([0, iw]);
      const yScale = d3.scaleLinear().domain([0, yMax * 1.15]).range([ih, 0]);

      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(6));
      g.append('text').attr('x', iw / 2).attr('y', ih + 35)
        .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
        .text('t');
      g.append('g').call(d3.axisLeft(yScale).ticks(5));

      // Shaded area = Gamma(s)
      const area = d3.area<{ t: number; y: number }>()
        .x((d) => xScale(d.t))
        .y0(yScale(0))
        .y1((d) => yScale(d.y));
      g.append('path').datum(integrandData).attr('d', area)
        .style('fill', regionColors.integralFill).style('opacity', 0.5);

      // Integrand curve
      const line = d3.line<{ t: number; y: number }>()
        .x((d) => xScale(d.t))
        .y((d) => yScale(d.y));
      g.append('path').datum(integrandData).attr('d', line)
        .style('fill', 'none').style('stroke', functionColors[0]).style('stroke-width', 2);

      // Label
      g.append('text').attr('x', iw - 5).attr('y', 15)
        .style('text-anchor', 'end').style('font-size', '11px').style('fill', '#666')
        .text(`t^{${(selectedS - 1).toFixed(1)}} e^{-t}, area = \u0393(${selectedS.toFixed(2)}) = ${gammaAtS.value.toFixed(4)}`);
    },
    [integrandData, selectedS, gammaAtS, width, botH],
  );

  // Find nearest factorial preset
  const nearestFactorial = GAMMA_FACTORIAL_POINTS.reduce((best, pt) =>
    Math.abs(pt.s - selectedS) < Math.abs(best.s - selectedS) ? pt : best
  );

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          s = {selectedS.toFixed(2)}
          <input type="range" min={0.1} max={5} step={0.01} value={selectedS}
            onChange={(e) => setSelectedS(Number(e.target.value))}
            style={{ width: '160px' }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showLogGamma} onChange={(e) => setShowLogGamma(e.target.checked)} />
          log \u0393(s)
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showNegative} onChange={(e) => setShowNegative(e.target.checked)} />
          Show s {'<'} 0
        </label>
      </div>

      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', marginBottom: '8px', color: '#555' }}>
        <span>\u0393({selectedS.toFixed(2)}) = {gammaAtS.value.toFixed(6)}</span>
        <span>log \u0393 = {gammaAtS.logValue.toFixed(6)}</span>
        {Math.abs(nearestFactorial.s - selectedS) < 0.1 && (
          <span style={{ color: functionColors[1] }}>
            Near: {nearestFactorial.label}
          </span>
        )}
      </div>

      <svg width={width} height={totalHeight}>
        <g ref={topRef} transform={`translate(${margin.left},${margin.top})`} />
        <g ref={botRef} transform={`translate(${margin.left},${topH + GAP + margin.top})`} />
      </svg>
    </div>
  );
}
