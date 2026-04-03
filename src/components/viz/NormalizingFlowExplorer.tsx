import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { FLOW_PRESETS, type FlowPreset } from '../../data/change-of-variables-data';
import { densityTransform } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 20, right: 16, bottom: 36, left: 50 };
const GAP = 24;

/** Standard Gaussian density */
function stdGaussian(z: number): number {
  return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
}

/** Build a flow preset with current parameter values */
function buildFlow(preset: FlowPreset, paramValues: Record<string, number>): {
  forward: (z: number) => number;
  inverse: (x: number) => number;
  logDetJ: (z: number) => number;
} {
  const s = paramValues.scale ?? paramValues.s1 ?? paramValues.s ?? Math.exp(paramValues.alpha ?? 0.5);
  const t = paramValues.shift ?? paramValues.t ?? paramValues.s2 ?? 0;

  if (preset.name === 'affine') {
    return {
      forward: (z) => s * z + t,
      inverse: (x) => (x - t) / s,
      logDetJ: () => Math.log(Math.abs(s)),
    };
  }
  if (preset.name === 'quadratic') {
    const alpha = paramValues.alpha ?? 0.5;
    return {
      forward: (z) => z + alpha * z * z,
      inverse: (x) => (-1 + Math.sqrt(1 + 4 * alpha * x)) / (2 * alpha),
      logDetJ: (z) => Math.log(Math.abs(1 + 2 * alpha * z)),
    };
  }
  if (preset.name === 'coupling') {
    const sVal = paramValues.s ?? 0.5;
    const tVal = paramValues.t ?? 0.3;
    const expS = Math.exp(sVal);
    return {
      forward: (z) => expS * z + tVal,
      inverse: (x) => (x - tVal) / expS,
      logDetJ: () => sVal,
    };
  }
  // composed
  const s1 = paramValues.s1 ?? 1.2;
  const s2 = paramValues.s2 ?? 0.8;
  return {
    forward: (z) => s2 * (s1 * z + 0.5) - 0.3,
    inverse: (x) => ((x + 0.3) / s2 - 0.5) / s1,
    logDetJ: () => Math.log(Math.abs(s1)) + Math.log(Math.abs(s2)),
  };
}

export default function NormalizingFlowExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const totalHeight = Math.min(width * 0.5, 420);

  const [presetIdx, setPresetIdx] = useState(0);
  const [showBoth, setShowBoth] = useState(true);
  const [showDetJ, setShowDetJ] = useState(false);

  const preset = FLOW_PRESETS[presetIdx];

  // Parameter values
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const vals: Record<string, number> = {};
    for (const [key, spec] of Object.entries(preset.params)) {
      vals[key] = spec.default;
    }
    return vals;
  });

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setPresetIdx(idx);
    const p = FLOW_PRESETS[idx];
    const vals: Record<string, number> = {};
    for (const [key, spec] of Object.entries(p.params)) {
      vals[key] = spec.default;
    }
    setParamValues(vals);
  }, []);

  const flow = useMemo(() => buildFlow(preset, paramValues), [presetIdx, paramValues]);

  // Compute densities
  const densityData = useMemo(() => {
    const nPts = 400;
    const zRange: [number, number] = [-4, 4];
    const pZ: { z: number; p: number }[] = [];
    const pX: { x: number; p: number }[] = [];
    const detJCurve: { x: number; val: number }[] = [];

    // z-space density
    for (let i = 0; i < nPts; i++) {
      const z = zRange[0] + (i / (nPts - 1)) * (zRange[1] - zRange[0]);
      pZ.push({ z, p: stdGaussian(z) });
    }

    // x-space density via change of variables
    // Determine x range from mapping z range
    const xVals = pZ.map(d => flow.forward(d.z)).filter(isFinite);
    const xMin = Math.min(...xVals) - 0.5;
    const xMax = Math.max(...xVals) + 0.5;

    for (let i = 0; i < nPts; i++) {
      const x = xMin + (i / (nPts - 1)) * (xMax - xMin);
      const invX = flow.inverse(x);
      if (!isFinite(invX)) {
        pX.push({ x, p: 0 });
        detJCurve.push({ x, val: 0 });
        continue;
      }
      const pVal = densityTransform(
        stdGaussian,
        flow.inverse,
        (xv) => {
          const h = 1e-6;
          return (flow.inverse(xv + h) - flow.inverse(xv - h)) / (2 * h);
        },
        x,
      );
      pX.push({ x, p: isFinite(pVal) ? Math.max(0, pVal) : 0 });

      const logDet = flow.logDetJ(invX);
      detJCurve.push({ x, val: isFinite(logDet) ? logDet : 0 });
    }

    // Numerical integral of pX (should be ≈ 1)
    const dx = (xMax - xMin) / (nPts - 1);
    const integralPX = pX.reduce((sum, d) => sum + d.p * dx, 0);

    return { pZ, pX, detJCurve, zRange, xRange: [xMin, xMax] as [number, number], integralPX };
  }, [presetIdx, paramValues]);

  // D3 rendering
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      if (width < 100) return;
      svg.selectAll('*').remove();

      const panelW = (width - GAP) / 2 - margin.left - margin.right;
      const panelH = totalHeight - margin.top - margin.bottom;
      if (panelW < 50 || panelH < 50) return;

      const yMax = Math.max(
        ...densityData.pZ.map(d => d.p),
        ...densityData.pX.map(d => d.p),
        0.01,
      ) * 1.1;

      // --- Left panel: z-space density ---
      const gLeft = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const xScaleL = d3.scaleLinear().domain(densityData.zRange).range([0, panelW]);
      const yScaleL = d3.scaleLinear().domain([0, yMax]).range([panelH, 0]);

      gLeft.append('g').attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xScaleL).ticks(5)).selectAll('text').style('font-size', '10px');
      gLeft.append('g').call(d3.axisLeft(yScaleL).ticks(5)).selectAll('text').style('font-size', '10px');

      gLeft.append('text').attr('x', panelW / 2).attr('y', panelH + 30)
        .attr('text-anchor', 'middle').style('font-size', '11px').style('fill', 'var(--color-text-secondary)')
        .text('z');
      gLeft.append('text').attr('x', panelW / 2).attr('y', -6)
        .attr('text-anchor', 'middle').style('font-size', '12px').style('font-weight', '600')
        .style('fill', 'var(--color-text-primary)')
        .text('Source density p_Z(z)');

      // pZ curve
      const lineZ = d3.line<{ z: number; p: number }>()
        .x(d => xScaleL(d.z)).y(d => yScaleL(d.p));

      // Shaded area
      const areaZ = d3.area<{ z: number; p: number }>()
        .x(d => xScaleL(d.z)).y0(yScaleL(0)).y1(d => yScaleL(d.p));
      gLeft.append('path').datum(densityData.pZ).attr('d', areaZ)
        .style('fill', functionColors[0]).style('opacity', 0.15);
      gLeft.append('path').datum(densityData.pZ).attr('d', lineZ)
        .style('fill', 'none').style('stroke', functionColors[0]).style('stroke-width', 2);

      // --- Right panel: x-space density ---
      const gRight = svg.append('g')
        .attr('transform', `translate(${margin.left + panelW + GAP + margin.right + margin.left},${margin.top})`);

      const xScaleR = d3.scaleLinear().domain(densityData.xRange).range([0, panelW]);
      const yScaleR = d3.scaleLinear().domain([0, yMax]).range([panelH, 0]);

      gRight.append('g').attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xScaleR).ticks(5)).selectAll('text').style('font-size', '10px');
      gRight.append('g').call(d3.axisLeft(yScaleR).ticks(5)).selectAll('text').style('font-size', '10px');

      gRight.append('text').attr('x', panelW / 2).attr('y', panelH + 30)
        .attr('text-anchor', 'middle').style('font-size', '11px').style('fill', 'var(--color-text-secondary)')
        .text('x');
      gRight.append('text').attr('x', panelW / 2).attr('y', -6)
        .attr('text-anchor', 'middle').style('font-size', '12px').style('font-weight', '600')
        .style('fill', 'var(--color-text-primary)')
        .text('Transformed density p_X(x)');

      // pX curve
      const lineX = d3.line<{ x: number; p: number }>()
        .x(d => xScaleR(d.x)).y(d => yScaleR(d.p));
      const areaX = d3.area<{ x: number; p: number }>()
        .x(d => xScaleR(d.x)).y0(yScaleR(0)).y1(d => yScaleR(d.p));
      gRight.append('path').datum(densityData.pX).attr('d', areaX)
        .style('fill', functionColors[1]).style('opacity', 0.15);
      gRight.append('path').datum(densityData.pX).attr('d', lineX)
        .style('fill', 'none').style('stroke', functionColors[1]).style('stroke-width', 2);

      // Overlay pZ on right panel for comparison
      if (showBoth) {
        gRight.append('path').datum(densityData.pZ.map(d => ({ x: d.z, p: d.p })))
          .attr('d', d3.line<{ x: number; p: number }>().x(d => xScaleR(d.x)).y(d => yScaleR(d.p)))
          .style('fill', 'none').style('stroke', functionColors[0])
          .style('stroke-width', 1).style('stroke-dasharray', '4,3').style('opacity', 0.5);
      }

      // |det J| overlay
      if (showDetJ) {
        const detJMax = Math.max(...densityData.detJCurve.map(d => Math.abs(d.val)), 0.01) * 1.2;
        const yScaleDetJ = d3.scaleLinear().domain([-detJMax, detJMax]).range([panelH, 0]);

        const lineDetJ = d3.line<{ x: number; val: number }>()
          .x(d => xScaleR(d.x)).y(d => yScaleDetJ(d.val));
        gRight.append('path').datum(densityData.detJCurve).attr('d', lineDetJ)
          .style('fill', 'none').style('stroke', '#059669').style('stroke-width', 1.5)
          .style('stroke-dasharray', '6,3');

        // Right-side axis for det J
        const axisDetJ = d3.axisRight(yScaleDetJ).ticks(4);
        gRight.append('g')
          .attr('transform', `translate(${panelW},0)`)
          .call(axisDetJ)
          .selectAll('text').style('font-size', '9px').style('fill', '#059669');
      }

      // Arrow between panels
      const arrowX = margin.left + panelW + GAP / 2 + margin.right;
      const arrowY = margin.top + panelH / 2;
      svg.append('text')
        .attr('x', arrowX).attr('y', arrowY)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .style('font-size', '18px').style('fill', 'var(--color-text-secondary)')
        .text('→');
      svg.append('text')
        .attr('x', arrowX).attr('y', arrowY + 16)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px').style('fill', 'var(--color-text-secondary)')
        .text('x = f(z)');
    },
    [width, totalHeight, densityData, showBoth, showDetJ],
  );

  return (
    <div ref={containerRef} className="viz-container">
      <div className="viz-controls">
        <label>
          Flow:{' '}
          <select value={presetIdx} onChange={handlePresetChange}>
            {FLOW_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>
        {Object.entries(preset.params).map(([key, spec]) => (
          <label key={key}>
            {spec.label}:{' '}
            <input
              type="range" min={spec.min} max={spec.max}
              step={(spec.max - spec.min) / 100}
              value={paramValues[key] ?? spec.default}
              onChange={(e) => setParamValues(prev => ({ ...prev, [key]: Number(e.target.value) }))}
            />
            <span className="viz-value">{(paramValues[key] ?? spec.default).toFixed(2)}</span>
          </label>
        ))}
        <label>
          <input type="checkbox" checked={showBoth} onChange={(e) => setShowBoth(e.target.checked)} />
          {' '}Overlay source
        </label>
        <label>
          <input type="checkbox" checked={showDetJ} onChange={(e) => setShowDetJ(e.target.checked)} />
          {' '}log|det J|
        </label>
      </div>

      <svg ref={svgRef} width={width} height={totalHeight} />

      <div className="viz-readout">
        <p>
          ∫p_X(x)dx ≈ <strong>{densityData.integralPX.toFixed(4)}</strong>
          {Math.abs(densityData.integralPX - 1) > 0.05 && <span style={{ color: '#DC2626' }}> (should be ≈ 1)</span>}
        </p>
      </div>
    </div>
  );
}
