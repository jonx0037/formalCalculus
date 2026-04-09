/**
 * EigenvalueExplorer — viz for variational characterization of eigenvalues.
 *
 * Visualizes the Rayleigh quotient R[u] = ∫u'²/∫u² for −u'' = λu on [0,π]:
 *  - Left panel: trial function (draggable) vs eigenfunction sin(nx)
 *  - Right panel: Rayleigh quotient value + eigenvalue spectrum bar chart
 *
 * Controls: mode selector n=1..4, trial function drag, "Show eigenfunction" toggle,
 *           "Show spectrum" toggle.
 */

import { useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import { sampleCurve, finiteYMax } from './shared/plotting';
import type { Point2D } from './shared/plotting';
import { computeRayleighQuotientDiscrete } from './shared/functional-analysis';
import { getEigenvalueData, computeRayleighQuotient } from '../../data/calculus-of-variations-data';

// ── Constants ─────────────────────────────────────────────────

const BLUE = '#2563EB';
const GREEN = '#059669';
const RED = '#DC2626';
const ORANGE = '#F97316';
const MUTED = '#6b7280';
const SPECTRUM_COLORS = [BLUE, RED, GREEN, ORANGE];

const margin = { top: 20, right: 16, bottom: 36, left: 48 };

// ── Component ─────────────────────────────────────────────────

export default function EigenvalueExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const width = containerWidth || 700;
  const height = Math.min(width * 0.55, 380);

  const [mode, setMode] = useState(1);
  const [showEigenfunction, setShowEigenfunction] = useState(true);
  const [showSpectrum, setShowSpectrum] = useState(true);
  // Trial function control points (coefficients for sin basis)
  const [trialCoeffs, setTrialCoeffs] = useState<number[]>([1.0, 0.0, 0.0, 0.0]);

  const eigenData = useMemo(() => getEigenvalueData(4), []);
  const currentEigen = eigenData[mode - 1];

  // Build trial function from coefficients
  const trialFn = useCallback(
    (x: number): number => {
      let val = 0;
      for (let k = 0; k < trialCoeffs.length; k++) {
        val += trialCoeffs[k] * Math.sin((k + 1) * x);
      }
      return val;
    },
    [trialCoeffs],
  );

  const trialDerivFn = useCallback(
    (x: number): number => {
      let val = 0;
      for (let k = 0; k < trialCoeffs.length; k++) {
        val += trialCoeffs[k] * (k + 1) * Math.cos((k + 1) * x);
      }
      return val;
    },
    [trialCoeffs],
  );

  // Compute Rayleigh quotients
  const rayleighTrial = useMemo(
    () => computeRayleighQuotient(trialFn, trialDerivFn, 0, Math.PI),
    [trialFn, trialDerivFn],
  );

  const rayleighExact = currentEigen.exactEigenvalue;

  // Sample curves
  const domain: [number, number] = [0, Math.PI];
  const trialPts = useMemo(() => sampleCurve(trialFn, domain), [trialFn]);
  const eigenPts = useMemo(
    () => (showEigenfunction ? sampleCurve(currentEigen.eigenfunction, domain) : []),
    [showEigenfunction, currentEigen],
  );
  const yMax = useMemo(
    () => finiteYMax([trialPts, eigenPts], 0.5, 1.2),
    [trialPts, eigenPts],
  );

  // ── D3 rendering ────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const splitRatio = showSpectrum ? 0.6 : 1.0;
      const leftW = width * splitRatio - margin.left - margin.right;
      const rightW = showSpectrum ? width * (1 - splitRatio) - margin.right - 16 : 0;
      const panelH = height - margin.top - margin.bottom;

      // ── Left panel: functions ──────────────────────────────
      const gLeft = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain([0, Math.PI]).range([0, leftW]);
      const yScale = d3.scaleLinear().domain([-yMax, yMax]).range([panelH, 0]);

      gLeft
        .append('g')
        .attr('transform', `translate(0,${panelH})`)
        .call(
          d3
            .axisBottom(xScale)
            .tickValues([0, Math.PI / 2, Math.PI])
            .tickFormat((d) => {
              const v = d as number;
              if (Math.abs(v) < 1e-10) return '0';
              if (Math.abs(v - Math.PI / 2) < 1e-10) return 'π/2';
              return 'π';
            }),
        )
        .selectAll('text')
        .style('font-size', '11px');
      gLeft
        .append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('font-size', '11px');

      // Zero line
      gLeft
        .append('line')
        .attr('x1', 0)
        .attr('y1', yScale(0))
        .attr('x2', leftW)
        .attr('y2', yScale(0))
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1);

      const line = d3
        .line<Point2D>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]))
        .defined((d) => Number.isFinite(d[1]));

      // Eigenfunction
      if (eigenPts.length > 0) {
        gLeft
          .append('path')
          .datum(eigenPts)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', GREEN)
          .attr('stroke-width', 2.5)
          .attr('opacity', 0.7);
      }

      // Trial function
      gLeft
        .append('path')
        .datum(trialPts)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', BLUE)
        .attr('stroke-width', 2.5);

      // Rayleigh quotient annotation
      gLeft
        .append('text')
        .attr('x', leftW / 2)
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('fill', RED)
        .style('font-weight', '600')
        .text(`R[u] = ${rayleighTrial.toFixed(4)} ≥ λ₁ = ${eigenData[0].exactEigenvalue}`);

      // Legend
      const legendItems = [
        { label: 'Trial u(x)', color: BLUE },
        ...(showEigenfunction
          ? [{ label: `sin(${mode}x)`, color: GREEN }]
          : []),
      ];
      legendItems.forEach((item, i) => {
        const lx = leftW - 90;
        const ly = panelH - 10 - (legendItems.length - 1 - i) * 18;
        gLeft
          .append('line')
          .attr('x1', lx)
          .attr('y1', ly)
          .attr('x2', lx + 20)
          .attr('y2', ly)
          .attr('stroke', item.color)
          .attr('stroke-width', 2);
        gLeft
          .append('text')
          .attr('x', lx + 25)
          .attr('y', ly + 4)
          .style('font-size', '11px')
          .style('fill', item.color)
          .text(item.label);
      });

      // ── Right panel: spectrum ──────────────────────────────
      if (showSpectrum && rightW > 40) {
        const gRight = svg
          .append('g')
          .attr(
            'transform',
            `translate(${width * splitRatio + 8},${margin.top})`,
          );

        const maxEigen = eigenData[eigenData.length - 1].exactEigenvalue;
        const barW = rightW / (eigenData.length * 2);

        const lambdaScale = d3
          .scaleLinear()
          .domain([0, maxEigen * 1.1])
          .range([panelH, 0]);

        gRight
          .append('g')
          .call(d3.axisLeft(lambdaScale).ticks(4))
          .selectAll('text')
          .style('font-size', '10px');

        gRight
          .append('text')
          .attr('x', rightW / 2)
          .attr('y', -6)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '600')
          .style('fill', MUTED)
          .text('Spectrum');

        eigenData.forEach((ed, i) => {
          const bx = (i * 2 + 0.5) * barW;
          const barH = panelH - lambdaScale(ed.exactEigenvalue);
          const isActive = ed.n === mode;

          gRight
            .append('rect')
            .attr('x', bx)
            .attr('y', lambdaScale(ed.exactEigenvalue))
            .attr('width', barW)
            .attr('height', barH)
            .attr('fill', SPECTRUM_COLORS[i % SPECTRUM_COLORS.length])
            .attr('opacity', isActive ? 1 : 0.4)
            .attr('rx', 2);

          gRight
            .append('text')
            .attr('x', bx + barW / 2)
            .attr('y', panelH + 14)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', MUTED)
            .text(`λ${ed.n}`);

          gRight
            .append('text')
            .attr('x', bx + barW / 2)
            .attr('y', lambdaScale(ed.exactEigenvalue) - 4)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', SPECTRUM_COLORS[i % SPECTRUM_COLORS.length])
            .text(ed.exactEigenvalue.toString());
        });

        // Rayleigh quotient marker
        if (rayleighTrial <= maxEigen * 1.1) {
          gRight
            .append('line')
            .attr('x1', 0)
            .attr('y1', lambdaScale(rayleighTrial))
            .attr('x2', rightW)
            .attr('y2', lambdaScale(rayleighTrial))
            .attr('stroke', RED)
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4,4');
          gRight
            .append('text')
            .attr('x', rightW + 2)
            .attr('y', lambdaScale(rayleighTrial) + 4)
            .style('font-size', '9px')
            .style('fill', RED)
            .text('R[u]');
        }
      }
    },
    [
      width,
      height,
      trialPts,
      eigenPts,
      showEigenfunction,
      showSpectrum,
      rayleighTrial,
      mode,
      yMax,
      eigenData,
    ],
  );

  return (
    <div ref={containerRef} className="w-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="font-medium text-gray-700 dark:text-gray-300">Mode n:</span>
          <select
            value={mode}
            onChange={(e) => setMode(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                n = {n} (λ = {n * n})
              </option>
            ))}
          </select>
        </label>

        {/* Trial function coefficients */}
        {trialCoeffs.map((c, k) => (
          <label key={k} className="flex items-center gap-1">
            <span className="text-gray-500 text-xs">c{k + 1}:</span>
            <input
              type="range"
              min={-1.5}
              max={1.5}
              step={0.05}
              value={c}
              onChange={(e) => {
                const newCoeffs = [...trialCoeffs];
                newCoeffs[k] = Number(e.target.value);
                setTrialCoeffs(newCoeffs);
              }}
              className="w-16"
            />
            <span className="font-mono text-xs w-8">{c.toFixed(1)}</span>
          </label>
        ))}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showEigenfunction}
            onChange={(e) => setShowEigenfunction(e.target.checked)}
          />
          <span className="text-gray-600 dark:text-gray-400">Eigenfunction</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSpectrum}
            onChange={(e) => setShowSpectrum(e.target.checked)}
          />
          <span className="text-gray-600 dark:text-gray-400">Spectrum</span>
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} className="overflow-visible" />

      {/* Info panel */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <span className="text-gray-500 dark:text-gray-400">R[u] = </span>
          <span className="font-mono font-medium" style={{ color: RED }}>
            {rayleighTrial.toFixed(4)}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">λ_{mode} = </span>
          <span className="font-mono font-medium" style={{ color: GREEN }}>
            {rayleighExact}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Error = </span>
          <span className="font-mono font-medium" style={{ color: MUTED }}>
            {((rayleighTrial / rayleighExact - 1) * 100).toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">R[u] ≥ λ₁ = </span>
          <span className="font-mono font-medium" style={{ color: BLUE }}>
            {rayleighTrial >= 1 - 0.01 ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    </div>
  );
}
