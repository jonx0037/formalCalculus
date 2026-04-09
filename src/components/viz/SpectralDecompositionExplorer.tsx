/**
 * SpectralDecompositionExplorer — viz for Topic 31 (Inner Product & Hilbert Spaces).
 *
 * Visualizes eigenvalue decomposition of a 2×2 symmetric matrix:
 *  - Left panel: unit circle → image ellipse under A
 *  - Right panel: eigenvalue bar chart
 *  - Matrix sliders: a11, a12 = a21, a22
 *  - Toggle: eigenvectors, rank-1 approximation
 */

import { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import { computeSpectralDecomposition } from '../../data/hilbert-spaces-data';

// ── Constants ─────────────────────────────────────────────────

const BLUE = '#2563EB';
const LIGHT_BLUE = '#93C5FD';
const RED = '#DC2626';
const GREEN = '#059669';
const ORANGE = '#F97316';

const margin = { top: 24, right: 16, bottom: 32, left: 16 };
const GAP = 28;

// ── Component ─────────────────────────────────────────────────

export default function SpectralDecompositionExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const width = containerWidth || 600;
  const height = Math.min(width * 0.5, 360);

  const [a11, setA11] = useState(2.5);
  const [a12, setA12] = useState(1.0);
  const [a22, setA22] = useState(1.0);
  const [showEigenvectors, setShowEigenvectors] = useState(true);
  const [showRank1, setShowRank1] = useState(false);

  const spectral = useMemo(
    () => computeSpectralDecomposition([a11, a12, a12, a22]),
    [a11, a12, a22],
  );

  const { eigenvalues, eigenvectors } = spectral;

  // Sample unit circle and image
  const numPoints = 200;
  const unitCircle = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= numPoints; i++) {
      const theta = (2 * Math.PI * i) / numPoints;
      pts.push({ x: Math.cos(theta), y: Math.sin(theta) });
    }
    return pts;
  }, []);

  const imageEllipse = useMemo(() => {
    return unitCircle.map(({ x, y }) => ({
      x: a11 * x + a12 * y,
      y: a12 * x + a22 * y,
    }));
  }, [unitCircle, a11, a12, a22]);

  // Rank-1 approximation image
  const rank1Image = useMemo(() => {
    if (!showRank1) return null;
    const [v1x, v1y] = eigenvectors[0];
    const l1 = eigenvalues[0];
    return unitCircle.map(({ x, y }) => {
      const coeff = x * v1x + y * v1y;
      return { x: l1 * coeff * v1x, y: l1 * coeff * v1y };
    });
  }, [unitCircle, eigenvectors, eigenvalues, showRank1]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const leftW = (width - margin.left - margin.right - GAP) * 0.65;
      const rightW = (width - margin.left - margin.right - GAP) * 0.35;
      const panelH = height - margin.top - margin.bottom;

      // Auto-scale left panel
      const maxVal = Math.max(
        ...imageEllipse.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))),
        1.5,
      );
      const ext = maxVal * 1.2;

      const xL = d3.scaleLinear().domain([-ext, ext]).range([0, leftW]);
      const yL = d3.scaleLinear().domain([-ext, ext]).range([panelH, 0]);

      const gL = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Axes
      gL.append('line')
        .attr('x1', xL(-ext)).attr('y1', yL(0))
        .attr('x2', xL(ext)).attr('y2', yL(0))
        .style('stroke', '#e5e7eb').style('stroke-width', 1);
      gL.append('line')
        .attr('x1', xL(0)).attr('y1', yL(-ext))
        .attr('x2', xL(0)).attr('y2', yL(ext))
        .style('stroke', '#e5e7eb').style('stroke-width', 1);

      // Unit circle (thin, muted)
      const circleLine = d3.line<{ x: number; y: number }>()
        .x((d) => xL(d.x)).y((d) => yL(d.y));
      gL.append('path')
        .datum(unitCircle)
        .attr('d', circleLine)
        .style('fill', 'none')
        .style('stroke', '#d1d5db')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '3,2');

      // Rank-1 approximation
      if (rank1Image) {
        gL.append('path')
          .datum(rank1Image)
          .attr('d', circleLine)
          .style('fill', 'none')
          .style('stroke', ORANGE)
          .style('stroke-width', 2)
          .style('stroke-dasharray', '6,3');
      }

      // Image ellipse
      gL.append('path')
        .datum(imageEllipse)
        .attr('d', circleLine)
        .style('fill', LIGHT_BLUE)
        .style('fill-opacity', 0.25)
        .style('stroke', BLUE)
        .style('stroke-width', 2);

      // Eigenvectors (scaled by eigenvalue)
      if (showEigenvectors) {
        eigenvectors.forEach(([vx, vy], i) => {
          const color = i === 0 ? RED : GREEN;
          const lambda = eigenvalues[i];
          const tipX = lambda * vx;
          const tipY = lambda * vy;

          // Draw both directions
          gL.append('line')
            .attr('x1', xL(-tipX)).attr('y1', yL(-tipY))
            .attr('x2', xL(tipX)).attr('y2', yL(tipY))
            .style('stroke', color)
            .style('stroke-width', 2.5);

          // Arrow tip
          gL.append('circle')
            .attr('cx', xL(tipX)).attr('cy', yL(tipY))
            .attr('r', 4)
            .style('fill', color).style('stroke', '#fff').style('stroke-width', 1);

          gL.append('text')
            .attr('x', xL(tipX) + 8).attr('y', yL(tipY) - 6)
            .style('font-size', '11px').style('fill', color).style('font-weight', '600')
            .text(`λ${i + 1}v${i + 1}`);
        });
      }

      gL.append('text')
        .attr('x', leftW / 2).attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text('Unit circle → image under A');

      // ── Right panel: eigenvalue bar chart ──
      const gR = svg.append('g')
        .attr('transform', `translate(${margin.left + leftW + GAP},${margin.top})`);

      const barH = panelH * 0.7;
      const barTop = (panelH - barH) / 2;
      const maxEig = Math.max(Math.abs(eigenvalues[0]), Math.abs(eigenvalues[1]), 0.5) * 1.3;
      const yBar = d3.scaleLinear().domain([-maxEig, maxEig]).range([barTop + barH, barTop]);
      const barW = rightW * 0.25;
      const gap = rightW * 0.15;

      // Zero line
      gR.append('line')
        .attr('x1', 0).attr('y1', yBar(0))
        .attr('x2', rightW).attr('y2', yBar(0))
        .style('stroke', '#d1d5db').style('stroke-width', 1);

      // Bars
      [RED, GREEN].forEach((color, i) => {
        const barX = gap + i * (barW + gap);
        const val = eigenvalues[i];
        const y0 = yBar(0);
        const y1 = yBar(val);
        gR.append('rect')
          .attr('x', barX)
          .attr('y', Math.min(y0, y1))
          .attr('width', barW)
          .attr('height', Math.abs(y1 - y0))
          .style('fill', color)
          .style('fill-opacity', 0.6)
          .style('stroke', color)
          .style('stroke-width', 1.5);

        gR.append('text')
          .attr('x', barX + barW / 2)
          .attr('y', y1 + (val >= 0 ? -6 : 14))
          .attr('text-anchor', 'middle')
          .style('font-size', '11px').style('fill', color).style('font-weight', '600')
          .text(val.toFixed(2));

        gR.append('text')
          .attr('x', barX + barW / 2)
          .attr('y', barTop + barH + 18)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px').style('fill', '#6b7280')
          .text(`λ${i + 1}`);
      });

      gR.append('text')
        .attr('x', rightW / 2).attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px').style('font-weight', '600').style('fill', '#374151')
        .text('Eigenvalues');
    },
    [width, height, unitCircle, imageEllipse, rank1Image, eigenvectors, eigenvalues, showEigenvectors, showRank1],
  );

  const rank1Error = useMemo(() => {
    // ‖A - λ₁v₁v₁ᵀ‖_F = |λ₂|
    return Math.abs(eigenvalues[1]);
  }, [eigenvalues]);

  return (
    <div
      ref={containerRef}
      className="my-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
    >
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-gray-600 dark:text-gray-400">a₁₁:</span>
          <input type="range" min={-3} max={3} step={0.1} value={a11}
            onChange={(e) => setA11(Number(e.target.value))}
            className="w-20 accent-gray-600" />
          <span className="w-8 text-right font-mono text-gray-700 dark:text-gray-300">{a11.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-gray-600 dark:text-gray-400">a₁₂ = a₂₁:</span>
          <input type="range" min={-3} max={3} step={0.1} value={a12}
            onChange={(e) => setA12(Number(e.target.value))}
            className="w-20 accent-gray-600" />
          <span className="w-8 text-right font-mono text-gray-700 dark:text-gray-300">{a12.toFixed(1)}</span>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-gray-600 dark:text-gray-400">a₂₂:</span>
          <input type="range" min={-3} max={3} step={0.1} value={a22}
            onChange={(e) => setA22(Number(e.target.value))}
            className="w-20 accent-gray-600" />
          <span className="w-8 text-right font-mono text-gray-700 dark:text-gray-300">{a22.toFixed(1)}</span>
        </label>

        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={showEigenvectors}
            onChange={(e) => setShowEigenvectors(e.target.checked)}
            className="accent-red-500" />
          <span className="text-gray-600 dark:text-gray-400">Eigenvectors</span>
        </label>

        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={showRank1}
            onChange={(e) => setShowRank1(e.target.checked)}
            className="accent-orange-500" />
          <span className="text-gray-600 dark:text-gray-400">Rank-1</span>
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} className="block" />

      {/* Info panel */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded bg-gray-50 p-3 text-sm dark:bg-gray-800 sm:grid-cols-4">
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">λ₁ = </span>
          <span className="font-mono font-semibold text-red-600 dark:text-red-400">
            {eigenvalues[0].toFixed(4)}
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">λ₂ = </span>
          <span className="font-mono font-semibold text-green-600 dark:text-green-400">
            {eigenvalues[1].toFixed(4)}
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">v₁ = </span>
          <span className="font-mono text-gray-700 dark:text-gray-300">
            ({eigenvectors[0][0].toFixed(3)}, {eigenvectors[0][1].toFixed(3)})
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">Rank-1 error = </span>
          <span className="font-mono text-orange-600 dark:text-orange-400">
            {rank1Error.toFixed(4)}
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        A symmetric matrix maps the unit circle to an ellipse whose axes are the eigenvectors, scaled by eigenvalues. The rank-1 approximation λ₁v₁v₁ᵀ keeps only the dominant eigendirection.
      </p>
    </div>
  );
}
