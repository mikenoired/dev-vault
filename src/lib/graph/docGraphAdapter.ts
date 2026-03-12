import type {
  DocumentationGraph,
  DocumentationGraphNode,
  GraphColor,
  GraphData,
  GraphNodeInput,
} from "@/types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hashHue = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }

  return hash % 360;
};

const resolveRootPath = (path: string, parentByPath: Map<string, string | undefined>): string => {
  let current = path;
  let parent = parentByPath.get(path);

  while (parent) {
    current = parent;
    parent = parentByPath.get(parent);
  }

  return current;
};

const getNodeColor = (
  node: DocumentationGraphNode,
  parentByPath: Map<string, string | undefined>,
): GraphColor => {
  const rootPath = resolveRootPath(node.path, parentByPath);
  const hue = hashHue(rootPath);

  if (!node.parentPath) {
    return {
      fill: `hsla(${hue} 74% 54% / 0.92)`,
      stroke: `hsla(${hue} 82% 74% / 0.98)`,
    };
  }

  if (node.hasChildren) {
    return {
      fill: `hsla(${hue} 78% 62% / 0.76)`,
      stroke: `hsla(${hue} 85% 72% / 0.94)`,
    };
  }

  return {
    fill: node.hasContent ? `hsla(${hue} 72% 68% / 0.58)` : `hsla(${hue} 18% 48% / 0.52)`,
    stroke: node.hasContent ? `hsla(${hue} 80% 82% / 0.82)` : `hsla(${hue} 18% 72% / 0.6)`,
  };
};

export const adaptDocumentationGraph = (graph: DocumentationGraph): GraphData => {
  const nodes: Record<string, GraphNodeInput> = {};
  const degreeByPath = new Map<string, number>();
  const parentByPath = new Map(graph.nodes.map((node) => [node.path, node.parentPath]));

  for (const edge of graph.edges) {
    degreeByPath.set(edge.source, (degreeByPath.get(edge.source) ?? 0) + 1);
    degreeByPath.set(edge.target, (degreeByPath.get(edge.target) ?? 0) + 1);
  }

  for (const node of graph.nodes) {
    const degree = degreeByPath.get(node.path) ?? 0;
    nodes[node.path] = {
      id: node.path,
      type: node.hasChildren ? "branch" : node.hasContent ? "page" : "leaf",
      label: node.title,
      color: getNodeColor(node, parentByPath),
      weight: clamp(degree + (node.hasChildren ? 2 : 0) + (node.hasContent ? 1 : 0), 1, 18),
      links: {},
      meta: {
        path: node.path,
        title: node.title,
        entryType: node.entryType,
        parentPath: node.parentPath,
        hasContent: node.hasContent,
        hasChildren: node.hasChildren,
      },
    };
  }

  for (const edge of graph.edges) {
    const source = nodes[edge.source];
    if (source) {
      source.links[edge.target] = true;
    }
  }

  return { nodes };
};
