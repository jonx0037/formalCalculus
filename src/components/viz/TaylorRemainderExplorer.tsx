import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { computeTaylorPolynomial, evaluateTaylorPolynomial } from './shared/differentiation';
import { getTaylorFunctionPresets } from '../../data/mean-value-taylor-data';
import { functionColors, convergenceColors, regionColors } from './shared/colorScales';

const presets = getTaylorFunctionPresets();
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const NUM_SAMPLES = 500;

type ShowMode = 'actual' | 'bound' | 'both';

export default function TaylorRemainderExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.6, 460);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [degree, setDegree] = useState(1);
  const [showMode, setShowMode] = useState<ShowMode>('actual');

  const preset = presets[selectedIdx];
  const center = preset.defaultCenter;
  const hasBound = preset.maxDerivBound != null;

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setDegree(1);
    setShowMode('actual');
  }, []);

  const handleDegreeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setDegree(Number(e.target.value));
  }, []);

  // Compute error data
  const { errorData, boundData, maxError, maxBound, boundAtEdge, ratio } = useMemo(() => {
    const [xMin, xMax] = preset.domain;
    const dx = (xMax - xMin) / (NUM_SAMPLES - 1);
    const poly = computeTaylorPolynomial(preset.derivatives, center, degree);

    // Precompute (n+1)!
    let factorial = 1;
    for (let k = 1; k <= degree + 1; k++) factorial *= k;

    const errPts: { x: number; y: number }[] = [];
    const bndPts: { x: number; y: number }[] = [];
    let mxErr = 1e-16;
    let mxBnd = 1e-16;

    for (let i = 0; i < NUM_SAMPLES; i++) {
      const x = xMin + i * dx;
      const err = Math.max(1e-16, Math.abs(preset.fn(x) - evaluateTaylorPolynomial(poly, x)));
      errPts.push({ x, y: err });
      if (err > mxErr) mxErr = err;

      if (hasBound) {
        const M = preset.maxDerivBound!(center, x, degree);
        const bnd = Math.max(1e-16, (M * Math.pow(Math.abs(x - center), degree + 1)) / factorial);
        bndPts.push({ x, y: bnd });
        if (bnd > mxBnd) mxBnd = bnd;
      }
    }

    // Bound at domain edge (max distance from center)
    const edgeDist = Math.max(Math.abs(xMin - center), Math.abs(xMax - center));
    let bndEdge = 0;
    if (hasBound) {
      const Medge = preset.maxDerivBound!(center, center + edgeDist, degree);
      bndEdge = (Medge * Math.pow(edgeDist, degree + 1)) / factorial;
    }

    const r = hasBound && bndEdge > 0 ? mxErr / bndEdge : NaN;

    return { errorData: errPts, boundData: bndPts, maxError: mxErr, maxBound: mxBnd, boundAtEdge: bndEdge, ratio: r };
  }, [preset, center, degree, hasBound]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width === 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      if (innerW <= 0 || innerH <= 0) return;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const [xMin, xMax] = preset.domain;
      const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);

      const yMax = Math.max(maxError, hasBound ? maxBound : 0, 1e-10);
      const yScale = d3.scaleLog().domain([1e-16, yMax * 2]).range([innerH, 0]).clamp(true);

      // Grid lines
      const yTicks = yScale.ticks(10);
      g.selectAll('.grid-line')
        .data(yTicks)
        .join('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', (d) => yScale(d))
        .attr('y2', (d) => yScale(d))
        .style('stroke', 'var(--color-border)')
        .style('stroke-opacity', 0.4)
        .style('stroke-dasharray', '2,3');

      // Axes
      const xAxis = d3.axisBottom(xScale).ticks(8);
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(xAxis)
        .style('color', 'var(--color-text-muted)');

      const yAxis = d3.axisLeft(yScale).ticks(6, d3.format('.0e'));
      g.append('g').call(yAxis).style('color', 'var(--color-text-muted)');

      // Center vertical line
      g.append('line')
        .attr('x1', xScale(center))
        .attr('x2', xScale(center))
        .attr('y1', 0)
        .attr('y2', innerH)
        .style('stroke', 'var(--color-text-muted)')
        .style('stroke-dasharray', '4,4')
        .style('stroke-opacity', 0.6);

      g.append('text')
        .attr('x', xScale(center) + 5)
        .attr('y', 12)
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '11px')
        .text(`a = ${center}`);

      // Line generators
      const errorLine = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .defined((d) => d.y > 0);

      const boundLine = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .defined((d) => d.y > 0);

      // Shaded region between curves (if both mode)
      if (showMode === 'both' && hasBound && errorData.length === boundData.length) {
        const area = d3
          .area<number>()
          .x((_, i) => xScale(errorData[i].x))
          .y0((_, i) => yScale(errorData[i].y))
          .y1((_, i) => yScale(boundData[i].y))
          .defined((_, i) => errorData[i].y > 0 && boundData[i].y > 0);

        g.append('path')
          .datum(d3.range(errorData.length))
          .attr('d', area)
          .attr('fill', regionColors.errorFill)
          .attr('fill-opacity', 0.15);
      }

      // Actual error curve
      if (showMode === 'actual' || showMode === 'both') {
        g.append('path')
          .datum(errorData)
          .attr('d', errorLine)
          .attr('fill', 'none')
          .attr('stroke', functionColors[1])
          .attr('stroke-width', 2);
      }

      // Lagrange bound curve
      if ((showMode === 'bound' || showMode === 'both') && hasBound) {
        g.append('path')
          .datum(boundData)
          .attr('d', boundLine)
          .attr('fill', 'none')
          .attr('stroke', convergenceColors.quadratic)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '6,4');
      }

      // Legend
      const legend = g.append('g').attr('transform', `translate(${innerW - 160}, 5)`);
      let ly = 0;

      if (showMode === 'actual' || showMode === 'both') {
        legend.append('line').attr('x1', 0).attr('x2', 20).attr('y1', ly).attr('y2', ly).attr('stroke', functionColors[1]).attr('stroke-width', 2);
        legend.append('text').attr('x', 25).attr('y', ly + 4).style('fill', 'var(--color-text)').style('font-size', '11px').text('|f(x) − Tₙ(x)|');
        ly += 16;
      }
      if ((showMode === 'bound' || showMode === 'both') && hasBound) {
        legend.append('line').attr('x1', 0).attr('x2', 20).attr('y1', ly).attr('y2', ly).attr('stroke', convergenceColors.quadratic).attr('stroke-width', 1.5).attr('stroke-dasharray', '6,4');
        legend.append('text').attr('x', 25).attr('y', ly + 4).style('fill', 'var(--color-text)').style('font-size', '11px').text('Lagrange bound');
      }
    },
    [width, height, preset, center, degree, showMode, errorData, boundData, maxError, maxBound, hasBound],
  );

  return (
    <div ref={containerRef} className="w-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-2" style={{ color: 'var(--color-text)' }}>
        <label className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text)' }}>
          Function:
          <select value={selectedIdx} onChange={handlePresetChange} className="text-sm rounded px-2 py-1" style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
            {presets.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text)' }}>
          Degree n = {degree}
          <input type="range" min={1} max={15} step={1} value={degree} onChange={handleDegreeChange} className="w-24" />
        </label>

        <div className="flex items-center gap-0.5 text-sm">
          <span className="mr-1" style={{ color: 'var(--color-text)' }}>Show:</span>
          {(['actual', 'bound', 'both'] as const).map((mode) => {
            const disabled = mode !== 'actual' && !hasBound;
            return (
              <button
                key={mode}
                onClick={() => !disabled && setShowMode(mode)}
                disabled={disabled}
                className="px-2 py-1 text-xs rounded"
                style={{
                  background: showMode === mode ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                  color: disabled ? 'var(--color-text-muted)' : showMode === mode ? '#fff' : 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {mode === 'actual' ? 'Actual error' : mode === 'bound' ? 'Lagrange bound' : 'Both'}
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} style={{ overflow: 'visible' }} />

      {/* Readout */}
      <div className="flex flex-wrap gap-4 mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          Max actual error: <strong style={{ color: functionColors[1] }}>{maxError.toExponential(2)}</strong>
        </span>
        {hasBound && (
          <span>
            Lagrange bound (edge): <strong style={{ color: convergenceColors.quadratic }}>{boundAtEdge.toExponential(2)}</strong>
          </span>
        )}
        {hasBound && isFinite(ratio) && (
          <span>
            Ratio (actual / bound): <strong style={{ color: 'var(--color-text)' }}>{ratio < 0.001 ? ratio.toExponential(2) : ratio.toFixed(4)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
