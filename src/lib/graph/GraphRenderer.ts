import type {
  GraphData,
  GraphForceOptions,
  GraphHoverPayload,
  GraphNodeSnapshot,
  GraphRendererOptions,
  GraphRenderOptions,
  GraphTheme,
  SimulationMessage,
  SimulationResultMessage,
} from "./types";

interface InternalNode {
  id: string;
  type: string;
  label: string;
  color: {
    fill: string;
    stroke: string;
  };
  weight: number;
  meta?: Record<string, unknown>;
  x: number;
  y: number;
  fx: number | null;
  fy: number | null;
  radius: number;
  fadeAlpha: number;
  forward: Record<string, InternalLink>;
  reverse: Record<string, InternalLink>;
}

interface InternalLink {
  source: InternalNode;
  target: InternalNode;
  fadeAlpha: number;
}

interface PointerState {
  mode: "idle" | "pan" | "drag-node";
  pointerId: number | null;
  nodeId: string | null;
  lastX: number;
  lastY: number;
  dragDistance: number;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 1.4;
const LERP = 0.15;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

const defaultRenderOptions: Required<GraphRenderOptions> = {
  nodeSizeMultiplier: 1,
  lineSizeMultiplier: 1,
  textFadeMultiplier: 1,
  showArrow: false,
};

const defaultForces: Required<GraphForceOptions> = {
  centerStrength: 0.015,
  linkStrength: 0.08,
  linkDistance: 120,
  repelStrength: 3800,
  collisionStrength: 0.2,
};

const isVisible = (
  bounds: { left: number; right: number; top: number; bottom: number },
  x: number,
  y: number,
  radius: number,
) =>
  !(
    x + radius < bounds.left ||
    x - radius > bounds.right ||
    y + radius < bounds.top ||
    y - radius > bounds.bottom
  );

const isPointInsideBounds = (
  bounds: { left: number; right: number; top: number; bottom: number },
  x: number,
  y: number,
) => x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;

const segmentsIntersect = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
) => {
  const abx = bx - ax;
  const aby = by - ay;
  const acx = cx - ax;
  const acy = cy - ay;
  const adx = dx - ax;
  const ady = dy - ay;
  const cdx = dx - cx;
  const cdy = dy - cy;
  const cax = ax - cx;
  const cay = ay - cy;
  const cbx = bx - cx;
  const cby = by - cy;
  const cross1 = abx * acy - aby * acx;
  const cross2 = abx * ady - aby * adx;
  const cross3 = cdx * cay - cdy * cax;
  const cross4 = cdx * cby - cdy * cbx;

  return cross1 === 0 || cross2 === 0 || cross3 === 0 || cross4 === 0
    ? false
    : cross1 > 0 !== cross2 > 0 && cross3 > 0 !== cross4 > 0;
};

const isSegmentVisible = (
  bounds: { left: number; right: number; top: number; bottom: number },
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => {
  if (isPointInsideBounds(bounds, x1, y1) || isPointInsideBounds(bounds, x2, y2)) {
    return true;
  }

  const lineBounds = {
    left: Math.min(x1, x2),
    right: Math.max(x1, x2),
    top: Math.min(y1, y2),
    bottom: Math.max(y1, y2),
  };

  if (
    lineBounds.right < bounds.left ||
    lineBounds.left > bounds.right ||
    lineBounds.bottom < bounds.top ||
    lineBounds.top > bounds.bottom
  ) {
    return false;
  }

  return (
    segmentsIntersect(x1, y1, x2, y2, bounds.left, bounds.top, bounds.right, bounds.top) ||
    segmentsIntersect(x1, y1, x2, y2, bounds.right, bounds.top, bounds.right, bounds.bottom) ||
    segmentsIntersect(x1, y1, x2, y2, bounds.right, bounds.bottom, bounds.left, bounds.bottom) ||
    segmentsIntersect(x1, y1, x2, y2, bounds.left, bounds.bottom, bounds.left, bounds.top)
  );
};

export const createGraphTheme = (element: HTMLElement): GraphTheme => {
  const style = getComputedStyle(element);
  const foreground = style.getPropertyValue("--foreground").trim() || "oklch(0.985 0 0)";
  const mutedForeground = style.getPropertyValue("--muted-foreground").trim() || "oklch(0.708 0 0)";
  const border = style.getPropertyValue("--border").trim() || "oklch(0.269 0 0)";
  const accent = style.getPropertyValue("--accent").trim() || "oklch(0.269 0 0)";
  const background = style.getPropertyValue("--background").trim() || "oklch(0.145 0 0)";

  return {
    background,
    fill: "rgba(148, 163, 184, 0.88)",
    fillFocused: "rgba(249, 115, 22, 0.95)",
    fillMuted: "rgba(100, 116, 139, 0.42)",
    line: `color-mix(in oklab, ${border} 72%, ${foreground} 28%)`,
    lineHighlight: `color-mix(in oklab, ${foreground} 86%, ${accent} 14%)`,
    arrow: foreground,
    text: foreground,
    textMuted: mutedForeground,
    ring: `color-mix(in oklab, ${foreground} 65%, ${accent} 35%)`,
  };
};

export class GraphRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly worker: Worker;
  private readonly container: HTMLElement;

  private width = 0;
  private height = 0;
  private panX = 0;
  private panY = 0;
  private scale = 0.42;
  private targetScale = 0.42;
  private nodeScale = Math.sqrt(1 / 0.42);
  private textAlpha = 0;
  private renderFrame: number | null = null;
  private hoverNode: InternalNode | null = null;
  private idleFrames = 0;
  private pointerState: PointerState = {
    mode: "idle",
    pointerId: null,
    nodeId: null,
    lastX: 0,
    lastY: 0,
    dragDistance: 0,
  };
  private nodes: InternalNode[] = [];
  private nodeById = new Map<string, InternalNode>();
  private links: InternalLink[] = [];
  private theme: GraphTheme;
  private renderOptions: Required<GraphRenderOptions>;
  private forces: Required<GraphForceOptions>;
  private readonly callbacks: GraphRendererOptions;

  constructor(container: HTMLElement, options: GraphRendererOptions) {
    this.container = container;
    this.callbacks = options;
    this.theme = options.theme;
    this.renderOptions = { ...defaultRenderOptions, ...options.renderOptions };
    this.forces = { ...defaultForces, ...options.forces };
    this.canvas = document.createElement("canvas");
    this.canvas.className = "h-full w-full touch-none";
    this.context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.worker = new Worker(new URL("./graphSimulation.worker.ts", import.meta.url), {
      type: "module",
    });

    this.container.appendChild(this.canvas);
    this.attachEvents();
    this.worker.onmessage = (event: MessageEvent<SimulationResultMessage>) => {
      const result = event.data;
      const positions = new Float32Array(result.buffer);

      for (let index = 0; index < result.id.length; index += 1) {
        const node = this.nodeById.get(result.id[index]);
        if (!node) {
          continue;
        }

        node.x = positions[index * 2];
        node.y = positions[index * 2 + 1];
        if (node.fx !== null) {
          node.x = node.fx;
        }
        if (node.fy !== null) {
          node.y = node.fy;
        }
      }

      this.requestRender();
    };

    this.onResize();
    this.setForces(this.forces);
  }

  destroy() {
    this.worker.terminate();
    this.detachEvents();
    if (this.renderFrame !== null) {
      window.cancelAnimationFrame(this.renderFrame);
    }
    this.canvas.remove();
  }

  setTheme(theme: GraphTheme) {
    this.theme = theme;
    this.requestRender();
  }

  setRenderOptions(options: GraphRenderOptions) {
    this.renderOptions = { ...this.renderOptions, ...options };
    for (const node of this.nodes) {
      node.radius = this.getNodeRadius(node.weight);
    }
    this.requestRender();
  }

  setForces(forces: GraphForceOptions) {
    this.forces = { ...this.forces, ...forces };
    const message: SimulationMessage = {
      forces: this.forces,
      alpha: 0.18,
      run: true,
    };
    this.worker.postMessage(message);
  }

  onResize() {
    const rect = this.container.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    this.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    if (this.panX === 0 && this.panY === 0) {
      this.panX = rect.width / 2;
      this.panY = rect.height / 2;
    }
    this.requestRender();
  }

  setData(data: GraphData) {
    const nextNodes = data.nodes;
    const removedIds = new Set<string>();

    for (const existing of this.nodes) {
      if (!nextNodes[existing.id]) {
        removedIds.add(existing.id);
      }
    }

    this.nodes = this.nodes.filter((node) => !removedIds.has(node.id));
    for (const removedId of removedIds) {
      this.nodeById.delete(removedId);
    }

    const newNodes: InternalNode[] = [];
    for (const [id, input] of Object.entries(nextNodes)) {
      const existing = this.nodeById.get(id);
      const weight = input.weight ?? (Object.keys(input.links).length || 1);
      if (existing) {
        existing.type = input.type ?? "";
        existing.label = input.label ?? id;
        existing.meta = input.meta;
        existing.weight = weight;
        existing.radius = this.getNodeRadius(weight);
        existing.color = {
          fill: input.color?.fill ?? this.theme.fill,
          stroke: input.color?.stroke ?? input.color?.fill ?? this.theme.ring,
        };
        existing.forward = {};
        existing.reverse = {};
        continue;
      }

      const created: InternalNode = {
        id,
        type: input.type ?? "",
        label: input.label ?? id,
        color: {
          fill: input.color?.fill ?? this.theme.fill,
          stroke: input.color?.stroke ?? input.color?.fill ?? this.theme.ring,
        },
        weight,
        meta: input.meta,
        x: 0,
        y: 0,
        fx: null,
        fy: null,
        radius: this.getNodeRadius(weight),
        fadeAlpha: 0,
        forward: {},
        reverse: {},
      };
      this.nodes.push(created);
      this.nodeById.set(id, created);
      newNodes.push(created);
    }

    this.links = [];
    for (const node of this.nodes) {
      const input = nextNodes[node.id];
      if (!input) {
        continue;
      }

      for (const targetId of Object.keys(input.links)) {
        const target = this.nodeById.get(targetId);
        if (!target) {
          continue;
        }
        const link: InternalLink = {
          source: node,
          target,
          fadeAlpha: 0,
        };
        this.links.push(link);
        node.forward[target.id] = link;
        target.reverse[node.id] = link;
      }
    }

    this.seedNewNodes(newNodes);

    const payloadNodes: Record<string, { position: [number, number] | false; radius: number }> = {};
    for (const node of this.nodes) {
      payloadNodes[node.id] = {
        position: newNodes.includes(node) ? [node.x, node.y] : false,
        radius: node.radius,
      };
    }

    const payloadLinks = this.links.map(
      (link) => [link.source.id, link.target.id] as [string, string],
    );
    const message: SimulationMessage = {
      nodes: payloadNodes,
      links: payloadLinks,
      alpha: 0.3,
      run: true,
    };
    this.worker.postMessage(message);
    this.requestRender();
  }

  private getNodeRadius(weight: number) {
    const base = Math.max(8, Math.min(6 + Math.sqrt(weight + 1) * 2.6, 30));
    return base * this.renderOptions.nodeSizeMultiplier;
  }

  private seedNewNodes(newNodes: InternalNode[]) {
    if (newNodes.length === 0) {
      return;
    }

    const existingRadius = this.nodes.reduce((max, node) => {
      const distance = Math.hypot(node.x, node.y);
      return Math.max(max, distance);
    }, 0);
    const outerRadius = Math.max(180, existingRadius + Math.sqrt(newNodes.length) * 100);

    for (const node of newNodes) {
      const relatedIds = Object.keys(node.forward).concat(Object.keys(node.reverse));
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      for (const relatedId of relatedIds) {
        const related = this.nodeById.get(relatedId);
        if (!related || related === node) {
          continue;
        }

        sumX += related.x;
        sumY += related.y;
        count += 1;
      }

      if (count > 0) {
        node.x = sumX / count + (Math.random() - 0.5) * 120;
        node.y = sumY / count + (Math.random() - 0.5) * 120;
        continue;
      }

      const angle = Math.random() * Math.PI * 2;
      const distance = outerRadius + Math.random() * 80;
      node.x = Math.cos(angle) * distance;
      node.y = Math.sin(angle) * distance;
    }
  }

  private attachEvents() {
    this.canvas.addEventListener("contextmenu", this.handleContextMenu);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  private detachEvents() {
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.removeEventListener("wheel", this.handleWheel);
  }

  private readonly handleContextMenu = (event: MouseEvent) => {
    const hit = this.findNodeAtClientPosition(event.clientX, event.clientY);
    if (!hit) {
      return;
    }

    event.preventDefault();
    this.callbacks.onNodeRightClick?.(this.toSnapshot(hit.node));
  };

  private readonly handlePointerDown = (event: PointerEvent) => {
    const hit = this.findNodeAtClientPosition(event.clientX, event.clientY);
    this.pointerState = {
      mode: hit ? "drag-node" : "pan",
      pointerId: event.pointerId,
      nodeId: hit?.node.id ?? null,
      lastX: event.clientX,
      lastY: event.clientY,
      dragDistance: 0,
    };

    if (hit && event.button === 0) {
      const world = this.toWorld(hit.x, hit.y);
      hit.node.fx = world.x;
      hit.node.fy = world.y;
      const message: SimulationMessage = {
        forceNode: { id: hit.node.id, x: world.x, y: world.y },
        alpha: 0.25,
        alphaTarget: 0.15,
        run: true,
      };
      this.worker.postMessage(message);
    }

    this.canvas.setPointerCapture(event.pointerId);
  };

  private readonly handlePointerMove = (event: PointerEvent) => {
    const deltaX = event.clientX - this.pointerState.lastX;
    const deltaY = event.clientY - this.pointerState.lastY;

    if (this.pointerState.pointerId === event.pointerId) {
      if (this.pointerState.mode === "pan") {
        this.panX += deltaX;
        this.panY += deltaY;
        this.requestRender();
      }

      if (this.pointerState.mode === "drag-node" && this.pointerState.nodeId) {
        const node = this.nodeById.get(this.pointerState.nodeId);
        if (node) {
          const rect = this.canvas.getBoundingClientRect();
          const world = this.toWorld(event.clientX - rect.left, event.clientY - rect.top);
          node.fx = world.x;
          node.fy = world.y;
          const message: SimulationMessage = {
            forceNode: { id: node.id, x: world.x, y: world.y },
            alpha: 0.25,
            alphaTarget: 0.15,
            run: true,
          };
          this.worker.postMessage(message);
          this.requestRender();
        }
      }
    }

    this.pointerState = {
      ...this.pointerState,
      lastX: event.clientX,
      lastY: event.clientY,
      dragDistance: this.pointerState.dragDistance + Math.hypot(deltaX, deltaY),
    };

    this.updateHover(event.clientX, event.clientY);
  };

  private readonly handlePointerUp = (event: PointerEvent) => {
    const { nodeId, mode, dragDistance } = this.pointerState;
    if (mode === "drag-node" && nodeId) {
      const node = this.nodeById.get(nodeId);
      if (node) {
        node.fx = null;
        node.fy = null;
        const message: SimulationMessage = {
          forceNode: { id: node.id, x: null, y: null },
          alphaTarget: 0,
          run: true,
        };
        this.worker.postMessage(message);

        if (dragDistance < 6 && event.button === 0) {
          this.callbacks.onNodeClick?.(this.toSnapshot(node));
        }
      }
    }

    this.pointerState = {
      mode: "idle",
      pointerId: null,
      nodeId: null,
      lastX: event.clientX,
      lastY: event.clientY,
      dragDistance: 0,
    };

    this.updateHover(event.clientX, event.clientY);
  };

  private readonly handlePointerLeave = () => {
    if (this.hoverNode) {
      this.hoverNode = null;
      this.callbacks.onNodeUnhover?.();
      this.requestRender();
    }
  };

  private readonly handleWheel = (event: WheelEvent) => {
    event.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const world = this.toWorld(localX, localY);
    const factor = event.deltaY > 0 ? 0.9 : 1.1;

    this.targetScale = clamp(this.targetScale * factor, MIN_SCALE, MAX_SCALE);
    this.scale = this.targetScale;
    this.nodeScale = Math.sqrt(1 / this.scale);
    this.textAlpha = clamp(Math.log2(this.scale) + 1 - this.renderOptions.textFadeMultiplier, 0, 1);
    this.panX = localX - world.x * this.scale;
    this.panY = localY - world.y * this.scale;
    this.updateHover(event.clientX, event.clientY);
    this.requestRender();
  };

  private toWorld(screenX: number, screenY: number) {
    return {
      x: (screenX - this.panX) / this.scale,
      y: (screenY - this.panY) / this.scale,
    };
  }

  private findNodeAtClientPosition(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const world = this.toWorld(localX, localY);

    for (let index = this.nodes.length - 1; index >= 0; index -= 1) {
      const node = this.nodes[index];
      const radius = node.radius * this.nodeScale + 10 / this.scale;
      const dx = node.x - world.x;
      const dy = node.y - world.y;
      if (dx * dx + dy * dy <= radius * radius) {
        return { node, x: localX, y: localY };
      }
    }

    return null;
  }

  private updateHover(clientX: number, clientY: number) {
    const hit = this.findNodeAtClientPosition(clientX, clientY);
    if (!hit) {
      if (this.hoverNode) {
        this.hoverNode = null;
        this.callbacks.onNodeUnhover?.();
        this.requestRender();
      }
      this.canvas.style.cursor = this.pointerState.mode === "pan" ? "grabbing" : "grab";
      return;
    }

    const previousHover = this.hoverNode;
    this.hoverNode = hit.node;
    this.canvas.style.cursor = hit.node.meta?.hasContent ? "pointer" : "grab";
    const payload: GraphHoverPayload = {
      node: this.toSnapshot(hit.node),
      x: hit.x,
      y: hit.y,
    };
    this.callbacks.onNodeHover?.(payload);
    if (previousHover !== hit.node) {
      this.requestRender();
    }
  }

  private toSnapshot(node: InternalNode): GraphNodeSnapshot {
    return {
      id: node.id,
      label: node.label,
      type: node.type,
      meta: node.meta,
    };
  }

  private requestRender() {
    this.idleFrames = 0;
    if (this.renderFrame !== null) {
      return;
    }
    this.renderFrame = window.requestAnimationFrame(() => {
      this.renderFrame = null;
      this.render();
    });
  }

  private render() {
    if (this.width === 0 || this.height === 0) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const context = this.context;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);

    this.scale = lerp(this.scale, this.targetScale, 0.22);
    this.nodeScale = Math.sqrt(1 / this.scale);
    this.textAlpha = clamp(Math.log2(this.scale) + 1 - this.renderOptions.textFadeMultiplier, 0, 1);

    const viewport = {
      left: -this.panX / this.scale,
      right: (-this.panX + this.width) / this.scale,
      top: -this.panY / this.scale,
      bottom: (-this.panY + this.height) / this.scale,
    };

    context.save();
    context.translate(this.panX, this.panY);
    context.scale(this.scale, this.scale);

    const highlight = this.hoverNode;

    for (const link of this.links) {
      const source = link.source;
      const target = link.target;
      const related = !highlight || highlight === source || highlight === target;
      link.fadeAlpha = lerp(link.fadeAlpha, related ? 1 : 0.14, LERP);
      const sourceRadius = source.radius * this.nodeScale;
      const targetRadius = target.radius * this.nodeScale;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.hypot(dx, dy) || 1;
      const nx = dx / distance;
      const ny = dy / distance;
      const startX = source.x + nx * sourceRadius;
      const startY = source.y + ny * sourceRadius;
      const endX = target.x - nx * targetRadius;
      const endY = target.y - ny * targetRadius;

      if (!isSegmentVisible(viewport, startX, startY, endX, endY)) {
        continue;
      }

      context.strokeStyle = highlight && related ? this.theme.lineHighlight : this.theme.line;
      context.globalAlpha = link.fadeAlpha * 0.9;
      context.lineWidth = Math.max(
        1 / this.scale,
        this.renderOptions.lineSizeMultiplier / this.scale,
      );
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.stroke();

      if (this.renderOptions.showArrow && distance > 20) {
        const arrowSize = 4.5 / this.scale;
        context.fillStyle = this.theme.arrow;
        context.beginPath();
        context.moveTo(endX, endY);
        context.lineTo(
          endX - nx * arrowSize - ny * arrowSize * 0.7,
          endY - ny * arrowSize + nx * arrowSize * 0.7,
        );
        context.lineTo(
          endX - nx * arrowSize + ny * arrowSize * 0.7,
          endY - ny * arrowSize - nx * arrowSize * 0.7,
        );
        context.closePath();
        context.fill();
      }
    }

    for (const node of this.nodes) {
      const related =
        !highlight ||
        highlight === node ||
        node.forward[highlight.id] !== undefined ||
        node.reverse[highlight.id] !== undefined;
      node.fadeAlpha = lerp(node.fadeAlpha, related ? 1 : 0.18, LERP);
      const radius = node.radius * this.nodeScale;

      if (!isVisible(viewport, node.x, node.y, radius + 24 / this.scale)) {
        continue;
      }

      context.globalAlpha = node.fadeAlpha;
      context.fillStyle = highlight === node ? this.theme.fillFocused : node.color.fill;
      context.strokeStyle = node.color.stroke;
      context.lineWidth = Math.max(1 / this.scale, 1.2 / this.scale);
      context.beginPath();
      context.arc(node.x, node.y, radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();

      if (highlight === node) {
        context.strokeStyle = this.theme.ring;
        context.lineWidth = Math.max(1.5 / this.scale, 2 / this.scale);
        context.beginPath();
        context.arc(node.x, node.y, radius + 4 / this.scale, 0, Math.PI * 2);
        context.stroke();
      }
    }

    for (const node of this.nodes) {
      const shouldShowLabel =
        this.textAlpha > 0.1 ||
        highlight === node ||
        (highlight !== null &&
          (node.forward[highlight.id] !== undefined || node.reverse[highlight.id] !== undefined));

      if (!shouldShowLabel) {
        continue;
      }

      const radius = node.radius * this.nodeScale;
      if (!isVisible(viewport, node.x, node.y, radius + 60 / this.scale)) {
        continue;
      }

      context.globalAlpha =
        highlight === node ? 1 : Math.max(this.textAlpha, 0.18) * node.fadeAlpha;
      context.fillStyle = highlight === node ? this.theme.text : this.theme.textMuted;
      context.font = `${12 / this.scale}px "JetBrains Mono", ui-monospace, monospace`;
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText(node.label, node.x, node.y + radius + 8 / this.scale);
    }

    context.restore();
    context.globalAlpha = 1;

    if (
      this.idleFrames < 6 ||
      this.hoverNode !== null ||
      Math.abs(this.scale - this.targetScale) > 0.002
    ) {
      this.idleFrames += 1;
      this.requestRender();
    }
  }
}
