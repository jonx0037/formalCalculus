import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { getActivationPresets } from '../../data/derivative-data';
import { computeBackprop } from './shared/differentiation';
import { functionColors } from './shared/colorScales';

const presets = getActivationPresets();
const margin = { top: 20, right: 30, bottom: 20, left: 30 };

type Mode = 'forward' | 'backward' | 'both';

interface NodeDef {
  id: string;
  label: string;
  xFrac: number;
  yFrac: number;
}

interface EdgeDef {
  from: string;
  to: string;
  forwardLabel: (vals: Record<string, number>) => string;
  backwardLabel: (vals: Record<string, number>) => string;
}

const NODE_W = 120;
const NODE_H = 50;

const nodeDefs: NodeDef[] = [
  { id: 'x', label: 'x', xFrac: 0.1, yFrac: 0.15 },
  { id: 'w', label: 'w', xFrac: 0.5, yFrac: 0.05 },
  { id: 'b', label: 'b', xFrac: 0.9, yFrac: 0.15 },
  { id: 'z', label: 'z = wx + b', xFrac: 0.5, yFrac: 0.35 },
  { id: 'a', label: 'a = σ(z)', xFrac: 0.5, yFrac: 0.6 },
  { id: 'L', label: 'L = (a − y)²', xFrac: 0.5, yFrac: 0.85 },
];

const edgeDefs: EdgeDef[] = [
  {
    from: 'x',
    to: 'z',
    forwardLabel: (v) => `x = ${v.xVal.toFixed(2)}`,
    backwardLabel: (v) => `∂z/∂x = w = ${v.w.toFixed(2)}`,
  },
  {
    from: 'w',
    to: 'z',
    forwardLabel: (v) => `w = ${v.w.toFixed(2)}`,
    backwardLabel: (v) => `∂z/∂w = x = ${v.xVal.toFixed(2)}`,
  },
  {
    from: 'b',
    to: 'z',
    forwardLabel: (v) => `b = ${v.b.toFixed(2)}`,
    backwardLabel: () => `∂z/∂b = 1`,
  },
  {
    from: 'z',
    to: 'a',
    forwardLabel: (v) => `z = ${v.z.toFixed(3)}`,
    backwardLabel: (v) => `σ'(z) = ${v.dadz.toFixed(4)}`,
  },
  {
    from: 'a',
    to: 'L',
    forwardLabel: (v) => `a = ${v.a.toFixed(4)}`,
    backwardLabel: (v) => `∂L/∂a = 2(a−y) = ${v.dLda.toFixed(4)}`,
  },
];

export default function BackpropGraphExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();
  const height = Math.min(width * 0.75, 520);

  const [mode, setMode] = useState<Mode>('forward');
  const [activationIdx, setActivationIdx] = useState(0);
  const [w, setW] = useState(1.5);
  const [b, setB] = useState(0.5);
  const [xVal, setXVal] = useState(0.8);
  const [yTarget, setYTarget] = useState(1.0);

  const preset = presets[activationIdx];

  const graph = useMemo(
    () => computeBackprop(w, b, xVal, yTarget, preset.sigma, preset.sigmaPrime),
    [w, b, xVal, yTarget, activationIdx],
  );

  // Extract named values for edge labels and readout
  const vals = useMemo(() => {
    const zNode = graph.nodes.find((n) => n.label.startsWith('z'));
    const aNode = graph.nodes.find((n) => n.label.startsWith('a'));
    const lNode = graph.nodes.find((n) => n.label.startsWith('L'));
    const zVal = zNode ? zNode.value : 0;
    const aVal = aNode ? aNode.value : 0;
    const dadz = preset.sigmaPrime(zVal);
    const dLda = 2 * (aVal - yTarget);
    return {
      w,
      b,
      xVal,
      yTarget,
      z: zVal,
      a: aVal,
      L: lNode ? lNode.value : 0,
      dadz,
      dLda,
      dLdw: graph.dLdw,
      dLdb: graph.dLdb,
    };
  }, [graph, w, b, xVal, yTarget, activationIdx]);

  const handleW = useCallback((e: ChangeEvent<HTMLInputElement>) => setW(Number(e.target.value)), []);
  const handleB = useCallback((e: ChangeEvent<HTMLInputElement>) => setB(Number(e.target.value)), []);
  const handleX = useCallback((e: ChangeEvent<HTMLInputElement>) => setXVal(Number(e.target.value)), []);
  const handleY = useCallback((e: ChangeEvent<HTMLInputElement>) => setYTarget(Number(e.target.value)), []);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || height <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Arrow marker definitions
      const defs = svg.append('defs');

      defs
        .append('marker')
        .attr('id', 'arrow-forward')
        .attr('viewBox', '0 0 10 6')
        .attr('refX', 10)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,0 L10,3 L0,6 Z')
        .style('fill', functionColors[0]);

      defs
        .append('marker')
        .attr('id', 'arrow-backward')
        .attr('viewBox', '0 0 10 6')
        .attr('refX', 0)
        .attr('refY', 3)
        .attr('markerWidth', 10)
        .attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M10,0 L0,3 L10,6 Z')
        .style('fill', functionColors[1]);

      // Compute pixel positions for nodes
      const nodePositions: Record<string, { cx: number; cy: number }> = {};
      for (const nd of nodeDefs) {
        nodePositions[nd.id] = {
          cx: nd.xFrac * innerW,
          cy: nd.yFrac * innerH,
        };
      }

      // Mapping from node id to BackpropNode for values/gradients
      const nodeDataMap: Record<string, { value: number; gradient: number }> = {};
      const idOrder = ['x', 'w', 'b', 'z', 'a', 'L'];
      for (let i = 0; i < idOrder.length; i++) {
        nodeDataMap[idOrder[i]] = {
          value: graph.nodes[i].value,
          gradient: graph.nodes[i].gradient,
        };
      }

      // Determine which nodes to highlight (order of computation)
      const forwardOrder = ['x', 'w', 'b', 'z', 'a', 'L'];
      const backwardOrder = ['L', 'a', 'z', 'w', 'b', 'x'];

      // Draw edges
      for (const edge of edgeDefs) {
        const from = nodePositions[edge.from];
        const to = nodePositions[edge.to];

        // Calculate edge start/end clipped to node rect boundaries
        const dx = to.cx - from.cx;
        const dy = to.cy - from.cy;
        const angle = Math.atan2(dy, dx);

        const halfW = NODE_W / 2;
        const halfH = NODE_H / 2;

        // Clip at from-node boundary
        const fromClipX = Math.abs(Math.cos(angle)) > 0.001
          ? Math.min(halfW, Math.abs(halfH / Math.tan(angle))) * Math.sign(Math.cos(angle))
          : 0;
        const fromClipY = Math.abs(Math.sin(angle)) > 0.001
          ? Math.min(halfH, Math.abs(halfW * Math.tan(angle))) * Math.sign(Math.sin(angle))
          : 0;

        // Clip at to-node boundary (opposite direction)
        const toClipX = Math.abs(Math.cos(angle)) > 0.001
          ? Math.min(halfW, Math.abs(halfH / Math.tan(angle))) * Math.sign(-Math.cos(angle))
          : 0;
        const toClipY = Math.abs(Math.sin(angle)) > 0.001
          ? Math.min(halfH, Math.abs(halfW * Math.tan(angle))) * Math.sign(-Math.sin(angle))
          : 0;

        const x1 = from.cx + fromClipX;
        const y1 = from.cy + fromClipY;
        const x2 = to.cx + toClipX;
        const y2 = to.cy + toClipY;

        const showForward = mode === 'forward' || mode === 'both';
        const showBackward = mode === 'backward' || mode === 'both';

        // Offset for both mode so lines don't overlap
        const offsetPx = mode === 'both' ? 4 : 0;
        const perpX = -Math.sin(angle) * offsetPx;
        const perpY = Math.cos(angle) * offsetPx;

        if (showForward) {
          g.append('line')
            .attr('x1', x1 + perpX)
            .attr('y1', y1 + perpY)
            .attr('x2', x2 + perpX)
            .attr('y2', y2 + perpY)
            .style('stroke', functionColors[0])
            .style('stroke-width', 2)
            .attr('marker-end', 'url(#arrow-forward)');

          // Forward edge label
          const midX = (x1 + x2) / 2 + perpX;
          const midY = (y1 + y2) / 2 + perpY;
          g.append('text')
            .attr('x', midX - perpX * 2.5)
            .attr('y', midY - perpY * 2.5 - 6)
            .attr('text-anchor', 'middle')
            .style('fill', functionColors[0])
            .style('font-size', '9px')
            .style('font-weight', '500')
            .text(edge.forwardLabel(vals));
        }

        if (showBackward) {
          g.append('line')
            .attr('x1', x2 - perpX)
            .attr('y1', y2 - perpY)
            .attr('x2', x1 - perpX)
            .attr('y2', y1 - perpY)
            .style('stroke', functionColors[1])
            .style('stroke-width', 2)
            .style('stroke-dasharray', '5,3')
            .attr('marker-end', 'url(#arrow-backward)');

          // Backward edge label
          const midX = (x1 + x2) / 2 - perpX;
          const midY = (y1 + y2) / 2 - perpY;
          g.append('text')
            .attr('x', midX + perpX * 2.5)
            .attr('y', midY + perpY * 2.5 + 12)
            .attr('text-anchor', 'middle')
            .style('fill', functionColors[1])
            .style('font-size', '9px')
            .style('font-weight', '500')
            .text(edge.backwardLabel(vals));
        }
      }

      // Draw nodes
      for (const nd of nodeDefs) {
        const pos = nodePositions[nd.id];
        const data = nodeDataMap[nd.id];

        const nodeG = g
          .append('g')
          .attr('transform', `translate(${pos.cx - NODE_W / 2},${pos.cy - NODE_H / 2})`);

        const isForwardHighlight = mode === 'forward' || mode === 'both';
        const isBackwardHighlight = mode === 'backward' || mode === 'both';

        if (mode === 'both') {
          // Split color: blue left half, red right half via clip paths
          const clipId = `clip-${nd.id}`;
          const clipIdR = `clip-r-${nd.id}`;

          defs
            .append('clipPath')
            .attr('id', clipId)
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', NODE_W / 2)
            .attr('height', NODE_H);

          defs
            .append('clipPath')
            .attr('id', clipIdR)
            .append('rect')
            .attr('x', NODE_W / 2)
            .attr('y', 0)
            .attr('width', NODE_W / 2)
            .attr('height', NODE_H);

          // Blue left half
          nodeG
            .append('rect')
            .attr('rx', 8)
            .attr('ry', 8)
            .attr('width', NODE_W)
            .attr('height', NODE_H)
            .attr('clip-path', `url(#${clipId})`)
            .style('fill', functionColors[0])
            .style('opacity', 0.15);

          // Red right half
          nodeG
            .append('rect')
            .attr('rx', 8)
            .attr('ry', 8)
            .attr('width', NODE_W)
            .attr('height', NODE_H)
            .attr('clip-path', `url(#${clipIdR})`)
            .style('fill', functionColors[1])
            .style('opacity', 0.15);

          // Border rect
          nodeG
            .append('rect')
            .attr('rx', 8)
            .attr('ry', 8)
            .attr('width', NODE_W)
            .attr('height', NODE_H)
            .style('fill', 'none')
            .style('stroke', 'var(--color-border)')
            .style('stroke-width', 1.5);
        } else {
          const fillColor = isForwardHighlight
            ? functionColors[0]
            : isBackwardHighlight
              ? functionColors[1]
              : 'var(--color-surface-alt)';
          const fillOpacity = isForwardHighlight || isBackwardHighlight ? 0.15 : 1;

          nodeG
            .append('rect')
            .attr('rx', 8)
            .attr('ry', 8)
            .attr('width', NODE_W)
            .attr('height', NODE_H)
            .style('fill', fillColor)
            .style('opacity', fillOpacity)
            .style('stroke', 'var(--color-border)')
            .style('stroke-width', 1.5);
        }

        // Label text
        nodeG
          .append('text')
          .attr('x', NODE_W / 2)
          .attr('y', 18)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text)')
          .style('font-size', '11px')
          .style('font-weight', '600')
          .text(nd.label);

        // Value / gradient text
        let valueText = '';
        if (mode === 'forward') {
          valueText = `val = ${data.value.toFixed(4)}`;
        } else if (mode === 'backward') {
          valueText = `∇ = ${data.gradient.toFixed(4)}`;
        } else {
          valueText = `${data.value.toFixed(3)} | ∇${data.gradient.toFixed(3)}`;
        }

        nodeG
          .append('text')
          .attr('x', NODE_W / 2)
          .attr('y', 36)
          .attr('text-anchor', 'middle')
          .style('fill', 'var(--color-text-muted)')
          .style('font-size', '10px')
          .text(valueText);
      }
    },
    [graph, width, height, mode, vals, activationIdx],
  );

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Mode toggle */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <div className="flex gap-1">
          {(['forward', 'backward', 'both'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{
                background: mode === m ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                color: mode === m ? '#fff' : 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
            >
              {m === 'forward' ? 'Forward' : m === 'backward' ? 'Backward' : 'Both'}
            </button>
          ))}
        </div>

        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Activation:
          <select
            value={activationIdx}
            onChange={(e) => setActivationIdx(Number(e.target.value))}
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
      </div>

      {/* Sliders */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          w = {w.toFixed(2)}
          <input type="range" min={-3} max={3} step={0.05} value={w} onChange={handleW} className="ml-2 w-24" />
        </label>
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          b = {b.toFixed(2)}
          <input type="range" min={-2} max={2} step={0.05} value={b} onChange={handleB} className="ml-2 w-24" />
        </label>
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          x = {xVal.toFixed(2)}
          <input type="range" min={-2} max={2} step={0.05} value={xVal} onChange={handleX} className="ml-2 w-24" />
        </label>
        <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          y = {yTarget.toFixed(2)}
          <input type="range" min={-1} max={2} step={0.05} value={yTarget} onChange={handleY} className="ml-2 w-24" />
        </label>
      </div>

      <svg ref={svgRef} width={width} height={height} />

      {/* Numerical readout */}
      <div className="mt-2 text-xs space-y-1" style={{ color: 'var(--color-text-muted)' }}>
        <div>
          <span className="font-medium" style={{ color: functionColors[0] }}>Forward:</span>{' '}
          z = {vals.z.toFixed(4)}, a = σ(z) = {vals.a.toFixed(4)}, L = (a − y)² = {vals.L.toFixed(4)}
        </div>
        <div>
          <span className="font-medium" style={{ color: functionColors[1] }}>Backward:</span>{' '}
          ∂L/∂a = {vals.dLda.toFixed(4)}, ∂a/∂z = σ&apos;(z) = {vals.dadz.toFixed(4)}, ∂L/∂w = {vals.dLdw.toFixed(4)}, ∂L/∂b = {vals.dLdb.toFixed(4)}
        </div>
        <div className="font-medium" style={{ color: 'var(--color-text)' }}>
          Activation: {preset.formulaLabel}
        </div>
      </div>
    </div>
  );
}
