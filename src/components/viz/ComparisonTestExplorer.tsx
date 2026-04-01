import { useState, useMemo, useCallback, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { adaptiveQuadrature } from './shared/integration';
import { COMPARISON_PRESETS } from '../../data/improper-integrals-data';
import { functionColors, regionColors } from './shared/colorScales';

const margin = { top: 20, right: 30, bottom: 40, left: 55 };
const CURVE_PTS = 400;
const GAP = 40;

export default function ComparisonTestExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.85, 640);
  const topH = totalHeight * 0.55;
  const botH = totalHeight - topH - GAP;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [bound, setBound] = useState(10);
  const [showRatio, setShowRatio] = useState(false);
  const [playing, setPlaying] = useState(false);

  const preset = COMPARISON_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setBound(10);
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setBound((prev) => {
        const next = prev + (prev < 10 ? 0.3 : 0.8);
        if (next >= preset.domain[1]) { setPlaying(false); return preset.domain[1]; }
        return next;
      });
    }, 80);
    return () => clearInterval(id);
  }, [playing, preset.domain]);

  // Curve data
  const curves = useMemo(() => {
    const [a, bMax] = [preset.domain[0], Math.max(bound * 1.1, preset.domain[0] + 5)];
    const fPts: { x: number; y: number }[] = [];
    const gPts: { x: number; y: number }[] = [];
    const rPts: { x: number; y: number }[] = [];

    for (let i = 0; i < CURVE_PTS; i++) {
      const x = a + (i / (CURVE_PTS - 1)) * (bMax - a);
      const fy = preset.f(x);
      const gy = preset.g(x);
      if (isFinite(fy) && isFinite(gy)) {
        fPts.push({ x, y: fy });
        gPts.push({ x, y: gy });
        if (gy > 1e-15) rPts.push({ x, y: fy / gy });
      }
    }
    return { fPts, gPts, rPts };
  }, [selectedIdx, bound]);

  // Integral values
  const integrals = useMemo(() => {
    const a = preset.domain[0];
    const fVal = adaptiveQuadrature(preset.f, a, bound, 1e-8).value;
    const gVal = adaptiveQuadrature(preset.g, a, bound, 1e-8).value;
    return { f: fVal, g: gVal };
  }, [selectedIdx, bound]);

  // Convergence traces
  const traces = useMemo(() => {
    const a = preset.domain[0];
    const nSteps = 50;
    const fTrace: { b: number; val: number }[] = [];
    const gTrace: { b: number; val: number }[] = [];

    for (let i = 0; i < nSteps; i++) {
      const b = a + 1 + (i / (nSteps - 1)) * (preset.domain[1] - a - 1);
      fTrace.push({ b, val: adaptiveQuadrature(preset.f, a, b, 1e-8).value });
      gTrace.push({ b, val: adaptiveQuadrature(preset.g, a, b, 1e-8).value });
    }
    return { fTrace, gTrace };
  }, [selectedIdx]);

  // Top panel: overlaid functions
  const topRef = useD3<SVGGElement>(
    (g) => {
      g.selectAll('*').remove();
      if (width < 50) return;

      const iw = width - margin.left - margin.right;
      const ih = topH - margin.top - margin.bottom;

      const allPts = [...curves.fPts, ...curves.gPts];
      const xDomain = d3.extent(allPts, (d) => d.x) as [number, number];
      const yMax = d3.max(allPts, (d) => d.y) ?? 1;

      const xScale = d3.scaleLinear().domain(xDomain).range([0, iw]);
      const yScale = d3.scaleLinear().domain([0, Math.min(yMax * 1.1, 10)]).range([ih, 0]);

      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8));
      g.append('g').call(d3.axisLeft(yScale).ticks(6));

      // Shaded area under f
      const fArea = curves.fPts.filter((d) => d.x <= bound);
      if (fArea.length > 1) {
        const area = d3.area<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y0(yScale(0))
          .y1((d) => yScale(Math.min(Math.max(d.y, 0), yScale.domain()[1])));
        g.append('path').datum(fArea).attr('d', area)
          .style('fill', regionColors.integralFill).style('opacity', 0.5);
      }

      // Gap between f and g shaded
      const gArea = curves.gPts.filter((d) => d.x <= bound);
      if (gArea.length > 1 && fArea.length > 1) {
        const area = d3.area<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y0((_, i) => {
            const fMatch = fArea[Math.min(i, fArea.length - 1)];
            return yScale(Math.min(Math.max(fMatch.y, 0), yScale.domain()[1]));
          })
          .y1((d) => yScale(Math.min(Math.max(d.y, 0), yScale.domain()[1])));
        g.append('path').datum(gArea).attr('d', area)
          .style('fill', regionColors.deltaBand).style('opacity', 0.3);
      }

      // Function curves
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(Math.min(d.y, yScale.domain()[1])));

      g.append('path').datum(curves.fPts).attr('d', line)
        .style('fill', 'none').style('stroke', functionColors[0]).style('stroke-width', 2);
      g.append('path').datum(curves.gPts).attr('d', line)
        .style('fill', 'none').style('stroke', functionColors[1]).style('stroke-width', 2);

      // Ratio curve (if toggled)
      if (showRatio && curves.rPts.length > 1) {
        const rYMax = d3.max(curves.rPts, (d) => d.y) ?? 2;
        const rScale = d3.scaleLinear().domain([0, rYMax * 1.2]).range([ih, 0]);
        const rLine = d3.line<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y((d) => rScale(d.y));
        g.append('path').datum(curves.rPts).attr('d', rLine)
          .style('fill', 'none').style('stroke', functionColors[2]).style('stroke-width', 1.5)
          .style('stroke-dasharray', '4,3');

        if (preset.limitRatio !== undefined) {
          g.append('line')
            .attr('x1', 0).attr('x2', iw)
            .attr('y1', rScale(preset.limitRatio)).attr('y2', rScale(preset.limitRatio))
            .style('stroke', functionColors[2]).style('stroke-width', 1).style('stroke-dasharray', '2,2');
          g.append('text')
            .attr('x', iw - 5).attr('y', rScale(preset.limitRatio) - 5)
            .style('text-anchor', 'end').style('fill', functionColors[2]).style('font-size', '10px')
            .text(`L = ${preset.limitRatio}`);
        }
      }

      // Legend
      const legendY = 12;
      g.append('line').attr('x1', iw - 100).attr('x2', iw - 80).attr('y1', legendY).attr('y2', legendY)
        .style('stroke', functionColors[0]).style('stroke-width', 2);
      g.append('text').attr('x', iw - 76).attr('y', legendY + 4).style('font-size', '10px').text('f(x)');

      g.append('line').attr('x1', iw - 100).attr('x2', iw - 80).attr('y1', legendY + 16).attr('y2', legendY + 16)
        .style('stroke', functionColors[1]).style('stroke-width', 2);
      g.append('text').attr('x', iw - 76).attr('y', legendY + 20).style('font-size', '10px').text('g(x)');
    },
    [curves, bound, showRatio, width, topH, selectedIdx],
  );

  // Bottom panel: running integrals
  const botRef = useD3<SVGGElement>(
    (g) => {
      g.selectAll('*').remove();
      if (width < 50 || traces.fTrace.length < 2) return;

      const iw = width - margin.left - margin.right;
      const ih = botH - margin.top - margin.bottom;

      const allVals = [...traces.fTrace.map((d) => d.val), ...traces.gTrace.map((d) => d.val)];
      const xDomain = d3.extent(traces.fTrace, (d) => d.b) as [number, number];
      const yMax = d3.max(allVals) ?? 1;

      const xScale = d3.scaleLinear().domain(xDomain).range([0, iw]);
      const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([ih, 0]);

      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(6));
      g.append('text').attr('x', iw / 2).attr('y', ih + 35)
        .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
        .text('Upper limit b');
      g.append('g').call(d3.axisLeft(yScale).ticks(5));

      const line = d3.line<{ b: number; val: number }>()
        .x((d) => xScale(d.b))
        .y((d) => yScale(d.val));

      g.append('path').datum(traces.fTrace).attr('d', line)
        .style('fill', 'none').style('stroke', functionColors[0]).style('stroke-width', 2);
      g.append('path').datum(traces.gTrace).attr('d', line)
        .style('fill', 'none').style('stroke', functionColors[1]).style('stroke-width', 2);

      // Current position markers
      if (bound >= xDomain[0] && bound <= xDomain[1]) {
        g.append('circle').attr('cx', xScale(bound)).attr('cy', yScale(integrals.f)).attr('r', 4)
          .style('fill', functionColors[0]).style('stroke', '#fff').style('stroke-width', 1.5);
        g.append('circle').attr('cx', xScale(bound)).attr('cy', yScale(integrals.g)).attr('r', 4)
          .style('fill', functionColors[1]).style('stroke', '#fff').style('stroke-width', 1.5);
      }
    },
    [traces, bound, integrals, width, botH, selectedIdx],
  );

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
        <select value={selectedIdx} onChange={handlePresetChange} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}>
          {COMPARISON_PRESETS.map((p, i) => (
            <option key={p.name} value={i}>{p.label}</option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          b = {bound.toFixed(1)}
          <input type="range" min={preset.domain[0] + 1} max={preset.domain[1]} step={0.3}
            value={bound} onChange={(e) => { setBound(Number(e.target.value)); setPlaying(false); }}
            style={{ width: '120px' }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showRatio} onChange={(e) => setShowRatio(e.target.checked)} />
          Show ratio f/g
        </label>

        <button onClick={() => setPlaying((p) => !p)}
          style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', background: playing ? '#FEE2E2' : '#F0FDF4' }}>
          {playing ? 'Stop' : 'Animate'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', marginBottom: '8px', color: '#555' }}>
        <span style={{ color: functionColors[0] }}>\u222B f = {integrals.f.toFixed(6)}</span>
        <span style={{ color: functionColors[1] }}>\u222B g = {integrals.g.toFixed(6)}</span>
        <span>Test: {preset.testType} comparison \u2192 {preset.convergenceResult}</span>
      </div>

      <svg width={width} height={totalHeight}>
        <g ref={topRef} transform={`translate(${margin.left},${margin.top})`} />
        <g ref={botRef} transform={`translate(${margin.left},${topH + GAP + margin.top})`} />
      </svg>
    </div>
  );
}
