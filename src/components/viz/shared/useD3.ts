import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

/**
 * Hook that wraps D3 rendering in a React-safe way.
 * Returns a ref to attach to an SVG element.
 * Calls renderFn(d3Selection) whenever deps change.
 */
export function useD3<T extends SVGSVGElement | HTMLDivElement>(
  renderFn: (selection: d3.Selection<T, unknown, null, undefined>) => void,
  deps: React.DependencyList,
): React.RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (ref.current) {
      renderFn(d3.select(ref.current) as d3.Selection<T, unknown, null, undefined>);
    }
  }, deps);

  return ref;
}
