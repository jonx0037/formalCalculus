/**
 * BrachistochroneExplorer — viz comparing descent times along different curves.
 *
 * Visualizes the brachistochrone problem: the cycloid is the curve of fastest
 * descent under gravity. Compares with straight line, parabola, and circular arc.
 *
 * Controls: endpoint drag, curve toggles, "Animate bead" button, speed control.
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useD3 } from './shared/useD3';
import { useResizeObserver } from './shared/useResizeObserver';
import { getCycloidParameterization, computeDescentTime } from '../../data/calculus-of-variations-data';

// ── Constants ─────────────────────────────────────────────────

const BLUE = '#2563EB';
const RED = '#DC2626';
const GREEN = '#059669';
const ORANGE = '#F97316';
const PURPLE = '#7C3AED';
const MUTED = '#6b7280';

const margin = { top: 20, right: 24, bottom: 36, left: 48 };

interface CurveData {
  name: string;
  color: string;
  points: [number, number][];
  time: number;
  visible: boolean;
}

// ── Component ─────────────────────────────────────────────────

export default function BrachistochroneExplorer() {
  const { ref: containerRef, width: containerWidth } = useResizeObserver<HTMLDivElement>();
  const width = containerWidth || 600;
  const height = Math.min(width * 0.65, 420);

  const [endX, setEndX] = useState(1.0);
  const [endY, setEndY] = useState(0.5);
  const [showLine, setShowLine] = useState(true);
  const [showParabola, setShowParabola] = useState(true);
  const [showArc, setShowArc] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Generate curves
  const curves = useMemo<CurveData[]>(() => {
    const nPts = 100;
    const result: CurveData[] = [];

    // Cycloid
    const cycloidFn = getCycloidParameterization([endX, endY]);
    const cycloidPts: [number, number][] = [];
    for (let i = 0; i <= nPts; i++) {
      const t = i / nPts;
      cycloidPts.push(cycloidFn(t));
    }
    const cycloidTime = computeDescentTime(cycloidPts);
    result.push({
      name: 'Cycloid',
      color: BLUE,
      points: cycloidPts,
      time: cycloidTime,
      visible: true,
    });

    // Straight line
    const linePts: [number, number][] = [];
    for (let i = 0; i <= nPts; i++) {
      const t = i / nPts;
      linePts.push([t * endX, t * endY]);
    }
    const lineTime = computeDescentTime(linePts);
    result.push({
      name: 'Straight line',
      color: RED,
      points: linePts,
      time: lineTime,
      visible: showLine,
    });

    // Parabola: y = (endY/endX²) * x²
    const parabolaPts: [number, number][] = [];
    const pCoeff = endY / (endX * endX);
    for (let i = 0; i <= nPts; i++) {
      const t = i / nPts;
      const x = t * endX;
      parabolaPts.push([x, pCoeff * x * x]);
    }
    const parabolaTime = computeDescentTime(parabolaPts);
    result.push({
      name: 'Parabola',
      color: GREEN,
      points: parabolaPts,
      time: parabolaTime,
      visible: showParabola,
    });

    // Circular arc through origin and endpoint
    if (showArc) {
      const arcPts: [number, number][] = [];
      // Circle through (0,0) and (endX, endY): center lies on the
      // perpendicular bisector of the chord at (endX/2, endY/2).
      // Choose center on the line x = endX/2 so the circle is symmetric in x.
      // From |center|² = R²: cx² + cy² = (cx - endX)² + (cy - endY)²
      // → cy = (endX² + endY²) / (2·endY)
      const cx = endX / 2;
      const cy = (endX * endX + endY * endY) / (2 * endY);
      const R = Math.sqrt(cx * cx + cy * cy); // = distance from center to origin

      // Angles from center to origin and endpoint
      const angle0 = Math.atan2(0 - cy, 0 - cx);
      const angle1 = Math.atan2(endY - cy, endX - cx);

      // Ensure we take the shorter arc (both points are below the center)
      let sweep = angle1 - angle0;
      if (sweep > Math.PI) sweep -= 2 * Math.PI;
      if (sweep < -Math.PI) sweep += 2 * Math.PI;

      for (let i = 0; i <= nPts; i++) {
        const t = i / nPts;
        const ang = angle0 + t * sweep;
        arcPts.push([cx + R * Math.cos(ang), cy + R * Math.sin(ang)]);
      }
      const arcTime = computeDescentTime(arcPts);
      result.push({
        name: 'Circular arc',
        color: ORANGE,
        points: arcPts,
        time: arcTime,
        visible: true,
      });
    }

    return result;
  }, [endX, endY, showLine, showParabola, showArc]);

  // Bead positions along each curve at a given fraction of the total time
  const maxTime = Math.max(...curves.filter((c) => c.visible).map((c) => c.time));

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000 * speed;
      const progress = Math.min(elapsed / maxTime, 1);
      setAnimProgress(progress);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    startTimeRef.current = 0;
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isAnimating, maxTime, speed]);

  // Get bead position on a curve given elapsed time
  const getBeadPosition = useCallback(
    (curve: CurveData, elapsed: number): [number, number] | null => {
      if (elapsed <= 0) return curve.points[0];
      let timeAcc = 0;
      for (let i = 1; i < curve.points.length; i++) {
        const [x0, y0] = curve.points[i - 1];
        const [x1, y1] = curve.points[i];
        const dx = x1 - x0;
        const dy = y1 - y0;
        const ds = Math.sqrt(dx * dx + dy * dy);
        const yMid = Math.max((y0 + y1) / 2, 1e-10);
        const spd = Math.sqrt(2 * 9.81 * yMid);
        const dt = ds / spd;
        if (timeAcc + dt >= elapsed) {
          const frac = (elapsed - timeAcc) / dt;
          return [x0 + frac * dx, y0 + frac * dy];
        }
        timeAcc += dt;
      }
      return curve.points[curve.points.length - 1];
    },
    [],
  );

  // ── D3 rendering ────────────────────────────────────────────

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0) return;

      const panelW = width - margin.left - margin.right;
      const panelH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Determine data extent
      let xMax = endX * 1.1;
      let yMaxVal = endY * 1.3;
      curves.forEach((c) => {
        c.points.forEach(([px, py]) => {
          if (px > xMax) xMax = px;
          if (py > yMaxVal) yMaxVal = py;
        });
      });

      const xScale = d3.scaleLinear().domain([0, xMax]).range([0, panelW]);
      const yScale = d3.scaleLinear().domain([0, yMaxVal]).range([0, panelH]); // y increases downward (gravity)

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${panelH})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll('text')
        .style('font-size', '11px');
      g.append('g')
        .call(
          d3.axisLeft(yScale.copy().range([panelH, 0])).ticks(5),
        )
        .selectAll('text')
        .style('font-size', '11px');

      g.append('text')
        .attr('x', panelW / 2)
        .attr('y', panelH + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', MUTED)
        .text('x');
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -panelH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', MUTED)
        .text('y (depth)');

      // Gravity arrow
      g.append('text')
        .attr('x', panelW - 10)
        .attr('y', 24)
        .attr('text-anchor', 'end')
        .style('font-size', '13px')
        .style('fill', MUTED)
        .text('g ↓');

      // Draw curves
      const line = d3
        .line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      curves.forEach((curve) => {
        if (!curve.visible) return;
        g.append('path')
          .datum(curve.points)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', curve.color)
          .attr('stroke-width', curve.name === 'Cycloid' ? 3 : 1.8)
          .attr('opacity', curve.name === 'Cycloid' ? 1 : 0.75);
      });

      // Endpoint
      g.append('circle')
        .attr('cx', xScale(endX))
        .attr('cy', yScale(endY))
        .attr('r', 5)
        .attr('fill', MUTED)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'move')
        .call(
          d3.drag<SVGCircleElement, unknown>().on('drag', (event) => {
            const newX = Math.max(0.2, Math.min(2.0, xScale.invert(event.x)));
            const newY = Math.max(0.1, Math.min(1.5, yScale.invert(event.y)));
            setEndX(newX);
            setEndY(newY);
          }) as any,
        );

      // Origin marker
      g.append('circle')
        .attr('cx', xScale(0))
        .attr('cy', yScale(0))
        .attr('r', 4)
        .attr('fill', MUTED);

      // Beads (during animation)
      if (isAnimating || animProgress > 0) {
        const elapsed = animProgress * maxTime;
        curves.forEach((curve) => {
          if (!curve.visible) return;
          const pos = getBeadPosition(curve, elapsed);
          if (!pos) return;
          const arrived = elapsed >= curve.time;
          g.append('circle')
            .attr('cx', xScale(pos[0]))
            .attr('cy', yScale(pos[1]))
            .attr('r', 7)
            .attr('fill', arrived ? curve.color : PURPLE)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('opacity', arrived ? 0.6 : 1);
        });
      }

      // Legend
      const visibleCurves = curves.filter((c) => c.visible);
      visibleCurves.forEach((curve, i) => {
        const lx = 8;
        const ly = 10 + i * 18;
        g.append('line')
          .attr('x1', lx)
          .attr('y1', ly)
          .attr('x2', lx + 20)
          .attr('y2', ly)
          .attr('stroke', curve.color)
          .attr('stroke-width', curve.name === 'Cycloid' ? 3 : 1.8);
        g.append('text')
          .attr('x', lx + 25)
          .attr('y', ly + 4)
          .style('font-size', '11px')
          .style('fill', curve.color)
          .text(`${curve.name} (${curve.time.toFixed(3)}s)`);
      });
    },
    [
      width,
      height,
      curves,
      endX,
      endY,
      isAnimating,
      animProgress,
      maxTime,
      getBeadPosition,
    ],
  );

  const cycloidCurve = curves[0];
  const lineCurve = curves.find((c) => c.name === 'Straight line');
  const improvement =
    lineCurve && cycloidCurve
      ? ((lineCurve.time - cycloidCurve.time) / lineCurve.time) * 100
      : 0;

  return (
    <div ref={containerRef} className="w-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
        <button
          onClick={() => {
            setAnimProgress(0);
            setIsAnimating(true);
          }}
          className="rounded bg-purple-600 px-3 py-1 text-white"
        >
          Animate bead
        </button>

        <label className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">Speed:</span>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showLine}
            onChange={(e) => setShowLine(e.target.checked)}
          />
          <span style={{ color: RED }}>Straight line</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showParabola}
            onChange={(e) => setShowParabola(e.target.checked)}
          />
          <span style={{ color: GREEN }}>Parabola</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showArc}
            onChange={(e) => setShowArc(e.target.checked)}
          />
          <span style={{ color: ORANGE }}>Circular arc</span>
        </label>
      </div>

      {/* SVG */}
      <svg ref={svgRef} width={width} height={height} className="overflow-visible" />

      {/* Info panel */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Cycloid: </span>
          <span className="font-mono font-medium" style={{ color: BLUE }}>
            {cycloidCurve.time.toFixed(4)}s
          </span>
        </div>
        {lineCurve && lineCurve.visible && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Line: </span>
            <span className="font-mono font-medium" style={{ color: RED }}>
              {lineCurve.time.toFixed(4)}s
            </span>
          </div>
        )}
        <div>
          <span className="text-gray-500 dark:text-gray-400">Improvement: </span>
          <span className="font-mono font-medium" style={{ color: PURPLE }}>
            {improvement.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Endpoint: </span>
          <span className="font-mono font-medium" style={{ color: MUTED }}>
            ({endX.toFixed(2)}, {endY.toFixed(2)})
          </span>
        </div>
      </div>
    </div>
  );
}
