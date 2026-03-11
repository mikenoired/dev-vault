import { useEffect, useMemo, useRef, useState } from "react";
import type { DocumentationGraph } from "@/types";
import { buildGraphLayout, type GraphEdgeLayout, type GraphNodeLayout } from "./layout";

interface DocGraphCanvasProps {
  graph: DocumentationGraph;
  onOpenNode: (path: string, title: string) => void;
}

interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

interface TooltipState {
  node: GraphNodeLayout;
  x: number;
  y: number;
}

interface PointerState {
  mode: "idle" | "pan" | "drag-node";
  pointerId: number | null;
  lastX: number;
  lastY: number;
  nodePath: string | null;
  dragDistance: number;
}

const MIN_SCALE = 0.45;
const MAX_SCALE = 2.8;
const CELL_SIZE = 70;
const GROUP_PULL = 0.012;
const ANCHOR_PULL = 0.02;
const PARENT_PULL = 0.0042;
const GROUP_BOUNDARY_PULL = 0.04;
const ROOT_CENTER_PULL = 0.003;
const MAX_VELOCITY = 18;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hashColor = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  const hue = hash % 360;
  return {
    fill: `hsla(${hue} 75% 58% / 0.08)`,
    stroke: `hsla(${hue} 82% 72% / 0.18)`,
  };
};

const screenToWorld = (x: number, y: number, viewport: ViewportState) => ({
  x: (x - viewport.x) / viewport.scale,
  y: (y - viewport.y) / viewport.scale,
});

const edgeColor = "rgba(148, 163, 184, 0.2)";
const labelColor = "rgba(226, 232, 240, 0.92)";

export const DocGraphCanvas = ({ graph, onOpenNode }: DocGraphCanvasProps) => {
  const scene = useMemo(() => buildGraphLayout(graph), [graph]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<GraphNodeLayout[]>(scene.nodes);
  const edgesRef = useRef<GraphEdgeLayout[]>(scene.edges);
  const viewportRef = useRef<ViewportState>({ x: 0, y: 0, scale: 1 });
  const pointerStateRef = useRef<PointerState>({
    mode: "idle",
    pointerId: null,
    lastX: 0,
    lastY: 0,
    nodePath: null,
    dragDistance: 0,
  });
  const suppressClickRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const alphaRef = useRef(0.14);
  const hoveredNodeRef = useRef<GraphNodeLayout | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    nodesRef.current = scene.nodes.map((node) => ({ ...node }));
    edgesRef.current = scene.edges;
    alphaRef.current = 0.14;
  }, [scene]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;
      viewportRef.current = {
        x: width / 2,
        y: height / 2,
        scale: clamp(viewportRef.current.scale || 1, MIN_SCALE, MAX_SCALE),
      };
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    canvas.style.cursor = "grab";

    const findNodeAtPosition = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const world = screenToWorld(x, y, viewportRef.current);

      for (let index = nodesRef.current.length - 1; index >= 0; index -= 1) {
        const node = nodesRef.current[index];
        const dx = node.x - world.x;
        const dy = node.y - world.y;
        const hitRadius = (node.radius + 7) / viewportRef.current.scale;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          return { node, x, y };
        }
      }

      return null;
    };

    const applyRepulsion = (nodes: GraphNodeLayout[]) => {
      const grid = new Map<string, number[]>();

      nodes.forEach((node, index) => {
        const cellX = Math.floor(node.x / CELL_SIZE);
        const cellY = Math.floor(node.y / CELL_SIZE);
        const key = `${cellX}:${cellY}`;
        const bucket = grid.get(key);
        if (bucket) {
          bucket.push(index);
        } else {
          grid.set(key, [index]);
        }
      });

      const offsets = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
        [-1, 1],
      ] as const;

      grid.forEach((indices, key) => {
        const [cellX, cellY] = key.split(":").map(Number);

        for (const [offsetX, offsetY] of offsets) {
          const neighbor = grid.get(`${cellX + offsetX}:${cellY + offsetY}`);
          if (!neighbor) {
            continue;
          }

          for (const sourceIndex of indices) {
            for (const targetIndex of neighbor) {
              if (sourceIndex >= targetIndex) {
                continue;
              }

              const source = nodes[sourceIndex];
              const target = nodes[targetIndex];
              let dx = target.x - source.x;
              let dy = target.y - source.y;
              let distanceSq = dx * dx + dy * dy;

              if (distanceSq < 0.01) {
                dx = (Math.random() - 0.5) * 0.5;
                dy = (Math.random() - 0.5) * 0.5;
                distanceSq = dx * dx + dy * dy;
              }

              const distance = Math.sqrt(distanceSq);
              const minDistance = (source.radius + target.radius + 18) * 1.4;
              const repulsion = 1600 / distanceSq;
              const collision = distance < minDistance ? (minDistance - distance) * 0.04 : 0;
              const force = repulsion + collision;
              const normalizedX = dx / distance;
              const normalizedY = dy / distance;

              source.vx -= normalizedX * force;
              source.vy -= normalizedY * force;
              target.vx += normalizedX * force;
              target.vy += normalizedY * force;
            }
          }
        }
      });
    };

    const tick = () => {
      const rect = container.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (
        canvas.width !== Math.floor(width * ratio) ||
        canvas.height !== Math.floor(height * ratio)
      ) {
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const viewport = viewportRef.current;

      applyRepulsion(nodes);

      edges.forEach((edge) => {
        const source = nodes[edge.sourceIndex];
        const target = nodes[edge.targetIndex];
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const spring = 0.0009;
        const restLength = 80 + Math.min(source.depth, target.depth) * 14;

        source.vx += dx * spring;
        source.vy += dy * spring;
        target.vx -= dx * spring;
        target.vy -= dy * spring;

        const distance = Math.hypot(dx, dy) || 1;
        const correction = (distance - restLength) * 0.003;
        const normalX = dx / distance;
        const normalY = dy / distance;

        source.vx += normalX * correction;
        source.vy += normalY * correction;
        target.vx -= normalX * correction;
        target.vy -= normalY * correction;
      });

      nodes.forEach((node) => {
        if (node.groupPath) {
          const groupPull = node.isGroupAnchor ? ANCHOR_PULL : GROUP_PULL + node.depth * 0.0005;
          node.vx += (node.groupX - node.x) * groupPull;
          node.vy += (node.groupY - node.y) * groupPull;
        }

        if (node.groupPath && !node.isGroupAnchor) {
          const groupDx = node.x - node.groupX;
          const groupDy = node.y - node.groupY;
          const groupDistance = Math.hypot(groupDx, groupDy) || 1;
          const maxDistance = node.groupRadius;

          if (groupDistance > maxDistance) {
            const overflow = groupDistance - maxDistance;
            const normalX = groupDx / groupDistance;
            const normalY = groupDy / groupDistance;
            node.vx -= normalX * overflow * GROUP_BOUNDARY_PULL;
            node.vy -= normalY * overflow * GROUP_BOUNDARY_PULL;
          }
        }

        if (node.parentIndex !== null) {
          const parent = nodes[node.parentIndex];
          node.vx += (parent.x - node.x) * PARENT_PULL;
          node.vy += (parent.y - node.y) * PARENT_PULL;
        }

        if (!node.groupPath && node.depth === 0) {
          node.vx -= node.x * ROOT_CENTER_PULL;
          node.vy -= node.y * ROOT_CENTER_PULL;
        }

        if (node.fx !== null && node.fy !== null) {
          node.x = node.fx;
          node.y = node.fy;
          node.vx = 0;
          node.vy = 0;
          return;
        }

        if (node.groupPath && node.isGroupAnchor) {
          node.x = node.groupX;
          node.y = node.groupY;
          node.vx = 0;
          node.vy = 0;
          return;
        }

        const velocity = Math.hypot(node.vx, node.vy);
        if (velocity > MAX_VELOCITY) {
          const scale = MAX_VELOCITY / velocity;
          node.vx *= scale;
          node.vy *= scale;
        }

        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx * alphaRef.current;
        node.y += node.vy * alphaRef.current;

        if (node.groupPath && !node.isGroupAnchor) {
          const groupDx = node.x - node.groupX;
          const groupDy = node.y - node.groupY;
          const groupDistance = Math.hypot(groupDx, groupDy) || 1;
          const maxDistance = node.groupRadius * 0.92;

          if (groupDistance > maxDistance) {
            const normalX = groupDx / groupDistance;
            const normalY = groupDy / groupDistance;
            node.x = node.groupX + normalX * maxDistance;
            node.y = node.groupY + normalY * maxDistance;
            node.vx *= 0.35;
            node.vy *= 0.35;
          }
        }
      });

      alphaRef.current = Math.max(alphaRef.current * 0.994, 0.035);

      context.save();
      context.translate(viewport.x, viewport.y);
      context.scale(viewport.scale, viewport.scale);

      const groupSummary = new Map<
        string,
        {
          x: number;
          y: number;
          anchorX: number;
          anchorY: number;
          count: number;
          spread: number;
          radius: number;
          color: ReturnType<typeof hashColor>;
        }
      >();

      nodes.forEach((node) => {
        if (!node.groupPath) {
          return;
        }

        const summary = groupSummary.get(node.groupPath);
        if (summary) {
          summary.x += node.x;
          summary.y += node.y;
          if (node.isGroupAnchor) {
            summary.anchorX = node.x;
            summary.anchorY = node.y;
          }
          summary.count += 1;
          summary.spread = Math.max(summary.spread, 42 + node.depth * 18);
          summary.radius = Math.max(summary.radius, node.groupRadius);
          return;
        }

        groupSummary.set(node.groupPath, {
          x: node.x,
          y: node.y,
          anchorX: node.isGroupAnchor ? node.x : node.groupX,
          anchorY: node.isGroupAnchor ? node.y : node.groupY,
          count: 1,
          spread: 42 + node.depth * 18,
          radius: node.groupRadius,
          color: hashColor(node.groupPath),
        });
      });

      groupSummary.forEach((summary) => {
        const centerX = summary.anchorX;
        const centerY = summary.anchorY;
        const radius = Math.max(summary.radius, summary.spread);

        context.beginPath();
        context.fillStyle = summary.color.fill;
        context.strokeStyle = summary.color.stroke;
        context.lineWidth = 1 / viewport.scale;
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      });

      context.strokeStyle = edgeColor;
      context.lineWidth = 1 / viewport.scale;
      context.beginPath();
      edges.forEach((edge) => {
        const source = nodes[edge.sourceIndex];
        const target = nodes[edge.targetIndex];
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
      });
      context.stroke();

      const labelOpacity = clamp((viewport.scale - 0.85) / 0.9, 0, 1);

      nodes.forEach((node) => {
        const isHovered = hoveredNodeRef.current?.path === node.path;
        context.beginPath();
        context.fillStyle = node.parentPath
          ? node.hasContent
            ? isHovered
              ? "#f97316"
              : "#fb923c"
            : isHovered
              ? "#38bdf8"
              : "#64748b"
          : isHovered
            ? "#22c55e"
            : "#a3e635";
        context.arc(
          node.x,
          node.y,
          node.radius / viewport.scale + 2.5 / viewport.scale,
          0,
          Math.PI * 2,
        );
        context.fill();
      });

      if (labelOpacity > 0.02) {
        context.font = `${12 / viewport.scale}px ui-sans-serif, system-ui, sans-serif`;
        context.textBaseline = "middle";
        nodes.forEach((node) => {
          context.fillStyle = labelColor.replace("0.92", `${labelOpacity.toFixed(2)}`);
          context.fillText(node.title, node.x + 10 / viewport.scale, node.y);
        });
      }

      context.restore();

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    const updateHover = (clientX: number, clientY: number) => {
      const hit = findNodeAtPosition(clientX, clientY);
      hoveredNodeRef.current = hit?.node ?? null;
      if (!hit) {
        setTooltip(null);
        canvas.style.cursor = "grab";
        return;
      }

      canvas.style.cursor = hit.node.hasContent ? "pointer" : "grab";
      setTooltip({
        node: hit.node,
        x: hit.x,
        y: hit.y,
      });
    };

    const handlePointerLeave = () => {
      hoveredNodeRef.current = null;
      setTooltip(null);
      canvas.style.cursor = "grab";
    };

    const handlePointerDown = (event: PointerEvent) => {
      const hit = findNodeAtPosition(event.clientX, event.clientY);
      suppressClickRef.current = false;
      pointerStateRef.current = {
        mode: hit ? "drag-node" : "pan",
        pointerId: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
        nodePath: hit?.node.path ?? null,
        dragDistance: 0,
      };

      if (hit) {
        const world = screenToWorld(hit.x, hit.y, viewportRef.current);
        hit.node.fx = world.x;
        hit.node.fy = world.y;
        alphaRef.current = 0.16;
      }

      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const pointerState = pointerStateRef.current;
      const deltaX = event.clientX - pointerState.lastX;
      const deltaY = event.clientY - pointerState.lastY;

      if (pointerState.pointerId === event.pointerId && pointerState.mode === "pan") {
        viewportRef.current = {
          ...viewportRef.current,
          x: viewportRef.current.x + deltaX,
          y: viewportRef.current.y + deltaY,
        };
      }

      if (pointerState.pointerId === event.pointerId && pointerState.mode === "drag-node") {
        const targetNode = nodesRef.current.find((node) => node.path === pointerState.nodePath);
        if (targetNode) {
          const rect = canvas.getBoundingClientRect();
          const world = screenToWorld(
            event.clientX - rect.left,
            event.clientY - rect.top,
            viewportRef.current,
          );
          targetNode.fx = world.x;
          targetNode.fy = world.y;
          alphaRef.current = 0.16;
        }
      }

      pointerStateRef.current = {
        ...pointerState,
        lastX: event.clientX,
        lastY: event.clientY,
        dragDistance: pointerState.dragDistance + Math.hypot(deltaX, deltaY),
      };
      suppressClickRef.current = pointerStateRef.current.dragDistance > 6;

      updateHover(event.clientX, event.clientY);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const pointerState = pointerStateRef.current;

      if (pointerState.mode === "drag-node" && pointerState.nodePath) {
        const targetNode = nodesRef.current.find((node) => node.path === pointerState.nodePath);
        if (targetNode) {
          targetNode.fx = null;
          targetNode.fy = null;
        }
      }

      pointerStateRef.current = {
        mode: "idle",
        pointerId: null,
        lastX: event.clientX,
        lastY: event.clientY,
        nodePath: null,
        dragDistance: 0,
      };

      updateHover(event.clientX, event.clientY);
    };

    const handleClick = (event: MouseEvent) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }

      const hit = findNodeAtPosition(event.clientX, event.clientY);
      if (!hit?.node.hasContent) {
        return;
      }

      onOpenNode(hit.node.path, hit.node.title);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const worldBefore = screenToWorld(cursorX, cursorY, viewportRef.current);
      const scaleFactor = event.deltaY > 0 ? 0.92 : 1.08;
      const nextScale = clamp(viewportRef.current.scale * scaleFactor, MIN_SCALE, MAX_SCALE);

      viewportRef.current = {
        scale: nextScale,
        x: cursorX - worldBefore.x * nextScale,
        y: cursorY - worldBefore.y * nextScale,
      };

      updateHover(event.clientX, event.clientY);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [onOpenNode]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-accent">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-300 backdrop-blur">
        <div>Drag: pan or move node</div>
        <div>Wheel: zoom</div>
      </div>
      {tooltip ? (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-white/10 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-lg"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 10,
          }}
        >
          <div className="font-medium">{tooltip.node.title}</div>
          <div className="text-slate-400">
            {tooltip.node.hasContent ? "Страница" : "Секция"}
            {tooltip.node.entryType ? ` • ${tooltip.node.entryType}` : ""}
          </div>
        </div>
      ) : null}
    </div>
  );
};
