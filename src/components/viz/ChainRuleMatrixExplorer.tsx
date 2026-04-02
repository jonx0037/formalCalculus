import { useState, useMemo, useCallback, useRef, useEffect, type ChangeEvent } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from './shared/useResizeObserver';
import { useD3 } from './shared/useD3';
import { CHAIN_RULE_PRESETS } from '../../data/jacobian-data';
import { multivariateChainRule, linearMapComposition } from './shared/multivariate';
import { functionColors } from './shared/colorScales';

const margin = { top: 16, right: 16, bottom: 16, left: 16 };
const NODE_W = 80;
const NODE_H = 40;
const ARROW_GAP = 60;

export default function ChainRuleMatrixExplorer() {
  const { ref: containerRef, width } = useResizeObserver<HTMLDivElement>();

  const [presetIdx, setPresetIdx] = useState(0);
  const [mode, setMode] = useState<'forward' | 'reverse'>('reverse');
  const [step, setStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const preset = CHAIN_RULE_PRESETS[presetIdx];

  // Input sliders — one per input dimension
  const [inputValues, setInputValues] = useState<number[]>(preset.defaultInput);

  const handlePresetChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    setPresetIdx(idx);
    setInputValues(CHAIN_RULE_PRESETS[idx].defaultInput);
    setStep(0);
    setIsRunning(false);
  }, []);

  // Compute the chain rule
  const chainResult = useMemo(() => {
    return multivariateChainRule(
      preset.layers.map((l) => ({ f: l.f, J: l.J })),
      inputValues,
    );
  }, [presetIdx, inputValues]);

  // Compute the multiplication order for the current mode
  const multiplicationSteps = useMemo(() => {
    const n = chainResult.steps.length;
    if (n === 0) return [];

    const jacobians = chainResult.steps.map((s) => s.jacobian);
    const steps: Array<{ label: string; product: number[][] }> = [];

    if (mode === 'reverse') {
      // Left-to-right: start from J_last, multiply leftward
      let product = jacobians[n - 1].map((row) => [...row]);
      steps.push({ label: preset.layers[n - 1].label, product: product.map((r) => [...r]) });
      for (let k = n - 2; k >= 0; k--) {
        product = linearMapComposition(product, jacobians[k]);
        steps.push({
          label: `${preset.layers[n - 1].label}…${preset.layers[k].label}`,
          product: product.map((r) => [...r]),
        });
      }
    } else {
      // Right-to-left: start from J_first, multiply rightward
      let product = jacobians[0].map((row) => [...row]);
      steps.push({ label: preset.layers[0].label, product: product.map((r) => [...r]) });
      for (let k = 1; k < n; k++) {
        product = linearMapComposition(jacobians[k], product);
        steps.push({
          label: `${preset.layers[k].label}…${preset.layers[0].label}`,
          product: product.map((r) => [...r]),
        });
      }
    }
    return steps;
  }, [chainResult, mode, presetIdx]);

  const maxStep = multiplicationSteps.length;

  // Animation
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setStep((prev) => {
          if (prev >= maxStep) {
            setIsRunning(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, maxStep]);

  // SVG height based on content
  const svgHeight = Math.min(width * 0.45, 340);

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      svg.selectAll('*').remove();
      if (width <= 0 || svgHeight <= 0) return;

      const innerW = width - margin.left - margin.right;
      const innerH = svgHeight - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const nLayers = preset.layers.length;
      const totalNodes = nLayers + 1; // input node + layer nodes
      const spacing = innerW / (totalNodes + 0.5);

      // Draw nodes
      const nodeY = innerH * 0.2;

      // Input node
      g.append('rect')
        .attr('x', spacing * 0.5 - NODE_W / 2).attr('y', nodeY - NODE_H / 2)
        .attr('width', NODE_W).attr('height', NODE_H)
        .attr('rx', 6)
        .attr('fill', '#F1F5F9').attr('stroke', '#94A3B8').attr('stroke-width', 1.5);
      g.append('text')
        .attr('x', spacing * 0.5).attr('y', nodeY + 4)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px').style('font-weight', '600').style('fill', '#334155')
        .text('Input');

      for (let k = 0; k < nLayers; k++) {
        const cx = spacing * (k + 1.5);

        // Determine highlight based on step and mode
        let highlighted = false;
        if (step > 0) {
          if (mode === 'reverse') {
            highlighted = k >= nLayers - step;
          } else {
            highlighted = k < step;
          }
        }

        // Arrow from previous node
        const prevCx = spacing * (k + 0.5);
        g.append('line')
          .attr('x1', prevCx + NODE_W / 2 + 4).attr('y1', nodeY)
          .attr('x2', cx - NODE_W / 2 - 4).attr('y2', nodeY)
          .attr('stroke', highlighted ? functionColors[0] : '#CBD5E1')
          .attr('stroke-width', highlighted ? 2 : 1.5)
          .attr('marker-end', 'url(#arrowhead)');

        // Node rectangle
        g.append('rect')
          .attr('x', cx - NODE_W / 2).attr('y', nodeY - NODE_H / 2)
          .attr('width', NODE_W).attr('height', NODE_H)
          .attr('rx', 6)
          .attr('fill', highlighted ? '#DBEAFE' : '#F1F5F9')
          .attr('stroke', highlighted ? functionColors[0] : '#94A3B8')
          .attr('stroke-width', highlighted ? 2 : 1.5);

        // Node label
        g.append('text')
          .attr('x', cx).attr('y', nodeY + 4)
          .attr('text-anchor', 'middle')
          .style('font-size', '12px').style('font-weight', '600')
          .style('fill', highlighted ? '#1E40AF' : '#334155')
          .text(preset.layers[k].label);

        // Jacobian matrix below node
        const J = chainResult.steps[k]?.jacobian;
        if (J) {
          const matY = nodeY + NODE_H / 2 + 16;
          const matStr = J.map((row) => row.map((v) => v.toFixed(2)).join('  ')).join('\n');
          const lines = matStr.split('\n');
          lines.forEach((line, li) => {
            g.append('text')
              .attr('x', cx).attr('y', matY + li * 13)
              .attr('text-anchor', 'middle')
              .style('font-size', '9px').style('font-family', 'monospace')
              .style('fill', highlighted ? '#1E40AF' : '#64748B')
              .text(`[${line.trim()}]`);
          });
        }
      }

      // Arrowhead marker
      svg.append('defs').append('marker')
        .attr('id', 'arrowhead').attr('markerWidth', 8).attr('markerHeight', 6)
        .attr('refX', 8).attr('refY', 3).attr('orient', 'auto')
        .append('polygon').attr('points', '0 0, 8 3, 0 6').attr('fill', '#94A3B8');

      // Accumulated product display at bottom
      if (step > 0 && step <= multiplicationSteps.length) {
        const currentStep = multiplicationSteps[step - 1];
        const prodY = innerH - 20;
        g.append('text')
          .attr('x', innerW / 2).attr('y', prodY - 20)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px').style('font-weight', '600').style('fill', '#1E40AF')
          .text(`Step ${step}/${maxStep}: J_${currentStep.label}`);

        const matStr = currentStep.product
          .map((row) => row.map((v) => v.toFixed(3)).join('  '))
          .join('  |  ');
        g.append('text')
          .attr('x', innerW / 2).attr('y', prodY)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px').style('font-family', 'monospace')
          .style('fill', '#1E40AF')
          .text(`[${matStr}]`);
      }

      // Mode indicator
      const modeLabel = mode === 'reverse' ? 'Reverse mode (← VJPs)' : 'Forward mode (→ JVPs)';
      g.append('text')
        .attr('x', innerW / 2).attr('y', innerH)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px').style('fill', '#94A3B8')
        .text(modeLabel);
    },
    [width, svgHeight, presetIdx, inputValues, chainResult, step, mode, multiplicationSteps],
  );

  const fmt = (v: number) => v.toFixed(3);

  return (
    <div ref={containerRef} className="w-full my-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-700">Preset:</span>
          <select value={presetIdx} onChange={handlePresetChange}
            className="border border-slate-300 rounded px-2 py-1 text-sm bg-white">
            {CHAIN_RULE_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>{p.label}</option>
            ))}
          </select>
        </label>

        {inputValues.map((val, i) => (
          <label key={i} className="flex items-center gap-1.5">
            <span className="font-medium text-slate-700">x{i + 1}:</span>
            <input type="range" min={-2} max={2} step={0.1} value={val}
              onChange={(e) => {
                const newVals = [...inputValues];
                newVals[i] = Number(e.target.value);
                setInputValues(newVals);
                setStep(0);
              }}
              className="w-16" />
            <span className="font-mono text-slate-500 w-10">{val.toFixed(1)}</span>
          </label>
        ))}

        <label className="flex items-center gap-1.5">
          <span className="font-medium text-slate-700">Mode:</span>
          <select value={mode} onChange={(e) => { setMode(e.target.value as 'forward' | 'reverse'); setStep(0); }}
            className="border border-slate-300 rounded px-2 py-1 text-sm bg-white">
            <option value="reverse">Reverse (backprop)</option>
            <option value="forward">Forward</option>
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep((s) => Math.min(s + 1, maxStep))}
            disabled={step >= maxStep}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40"
          >
            Step
          </button>
          <button
            onClick={() => { setStep(0); setIsRunning(true); }}
            className="px-3 py-1 text-sm border border-blue-400 text-blue-700 rounded hover:bg-blue-50"
          >
            Run
          </button>
          <button
            onClick={() => { setIsRunning(false); setStep(0); }}
            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* SVG */}
      {width > 0 && (
        <svg ref={svgRef} width={width} height={svgHeight}
          className="border border-slate-200 rounded bg-white" />
      )}

      {/* Readout */}
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <div className="bg-slate-50 rounded p-2">
          <div className="text-xs font-medium text-slate-500 mb-1">Input</div>
          <div className="font-mono text-slate-800">
            ({inputValues.map(fmt).join(', ')})
          </div>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <div className="text-xs font-medium text-slate-500 mb-1">Output</div>
          <div className="font-mono text-slate-800">
            {chainResult.steps.length > 0
              ? `(${chainResult.steps[chainResult.steps.length - 1].outputPoint.map(fmt).join(', ')})`
              : '—'}
          </div>
        </div>
        <div className="bg-blue-50 rounded p-2">
          <div className="text-xs font-medium text-blue-600 mb-1">Final Jacobian</div>
          <div className="font-mono text-blue-900 text-xs">
            {chainResult.finalJacobian.map(
              (row, i) => <div key={i}>[{row.map(fmt).join(', ')}]</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
