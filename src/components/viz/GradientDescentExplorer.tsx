import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { LOSS_SURFACE_PRESETS } from '../../data/gradient-data';
import { generateContours, gradientDescent } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

import type { ChangeEvent } from 'react';
import type { GDTrajectory } from './shared/multivariate';

const margin = { top: 20, right: 20, bottom: 40, left: 50 };

export default function GradientDescentExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.75, 500);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [startPoint, setStartPoint] = useState<[number, number]>(
    LOSS_SURFACE_PRESETS[0].defaultStart,
  );
  const [learningRate, setLearningRate] = useState(LOSS_SURFACE_PRESETS[0].defaultLR);
  const [trajectory, setTrajectory] = useState<GDTrajectory | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const preset = LOSS_SURFACE_PRESETS[selectedIdx];

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setSelectedIdx(idx);
    setStartPoint(LOSS_SURFACE_PRESETS[idx].defaultStart);
    setLearningRate(LOSS_SURFACE_PRESETS[idx].defaultLR);
    setTrajectory(null);
    setCurrentStep(0);
    setIsRunning(false);
  }, []);

  // Generate contours (more levels for log-scaled presets like Rosenbrock)
  const contours = useMemo(() => {
    const nLevels = preset.logContours ? 16 : 14;
    return generateContours(preset.L, preset.xDomain, preset.yDomain, nLevels, 80);
  }, [selectedIdx]);

  // Compute trajectory when start or LR changes
  const computeTrajectory = useCallback(() => {
    const traj = gradientDescent(
      (...args: number[]) => preset.L(args[0], args[1]),
      (...args: number[]) => preset.grad_L(args[0], args[1]),
      [startPoint[0], startPoint[1]],
      learningRate,
      300,
      1e-6,
    );
    setTrajectory(traj);
    setCurrentStep(0);
    setIsRunning(false);
  }, [selectedIdx, startPoint, learningRate]);

  // Stop animation on cleanup
  useEffect(() => {
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, []);

  // Animation
  useEffect(() => {
    if (animRef.current) clearInterval(animRef.current);
    if (!isRunning || !trajectory) return;

    animRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        if (next >= trajectory.steps.length - 1) {
          setIsRunning(false);
          return trajectory.steps.length - 1;
        }
        return next;
      });
    }, 60);

    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [isRunning, trajectory]);

  const handleStep = useCallback(() => {
    if (!trajectory) {
      computeTrajectory();
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, trajectory.steps.length - 1));
  }, [trajectory, computeTrajectory]);

  const handleRun = useCallback(() => {
    if (!trajectory) computeTrajectory();
    setIsRunning(true);
  }, [trajectory, computeTrajectory]);

  const handleReset = useCallback(() => {
    setTrajectory(null);
    setCurrentStep(0);
    setIsRunning(false);
  }, []);

  const currentStepData = trajectory?.steps[currentStep] ?? null;

  // Log slider for learning rate
  const lrLogMin = -3;
  const lrLogMax = 0;
  const lrLogVal = Math.log10(learningRate);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleLinear().domain(preset.xDomain).range([0, innerW]);
      const yScale = d3.scaleLinear().domain(preset.yDomain).range([innerH, 0]);

      // Contour fills
      const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain(d3.extent(contours, (c) => c.level) as [number, number]);

      for (const contour of contours) {
        const pts = contour.points;
        for (let k = 0; k < pts.length - 1; k += 2) {
          g.append('line')
            .attr('x1', xScale(pts[k][0]))
            .attr('y1', yScale(pts[k][1]))
            .attr('x2', xScale(pts[k + 1][0]))
            .attr('y2', yScale(pts[k + 1][1]))
            .style('stroke', colorScale(contour.level))
            .style('stroke-width', 1)
            .style('opacity', 0.6);
        }
      }

      // Minimum marker
      g.append('circle')
        .attr('cx', xScale(preset.minimum[0]))
        .attr('cy', yScale(preset.minimum[1]))
        .attr('r', 6)
        .style('fill', 'none')
        .style('stroke', functionColors[2])
        .style('stroke-width', 2)
        .style('stroke-dasharray', '3,2');

      g.append('text')
        .attr('x', xScale(preset.minimum[0]) + 10)
        .attr('y', yScale(preset.minimum[1]) - 8)
        .style('fill', functionColors[2])
        .style('font-size', '10px')
        .text('min');

      // Trajectory
      if (trajectory && currentStep > 0) {
        const visibleSteps = trajectory.steps.slice(0, currentStep + 1);

        // Trail line
        const lineGen = d3.line<{ point: number[] }>()
          .x((d) => xScale(d.point[0]))
          .y((d) => yScale(d.point[1]));

        g.append('path')
          .datum(visibleSteps)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .style('stroke', functionColors[0])
          .style('stroke-width', 1.5)
          .style('opacity', 0.7);

        // Step dots
        for (let k = 0; k < visibleSteps.length; k++) {
          const step = visibleSteps[k];
          const opacity = 0.3 + 0.7 * (k / visibleSteps.length);
          g.append('circle')
            .attr('cx', xScale(step.point[0]))
            .attr('cy', yScale(step.point[1]))
            .attr('r', 2.5)
            .style('fill', functionColors[0])
            .style('opacity', opacity);
        }
      }

      // Current point (or start)
      const displayPt = currentStepData
        ? [currentStepData.point[0], currentStepData.point[1]]
        : startPoint;

      g.append('circle')
        .attr('cx', xScale(displayPt[0]))
        .attr('cy', yScale(displayPt[1]))
        .attr('r', 6)
        .style('fill', functionColors[0])
        .style('stroke', '#fff')
        .style('stroke-width', 2);

      // Gradient arrow at current point
      if (currentStepData && currentStepData.gradientNorm > 1e-8) {
        const arrowLen = Math.min(innerW, innerH) * 0.08;
        const gn = currentStepData.gradientNorm;
        const nx = -currentStepData.gradient[0] / gn;
        const ny = -currentStepData.gradient[1] / gn;
        g.append('line')
          .attr('x1', xScale(displayPt[0]))
          .attr('y1', yScale(displayPt[1]))
          .attr('x2', xScale(displayPt[0]) + nx * arrowLen)
          .attr('y2', yScale(displayPt[1]) - ny * arrowLen)
          .style('stroke', functionColors[1])
          .style('stroke-width', 2)
          .style('opacity', 0.8);
      }

      // Click to set start
      g.append('rect')
        .attr('width', innerW)
        .attr('height', innerH)
        .style('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('click', (event) => {
          const [mx, my] = d3.pointer(event, g.node());
          const x = xScale.invert(mx);
          const y = yScale.invert(my);
          if (
            x >= preset.xDomain[0] && x <= preset.xDomain[1] &&
            y >= preset.yDomain[0] && y <= preset.yDomain[1]
          ) {
            setStartPoint([x, y]);
            setTrajectory(null);
            setCurrentStep(0);
            setIsRunning(false);
          }
        });

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(6))
        .selectAll('text')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px');

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(6))
        .selectAll('text')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '10px');

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 32)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('θ₁');

      g.append('text')
        .attr('x', -innerH / 2)
        .attr('y', -35)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .style('fill', 'var(--color-text-muted)')
        .style('font-size', '12px')
        .text('θ₂');
    },
    [contours, trajectory, currentStep, startPoint, currentStepData, width, height],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Loss:
          <select
            className="ml-1 rounded px-1 py-0.5 text-sm"
            style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
            value={selectedIdx}
            onChange={handlePresetChange}
          >
            {LOSS_SURFACE_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          η = {learningRate.toFixed(4)}
          <input
            type="range"
            className="ml-2 w-28"
            min={lrLogMin}
            max={lrLogMax}
            step={0.05}
            value={lrLogVal}
            onChange={(e) => {
              setLearningRate(Math.pow(10, Number(e.target.value)));
              setTrajectory(null);
              setCurrentStep(0);
              setIsRunning(false);
            }}
          />
        </label>

        <button
          className="text-sm px-2 py-0.5 rounded"
          style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
          onClick={handleStep}
        >
          Step
        </button>

        <button
          className="text-sm px-2 py-0.5 rounded"
          style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
          onClick={isRunning ? () => setIsRunning(false) : handleRun}
        >
          {isRunning ? 'Pause' : 'Run'}
        </button>

        <button
          className="text-sm px-2 py-0.5 rounded"
          style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
          onClick={handleReset}
        >
          Reset
        </button>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {currentStepData ? (
          <>
            <span>Iter: {currentStepData.iteration}</span>
            <span>θ = ({currentStepData.point[0].toFixed(3)}, {currentStepData.point[1].toFixed(3)})</span>
            <span>L = {currentStepData.loss.toFixed(5)}</span>
            <span>‖∇L‖ = {currentStepData.gradientNorm.toFixed(5)}</span>
            {trajectory?.converged && currentStep >= trajectory.steps.length - 1 && (
              <span style={{ color: functionColors[2] }}>Converged</span>
            )}
          </>
        ) : (
          <span>Click to set start point, then Step or Run</span>
        )}
      </div>
    </div>
  );
}
