import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getDiscontinuityPresets } from '../../data/epsilon-delta-data';
import { functionColors, regionColors } from './shared/colorScales';

type Tab = 'continuous' | 'removable' | 'jump' | 'essential';

const presets = getDiscontinuityPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const SAMPLE_PTS = 600;

export default function ContinuityTypesExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [tab, setTab] = useState<Tab>('continuous');
  const [epsilonLog, setEpsilonLog] = useState(-0.5);

  const epsilon = Math.pow(10, epsilonLog);
  const preset = presets.find((p) => p.type === tab)!;

  // Generate curve data with adaptive sampling for sin(1/x)
  const curveData = useMemo(() => {
    const a = preset.a;
    const pts: { x: number; y: number }[] = [];

    if (tab === 'essential') {
      // Adaptive sampling: log-spaced near 0, uniform elsewhere
      for (let k = 1; k <= 300; k++) {
        const x = Math.pow(10, -k * 0.01);
        const y = preset.fn(x);
        if (isFinite(y)) pts.push({ x, y });
      }
      for (let k = 1; k <= 300; k++) {
        const x = -Math.pow(10, -k * 0.01);
        const y = preset.fn(x);
        if (isFinite(y)) pts.push({ x, y });
      }
      // Uniform sampling away from 0
      for (let i = 0; i <= 200; i++) {
        const x = 0.1 + (1.9) * (i / 200);
        pts.push({ x, y: preset.fn(x) });
      }
      for (let i = 0; i <= 200; i++) {
        const x = -0.1 - (1.9) * (i / 200);
        pts.push({ x, y: preset.fn(x) });
      }
      pts.sort((p1, p2) => p1.x - p2.x);
    } else {
      const xMin = a - 2;
      const xMax = a + 2;
      for (let i = 0; i <= SAMPLE_PTS; i++) {
        const x = xMin + (xMax - xMin) * (i / SAMPLE_PTS);
        const y = preset.fn(x);
        if (isFinite(y)) pts.push({ x, y });
      }
    }
    return pts;
  }, [tab]);

  const handleEpsilonChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEpsilonLog(Number(e.target.value));
  }, []);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const a = preset.a;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Domains
      const xMin = tab === 'essential' ? -2 : a - 2;
      const xMax = tab === 'essential' ? 2 : a + 2;
      const yExtent = d3.extent(curveData, (d) => d.y) as [number, number];
      const yPad = ((yExtent[1] || 1) - (yExtent[0] || -1)) * 0.15 || 0.5;
      const yMin = (yExtent[0] || -1) - yPad;
      const yMax = (yExtent[1] || 1) + yPad;

      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

      // Epsilon band around limit (or f(a) for continuous)
      const bandCenter = preset.type === 'continuous'
        ? preset.fOfA!
        : (preset.leftLimit !== null && preset.rightLimit !== null)
          ? (preset.leftLimit + preset.rightLimit) / 2
          : preset.fOfA ?? 0;

      if (isFinite(bandCenter)) {
        const bandTop = yScale(bandCenter + epsilon);
        const bandBottom = yScale(bandCenter - epsilon);
        g.append('rect')
          .attr('x', 0)
          .attr('y', Math.max(0, bandTop))
          .attr('width', innerW)
          .attr('height', Math.max(0, Math.min(innerH, bandBottom) - Math.max(0, bandTop)))
          .style('fill', regionColors.epsilonBand)
          .style('opacity', 0.3);
      }

      // Delta band around a
      const delta = epsilon * 0.5; // illustrative delta
      const deltaLeft = xScale(a - delta);
      const deltaRight = xScale(a + delta);
      g.append('rect')
        .attr('x', Math.max(0, deltaLeft))
        .attr('y', 0)
        .attr('width', Math.max(0, Math.min(innerW, deltaRight) - Math.max(0, deltaLeft)))
        .attr('height', innerH)
        .style('fill', regionColors.deltaBand)
        .style('opacity', 0.2);

      // Function curve
      const line = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .defined((d) => d.x >= xMin && d.x <= xMax && isFinite(d.y));

      // For jump discontinuity, split into left and right segments
      if (tab === 'jump') {
        const leftPts = curveData.filter((d) => d.x < a);
        const rightPts = curveData.filter((d) => d.x >= a);
        g.append('path').datum(leftPts).attr('fill', 'none')
          .attr('stroke', functionColors[0]).attr('stroke-width', 2).attr('d', line);
        g.append('path').datum(rightPts).attr('fill', 'none')
          .attr('stroke', functionColors[0]).attr('stroke-width', 2).attr('d', line);
        // Open and closed circles at jump
        if (preset.leftLimit !== null) {
          g.append('circle')
            .attr('cx', xScale(a)).attr('cy', yScale(preset.leftLimit))
            .attr('r', 5).style('fill', 'var(--color-surface)')
            .style('stroke', functionColors[0]).style('stroke-width', 2);
        }
        if (preset.fOfA !== null) {
          g.append('circle')
            .attr('cx', xScale(a)).attr('cy', yScale(preset.fOfA))
            .attr('r', 4).style('fill', functionColors[0]);
        }
      } else {
        g.append('path')
          .datum(curveData.filter((d) => d.x >= xMin && d.x <= xMax))
          .attr('fill', 'none')
          .attr('stroke', functionColors[0])
          .attr('stroke-width', 2)
          .attr('d', line);

        // Removable: open circle at wrong value, dotted line to correct value
        if (tab === 'removable' && preset.leftLimit !== null && preset.fOfA !== null) {
          g.append('circle')
            .attr('cx', xScale(a)).attr('cy', yScale(preset.fOfA))
            .attr('r', 4).style('fill', functionColors[0]);
          g.append('circle')
            .attr('cx', xScale(a)).attr('cy', yScale(preset.leftLimit))
            .attr('r', 5).style('fill', 'var(--color-surface)')
            .style('stroke', functionColors[0]).style('stroke-width', 2);
          g.append('line')
            .attr('x1', xScale(a)).attr('x2', xScale(a))
            .attr('y1', yScale(preset.fOfA)).attr('y2', yScale(preset.leftLimit))
            .style('stroke', functionColors[1]).style('stroke-dasharray', '3,3')
            .style('stroke-width', 1.5);
        }
      }

      // Point a marker
      g.append('line')
        .attr('x1', xScale(a)).attr('x2', xScale(a))
        .attr('y1', 0).attr('y2', innerH)
        .style('stroke', functionColors[2])
        .style('stroke-dasharray', '4,3')
        .style('stroke-width', 1);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });
    },
    [tab, curveData, width, height, epsilon],
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'continuous', label: 'Continuous' },
    { key: 'removable', label: 'Removable' },
    { key: 'jump', label: 'Jump' },
    { key: 'essential', label: 'Essential' },
  ];

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap gap-1 mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
            style={{
              background: tab === t.key ? 'var(--color-primary)' : 'var(--color-surface-alt)',
              color: tab === t.key ? '#fff' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <label className="text-sm mb-2 block" style={{ color: 'var(--color-text-muted)' }}>
        ε = {epsilon.toFixed(epsilon < 0.01 ? 3 : 2)}
        <input
          type="range"
          min={-2}
          max={0.3}
          step={0.02}
          value={epsilonLog}
          onChange={handleEpsilonChange}
          className="ml-2 w-36"
        />
      </label>

      <svg ref={svgRef} width={width} height={height} />

      <div className="mt-2 text-xs p-3 rounded" style={{
        background: 'var(--color-surface-alt)',
        color: 'var(--color-text-muted)',
        border: '1px solid var(--color-border)',
      }}>
        <strong style={{ color: 'var(--color-text)' }}>{preset.label}</strong> at x = {preset.a}:
        {' '}{preset.explanation}
      </div>
    </div>
  );
}
