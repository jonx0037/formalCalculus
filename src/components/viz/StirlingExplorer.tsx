import { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { STIRLING_DATA } from '../../data/improper-integrals-data';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 30, bottom: 40, left: 60 };
const GAP = 40;

export default function StirlingExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.8, 600);
  const topH = totalHeight * 0.52;
  const botH = totalHeight - topH - GAP;

  const [maxN, setMaxN] = useState(20);
  const [showLog, setShowLog] = useState(true);
  const [showImproved, setShowImproved] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  const data = useMemo(() => STIRLING_DATA.filter((d) => d.n <= maxN), [maxN]);

  // Top panel: n! vs Stirling
  const topRef = useD3<SVGGElement>(
    (g) => {
      g.selectAll('*').remove();
      if (width < 50 || data.length < 2) return;

      const iw = width - margin.left - margin.right;
      const ih = topH - margin.top - margin.bottom;

      const xScale = d3.scaleLinear().domain([1, maxN]).range([0, iw]);

      if (showLogForm) {
        // Show log(n!) vs Stirling log approximation
        const yMax = d3.max(data, (d) => d.logFactorial) ?? 1;
        const yScale = d3.scaleLinear().domain([0, yMax * 1.05]).range([ih, 0]);

        g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8));
        g.append('g').call(d3.axisLeft(yScale).ticks(6));
        g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -48)
          .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
          .text('log(n!)');

        // log(n!) dots and line
        const lineFact = d3.line<(typeof data)[0]>()
          .x((d) => xScale(d.n)).y((d) => yScale(d.logFactorial));
        g.append('path').datum(data).attr('d', lineFact)
          .style('fill', 'none').style('stroke', functionColors[0]).style('stroke-width', 2);

        // Stirling log approximation
        const lineStir = d3.line<(typeof data)[0]>()
          .x((d) => xScale(d.n)).y((d) => yScale(d.logStirling));
        g.append('path').datum(data).attr('d', lineStir)
          .style('fill', 'none').style('stroke', functionColors[1]).style('stroke-width', 2)
          .style('stroke-dasharray', '6,4');
      } else if (showLog) {
        // Log scale comparison
        const yMax = d3.max(data, (d) => d.logFactorial) ?? 1;
        const yScale = d3.scaleLinear().domain([0, yMax * 1.05]).range([ih, 0]);

        g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8));
        g.append('g').call(d3.axisLeft(yScale).ticks(6));
        g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -48)
          .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
          .text('log value');

        // log(n!)
        const lineFact = d3.line<(typeof data)[0]>()
          .x((d) => xScale(d.n)).y((d) => yScale(d.logFactorial));
        g.append('path').datum(data).attr('d', lineFact)
          .style('fill', 'none').style('stroke', functionColors[0]).style('stroke-width', 2);

        for (const d of data) {
          g.append('circle').attr('cx', xScale(d.n)).attr('cy', yScale(d.logFactorial)).attr('r', 3)
            .style('fill', functionColors[0]);
        }

        // log(Stirling)
        const lineStir = d3.line<(typeof data)[0]>()
          .x((d) => xScale(d.n)).y((d) => yScale(d.logStirling));
        g.append('path').datum(data).attr('d', lineStir)
          .style('fill', 'none').style('stroke', functionColors[1]).style('stroke-width', 2)
          .style('stroke-dasharray', '6,4');

        for (const d of data) {
          g.append('circle').attr('cx', xScale(d.n)).attr('cy', yScale(d.logStirling)).attr('r', 3)
            .style('fill', functionColors[1]);
        }
      } else {
        // Linear scale (only useful for small n)
        const yMax = d3.max(data, (d) => d.factorial) ?? 1;
        const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([ih, 0]);

        g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8));
        g.append('g').call(d3.axisLeft(yScale).ticks(6));
        g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -48)
          .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
          .text('n!');

        for (const d of data) {
          g.append('circle').attr('cx', xScale(d.n)).attr('cy', yScale(d.factorial)).attr('r', 3)
            .style('fill', functionColors[0]);
          g.append('circle').attr('cx', xScale(d.n)).attr('cy', yScale(d.stirling)).attr('r', 3)
            .style('fill', functionColors[1]);
        }
      }

      // Legend
      g.append('line').attr('x1', iw - 120).attr('x2', iw - 100).attr('y1', 12).attr('y2', 12)
        .style('stroke', functionColors[0]).style('stroke-width', 2);
      g.append('text').attr('x', iw - 96).attr('y', 16).style('font-size', '10px').text('n!');

      g.append('line').attr('x1', iw - 120).attr('x2', iw - 100).attr('y1', 28).attr('y2', 28)
        .style('stroke', functionColors[1]).style('stroke-width', 2).style('stroke-dasharray', '6,4');
      g.append('text').attr('x', iw - 96).attr('y', 32).style('font-size', '10px').text('Stirling');
    },
    [data, maxN, showLog, showLogForm, width, topH],
  );

  // Bottom panel: relative error
  const botRef = useD3<SVGGElement>(
    (g) => {
      g.selectAll('*').remove();
      if (width < 50 || data.length < 2) return;

      const iw = width - margin.left - margin.right;
      const ih = botH - margin.top - margin.bottom;

      const xScale = d3.scaleLinear().domain([1, maxN]).range([0, iw]);
      const yMax = d3.max(data, (d) => d.relativeError) ?? 0.1;
      const yScale = d3.scaleLog().domain([1e-4, yMax * 2]).range([ih, 0]);

      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(xScale).ticks(8));
      g.append('text').attr('x', iw / 2).attr('y', ih + 35)
        .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
        .text('n');

      g.append('g').call(d3.axisLeft(yScale).ticks(4, '.0e'));
      g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -48)
        .style('text-anchor', 'middle').style('font-size', '11px').style('fill', '#666')
        .text('Relative error');

      // Relative error points and line
      const errLine = d3.line<(typeof data)[0]>()
        .x((d) => xScale(d.n))
        .y((d) => yScale(Math.max(d.relativeError, 1e-16)));
      g.append('path').datum(data).attr('d', errLine)
        .style('fill', 'none').style('stroke', functionColors[1]).style('stroke-width', 2);

      for (const d of data) {
        g.append('circle').attr('cx', xScale(d.n)).attr('cy', yScale(Math.max(d.relativeError, 1e-16))).attr('r', 3)
          .style('fill', functionColors[1]);
      }

      // 1/(12n) theoretical bound
      const boundData = data.map((d) => ({ n: d.n, bound: 1 / (12 * d.n) }));
      const boundLine = d3.line<{ n: number; bound: number }>()
        .x((d) => xScale(d.n))
        .y((d) => yScale(d.bound));
      g.append('path').datum(boundData).attr('d', boundLine)
        .style('fill', 'none').style('stroke', '#999').style('stroke-width', 1)
        .style('stroke-dasharray', '4,4');
      g.append('text').attr('x', iw - 5).attr('y', yScale(1 / (12 * maxN)) - 5)
        .style('text-anchor', 'end').style('font-size', '10px').style('fill', '#999')
        .text('1/(12n)');

      // Improved Stirling error (if toggled)
      if (showImproved) {
        const impData = data.map((d) => {
          const impErr = Math.abs(d.factorial - d.improvedStirling) / d.factorial;
          return { n: d.n, err: Math.max(impErr, 1e-16) };
        });
        const impLine = d3.line<{ n: number; err: number }>()
          .x((d) => xScale(d.n))
          .y((d) => yScale(d.err));
        g.append('path').datum(impData).attr('d', impLine)
          .style('fill', 'none').style('stroke', functionColors[2]).style('stroke-width', 1.5)
          .style('stroke-dasharray', '3,3');
      }
    },
    [data, maxN, showImproved, width, botH],
  );

  // Current readout
  const current = data[data.length - 1];

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          n max = {maxN}
          <input type="range" min={5} max={50} step={1} value={maxN}
            onChange={(e) => setMaxN(Number(e.target.value))}
            style={{ width: '120px' }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showLog} onChange={(e) => setShowLog(e.target.checked)} />
          Log scale
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showImproved} onChange={(e) => setShowImproved(e.target.checked)} />
          Improved Stirling
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showLogForm} onChange={(e) => setShowLogForm(e.target.checked)} />
          Log form
        </label>
      </div>

      {current && (
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', marginBottom: '8px', color: '#555' }}>
          <span>{maxN}! = {current.factorial.toExponential(4)}</span>
          <span>Stirling: {current.stirling.toExponential(4)}</span>
          <span>Relative error: {(current.relativeError * 100).toFixed(3)}%</span>
        </div>
      )}

      <svg width={width} height={totalHeight}>
        <g ref={topRef} transform={`translate(${margin.left},${margin.top})`} />
        <g ref={botRef} transform={`translate(${margin.left},${topH + GAP + margin.top})`} />
      </svg>
    </div>
  );
}
