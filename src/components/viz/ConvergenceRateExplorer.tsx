import { useState, useMemo, useCallback, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import {
  generateCurve,
  gradientDescentTrajectory,
  newtonTrajectory,
  evaluateTaylorPolynomial,
} from './shared/differentiation';
import { getConvergencePresets } from '../../data/mean-value-taylor-data';
import { functionColors, convergenceColors } from './shared/colorScales';

const presets = getConvergencePresets();
const margin = { top: 20, right: 20, bottom: 35, left: 45 };
const maxSteps = 20;

export default function ConvergenceRateExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [x0, setX0] = useState(presets[0].defaultX0);
  const [eta, setEta] = useState(presets[0].defaultEta);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showModels, setShowModels] = useState(false);

  const preset = presets[selectedIdx];

  // --- Trajectories ---

  const gdTraj = useMemo(
    () => gradientDescentTrajectory(preset.fn, preset.derivative, x0, eta, maxSteps),
    [selectedIdx, x0, eta],
  );

  const newtonTraj = useMemo(
    () => newtonTrajectory(preset.fn, preset.derivative, preset.secondDerivative, x0, maxSteps),
    [selectedIdx, x0],
  );

  const curveData = useMemo(
    () => generateCurve(preset.fn, preset.domain[0], preset.domain[1], 500),
    [selectedIdx],
  );

  // --- Handlers ---

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setX0(presets[idx].defaultX0);
    setEta(presets[idx].defaultEta);
    setCurrentStep(0);
    setPlaying(false);
    setShowModels(false);
  }, []);

  const handleX0Change = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setX0(Number(e.target.value));
    setCurrentStep(0);
    setPlaying(false);
  }, []);

  const handleEtaChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEta(Number(e.target.value));
    setCurrentStep(0);
    setPlaying(false);
  }, []);

  const maxAvail = Math.min(gdTraj.length - 1, newtonTraj.length - 1, maxSteps);

  const handleStep = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, maxAvail));
  }, [maxAvail]);

  const handlePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setPlaying(false);
  }, []);

  const handleShowModelsChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setShowModels(e.target.checked);
  }, []);

  // --- Animation ---

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCurrentStep((s) => {
        const cap = Math.min(gdTraj.length - 1, newtonTraj.length - 1, maxSteps);
        if (s >= cap) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 300);
    return () => clearInterval(id);
  }, [playing, gdTraj.length, newtonTraj.length]);

  // --- Readout values ---

  const gdCurrent = gdTraj[Math.min(currentStep, gdTraj.length - 1)];
  const newtonCurrent = newtonTraj[Math.min(currentStep, newtonTraj.length - 1)];
  const gdDist = Math.abs(gdCurrent.x - preset.minimizer);
  const newtonDist = Math.abs(newtonCurrent.x - preset.minimizer);

  // --- Layout ---

  const panelGap = 40;
  const topPanelHeight = Math.min(width * 0.35, 280);
  const panelWidth = (width - margin.left - margin.right - panelGap) / 2;
  const bottomHeight = Math.min(width * 0.25, 180);
  const totalHeight = margin.top + topPanelHeight + 30 + bottomHeight + margin.bottom;

  // --- D3 render ---

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width < 100 || panelWidth < 40) return;

      svg.attr('width', width).attr('height', totalHeight);

      // Shared scales for top panels
      const xDomain = preset.domain;
      const yValues = curveData.map((d) => d.y);
      const yMin = d3.min(yValues) ?? 0;
      const yMax = d3.max(yValues) ?? 1;
      const yPad = (yMax - yMin) * 0.1 || 1;

      const xScale = d3.scaleLinear().domain(xDomain).range([0, panelWidth]);
      const yScale = d3
        .scaleLinear()
        .domain([yMin - yPad, yMax + yPad])
        .range([topPanelHeight, 0]);

      // Clip paths
      const defs = svg.append('defs');
      defs
        .append('clipPath')
        .attr('id', 'clip-left')
        .append('rect')
        .attr('width', panelWidth)
        .attr('height', topPanelHeight);
      defs
        .append('clipPath')
        .attr('id', 'clip-right')
        .append('rect')
        .attr('width', panelWidth)
        .attr('height', topPanelHeight);
      defs
        .append('clipPath')
        .attr('id', 'clip-bottom')
        .append('rect')
        .attr('width', width - margin.left - margin.right)
        .attr('height', bottomHeight);

      // ── Top-Left Panel: Gradient Descent ──

      const leftG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Axes
      leftG
        .append('g')
        .attr('transform', `translate(0,${topPanelHeight})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');
      leftG
        .append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');

      const leftClip = leftG.append('g').attr('clip-path', 'url(#clip-left)');

      // Function curve
      const line = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));

      leftClip
        .append('path')
        .datum(curveData)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2);

      // GD iterates
      for (let k = 0; k <= Math.min(currentStep, gdTraj.length - 1); k++) {
        const pt = gdTraj[k];
        if (!isFinite(pt.x) || !isFinite(pt.fx)) break;

        // Vertical dashed line
        leftClip
          .append('line')
          .attr('x1', xScale(pt.x))
          .attr('y1', yScale(0))
          .attr('x2', xScale(pt.x))
          .attr('y2', yScale(pt.fx))
          .attr('stroke', '#9ca3af')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
          .attr('opacity', 0.5);

        // Point on curve
        leftClip
          .append('circle')
          .attr('cx', xScale(pt.x))
          .attr('cy', yScale(pt.fx))
          .attr('r', 4)
          .attr('fill', convergenceColors.linear);

        // Linear Taylor model at current step
        if (showModels && k === currentStep) {
          const slope = preset.derivative(pt.x);
          const xL = preset.domain[0];
          const xR = preset.domain[1];
          const yL = pt.fx + slope * (xL - pt.x);
          const yR = pt.fx + slope * (xR - pt.x);

          leftClip
            .append('line')
            .attr('x1', xScale(xL))
            .attr('y1', yScale(yL))
            .attr('x2', xScale(xR))
            .attr('y2', yScale(yR))
            .attr('stroke', convergenceColors.linear)
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4,3')
            .attr('opacity', 0.8);
        }
      }

      // Title
      leftG
        .append('text')
        .attr('x', panelWidth / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 600)
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text('Gradient Descent');

      // ── Top-Right Panel: Newton's Method ──

      const rightX = margin.left + panelWidth + panelGap;
      const rightG = svg
        .append('g')
        .attr('transform', `translate(${rightX},${margin.top})`);

      // Axes
      rightG
        .append('g')
        .attr('transform', `translate(0,${topPanelHeight})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');
      rightG
        .append('g')
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');

      const rightClip = rightG.append('g').attr('clip-path', 'url(#clip-right)');

      // Function curve
      rightClip
        .append('path')
        .datum(curveData)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', functionColors[0])
        .attr('stroke-width', 2);

      // Newton iterates
      for (let k = 0; k <= Math.min(currentStep, newtonTraj.length - 1); k++) {
        const pt = newtonTraj[k];
        if (!isFinite(pt.x) || !isFinite(pt.fx)) break;

        // Vertical dashed line
        rightClip
          .append('line')
          .attr('x1', xScale(pt.x))
          .attr('y1', yScale(0))
          .attr('x2', xScale(pt.x))
          .attr('y2', yScale(pt.fx))
          .attr('stroke', '#9ca3af')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
          .attr('opacity', 0.5);

        // Point on curve
        rightClip
          .append('circle')
          .attr('cx', xScale(pt.x))
          .attr('cy', yScale(pt.fx))
          .attr('r', 4)
          .attr('fill', convergenceColors.quadratic);

        // Quadratic Taylor model at current step
        if (showModels && k === currentStep && pt.taylorModel) {
          const model = pt.taylorModel;
          const localRange = (preset.domain[1] - preset.domain[0]) * 0.4;
          const mxL = Math.max(preset.domain[0], pt.x - localRange);
          const mxR = Math.min(preset.domain[1], pt.x + localRange);
          const nPts = 100;
          const modelPts: { x: number; y: number }[] = [];
          for (let i = 0; i <= nPts; i++) {
            const mx = mxL + (i / nPts) * (mxR - mxL);
            const my = evaluateTaylorPolynomial(model, mx);
            if (isFinite(my)) {
              modelPts.push({ x: mx, y: my });
            }
          }

          if (modelPts.length > 1) {
            rightClip
              .append('path')
              .datum(modelPts)
              .attr('d', line)
              .attr('fill', 'none')
              .attr('stroke', convergenceColors.quadratic)
              .attr('stroke-width', 1.5)
              .attr('stroke-dasharray', '4,3')
              .attr('opacity', 0.8);
          }
        }
      }

      // Title
      rightG
        .append('text')
        .attr('x', panelWidth / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 600)
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text("Newton's Method");

      // ── Bottom Panel: Convergence Plot ──

      const bottomY = margin.top + topPanelHeight + 30;
      const bottomWidth = width - margin.left - margin.right;
      const bottomG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${bottomY})`);

      // Compute log-distance arrays
      const gdLogDist: { k: number; logDist: number }[] = [];
      const newtonLogDist: { k: number; logDist: number }[] = [];

      for (let k = 0; k <= currentStep; k++) {
        if (k < gdTraj.length) {
          const dist = Math.max(1e-16, Math.abs(gdTraj[k].x - preset.minimizer));
          gdLogDist.push({ k, logDist: Math.log10(dist) });
        }
        if (k < newtonTraj.length && isFinite(newtonTraj[k].x)) {
          const dist = Math.max(1e-16, Math.abs(newtonTraj[k].x - preset.minimizer));
          newtonLogDist.push({ k, logDist: Math.log10(dist) });
        }
      }

      const allLogDist = [...gdLogDist.map((d) => d.logDist), ...newtonLogDist.map((d) => d.logDist)];
      const logMin = d3.min(allLogDist) ?? -16;
      const logMax = d3.max(allLogDist) ?? 1;
      const logPad = Math.max((logMax - logMin) * 0.1, 0.5);

      const bxScale = d3
        .scaleLinear()
        .domain([0, Math.max(currentStep, 1)])
        .range([0, bottomWidth]);
      const byScale = d3
        .scaleLinear()
        .domain([logMin - logPad, logMax + logPad])
        .range([bottomHeight, 0]);

      // Axes
      bottomG
        .append('g')
        .attr('transform', `translate(0,${bottomHeight})`)
        .call(d3.axisBottom(bxScale).ticks(Math.min(currentStep, 10)).tickFormat(d3.format('d')))
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');
      bottomG
        .append('g')
        .call(d3.axisLeft(byScale).ticks(5))
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .style('font-size', '10px');

      // Axis labels
      bottomG
        .append('text')
        .attr('x', bottomWidth / 2)
        .attr('y', bottomHeight + 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('Step k');
      bottomG
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -bottomHeight / 2)
        .attr('y', -35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .style('fill', 'var(--color-text-secondary, #6b7280)')
        .text('log\u2081\u2080 |x\u2096 \u2212 x*|');

      const bottomClip = bottomG.append('g').attr('clip-path', 'url(#clip-bottom)');

      // GD convergence line + points
      const bLine = d3
        .line<{ k: number; logDist: number }>()
        .x((d) => bxScale(d.k))
        .y((d) => byScale(d.logDist));

      if (gdLogDist.length > 1) {
        bottomClip
          .append('path')
          .datum(gdLogDist)
          .attr('d', bLine)
          .attr('fill', 'none')
          .attr('stroke', convergenceColors.linear)
          .attr('stroke-width', 1.5);
      }
      gdLogDist.forEach((d) => {
        bottomClip
          .append('circle')
          .attr('cx', bxScale(d.k))
          .attr('cy', byScale(d.logDist))
          .attr('r', 3)
          .attr('fill', convergenceColors.linear);
      });

      // Newton convergence line + points
      if (newtonLogDist.length > 1) {
        bottomClip
          .append('path')
          .datum(newtonLogDist)
          .attr('d', bLine)
          .attr('fill', 'none')
          .attr('stroke', convergenceColors.quadratic)
          .attr('stroke-width', 1.5);
      }
      newtonLogDist.forEach((d) => {
        bottomClip
          .append('circle')
          .attr('cx', bxScale(d.k))
          .attr('cy', byScale(d.logDist))
          .attr('r', 3)
          .attr('fill', convergenceColors.quadratic);
      });

      // Legend
      const legendX = bottomWidth - 160;
      const legendY = 8;
      const legendG = bottomG.append('g').attr('transform', `translate(${legendX},${legendY})`);

      legendG
        .append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 4)
        .attr('fill', convergenceColors.linear);
      legendG
        .append('text')
        .attr('x', 8)
        .attr('y', 4)
        .attr('font-size', '10px')
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text('GD (linear)');

      legendG
        .append('circle')
        .attr('cx', 0)
        .attr('cy', 18)
        .attr('r', 4)
        .attr('fill', convergenceColors.quadratic);
      legendG
        .append('text')
        .attr('x', 8)
        .attr('y', 22)
        .attr('font-size', '10px')
        .style('fill', 'var(--color-text-primary, #1f2937)')
        .text('Newton (quadratic)');
    },
    [width, selectedIdx, x0, eta, currentStep, showModels, curveData, gdTraj, newtonTraj],
  );

  // --- Render ---

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%' }} />

      {/* Controls row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          padding: '8px 0',
          fontSize: '13px',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          Function:
          <select value={selectedIdx} onChange={handlePresetChange} style={{ fontSize: '13px' }}>
            {presets.map((p, i) => (
              <option key={p.name} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          x&#x2080; = {x0.toFixed(2)}
          <input
            type="range"
            min={preset.domain[0] + 0.1}
            max={preset.domain[1] - 0.1}
            step={0.01}
            value={x0}
            onChange={handleX0Change}
            style={{ width: '80px' }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          &#x3B7; = {eta.toFixed(2)}
          <input
            type="range"
            min={0.01}
            max={0.5}
            step={0.01}
            value={eta}
            onChange={handleEtaChange}
            style={{ width: '80px' }}
          />
        </label>

        <span>
          Step {currentStep}/{maxAvail}
        </span>

        <button
          onClick={handleStep}
          disabled={currentStep >= maxAvail}
          style={{ fontSize: '13px', cursor: 'pointer' }}
        >
          Step &#x25B6;
        </button>
        <button onClick={handlePlay} style={{ fontSize: '13px', cursor: 'pointer' }}>
          {playing ? 'Pause \u23F8' : 'Play \u23E9'}
        </button>
        <button onClick={handleReset} style={{ fontSize: '13px', cursor: 'pointer' }}>
          Reset &#x21BA;
        </button>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input type="checkbox" checked={showModels} onChange={handleShowModelsChange} />
          Show Taylor models
        </label>
      </div>

      {/* Readout */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          padding: '4px 0 8px',
          fontSize: '12px',
          fontFamily: 'monospace',
        }}
      >
        <span style={{ color: convergenceColors.linear }}>
          GD: x&#x2096; = {gdCurrent.x.toFixed(6)}, f(x&#x2096;) = {gdCurrent.fx.toFixed(6)},
          |x&#x2096; &minus; x*| = {gdDist.toExponential(2)}
        </span>
        <span style={{ color: convergenceColors.quadratic }}>
          Newton: x&#x2096; = {newtonCurrent.x.toFixed(6)}, f(x&#x2096;) ={' '}
          {newtonCurrent.fx.toFixed(6)}, |x&#x2096; &minus; x*| = {newtonDist.toExponential(2)}
        </span>
      </div>
    </div>
  );
}
