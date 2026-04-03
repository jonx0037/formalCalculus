import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { monteCarloIntegral } from './shared/integration';
import { MONTE_CARLO_PRESETS } from '../../data/multiple-integrals-data';
import { functionColors } from './shared/colorScales';

const presets = MONTE_CARLO_PRESETS;
const margin = { top: 20, right: 20, bottom: 40, left: 55 };
const GAP = 32;

export default function MonteCarloExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.65, 450);
  const leftW = (width - GAP - margin.left - margin.right * 2) * 0.5;
  const rightW = width - leftW - GAP - margin.left - margin.right;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [logN, setLogN] = useState(3); // 10^logN samples
  const [seed, setSeed] = useState(42);

  const preset = presets[selectedIdx];
  const nSamples = Math.round(Math.pow(10, logN));

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdx(Number(e.target.value));
    setSeed(42);
  }, []);

  const result = useMemo(() => {
    return monteCarloIntegral(preset.f, {
      x: preset.domain.x,
      y: preset.domain.y,
    }, nSamples, preset.inRegion, seed);
  }, [selectedIdx, nSamples, seed]);

  const error = Math.abs(result.estimate - preset.exactValue);

  // ─── Scatter plot ────────────────────────────────────────
  const scatterRef = useD3<SVGSVGElement>((svg) => {
    svg.selectAll('*').remove();
    if (leftW <= 0 || totalHeight <= 0) return;

    const w = leftW;
    const h = totalHeight - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const [xMin, xMax] = preset.domain.x;
    const [yMin, yMax] = preset.domain.y;
    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, w]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([h, 0]);

    // Limit displayed points for performance
    const maxDisplay = Math.min(result.samples.length, 5000);
    const step = Math.max(1, Math.floor(result.samples.length / maxDisplay));
    const displayed = result.samples.filter((_, i) => i % step === 0);

    g.selectAll('circle')
      .data(displayed)
      .join('circle')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', nSamples <= 500 ? 2 : 1)
      .style('fill', (d) => d.inRegion ? functionColors[0] : '#D1D5DB')
      .style('opacity', 0.6);

    // Region boundary (if inRegion defined — draw unit circle for pi preset)
    if (preset.inRegion && preset.name === 'pi-estimation') {
      const circleData = d3.range(0, 2 * Math.PI + 0.1, 0.05).map((t) => ({
        x: Math.cos(t), y: Math.sin(t),
      }));
      g.append('path')
        .datum(circleData)
        .attr('fill', 'none')
        .style('stroke', functionColors[1]).style('stroke-width', 1.5)
        .attr('d', d3.line<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y))
        );
    }

    // Axes
    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(xScale).ticks(5))
      .append('text').attr('x', w / 2).attr('y', 32)
      .style('fill', 'currentColor').style('font-size', '12px').style('text-anchor', 'middle').text('x');

    g.append('g').call(d3.axisLeft(yScale).ticks(5))
      .append('text').attr('transform', 'rotate(-90)').attr('x', -h / 2).attr('y', -40)
      .style('fill', 'currentColor').style('font-size', '12px').style('text-anchor', 'middle').text('y');

    g.append('text')
      .attr('x', w / 2).attr('y', -5)
      .style('fill', 'currentColor').style('font-size', '13px').style('text-anchor', 'middle')
      .text(`N = ${nSamples.toLocaleString()} samples`);
  }, [selectedIdx, nSamples, seed, width, totalHeight]);

  // ─── Convergence plot ────────────────────────────────────
  const convRef = useD3<SVGSVGElement>((svg) => {
    svg.selectAll('*').remove();
    if (rightW <= 0 || totalHeight <= 0) return;

    const w = rightW;
    const h = totalHeight - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const hist = result.convergenceHistory;
    if (hist.length === 0) return;

    const xScale = d3.scaleLog().domain([hist[0].n, Math.max(hist[hist.length - 1].n, 10)]).range([0, w]);

    const estimates = hist.map((d) => d.estimate);
    const eMin = d3.min(estimates) ?? 0;
    const eMax = d3.max(estimates) ?? 1;
    const pad = Math.max((eMax - eMin) * 0.2, 0.1);
    const yScale = d3.scaleLinear()
      .domain([Math.min(eMin - pad, preset.exactValue - pad), Math.max(eMax + pad, preset.exactValue + pad)])
      .range([h, 0]);

    // ±2σ/√N bands
    const bandData = hist.map((d) => {
      const se = result.standardError * Math.sqrt(nSamples / Math.max(d.n, 1));
      return { n: d.n, lo: preset.exactValue - 2 * se, hi: preset.exactValue + 2 * se };
    });

    g.append('path')
      .datum(bandData)
      .attr('fill', '#BFDBFE').attr('opacity', 0.4)
      .attr('d', d3.area<typeof bandData[0]>()
        .x((d) => xScale(d.n))
        .y0((d) => yScale(d.lo))
        .y1((d) => yScale(d.hi))
      );

    // Exact value line
    g.append('line')
      .attr('x1', 0).attr('x2', w)
      .attr('y1', yScale(preset.exactValue)).attr('y2', yScale(preset.exactValue))
      .style('stroke', functionColors[1]).style('stroke-width', 1.5)
      .style('stroke-dasharray', '6,3');

    // Convergence path
    g.append('path')
      .datum(hist)
      .attr('fill', 'none')
      .style('stroke', functionColors[0]).style('stroke-width', 1.5)
      .attr('d', d3.line<typeof hist[0]>()
        .x((d) => xScale(d.n))
        .y((d) => yScale(d.estimate))
      );

    // Axes
    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(xScale).ticks(4, '~s'))
      .append('text').attr('x', w / 2).attr('y', 32)
      .style('fill', 'currentColor').style('font-size', '12px').style('text-anchor', 'middle').text('N (samples)');

    g.append('g').call(d3.axisLeft(yScale).ticks(5))
      .append('text').attr('transform', 'rotate(-90)').attr('x', -h / 2).attr('y', -40)
      .style('fill', 'currentColor').style('font-size', '12px').style('text-anchor', 'middle').text('Estimate');

    g.append('text')
      .attr('x', w / 2).attr('y', -5)
      .style('fill', 'currentColor').style('font-size', '13px').style('text-anchor', 'middle')
      .text('Convergence to exact value');

    // Legend
    g.append('text')
      .attr('x', w - 5).attr('y', yScale(preset.exactValue) - 8)
      .style('fill', functionColors[1]).style('font-size', '10px').style('text-anchor', 'end')
      .text(`exact = ${preset.exactValue.toFixed(4)}`);
  }, [selectedIdx, nSamples, seed, width, totalHeight]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px', fontSize: '14px' }}>
        <label>
          Target:{' '}
          <select value={selectedIdx} onChange={handlePresetChange}>
            {presets.map((p, i) => <option key={p.name} value={i}>{p.label}</option>)}
          </select>
        </label>
        <label>
          N = {nSamples.toLocaleString()}{' '}
          <input type="range" min={1} max={4} step={0.1} value={logN}
            onChange={(e) => setLogN(Number(e.target.value))} />
        </label>
        <button onClick={() => setSeed((s) => s + 1)} style={{ cursor: 'pointer' }}>
          New seed
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '8px', fontSize: '13px', fontFamily: 'var(--font-mono, monospace)' }}>
        <span>Estimate: {result.estimate.toFixed(6)}</span>
        <span>Exact: {preset.exactValue.toFixed(6)}</span>
        <span>Error: {error.toExponential(2)}</span>
        <span>SE: {result.standardError.toExponential(2)}</span>
      </div>

      <div style={{ display: 'flex', gap: `${GAP}px` }}>
        <svg ref={scatterRef} width={leftW + margin.left + margin.right} height={totalHeight} />
        <svg ref={convRef} width={rightW + margin.left + margin.right} height={totalHeight} />
      </div>
    </div>
  );
}
