import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getFTCPresets } from '../../data/riemann-integral-data';
import { functionColors, regionColors } from './shared/colorScales';

const presets = getFTCPresets();
const margin = { top: 20, right: 30, bottom: 35, left: 55 };
const CURVE_PTS = 300;
const GAP = 30;

export default function FTCExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalH = Math.min(width * 0.9, 600);
  const panelH = (totalH - GAP) / 2;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [currentX, setCurrentX] = useState(presets[0].domain[1] * 0.5);
  const [showTangent, setShowTangent] = useState(true);

  const preset = presets[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setCurrentX(presets[idx].domain[1] * 0.5);
  }, []);

  // f(x) curve
  const fCurve = useMemo(() => {
    const [a, b] = preset.domain;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < CURVE_PTS; i++) {
      const x = a + (i / (CURVE_PTS - 1)) * (b - a);
      pts.push({ x, y: preset.f(x) });
    }
    return pts;
  }, [selectedIdx]);

  // F(x) exact curve
  const fExactCurve = useMemo(() => {
    const [a, b] = preset.domain;
    const F0 = preset.F(preset.defaultA);
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < CURVE_PTS; i++) {
      const x = a + (i / (CURVE_PTS - 1)) * (b - a);
      pts.push({ x, y: preset.F(x) - F0 });
    }
    return pts;
  }, [selectedIdx]);

  const fVal = preset.f(currentX);
  const Fval = preset.F(currentX) - preset.F(preset.defaultA);

  // ── Top panel: f(x) with shaded area ──
  const topRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 50) return;

      const iw = width - margin.left - margin.right;
      const ih = panelH - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const [domA, domB] = preset.domain;
      const a = preset.defaultA;
      const yVals = fCurve.map((d) => d.y);
      const yMin = Math.min(d3.min(yVals) ?? 0, 0);
      const yMax = (d3.max(yVals) ?? 1) * 1.1;

      const xScale = d3.scaleLinear().domain([domA, domB]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([ih, 0]);

      // Axes
      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.append('g').call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.selectAll('.domain, .tick line').style('stroke', 'var(--color-border)');

      // Shaded area from a to currentX
      const shadePts = fCurve.filter((d) => d.x >= a && d.x <= currentX);
      if (shadePts.length > 1) {
        const area = d3.area<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y0(yScale(0))
          .y1((d) => yScale(d.y));
        g.append('path')
          .datum(shadePts)
          .attr('d', area)
          .style('fill', regionColors.integralFill)
          .style('fill-opacity', 0.5);
      }

      // Function curve
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));
      g.append('path')
        .datum(fCurve)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', functionColors[0])
        .style('stroke-width', 2.5);

      // Vertical line at currentX
      g.append('line')
        .attr('x1', xScale(currentX)).attr('x2', xScale(currentX))
        .attr('y1', yScale(yMin)).attr('y2', yScale(yMax))
        .style('stroke', functionColors[1])
        .style('stroke-dasharray', '5,4')
        .style('stroke-width', 1.5);

      // f(x) dot
      g.append('circle')
        .attr('cx', xScale(currentX))
        .attr('cy', yScale(fVal))
        .attr('r', 5)
        .style('fill', functionColors[1])
        .style('stroke', '#fff')
        .style('stroke-width', 2);

      g.append('text')
        .attr('x', iw / 2).attr('y', -4)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '13px')
        .text(`${preset.label}  —  shaded area = F(x)`);
    },
    [width, selectedIdx, currentX, fCurve],
  );

  // ── Bottom panel: F(x) with tangent ──
  const botRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 50) return;

      const iw = width - margin.left - margin.right;
      const ih = panelH - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const [domA, domB] = preset.domain;
      const yVals = fExactCurve.map((d) => d.y);
      const yMin = Math.min(d3.min(yVals) ?? 0, 0);
      const yMax = (d3.max(yVals) ?? 1) * 1.1;

      const xScale = d3.scaleLinear().domain([domA, domB]).range([0, iw]);
      const yScale = d3.scaleLinear().domain([yMin - (yMax - yMin) * 0.1, yMax]).range([ih, 0]);

      // Axes
      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.append('g').call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text').style('fill', 'var(--color-text-muted)');
      g.selectAll('.domain, .tick line').style('stroke', 'var(--color-border)');

      // F(x) curve
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));
      g.append('path')
        .datum(fExactCurve)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', functionColors[2])
        .style('stroke-width', 2.5);

      // Tangent line at currentX with slope = f(currentX)
      if (showTangent) {
        const slope = fVal;
        const span = (domB - domA) * 0.15;
        const x1 = currentX - span;
        const x2 = currentX + span;
        const y1 = Fval + slope * (x1 - currentX);
        const y2 = Fval + slope * (x2 - currentX);
        g.append('line')
          .attr('x1', xScale(x1)).attr('x2', xScale(x2))
          .attr('y1', yScale(y1)).attr('y2', yScale(y2))
          .style('stroke', functionColors[1])
          .style('stroke-width', 2)
          .style('stroke-dasharray', '6,3');

        // Slope annotation
        g.append('text')
          .attr('x', xScale(x2) + 4)
          .attr('y', yScale(y2) - 6)
          .style('fill', functionColors[1])
          .style('font-size', '11px')
          .text(`slope = f(x) = ${fVal.toFixed(3)}`);
      }

      // F(x) dot
      g.append('circle')
        .attr('cx', xScale(currentX))
        .attr('cy', yScale(Fval))
        .attr('r', 5)
        .style('fill', functionColors[2])
        .style('stroke', '#fff')
        .style('stroke-width', 2);

      g.append('text')
        .attr('x', iw / 2).attr('y', -4)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '13px')
        .text(`F(x) = ∫ₐˣ f(t) dt  —  F'(x) = f(x)`);
    },
    [width, selectedIdx, currentX, fExactCurve, showTangent],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span style={{ color: 'var(--color-text-muted)' }}>Function:</span>
          <select
            value={selectedIdx}
            onChange={handlePresetChange}
            className="rounded border px-2 py-1"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
          >
            {presets.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span style={{ color: 'var(--color-text-muted)' }}>x = {currentX.toFixed(2)}</span>
          <input
            type="range"
            min={preset.defaultA}
            max={preset.domain[1]}
            step={0.01}
            value={currentX}
            onChange={(e) => setCurrentX(Number(e.target.value))}
            className="w-40"
          />
        </label>

        <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <input type="checkbox" checked={showTangent} onChange={(e) => setShowTangent(e.target.checked)} />
          Tangent line
        </label>
      </div>

      <svg ref={topRef} width={width} height={panelH} />

      {/* Readout */}
      <div
        className="flex flex-wrap gap-4 px-3 py-1.5 rounded text-sm my-1"
        style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}
      >
        <span>f(x) = <strong>{fVal.toFixed(4)}</strong></span>
        <span>F(x) = <strong>{Fval.toFixed(4)}</strong></span>
        <span>F'(x) = f(x) = <strong>{fVal.toFixed(4)}</strong> <span style={{ color: 'var(--color-text-muted)' }}>(FTC1)</span></span>
      </div>

      <svg ref={botRef} width={width} height={panelH} />
    </div>
  );
}
