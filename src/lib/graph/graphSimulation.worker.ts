import type {
  GraphForceOptions,
  SimulationMessage,
  SimulationResultMessage,
  SimulationSeedNode,
} from "./types";

interface SimNode {
  id: string;
  index: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  radius: number;
}

interface SimLink {
  source: SimNode;
  target: SimNode;
}

const nodesById = new Map<string, SimNode>();
let nodes: SimNode[] = [];
let links: SimLink[] = [];
let alpha = 0;
let alphaTarget = 0;
let timer: number | null = null;

const forceConfig: Required<GraphForceOptions> = {
  centerStrength: 0.015,
  linkStrength: 0.08,
  linkDistance: 120,
  repelStrength: 3800,
  collisionStrength: 0.2,
};

const ensureNode = (id: string, seed: SimulationSeedNode): SimNode => {
  const existing = nodesById.get(id);
  if (existing) {
    existing.radius = seed.radius;
    if (seed.position) {
      existing.x = seed.position[0];
      existing.y = seed.position[1];
    }
    return existing;
  }

  const next: SimNode = {
    id,
    index: 0,
    x: seed.position ? seed.position[0] : 0,
    y: seed.position ? seed.position[1] : 0,
    vx: 0,
    vy: 0,
    fx: null,
    fy: null,
    radius: seed.radius,
  };
  nodesById.set(id, next);
  return next;
};

const rebuildNodes = (inputNodes: Record<string, SimulationSeedNode>) => {
  const nextIds = new Set(Object.keys(inputNodes));

  for (const existingId of nodesById.keys()) {
    if (!nextIds.has(existingId)) {
      nodesById.delete(existingId);
    }
  }

  nodes = Object.entries(inputNodes).map(([id, seed]) => ensureNode(id, seed));
  nodes.forEach((node, index) => {
    node.index = index;
  });
};

const rebuildLinks = (inputLinks: Array<[string, string]>) => {
  links = inputLinks.flatMap(([sourceId, targetId]) => {
    const source = nodesById.get(sourceId);
    const target = nodesById.get(targetId);
    if (!source || !target) {
      return [];
    }

    return [{ source, target }];
  });
};

const applyCenterForce = () => {
  for (const node of nodes) {
    if (node.fx === null) {
      node.vx += -node.x * forceConfig.centerStrength * alpha;
    }
    if (node.fy === null) {
      node.vy += -node.y * forceConfig.centerStrength * alpha;
    }
  }
};

const applyLinkForce = () => {
  for (const link of links) {
    const source = link.source;
    const target = link.target;
    let dx = target.x - source.x;
    let dy = target.y - source.y;
    let distance = Math.hypot(dx, dy);

    if (distance < 0.001) {
      dx = (Math.random() - 0.5) * 0.1;
      dy = (Math.random() - 0.5) * 0.1;
      distance = Math.hypot(dx, dy);
    }

    const desired =
      forceConfig.linkDistance + Math.min(source.radius + target.radius, forceConfig.linkDistance);
    const delta = distance - desired;
    const strength = forceConfig.linkStrength * alpha;
    const nx = dx / distance;
    const ny = dy / distance;
    const force = delta * strength;

    if (source.fx === null) {
      source.vx += nx * force;
      source.vy += ny * force;
    }
    if (target.fx === null) {
      target.vx -= nx * force;
      target.vy -= ny * force;
    }
  }
};

const applyNodeForces = () => {
  for (let sourceIndex = 0; sourceIndex < nodes.length; sourceIndex += 1) {
    const source = nodes[sourceIndex];

    for (let targetIndex = sourceIndex + 1; targetIndex < nodes.length; targetIndex += 1) {
      const target = nodes[targetIndex];
      let dx = target.x - source.x;
      let dy = target.y - source.y;
      let distanceSq = dx * dx + dy * dy;

      if (distanceSq < 0.01) {
        dx = (Math.random() - 0.5) * 0.2;
        dy = (Math.random() - 0.5) * 0.2;
        distanceSq = dx * dx + dy * dy;
      }

      const distance = Math.sqrt(distanceSq);
      const nx = dx / distance;
      const ny = dy / distance;
      const repel = (forceConfig.repelStrength * alpha) / distanceSq;
      const minDistance = source.radius + target.radius + 18;
      const overlap = minDistance - distance;
      const collision = overlap > 0 ? overlap * forceConfig.collisionStrength * alpha : 0;
      const force = repel + collision;

      if (source.fx === null) {
        source.vx -= nx * force;
        source.vy -= ny * force;
      }
      if (target.fx === null) {
        target.vx += nx * force;
        target.vy += ny * force;
      }
    }
  }
};

const integrate = () => {
  for (const node of nodes) {
    if (node.fx !== null) {
      node.x = node.fx;
      node.vx = 0;
    } else {
      node.vx *= 0.86;
      node.x += node.vx;
    }

    if (node.fy !== null) {
      node.y = node.fy;
      node.vy = 0;
    } else {
      node.vy *= 0.86;
      node.y += node.vy;
    }
  }
};

const publish = () => {
  const payload = new Float32Array(nodes.length * 2);
  const ids: string[] = new Array(nodes.length);

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    ids[index] = node.id;
    payload[index * 2] = node.x;
    payload[index * 2 + 1] = node.y;
  }

  const message: SimulationResultMessage = {
    id: ids,
    buffer: payload.buffer,
  };
  self.postMessage(message, [payload.buffer]);
};

const tick = () => {
  timer = null;

  if (nodes.length === 0) {
    return;
  }

  alpha += (alphaTarget - alpha) * 0.025;
  alpha *= 0.997;

  if (alpha < 0.001) {
    alpha = 0;
    return;
  }

  applyCenterForce();
  applyLinkForce();
  applyNodeForces();
  integrate();
  publish();
  schedule();
};

const schedule = () => {
  if (timer !== null) {
    return;
  }

  timer = self.setTimeout(tick, 16);
};

self.onmessage = (event: MessageEvent<SimulationMessage>) => {
  const message = event.data;

  if ("nodes" in message) {
    rebuildNodes(message.nodes);
    rebuildLinks(message.links);
  }

  if ("forceNode" in message) {
    const target = nodesById.get(message.forceNode.id);
    if (target) {
      target.fx = message.forceNode.x;
      target.fy = message.forceNode.y;
    }
  }

  if ("forces" in message) {
    forceConfig.centerStrength = message.forces.centerStrength ?? forceConfig.centerStrength;
    forceConfig.linkStrength = message.forces.linkStrength ?? forceConfig.linkStrength;
    forceConfig.linkDistance = message.forces.linkDistance ?? forceConfig.linkDistance;
    forceConfig.repelStrength = message.forces.repelStrength ?? forceConfig.repelStrength;
    forceConfig.collisionStrength =
      message.forces.collisionStrength ?? forceConfig.collisionStrength;
  }

  if (typeof message.alpha === "number") {
    alpha = Math.max(alpha, message.alpha);
  }

  if ("alphaTarget" in message && typeof message.alphaTarget === "number") {
    alphaTarget = message.alphaTarget;
  }

  if (message.run) {
    schedule();
  }
};
