import graphData from '../data/curriculum-graph.json';

export interface ConnectedTopic {
  id: string;
  label: string;
  url: string;
  domain: string;
  relationship?: string;
}

export interface ConnectionAnnotation {
  topic: string;
  relationship?: string;
}

type GraphNode = (typeof graphData.nodes)[number];

const nodeMap: Map<string, GraphNode> = new Map(
  graphData.nodes.map((n) => [n.id, n]),
);

const prereqMap: Map<string, string[]> = new Map();
const downstreamMap: Map<string, string[]> = new Map();

for (const edge of graphData.edges) {
  const prereqs = prereqMap.get(edge.target);
  if (prereqs) prereqs.push(edge.source);
  else prereqMap.set(edge.target, [edge.source]);

  const downstream = downstreamMap.get(edge.source);
  if (downstream) downstream.push(edge.target);
  else downstreamMap.set(edge.source, [edge.target]);
}

function enrich(
  ids: string[],
  annotations: ConnectionAnnotation[] = [],
): ConnectedTopic[] {
  const annotationMap = new Map(annotations.map((a) => [a.topic, a.relationship]));
  const enriched = ids
    .map((id) => {
      const node = nodeMap.get(id);
      if (!node) return null;
      return {
        id: node.id,
        label: node.label,
        url: node.url,
        domain: node.domain,
        relationship: annotationMap.get(id),
      };
    })
    .filter((n): n is ConnectedTopic => n !== null);

  // Stable sort: annotated entries first, graph-only entries after.
  // Authors annotate the cards worth prose — they deserve the visual priority.
  return enriched.sort((a, b) => {
    const aHas = a.relationship ? 0 : 1;
    const bHas = b.relationship ? 0 : 1;
    return aHas - bHas;
  });
}

/**
 * Returns the prereqs (and annotations) for a topic.
 *
 * Semantics: we union graph edges with annotation topics. An annotation that
 * references a topic not in `graphPrereqs` still renders as a card — this is
 * intentional so authors can highlight *conceptual* predecessors the graph
 * doesn't explicitly encode as edges. The `scripts/check-connections.mjs`
 * validator surfaces such entries as warnings so typos are caught.
 */
export function getPrerequisites(
  slug: string,
  annotations: ConnectionAnnotation[] = [],
): ConnectedTopic[] {
  const graphPrereqs = prereqMap.get(slug) ?? [];
  const annotationTopics = annotations.map((a) => a.topic);
  const allIds = [...new Set([...graphPrereqs, ...annotationTopics])];
  return enrich(allIds, annotations);
}

/**
 * Returns the downstream topics (and annotations) for a topic.
 *
 * Same union semantics as `getPrerequisites`: annotations that reference a
 * non-successor topic still render — useful for leaf topics (e.g.
 * surface-integrals, approximation-theory) that have no direct graph
 * successors but are conceptually followed by topics in other tracks. The
 * validator warns on these so typos don't silently produce cards.
 */
export function getDownstream(
  slug: string,
  annotations: ConnectionAnnotation[] = [],
): ConnectedTopic[] {
  const graphDownstream = downstreamMap.get(slug) ?? [];
  const annotationTopics = annotations.map((a) => a.topic);
  const allIds = [...new Set([...graphDownstream, ...annotationTopics])];
  return enrich(allIds, annotations);
}
