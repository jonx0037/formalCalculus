import { useState, useMemo, useCallback, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { adaptiveQuadrature } from './shared/integration';
import { TYPE_I_PRESETS, TYPE_II_PRESETS, type ImproperIntegralPreset } from '../../data/improper-integrals-data';
import { functionColors, regionColors } from './shared/colorScales';

const margin = { top: 20, right: 30, bottom: 40, left: 55 };
const CURVE_PTS = 400;
const GAP = 40;

export default function ImproperIntegralExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.85, 680);
  const topH = totalHeight * 0.55;
  const botH = totalHeight - topH - GAP;

  const [integralType, setIntegralType] = useState<'I' | 'II'>('I');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const presets = integralType === 'I' ? TYPE_I_PRESETS : TYPE_II_PRESETS;
  const preset = presets[selectedIdx];

  // Bound: for Type I, b ranges from a+1 to max; for Type II, epsilon from large to small
  const boundRange = useMemo(() => {
    if (integralType === 'I') {
      return { min: preset.defaultA + 1, max: preset.defaultB, step: 0.5 };
    }
    return { min: 0.001, max: (preset.defaultB - preset.defaultA) / 2, step: 0.001 };
  }, [integralType, selectedIdx]);

  const [bound, setBound] = useState(integralType === 'I' ? boundRange.min + 2 : boundRange.max);

  // Reset bound when preset or type changes
  useEffect(() => {
    if (integralType === 'I') {
      setBound(boundRange.min + 2);
    } else {
      setBound(boundRange.max);
    }
    setPlaying(false);
  }, [integralType, selectedIdx]);

  const handleTypeChange = useCallback((type: 'I' | 'II') => {
    setIntegralType(type);
    setSelectedIdx(0);
  }, []);

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
  }, []);

  // Animation
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setBound((prev) => {
        if (integralType === 'I') {
          const next = prev + (prev < 10 ? 0.3 : prev < 30 ? 0.8 : 2);
          if (next >= boundRange.max) { setPlaying(false); return boundRange.max; }
          return next;
        }
        const next = prev * 0.92;
        if (next <= boundRange.min) { setPlaying(false); return boundRange.min; }
        return next;
      });
    }, 80);
    return () => clearInterval(id);
  }, [playing, integralType, boundRange]);

  // Compute current integral value
  const integralValue = useMemo(() => {
    if (integralType === 'I') {
      const result = adaptiveQuadrature(preset.f, preset.defaultA, bound, 1e-10);
      return result.value;
    }
    const eps = bound;
    const a = preset.defaultA + eps;
    const b = preset.defaultB;
    if (a >= b) return 0;
    const result = adaptiveQuadrature(preset.f, a, b, 1e-10);
    return result.value;
  }, [selectedIdx, integralType, bound]);

  // Convergence trace: partial integrals at multiple bound values
  const convergenceTrace = useMemo(() => {
    const nSteps = 60;
    const trace: { param: number; value: number }[] = [];

    if (integralType === 'I') {
      const a = preset.defaultA;
      for (let i = 0; i < nSteps; i++) {
        const b = a + 1 + (i / (nSteps - 1)) * (preset.defaultB - a - 1);
        const result = adaptiveQuadrature(preset.f, a, b, 1e-8);
        trace.push({ param: b, value: result.value });
      }
    } else {
      const b = preset.defaultB;
      for (let i = 0; i < nSteps; i++) {
        const eps = (b - preset.defaultA) / 2 * Math.pow(0.5, i * 0.5);
        const a = preset.defaultA + eps;
        if (a >= b) continue;
        const result = adaptiveQuadrature(preset.f, a, b, 1e-8);
        trace.push({ param: eps, value: result.value });
      }
    }
    return trace;
  }, [selectedIdx, integralType]);

  // Function curve data for top panel
  const curveData = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    let xMin: number, xMax: number;

    if (integralType === 'I') {
      xMin = preset.defaultA;
      xMax = Math.max(bound * 1.1, preset.defaultA + 5);
    } else {
      xMin = Math.max(preset.defaultA + 0.001, bound * 0.5);
      xMax = preset.defaultB;
    }

    for (let i = 0; i < CURVE_PTS; i++) {
      const x = xMin + (i / (CURVE_PTS - 1)) * (xMax - xMin);
      const y = preset.f(x);
      if (isFinite(y) && Math.abs(y) < 1e6) {
        pts.push({ x, y });
      }
    }
    return pts;
  }, [selectedIdx, integralType, bound]);

  // Top panel: function + shaded area
  const topRef = useD3<SVGGElement>(
    (g) => {
      g.selectAll('*').remove();
      if (width < 50) return;

      const iw = width - margin.left - margin.right;
      const ih = topH - margin.top - margin.bottom;

      const xDomain = d3.extent(curveData, (d) => d.x) as [number, number];
      const yMax = d3.max(curveData, (d) => d.y) ?? 1;
      const yMin = Math.min(0, d3.min(curveData, (d) => d.y) ?? 0);

      const xScale = d3.scaleLinear().domain(xDomain).range([0, iw]);
      const yScale = d3.scaleLinear().domain([yMin, yMax * 1.1]).range([ih, 0]);

      // Axes
      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8));
      g.append('g').call(d3.axisLeft(yScale).ticks(6));

      // Shaded area
      const areaStart = integralType === 'I' ? preset.defaultA : preset.defaultA + bound;
      const areaEnd = integralType === 'I' ? bound : preset.defaultB;

      const areaData = curveData.filter((d) => d.x >= areaStart && d.x <= areaEnd);
      if (areaData.length > 1) {
        const area = d3.area<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y0(yScale(0))
          .y1((d) => yScale(Math.max(d.y, 0)));

        g.append('path')
          .datum(areaData)
          .attr('d', area)
          .style('fill', regionColors.integralFill)
          .style('opacity', 0.6);
      }

      // Function curve
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));

      g.append('path')
        .datum(curveData)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', functionColors[0])
        .style('stroke-width', 2);

      // Bound indicator line
      const boundX = integralType === 'I' ? bound : preset.defaultA + bound;
      if (xScale(boundX) >= 0 && xScale(boundX) <= iw) {
        g.append('line')
          .attr('x1', xScale(boundX)).attr('x2', xScale(boundX))
          .attr('y1', 0).attr('y2', ih)
          .style('stroke', functionColors[1])
          .style('stroke-width', 1.5)
          .style('stroke-dasharray', '6,4');

        const labelText = integralType === 'I' ? `b = ${bound.toFixed(1)}` : `\u03B5 = ${bound.toFixed(4)}`;
        g.append('text')
          .attr('x', xScale(boundX) + 5)
          .attr('y', 15)
          .style('fill', functionColors[1])
          .style('font-size', '11px')
          .text(labelText);
      }

      // Exact value line (if convergent)
      if (preset.converges && preset.exactValue !== null) {
        // Show as annotation text
        g.append('text')
          .attr('x', iw - 5)
          .attr('y', 15)
          .style('text-anchor', 'end')
          .style('fill', '#666')
          .style('font-size', '11px')
          .text(`Exact: ${preset.exactValue.toFixed(6)}`);
      }
    },
    [curveData, bound, width, topH, integralType, selectedIdx],
  );

  // Bottom panel: convergence plot
  const botRef = useD3<SVGGElement>(
    (g) => {
      g.selectAll('*').remove();
      if (width < 50 || convergenceTrace.length < 2) return;

      const iw = width - margin.left - margin.right;
      const ih = botH - margin.top - margin.bottom;

      const xDomain = d3.extent(convergenceTrace, (d) => d.param) as [number, number];
      const yDomain = d3.extent(convergenceTrace, (d) => d.value) as [number, number];
      // Add padding
      const yPad = (yDomain[1] - yDomain[0]) * 0.1 || 1;

      const xScale = integralType === 'II'
        ? d3.scaleLog().domain([Math.max(xDomain[0], 1e-6), xDomain[1]]).range([iw, 0])
        : d3.scaleLinear().domain(xDomain).range([0, iw]);
      const yScale = d3.scaleLinear()
        .domain([Math.min(yDomain[0], 0), yDomain[1] + yPad])
        .range([ih, 0]);

      // Axes
      const xLabel = integralType === 'I' ? 'Upper limit b' : 'Distance from singularity \u03B5';
      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(6));
      g.append('text')
        .attr('x', iw / 2).attr('y', ih + 35)
        .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
        .text(xLabel);

      g.append('g').call(d3.axisLeft(yScale).ticks(5));
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -ih / 2).attr('y', -42)
        .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
        .text('Integral value');

      // Convergence line
      const line = d3.line<{ param: number; value: number }>()
        .x((d) => xScale(d.param))
        .y((d) => yScale(d.value));

      g.append('path')
        .datum(convergenceTrace)
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', functionColors[0])
        .style('stroke-width', 2);

      // Exact value horizontal line
      if (preset.converges && preset.exactValue !== null) {
        g.append('line')
          .attr('x1', 0).attr('x2', iw)
          .attr('y1', yScale(preset.exactValue))
          .attr('y2', yScale(preset.exactValue))
          .style('stroke', functionColors[1])
          .style('stroke-width', 1)
          .style('stroke-dasharray', '4,4');

        g.append('text')
          .attr('x', iw - 5)
          .attr('y', yScale(preset.exactValue) - 5)
          .style('text-anchor', 'end')
          .style('fill', functionColors[1])
          .style('font-size', '10px')
          .text(`Exact = ${preset.exactValue.toFixed(4)}`);
      }

      // Current position marker
      const currentParam = integralType === 'I' ? bound : bound;
      if (currentParam >= xDomain[0] && currentParam <= xDomain[1]) {
        g.append('circle')
          .attr('cx', xScale(currentParam))
          .attr('cy', yScale(integralValue))
          .attr('r', 5)
          .style('fill', functionColors[0])
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      }
    },
    [convergenceTrace, bound, integralValue, width, botH, integralType, selectedIdx],
  );

  const boundLabel = integralType === 'I'
    ? `b = ${bound.toFixed(1)}`
    : `\u03B5 = ${bound.toFixed(bound < 0.01 ? 5 : 3)}`;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => handleTypeChange('I')}
            style={{
              padding: '4px 10px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer',
              background: integralType === 'I' ? functionColors[0] : '#fff',
              color: integralType === 'I' ? '#fff' : '#333',
            }}
          >Type I</button>
          <button
            onClick={() => handleTypeChange('II')}
            style={{
              padding: '4px 10px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer',
              background: integralType === 'II' ? functionColors[0] : '#fff',
              color: integralType === 'II' ? '#fff' : '#333',
            }}
          >Type II</button>
        </div>

        <select value={selectedIdx} onChange={handlePresetChange} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}>
          {presets.map((p, i) => (
            <option key={p.name} value={i}>{p.label}{p.converges ? ' (converges)' : ' (diverges)'}</option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {boundLabel}
          <input
            type="range"
            min={boundRange.min}
            max={boundRange.max}
            step={boundRange.step}
            value={bound}
            onChange={(e) => { setBound(Number(e.target.value)); setPlaying(false); }}
            style={{ width: '120px' }}
          />
        </label>

        <button
          onClick={() => setPlaying((p) => !p)}
          style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', background: playing ? '#FEE2E2' : '#F0FDF4' }}
        >{playing ? 'Stop' : 'Animate'}</button>
      </div>

      {/* Readout */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', marginBottom: '8px', color: '#555' }}>
        <span>
          {integralType === 'I'
            ? `\u222B${preset.defaultA === 0 ? '\u2080' : '\u2081'}\u1D47 f(x) dx = ${integralValue.toFixed(6)}`
            : `\u222B\u03B5\u1D47 f(x) dx = ${integralValue.toFixed(6)}`}
        </span>
        {preset.converges && preset.exactValue !== null && (
          <span style={{ color: '#059669' }}>
            Exact: {preset.exactValue.toFixed(6)} | Error: {Math.abs(integralValue - preset.exactValue).toExponential(2)}
          </span>
        )}
        {!preset.converges && (
          <span style={{ color: '#DC2626' }}>Diverges</span>
        )}
      </div>

      {/* SVG */}
      <svg width={width} height={totalHeight}>
        <g ref={topRef} transform={`translate(${margin.left},${margin.top})`} />
        <g ref={botRef} transform={`translate(${margin.left},${topH + GAP + margin.top})`} />
      </svg>

      {preset.notes && (
        <p style={{ fontSize: '12px', color: '#888', marginTop: '4px', fontStyle: 'italic' }}>{preset.notes}</p>
      )}
    </div>
  );
}
