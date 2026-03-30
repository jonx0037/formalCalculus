import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { generateCurve, computeTangent, tangentLineAt } from './shared/differentiation';
import { getChainRulePresets } from '../../data/derivative-data';
import { functionColors } from './shared/colorScales';

const presets = getChainRulePresets();
const margin = { top: 30, right: 20, bottom: 40, left: 50 };
const GAP = 40;
const SAMPLE_PTS = 500;

export default function ChainRuleCompositionExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.55, 420);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const preset = presets[selectedIdx];

  const domainMin = preset.domain[0] + 0.1;
  const domainMax = preset.domain[1] - 0.1;
  const domainMid = (domainMin + domainMax) / 2;

  const [x, setX] = useState(domainMid);

  // Clamp x into current preset domain when switching presets
  const clampedX = Math.max(domainMin, Math.min(domainMax, x));

  // Chain rule values
  const gx = preset.inner(clampedX);
  const gPrime = preset.innerPrime(clampedX);
  const fgx = preset.outer(gx);
  const fPrime = preset.outerPrime(gx);
  const composedDerivative = fPrime * gPrime;

  // Generate inner curve data
  const innerCurveData = useMemo(
    () => generateCurve(preset.inner, preset.domain[0], preset.domain[1], SAMPLE_PTS),
    [selectedIdx],
  );

  // Determine u-domain from the range of the inner function, with padding
  const uDomain = useMemo(() => {
    const extent = d3.extent(innerCurveData, (d) => d.y) as [number, number];
    const pad = (extent[1] - extent[0]) * 0.15 || 0.5;
    return [extent[0] - pad, extent[1] + pad] as [number, number];
  }, [innerCurveData]);

  // Generate outer curve data over u-domain
  const outerCurveData = useMemo(
    () => generateCurve(preset.outer, uDomain[0], uDomain[1], SAMPLE_PTS),
    [selectedIdx, uDomain],
  );

  const handleXChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setX(Number(e.target.value));
  }, []);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const leftW = (innerW - GAP) / 2;
      const rightW = (innerW - GAP) / 2;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // ── Left panel: inner function g(x) ──────────────────────

      const leftG = g.append('g');

      // Scales for left panel
      const xScaleL = d3.scaleLinear().domain(preset.domain).range([0, leftW]);
      const yExtentL = d3.extent(innerCurveData, (d) => d.y) as [number, number];
      const yPadL = (yExtentL[1] - yExtentL[0]) * 0.12 || 0.5;
      const yScaleL = d3
        .scaleLinear()
        .domain([yExtentL[0] - yPadL, yExtentL[1] + yPadL])
        .range([innerH, 0]);

      // Inner function curve
      const lineL = d3.line<{ x: number; y: number }>()
        .x((d) => xScaleL(d.x))
        .y((d) => yScaleL(d.y))
        .defined((d) => isFinite(d.y));

      leftG
        .append('path')
        .datum(innerCurveData)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2)
        .attr('d', lineL);

      // Tangent line at x for g
      const tangentG = computeTangent(preset.inner, preset.innerPrime, clampedX);
      const tangentExtent = 0.6;
      const tgX1 = clampedX - tangentExtent;
      const tgX2 = clampedX + tangentExtent;
      const tgY1 = tangentLineAt(tangentG, tgX1);
      const tgY2 = tangentLineAt(tangentG, tgX2);

      leftG
        .append('line')
        .attr('x1', xScaleL(tgX1))
        .attr('y1', yScaleL(tgY1))
        .attr('x2', xScaleL(tgX2))
        .attr('y2', yScaleL(tgY2))
        .style('stroke', functionColors[1])
        .style('stroke-dasharray', '6,4')
        .style('stroke-width', 2);

      // Point (x, g(x))
      leftG
        .append('circle')
        .attr('cx', xScaleL(clampedX))
        .attr('cy', yScaleL(gx))
        .attr('r', 5)
        .style('fill', functionColors[2])
        .style('stroke', '#fff')
        .style('stroke-width', 1.5);

      // Horizontal dashed line from (x, g(x)) to right edge, showing output passed to f
      leftG
        .append('line')
        .attr('x1', xScaleL(clampedX))
        .attr('y1', yScaleL(gx))
        .attr('x2', leftW)
        .attr('y2', yScaleL(gx))
        .style('stroke', functionColors[2])
        .style('stroke-dasharray', '4,3')
        .style('stroke-width', 1.5)
        .style('opacity', 0.6);

      // Title
      leftG
        .append('text')
        .attr('x', leftW / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text)')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .text(preset.innerLabel);

      // Axes for left panel
      leftG
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScaleL).ticks(5))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      leftG
        .append('g')
        .call(d3.axisLeft(yScaleL).ticks(5))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      // x-axis label
      leftG
        .append('text')
        .attr('x', leftW / 2)
        .attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('x');

      // ── Right panel: outer function f(u) ─────────────────────

      const rightG = g.append('g').attr('transform', `translate(${leftW + GAP},0)`);

      // Scales for right panel
      const xScaleR = d3.scaleLinear().domain(uDomain).range([0, rightW]);
      const yExtentR = d3.extent(outerCurveData, (d) => d.y) as [number, number];
      const yPadR = (yExtentR[1] - yExtentR[0]) * 0.12 || 0.5;
      const yScaleR = d3
        .scaleLinear()
        .domain([yExtentR[0] - yPadR, yExtentR[1] + yPadR])
        .range([innerH, 0]);

      // Outer function curve
      const lineR = d3.line<{ x: number; y: number }>()
        .x((d) => xScaleR(d.x))
        .y((d) => yScaleR(d.y))
        .defined((d) => isFinite(d.y));

      rightG
        .append('path')
        .datum(outerCurveData)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2)
        .attr('d', lineR);

      // Tangent line at u = g(x) for f
      const tangentF = computeTangent(preset.outer, preset.outerPrime, gx);
      const tangentExtentR = (uDomain[1] - uDomain[0]) * 0.1;
      const tfU1 = gx - tangentExtentR;
      const tfU2 = gx + tangentExtentR;
      const tfY1 = tangentLineAt(tangentF, tfU1);
      const tfY2 = tangentLineAt(tangentF, tfU2);

      rightG
        .append('line')
        .attr('x1', xScaleR(tfU1))
        .attr('y1', yScaleR(tfY1))
        .attr('x2', xScaleR(tfU2))
        .attr('y2', yScaleR(tfY2))
        .style('stroke', functionColors[1])
        .style('stroke-dasharray', '6,4')
        .style('stroke-width', 2);

      // Point (g(x), f(g(x)))
      rightG
        .append('circle')
        .attr('cx', xScaleR(gx))
        .attr('cy', yScaleR(fgx))
        .attr('r', 5)
        .style('fill', functionColors[2])
        .style('stroke', '#fff')
        .style('stroke-width', 1.5);

      // Title
      rightG
        .append('text')
        .attr('x', rightW / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text)')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .text(preset.outerLabel);

      // Axes for right panel
      rightG
        .append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScaleR).ticks(5))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      rightG
        .append('g')
        .call(d3.axisLeft(yScaleR).ticks(5))
        .call((a) => {
          a.select('.domain').style('stroke', 'var(--color-border)');
          a.selectAll('.tick line').style('stroke', 'var(--color-border)');
          a.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      // u-axis label
      rightG
        .append('text')
        .attr('x', rightW / 2)
        .attr('y', innerH + 35)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('u');

      // ── Flow arrow: left panel output → right panel input ────

      const arrowStartX = leftW + 4;
      const arrowStartY = yScaleL(gx);
      const arrowEndX = leftW + GAP - 4;
      // Map g(x) into right panel's y position
      const arrowEndY = yScaleR(fgx);
      // Use midpoint Y for a gentle curve
      const arrowMidX = (arrowStartX + arrowEndX) / 2;
      const arrowMidY = Math.min(arrowStartY, arrowEndY) - 20;

      const arrowPath = `M ${arrowStartX},${arrowStartY} Q ${arrowMidX},${arrowMidY} ${arrowEndX},${arrowEndY}`;

      // Arrow marker definition
      svg
        .append('defs')
        .append('marker')
        .attr('id', 'chain-arrow')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 8)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .style('fill', functionColors[2]);

      g.append('path')
        .attr('d', arrowPath)
        .attr('fill', 'none')
        .style('stroke', functionColors[2])
        .style('stroke-width', 2)
        .style('opacity', 0.7)
        .attr('marker-end', 'url(#chain-arrow)');

      // Label on the arrow: "g(x)"
      g.append('text')
        .attr('x', arrowMidX)
        .attr('y', arrowMidY - 4)
        .attr('text-anchor', 'middle')
        .style('fill', functionColors[2])
        .style('font-size', '11px')
        .style('font-weight', '600')
        .text(`g(x) = ${gx.toFixed(2)}`);
    },
    [innerCurveData, outerCurveData, width, height, clampedX, selectedIdx, gx, fgx, gPrime, fPrime, uDomain],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Composition:
          <select
            value={selectedIdx}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setSelectedIdx(idx);
              const p = presets[idx];
              setX((p.domain[0] + p.domain[1]) / 2);
            }}
            className="ml-2 px-2 py-1 rounded text-sm"
            style={{
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {presets.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          x = {clampedX.toFixed(2)}
          <input
            type="range"
            min={domainMin}
            max={domainMax}
            step={0.01}
            value={clampedX}
            onChange={handleXChange}
            className="ml-2 w-36"
          />
        </label>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div
        className="mt-3 p-3 rounded text-sm leading-relaxed"
        style={{
          background: 'var(--color-surface-alt)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
        }}
      >
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>
            <span style={{ color: functionColors[2], fontWeight: 600 }}>g&prime;(x)</span>
            {' = '}
            <span style={{ color: functionColors[2] }}>{gPrime.toFixed(4)}</span>
          </span>
          <span>
            <span style={{ color: functionColors[1], fontWeight: 600 }}>f&prime;(g(x))</span>
            {' = '}
            <span style={{ color: functionColors[1] }}>{fPrime.toFixed(4)}</span>
          </span>
          <span style={{ fontWeight: 600 }}>
            <span style={{ color: functionColors[0] }}>(f &#8728; g)&prime;(x)</span>
            {' = '}
            <span style={{ color: functionColors[1] }}>f&prime;(g(x))</span>
            {' \u00B7 '}
            <span style={{ color: functionColors[2] }}>g&prime;(x)</span>
            {' = '}
            <span style={{ color: functionColors[0] }}>{composedDerivative.toFixed(4)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
