import { useState, useMemo, useCallback, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { generateCurve, computeTaylorPolynomial, evaluateTaylorPolynomial } from './shared/differentiation';
import { getTaylorFunctionPresets } from '../../data/mean-value-taylor-data';
import { functionColors } from './shared/colorScales';

const presets = getTaylorFunctionPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const SAMPLE_PTS = 500;
const GAP = 40;

export default function TaylorPolynomialExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [degree, setDegree] = useState(1);
  const [center, setCenter] = useState(presets[0].defaultCenter);
  const [showError, setShowError] = useState(false);
  const [playing, setPlaying] = useState(false);

  const preset = presets[selectedIdx];
  const maxDegree = Math.min(15, preset.derivatives.length - 1);

  // Reset state when preset changes
  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setCenter(presets[idx].defaultCenter);
    setDegree(1);
    setPlaying(false);
  }, []);

  // Animation effect
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setDegree((d) => {
        const next = d + 1;
        if (next >= maxDegree) {
          setPlaying(false);
          return maxDegree;
        }
        return next;
      });
    }, 150);
    return () => clearInterval(id);
  }, [playing, maxDegree]);

  // Generate function curve data
  const curveData = useMemo(() => {
    return generateCurve(preset.fn, preset.domain[0], preset.domain[1], SAMPLE_PTS);
  }, [selectedIdx]);

  // Compute Taylor polynomial and generate its curve
  const taylorCurveData = useMemo(() => {
    const poly = computeTaylorPolynomial(preset.derivatives, center, degree);
    const [xMin, xMax] = preset.domain;
    const dx = (xMax - xMin) / (SAMPLE_PTS - 1);
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < SAMPLE_PTS; i++) {
      const x = xMin + i * dx;
      const y = evaluateTaylorPolynomial(poly, x);
      pts.push({ x, y });
    }
    return pts;
  }, [selectedIdx, degree, center]);

  // Error data: |f(x) - T_n(x)|
  const errorData = useMemo(() => {
    const poly = computeTaylorPolynomial(preset.derivatives, center, degree);
    const [xMin, xMax] = preset.domain;
    const dx = (xMax - xMin) / (SAMPLE_PTS - 1);
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < SAMPLE_PTS; i++) {
      const x = xMin + i * dx;
      const fx = preset.fn(x);
      const tx = evaluateTaylorPolynomial(poly, x);
      const err = Math.abs(fx - tx);
      if (isFinite(err) && isFinite(fx) && isFinite(tx)) {
        pts.push({ x, y: err });
      }
    }
    return pts;
  }, [selectedIdx, degree, center]);

  // Compute max error for readout
  const maxError = useMemo(() => {
    if (errorData.length === 0) return 0;
    return d3.max(errorData, (d) => d.y) ?? 0;
  }, [errorData]);

  // Layout dimensions
  const topHeight = Math.min(width * 0.5, 360);
  const bottomHeight = showError ? Math.min(width * 0.3, 200) : 0;
  const totalHeight = topHeight + (showError ? GAP + bottomHeight : 0);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || topHeight <= 0) return;

      const innerW = width - margin.left - margin.right;
      const topInnerH = topHeight - margin.top - margin.bottom;

      // ── Y-range from original function (for clipping Taylor) ──
      const yExtent = d3.extent(curveData, (d) => d.y);
      if (yExtent[0] === undefined || yExtent[1] === undefined) return;
      const yRange = yExtent[1] - yExtent[0];
      const yPad = yRange * 0.15 || 0.5;
      const yMin = yExtent[0] - yPad;
      const yMax = yExtent[1] + yPad;

      const xScale = d3.scaleLinear().domain(preset.domain).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([yMin, yMax]).range([topInnerH, 0]);

      // ── Defs: clip path ──
      const defs = svg.append('defs');
      defs.append('clipPath')
        .attr('id', 'taylor-clip-top')
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', innerW)
        .attr('height', topInnerH);

      // ── Top panel group ──
      const topG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const clippedG = topG.append('g').attr('clip-path', 'url(#taylor-clip-top)');

      // Vertical dashed line at center
      clippedG.append('line')
        .attr('x1', xScale(center))
        .attr('x2', xScale(center))
        .attr('y1', 0)
        .attr('y2', topInnerH)
        .style('stroke', 'var(--color-border)')
        .style('stroke-dasharray', '4,3')
        .style('stroke-width', 1)
        .style('opacity', 0.6);

      // Function curve f(x)
      const fLine = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .defined((d) => isFinite(d.y));

      clippedG.append('path')
        .datum(curveData)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2)
        .attr('d', fLine);

      // Taylor polynomial curve T_n(x) — clip to reasonable y-range
      const taylorLine = d3.line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .defined((d) => isFinite(d.y) && d.y >= yMin && d.y <= yMax);

      clippedG.append('path')
        .datum(taylorCurveData)
        .attr('fill', 'none')
        .attr('stroke', functionColors[1])
        .attr('stroke-width', 2)
        .attr('d', taylorLine);

      // Center marker
      const fc = preset.fn(center);
      if (isFinite(fc)) {
        clippedG.append('circle')
          .attr('cx', xScale(center))
          .attr('cy', yScale(fc))
          .attr('r', 5)
          .style('fill', functionColors[2])
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      }

      // Top panel axes
      topG.append('g')
        .attr('transform', `translate(0,${topInnerH})`)
        .call(d3.axisBottom(xScale).ticks(Math.min(8, Math.floor(innerW / 60))))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      topG.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      // Axis labels
      topG.append('text')
        .attr('x', innerW / 2)
        .attr('y', topInnerH + 35)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('x');

      topG.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -topInnerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('y');

      // ── Bottom panel: error plot (log scale) ──
      if (!showError) return;

      const botInnerH = bottomHeight - margin.top - margin.bottom;
      if (botInnerH <= 0) return;

      defs.append('clipPath')
        .attr('id', 'taylor-clip-bot')
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', innerW)
        .attr('height', botInnerH);

      const botOffset = topHeight + GAP;
      const botG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${botOffset})`);

      const clippedBotG = botG.append('g').attr('clip-path', 'url(#taylor-clip-bot)');

      // Filter out zero errors for log scale
      const errorFiltered = errorData
        .filter((d) => d.y > 0)
        .map((d) => ({ x: d.x, y: Math.max(1e-16, d.y) }));

      if (errorFiltered.length === 0) return;

      const errExtent = d3.extent(errorFiltered, (d) => d.y);
      if (errExtent[0] === undefined || errExtent[1] === undefined) return;
      const errMin = Math.max(1e-16, errExtent[0] * 0.1);
      const errMax = errExtent[1] * 10;

      const exScale = d3.scaleLinear().domain(preset.domain).range([0, innerW]);
      const eyScale = d3.scaleLog().domain([errMin, errMax]).range([botInnerH, 0]).clamp(true);

      // Error curve
      const errLine = d3.line<{ x: number; y: number }>()
        .x((d) => exScale(d.x))
        .y((d) => eyScale(d.y))
        .defined((d) => isFinite(d.y) && d.y > 0);

      clippedBotG.append('path')
        .datum(errorFiltered)
        .attr('fill', 'none')
        .attr('stroke', functionColors[1])
        .attr('stroke-width', 1.5)
        .attr('d', errLine);

      // Bottom panel axes
      botG.append('g')
        .attr('transform', `translate(0,${botInnerH})`)
        .call(d3.axisBottom(exScale).ticks(Math.min(8, Math.floor(innerW / 60))))
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      botG.append('g')
        .call(
          d3.axisLeft(eyScale)
            .ticks(4, '~e')
        )
        .call((ax) => {
          ax.select('.domain').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick line').style('stroke', 'var(--color-border)');
          ax.selectAll('.tick text').style('fill', 'var(--color-text-muted)').style('font-size', '11px');
        });

      // Bottom axis labels
      botG.append('text')
        .attr('x', innerW / 2)
        .attr('y', botInnerH + 35)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('x');

      botG.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -botInnerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('|f(x) \u2212 T\u2099(x)|');
    },
    [curveData, taylorCurveData, errorData, width, topHeight, bottomHeight, showError, center, selectedIdx, degree],
  );

  const handleDegreeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setDegree(Number(e.target.value));
  }, []);

  const handleCenterChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setCenter(Number(e.target.value));
  }, []);

  const handleAnimate = useCallback(() => {
    setPlaying((p) => {
      if (!p) {
        // If at max, reset to 1 before starting
        setDegree((d) => (d >= maxDegree ? 1 : d));
        return true;
      }
      return false;
    });
  }, [maxDegree]);

  const centerStep = (preset.domain[1] - preset.domain[0]) / 200;
  const errorStr = maxError < 1e-10 ? maxError.toExponential(2) : maxError.toFixed(6);

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Function:
          <select
            value={selectedIdx}
            onChange={handlePresetChange}
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
          Degree n = {degree}
          <input
            type="range"
            min={1}
            max={maxDegree}
            step={1}
            value={degree}
            onChange={handleDegreeChange}
            className="ml-2 w-28"
          />
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Center a = {center.toFixed(2)}
          <input
            type="range"
            min={preset.domain[0]}
            max={preset.domain[1]}
            step={centerStep}
            value={center}
            onChange={handleCenterChange}
            className="ml-2 w-28"
          />
        </label>

        <label className="text-sm flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
          <input
            type="checkbox"
            checked={showError}
            onChange={(e) => setShowError(e.target.checked)}
          />
          Show error
        </label>

        <button
          onClick={handleAnimate}
          className="px-3 py-1 rounded text-xs font-medium"
          style={{
            background: playing ? 'var(--color-primary)' : 'var(--color-surface-alt)',
            color: playing ? '#fff' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          {playing ? '\u23F8 Pause' : '\u25B6 Animate'}
        </button>
      </div>

      {/* SVG chart */}
      <svg ref={svgRef} width={width} height={totalHeight} />

      {/* Readout */}
      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span style={{ color: functionColors[0] }}>{'\u2501'}</span> f(x)
        </span>
        <span>
          <span style={{ color: functionColors[1] }}>{'\u2501'}</span> T<sub>{degree}</sub>(x)
        </span>
        <span>
          <span style={{ color: functionColors[2] }}>{'\u25CF'}</span> Center (a = {center.toFixed(2)})
        </span>
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>
          n = {degree} · max |error| = {errorStr}
        </span>
      </div>
    </div>
  );
}
