import type { DocumentationGraph } from "@/types";

export interface GraphNodeLayout {
  path: string;
  title: string;
  parentPath?: string;
  parentIndex: number | null;
  entryType?: string;
  hasContent: boolean;
  hasChildren: boolean;
  depth: number;
  degree: number;
  groupPath: string | null;
  groupX: number;
  groupY: number;
  groupRadius: number;
  isGroupAnchor: boolean;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

export interface GraphEdgeLayout {
  sourceIndex: number;
  targetIndex: number;
}

export interface GraphLayoutScene {
  nodes: GraphNodeLayout[];
  edges: GraphEdgeLayout[];
}

const polar = (index: number, total: number, radius: number) => {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
};

export const buildGraphLayout = (graph: DocumentationGraph): GraphLayoutScene => {
  const nodeIndexByPath = new Map<string, number>();
  const nodeByPath = new Map(graph.nodes.map((node) => [node.path, node]));
  const parentByPath = new Map(graph.nodes.map((node) => [node.path, node.parentPath]));

  const depthByPath = new Map<string, number>();

  const resolveDepth = (path: string): number => {
    const cachedDepth = depthByPath.get(path);
    if (cachedDepth !== undefined) {
      return cachedDepth;
    }

    const parentPath = parentByPath.get(path);
    if (!parentPath || !nodeByPath.has(parentPath)) {
      depthByPath.set(path, 0);
      return 0;
    }

    const depth = resolveDepth(parentPath) + 1;
    depthByPath.set(path, depth);
    return depth;
  };

  graph.nodes.forEach((node) => {
    resolveDepth(node.path);
  });

  const degreeByPath = new Map<string, number>();
  graph.edges.forEach((edge) => {
    degreeByPath.set(edge.source, (degreeByPath.get(edge.source) ?? 0) + 1);
    degreeByPath.set(edge.target, (degreeByPath.get(edge.target) ?? 0) + 1);
  });

  const isSectionNode = (path: string) => {
    const node = nodeByPath.get(path);
    if (!node) {
      return false;
    }

    return Boolean(node.hasChildren) && (depthByPath.get(path) ?? 0) > 0;
  };

  const resolveSectionGroup = (path: string): string | null => {
    if (isSectionNode(path)) {
      return path;
    }

    let currentPath = parentByPath.get(path);
    while (currentPath) {
      if (isSectionNode(currentPath)) {
        return currentPath;
      }
      currentPath = parentByPath.get(currentPath);
    }

    return null;
  };

  const sectionPaths = graph.nodes
    .map((node) => node.path)
    .filter((path) => isSectionNode(path))
    .sort((left, right) => {
      const leftTitle = nodeByPath.get(left)?.title ?? left;
      const rightTitle = nodeByPath.get(right)?.title ?? right;
      return leftTitle.localeCompare(rightTitle);
    });

  const sectionAnchorByPath = new Map<string, { x: number; y: number }>();
  sectionPaths.forEach((path, index) => {
    sectionAnchorByPath.set(
      path,
      polar(index, sectionPaths.length, sectionPaths.length > 1 ? 360 : 0),
    );
  });

  const groupMembersByPath = new Map<string, string[]>();
  graph.nodes.forEach((node) => {
    const groupPath = resolveSectionGroup(node.path);
    if (!groupPath) {
      return;
    }

    const members = groupMembersByPath.get(groupPath);
    if (members) {
      members.push(node.path);
    } else {
      groupMembersByPath.set(groupPath, [node.path]);
    }
  });

  const nodes: GraphNodeLayout[] = graph.nodes.map((node, index) => {
    nodeIndexByPath.set(node.path, index);

    const depth = depthByPath.get(node.path) ?? 0;
    const degree = degreeByPath.get(node.path) ?? 0;
    const groupPath = resolveSectionGroup(node.path);
    const groupAnchor = groupPath
      ? (sectionAnchorByPath.get(groupPath) ?? { x: 0, y: 0 })
      : { x: 0, y: 0 };
    const groupMembers = groupPath
      ? (groupMembersByPath.get(groupPath) ?? [node.path])
      : [node.path];
    const groupRadius = groupPath ? Math.max(92, 58 + Math.sqrt(groupMembers.length) * 24) : 0;
    const isGroupAnchor = groupPath === node.path;
    const radius = node.hasChildren ? 7 : node.hasContent ? 5 : 4;

    const localIndex = groupMembers.indexOf(node.path);
    const localOrbit =
      !groupPath || isGroupAnchor
        ? { x: 0, y: 0 }
        : polar(localIndex, Math.max(groupMembers.length, 5), groupRadius * 0.58);

    const rootOrbit =
      !groupPath && depth === 0 ? { x: 0, y: 0 } : { x: localOrbit.x, y: localOrbit.y };

    return {
      path: node.path,
      title: node.title,
      parentPath: node.parentPath,
      parentIndex: null,
      entryType: node.entryType,
      hasContent: node.hasContent,
      hasChildren: node.hasChildren,
      depth,
      degree,
      groupPath,
      groupX: groupAnchor.x,
      groupY: groupAnchor.y,
      groupRadius,
      isGroupAnchor,
      radius,
      x: groupAnchor.x + rootOrbit.x,
      y: groupAnchor.y + rootOrbit.y,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    };
  });

  const edges = graph.edges.flatMap((edge) => {
    const sourceIndex = nodeIndexByPath.get(edge.source);
    const targetIndex = nodeIndexByPath.get(edge.target);
    if (sourceIndex === undefined || targetIndex === undefined) {
      return [];
    }

    return [{ sourceIndex, targetIndex }];
  });

  nodes.forEach((node) => {
    node.parentIndex = node.parentPath ? (nodeIndexByPath.get(node.parentPath) ?? null) : null;
  });

  return { nodes, edges };
};
