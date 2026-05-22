/**
 * RayleighQuotientExplorer — Topic 34 §§8-9.
 *
 * Two-panel viz:
 *   - Left:  unit circle with a draggable probe vector x(θ) and the
 *            eigenvector lines drawn through the origin
 *   - Right: R_A(x(θ)) = x^T A x / x^T x plotted as a function of θ on
 *            [0, 2π), with horizontal dashed lines at λ_max and λ_min
 *
 * Dragging the probe around the unit circle updates the right panel's
 * "current" marker in real time. The peaks of R_A(θ) coincide with the
 * eigenvector angles and the peak values are λ_max / λ_min.
 *
 * Optional "constrain to subspace" toggle (Courant-Fischer §9): rotate
 * a 1-dimensional subspace and observe the constrained max-min behavior.
 */

import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import {
  isSymmetric,
  quadraticForm,
  rayleighQuotient,
  spectralDecompositionSymmetric,
  type Matrix,
} from './shared/linearAlgebra';
import {
  getRayleighPresets,
  type RayleighPreset,
} from '../../data/eigenvalues-eigenvectors-data';

const LEFT_SVG_SIZE = 320;
const RIGHT_SVG_WIDTH = 340;
const RIGHT_SVG_HEIGHT = 260;
const margin = { top: 18, right: 18, bottom: 32, left: 42 };
const COLOR_EIGEN_1 = '#2563eb';
const COLOR_EIGEN_2 = '#059669';
const COLOR_PROBE = '#dc2626';
const COLOR_AXIS = '#9ca3af';

function formatNumber(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1e-9) return '0.00';
  return n.toFixed(digits);
}

export interface RayleighQuotientExplorerProps {
  initialMatrix?: [[number, number], [number, number]];
  showCourantFischer?: boolean;
}

export default function RayleighQuotientExplorer({
  initialMatrix = [[5, 0], [0, 1]],
  showCourantFischer: initialShowCF = true,
}: RayleighQuotientExplorerProps = {}) {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const presets = useMemo<RayleighPreset[]>(() => getRayleighPresets(), []);
  const [matrix, setMatrix] = useState<[[number, number], [number, number]]>(initialMatrix);
  const [presetId, setPresetId] = useState<string>('moderate');
  const [probeTheta, setProbeTheta] = useState<number>(0);
  const [showCF, setShowCF] = useState<boolean>(initialShowCF);
  const [subspaceTheta, setSubspaceTheta] = useState<number>(Math.PI / 4);

  // Symmetrize
  const symMatrix: Matrix = useMemo(() => {
    const a = matrix[0][0];
    const b = (matrix[0][1] + matrix[1][0]) / 2;
    const d = matrix[1][1];
    return [[a, b], [b, d]];
  }, [matrix]);

  const wasAsymmetric = !isSymmetric(matrix, 1e-7);

  const spectral = useMemo(() => {
    try {
      return spectralDecompositionSymmetric(symMatrix);
    } catch {
      return null;
    }
  }, [symMatrix]);

  const eigenvalues = useMemo<[number, number]>(
    () => (spectral ? [spectral.Lambda[0][0], spectral.Lambda[1][1]] : [0, 0]),
    [spectral],
  );

  const eigenvectors = useMemo(
    () =>
      spectral
        ? [
            [spectral.Q[0][0], spectral.Q[1][0]] as [number, number],
            [spectral.Q[0][1], spectral.Q[1][1]] as [number, number],
          ]
        : [],
    [spectral],
  );

  // R_A samples on [0, 2π]
  const SAMPLES = 240;
  const rayleighSamples = useMemo(() => {
    const out: { theta: number; value: number }[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const theta = (2 * Math.PI * i) / SAMPLES;
      const x: [number, number] = [Math.cos(theta), Math.sin(theta)];
      out.push({ theta, value: quadraticForm(symMatrix, x) });
    }
    return out;
  }, [symMatrix]);

  const currentRayleigh = useMemo(() => {
    const x: [number, number] = [Math.cos(probeTheta), Math.sin(probeTheta)];
    return rayleighQuotient(symMatrix, x);
  }, [symMatrix, probeTheta]);

  const constrainedMin = useMemo(() => {
    // R_A restricted to the 1D subspace through angle subspaceTheta:
    // any nonzero x = c·(cos α, sin α) gives R_A = const, so the
    // constrained set is just the singleton value. For the 2D ambient
    // case there's nothing to minimize over inside a 1D subspace.
    if (!showCF) return null;
    const x: [number, number] = [Math.cos(subspaceTheta), Math.sin(subspaceTheta)];
    return rayleighQuotient(symMatrix, x);
  }, [showCF, subspaceTheta, symMatrix]);

  const updateEntry = useCallback((row: 0 | 1, col: 0 | 1, value: number) => {
    setMatrix((prev) => {
      const next = prev.map((r) => r.slice()) as [[number, number], [number, number]];
      next[row][col] = value;
      if (row !== col) next[col][row] = value;
      return next;
    });
  }, []);

  const handlePresetChange = useCallback(
    (id: string) => {
      setPresetId(id);
      const p = presets.find((x) => x.id === id);
      if (!p) return;
      setMatrix([[p.matrix[0][0], p.matrix[0][1]], [p.matrix[1][0], p.matrix[1][1]]]);
    },
    [presets],
  );

  // ── Left SVG: unit circle + probe ────────────────────────────
  const leftRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const size = LEFT_SVG_SIZE;
      const innerW = size - margin.left - margin.right;
      const innerH = size - margin.top - margin.bottom;
      const xScale = d3.scaleLinear().domain([-1.5, 1.5]).range([0, innerW]);
      const yScale = d3.scaleLinear().domain([-1.5, 1.5]).range([innerH, 0]);
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Origin axes
      g.append('line').attr('x1', xScale(-1.5)).attr('x2', xScale(1.5)).attr('y1', yScale(0)).attr('y2', yScale(0))
        .style('stroke', COLOR_AXIS).style('opacity', 0.5);
      g.append('line').attr('x1', xScale(0)).attr('x2', xScale(0)).attr('y1', yScale(-1.5)).attr('y2', yScale(1.5))
        .style('stroke', COLOR_AXIS).style('opacity', 0.5);

      // Unit circle
      const circlePts: [number, number][] = [];
      for (let i = 0; i <= 100; i++) {
        const t = (2 * Math.PI * i) / 100;
        circlePts.push([Math.cos(t), Math.sin(t)]);
      }
      g.append('path')
        .attr('d', d3.line<[number, number]>().x((p) => xScale(p[0])).y((p) => yScale(p[1]))(circlePts) ?? '')
        .style('fill', 'none')
        .style('stroke', COLOR_AXIS)
        .style('stroke-width', 1.5);

      // Eigenvector lines
      eigenvectors.forEach((v, idx) => {
        const color = idx === 0 ? COLOR_EIGEN_1 : COLOR_EIGEN_2;
        const len = Math.hypot(v[0], v[1]);
        if (len < 1e-9) return;
        const ux = v[0] / len;
        const uy = v[1] / len;
        g.append('line')
          .attr('x1', xScale(-1.4 * ux))
          .attr('y1', yScale(-1.4 * uy))
          .attr('x2', xScale(1.4 * ux))
          .attr('y2', yScale(1.4 * uy))
          .style('stroke', color)
          .style('stroke-width', 2)
          .style('opacity', 0.8);
      });

      // Constrained subspace line (Courant-Fischer)
      if (showCF) {
        const cx = Math.cos(subspaceTheta);
        const cy = Math.sin(subspaceTheta);
        g.append('line')
          .attr('x1', xScale(-1.4 * cx))
          .attr('y1', yScale(-1.4 * cy))
          .attr('x2', xScale(1.4 * cx))
          .attr('y2', yScale(1.4 * cy))
          .style('stroke', '#d97706')
          .style('stroke-width', 2)
          .style('opacity', 0.6)
          .style('stroke-dasharray', '4 4');
      }

      // Probe vector
      const px = Math.cos(probeTheta);
      const py = Math.sin(probeTheta);
      g.append('line')
        .attr('x1', xScale(0))
        .attr('y1', yScale(0))
        .attr('x2', xScale(px))
        .attr('y2', yScale(py))
        .style('stroke', COLOR_PROBE)
        .style('stroke-width', 2.5);
      g.append('circle')
        .attr('cx', xScale(px))
        .attr('cy', yScale(py))
        .attr('r', 8)
        .style('fill', COLOR_PROBE)
        .style('cursor', 'grab')
        .attr('role', 'slider')
        .attr('aria-label', 'probe vector on unit circle')
        .call(
          d3
            .drag<SVGCircleElement, unknown>()
            .on('drag', function (event) {
              const xv = xScale.invert(event.x);
              const yv = yScale.invert(event.y);
              const theta = Math.atan2(yv, xv);
              setProbeTheta(theta < 0 ? theta + 2 * Math.PI : theta);
            }),
        );
    },
    [eigenvectors, probeTheta, showCF, subspaceTheta],
  );

  // ── Right SVG: Rayleigh quotient vs θ ────────────────────────
  const rightRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      const innerW = RIGHT_SVG_WIDTH - margin.left - margin.right;
      const innerH = RIGHT_SVG_HEIGHT - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      const xScale = d3.scaleLinear().domain([0, 2 * Math.PI]).range([0, innerW]);
      const yMax = Math.max(Math.abs(eigenvalues[0]), Math.abs(eigenvalues[1])) * 1.15;
      const yScale = d3.scaleLinear().domain([-yMax, yMax]).range([innerH, 0]);

      // Axes
      const xAxis = d3.axisBottom(xScale).tickValues([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI]).tickFormat((d) => {
        const v = d as number;
        if (Math.abs(v) < 1e-6) return '0';
        if (Math.abs(v - Math.PI / 2) < 1e-3) return 'π/2';
        if (Math.abs(v - Math.PI) < 1e-3) return 'π';
        if (Math.abs(v - 3 * Math.PI / 2) < 1e-3) return '3π/2';
        if (Math.abs(v - 2 * Math.PI) < 1e-3) return '2π';
        return '';
      });
      const yAxis = d3.axisLeft(yScale).ticks(5);
      const xAxisG = g.append('g').attr('transform', `translate(0,${yScale(0)})`).call(xAxis);
      xAxisG.selectAll('line').style('stroke', COLOR_AXIS).style('opacity', 0.5);
      xAxisG.selectAll('path').style('stroke', COLOR_AXIS);
      xAxisG.selectAll('text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');
      const yAxisG = g.append('g').call(yAxis);
      yAxisG.selectAll('line').style('stroke', COLOR_AXIS).style('opacity', 0.5);
      yAxisG.selectAll('path').style('stroke', COLOR_AXIS);
      yAxisG.selectAll('text').style('fill', 'var(--color-text-muted)').style('font-size', '10px');

      // λ_max and λ_min dashed lines
      g.append('line').attr('x1', 0).attr('x2', innerW).attr('y1', yScale(eigenvalues[0])).attr('y2', yScale(eigenvalues[0]))
        .style('stroke', COLOR_EIGEN_1).style('stroke-width', 1.5).style('stroke-dasharray', '4 4').style('opacity', 0.7);
      g.append('text').attr('x', innerW - 5).attr('y', yScale(eigenvalues[0]) - 4).attr('text-anchor', 'end')
        .style('fill', COLOR_EIGEN_1).style('font-size', '10px').style('font-weight', '600').text(`λ_max = ${formatNumber(eigenvalues[0])}`);
      g.append('line').attr('x1', 0).attr('x2', innerW).attr('y1', yScale(eigenvalues[1])).attr('y2', yScale(eigenvalues[1]))
        .style('stroke', COLOR_EIGEN_2).style('stroke-width', 1.5).style('stroke-dasharray', '4 4').style('opacity', 0.7);
      g.append('text').attr('x', innerW - 5).attr('y', yScale(eigenvalues[1]) + 12).attr('text-anchor', 'end')
        .style('fill', COLOR_EIGEN_2).style('font-size', '10px').style('font-weight', '600').text(`λ_min = ${formatNumber(eigenvalues[1])}`);

      // R_A curve
      const pathStr = d3.line<{ theta: number; value: number }>()
        .x((p) => xScale(p.theta))
        .y((p) => yScale(p.value))(rayleighSamples);
      g.append('path').attr('d', pathStr ?? '').style('fill', 'none').style('stroke', '#7c3aed').style('stroke-width', 2.25);

      // Current marker
      g.append('circle')
        .attr('cx', xScale(probeTheta))
        .attr('cy', yScale(currentRayleigh))
        .attr('r', 6)
        .style('fill', COLOR_PROBE);
      g.append('text')
        .attr('x', xScale(probeTheta))
        .attr('y', yScale(currentRayleigh) - 10)
        .attr('text-anchor', 'middle')
        .style('fill', COLOR_PROBE)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .text(`R = ${formatNumber(currentRayleigh)}`);

      // Axis labels
      g.append('text').attr('x', innerW / 2).attr('y', innerH + 24).attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '11px').text('θ');
      g.append('text').attr('x', -innerH / 2).attr('y', -32).attr('transform', 'rotate(-90)').attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)').style('font-size', '11px').text('R_A(x(θ))');
    },
    [rayleighSamples, eigenvalues, probeTheta, currentRayleigh],
  );

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border p-4"
      style={{ background: 'var(--color-viz-surface)', borderColor: 'var(--color-viz-border)' }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">
        <div className="flex justify-center md:justify-start">
          <svg
            ref={leftRef}
            width={LEFT_SVG_SIZE}
            height={LEFT_SVG_SIZE}
            style={{ background: 'var(--color-viz-canvas)' }}
            aria-label="Unit circle with probe vector and eigenvector lines"
          />
        </div>
        <div className="flex justify-center md:justify-start">
          <svg
            ref={rightRef}
            width={RIGHT_SVG_WIDTH}
            height={RIGHT_SVG_HEIGHT}
            style={{ background: 'var(--color-viz-canvas)' }}
            aria-label="Rayleigh quotient plotted as a function of angle on the unit circle"
          />
        </div>

        <div className="flex-1 min-w-0 md:basis-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block mb-3">
                <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Preset
                </span>
                <select
                  value={presetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-viz-border)' }}
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </label>

              <span className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Symmetric matrix A
              </span>
              <div className="grid grid-cols-2 gap-2" style={{ maxWidth: 220 }}>
                {([0, 1] as const).map((row) =>
                  ([0, 1] as const).map((col) => (
                    <input
                      key={`${row}-${col}`}
                      type="number"
                      step={0.5}
                      min={-10}
                      max={100}
                      value={matrix[row][col]}
                      onChange={(e) => {
                        const v = Number.parseFloat(e.target.value);
                        if (Number.isFinite(v)) updateEntry(row, col, v);
                      }}
                      className="rounded border px-2 py-1 text-sm text-center"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-viz-border)' }}
                      aria-label={`Matrix entry row ${row + 1}, column ${col + 1}`}
                    />
                  )),
                )}
              </div>
              {wasAsymmetric && (
                <div className="mt-2 text-xs rounded px-2 py-1" style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
                  Symmetrized to (A + Aᵀ)/2.
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 rounded p-2 text-sm" style={{ background: 'var(--color-viz-info-bg)' }}>
                <div style={{ color: 'var(--color-text)' }}>
                  <strong>θ = {formatNumber(probeTheta)} rad</strong> &nbsp;
                  ({formatNumber((probeTheta * 180) / Math.PI, 1)}°)
                </div>
                <div className="mt-1" style={{ color: 'var(--color-text)' }}>
                  R<sub>A</sub>(x(θ)) = <strong style={{ color: COLOR_PROBE }}>{formatNumber(currentRayleigh)}</strong>
                </div>
                <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  λ<sub>max</sub> = <span style={{ color: COLOR_EIGEN_1, fontWeight: 600 }}>{formatNumber(eigenvalues[0])}</span>
                  , λ<sub>min</sub> = <span style={{ color: COLOR_EIGEN_2, fontWeight: 600 }}>{formatNumber(eigenvalues[1])}</span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={showCF}
                  onChange={(e) => setShowCF(e.target.checked)}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>Show 1D constrained subspace (Courant-Fischer)</span>
              </label>

              {showCF && (
                <div>
                  <label className="block text-xs">
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      Subspace angle (dashed amber): {formatNumber((subspaceTheta * 180) / Math.PI, 1)}°
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={Math.PI}
                      step={0.01}
                      value={subspaceTheta}
                      onChange={(e) => setSubspaceTheta(Number.parseFloat(e.target.value))}
                      className="w-full mt-1"
                      aria-label="Constrained subspace angle"
                    />
                  </label>
                  {constrainedMin !== null && (
                    <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      R<sub>A</sub> restricted to this 1D subspace: <strong style={{ color: '#d97706' }}>{formatNumber(constrainedMin)}</strong>
                      <br />
                      (constrained value, between λ<sub>min</sub> and λ<sub>max</sub>)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Drag the red probe around the unit circle. The right panel's red marker tracks R_A. Peaks are λ_max and λ_min, attained at the eigenvector angles (blue, emerald).
          </div>
        </div>
      </div>
    </div>
  );
}
