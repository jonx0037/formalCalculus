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

function findNode(id: string) {
  return graphData.nodes.find((n) => n.id === id);
}

function enrich(
  ids: string[],
  annotations: ConnectionAnnotation[] = [],
): ConnectedTopic[] {
  const annotationMap = new Map(annotations.map((a) => [a.topic, a.relationship]));
  return ids
    .map((id) => {
      const node = findNode(id);
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
}

export function getPrerequisites(
  slug: string,
  annotations: ConnectionAnnotation[] = [],
): ConnectedTopic[] {
  const incomingIds = graphData.edges
    .filter((e) => e.target === slug)
    .map((e) => e.source);
  return enrich(incomingIds, annotations);
}

export function getDownstream(slug: string): ConnectedTopic[] {
  const outgoingIds = graphData.edges
    .filter((e) => e.source === slug)
    .map((e) => e.target);
  return enrich(outgoingIds);
}
