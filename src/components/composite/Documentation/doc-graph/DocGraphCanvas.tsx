import { useEffect, useEffectEvent, useRef } from "react";
import { adaptDocumentationGraph } from "@/lib/graph/docGraphAdapter";
import { createGraphTheme, GraphRenderer } from "@/lib/graph/GraphRenderer";
import type { GraphHoverPayload, GraphNodeSnapshot } from "@/lib/graph/types";
import type { DocumentationGraph } from "@/types";

interface DocGraphCanvasProps {
  graph: DocumentationGraph;
  onOpenNode: (path: string, title: string) => void;
}

const getTooltipSubtitle = (node: GraphNodeSnapshot) => {
  const meta = node.meta;
  const hasContent = meta?.hasContent === true;
  const entryType = typeof meta?.entryType === "string" ? meta.entryType : null;
  const kind = hasContent ? "Страница" : "Секция";

  return entryType ? `${kind} • ${entryType}` : kind;
};

export const DocGraphCanvas = ({ graph, onOpenNode }: DocGraphCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipTitleRef = useRef<HTMLDivElement | null>(null);
  const tooltipSubtitleRef = useRef<HTMLDivElement | null>(null);
  const tooltipHintRef = useRef<HTMLDivElement | null>(null);

  const handleOpenNode = useEffectEvent((node: GraphNodeSnapshot) => {
    const path = typeof node.meta?.path === "string" ? node.meta.path : node.id;
    const hasContent = node.meta?.hasContent === true;
    if (!hasContent) {
      return;
    }

    onOpenNode(path, node.label);
  });

  const handleHover = useEffectEvent((payload: GraphHoverPayload) => {
    const tooltip = tooltipRef.current;
    const title = tooltipTitleRef.current;
    const subtitle = tooltipSubtitleRef.current;
    const hint = tooltipHintRef.current;
    if (!tooltip || !title || !subtitle || !hint) {
      return;
    }

    const hasContent = payload.node.meta?.hasContent === true;
    title.textContent = payload.node.label;
    subtitle.textContent = getTooltipSubtitle(payload.node);
    hint.textContent = hasContent ? "Клик: открыть страницу" : "";
    hint.style.display = hasContent ? "block" : "none";
    tooltip.style.transform = `translate(${payload.x + 14}px, ${payload.y - 10}px)`;
    tooltip.style.opacity = "1";
  });

  const handleUnhover = useEffectEvent(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) {
      return;
    }

    tooltip.style.opacity = "0";
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const renderer = new GraphRenderer(container, {
      theme: createGraphTheme(container),
      renderOptions: {
        lineSizeMultiplier: 1.4,
        textFadeMultiplier: 0.82,
      },
      forces: {
        centerStrength: 0.01,
        linkStrength: 0.06,
        linkDistance: 128,
        repelStrength: 4200,
        collisionStrength: 0.24,
      },
      onNodeClick: handleOpenNode,
      onNodeHover: handleHover,
      onNodeUnhover: handleUnhover,
    });

    rendererRef.current = renderer;
    renderer.setData(adaptDocumentationGraph(graph));

    const observer = new ResizeObserver(() => {
      renderer.setTheme(createGraphTheme(container));
      renderer.onResize();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [handleHover, handleOpenNode, handleUnhover]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }

    const container = containerRef.current;
    if (container) {
      renderer.setTheme(createGraphTheme(container));
    }
    renderer.setData(adaptDocumentationGraph(graph));
  }, [graph]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-accent/35">
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-10 rounded-md border border-border bg-background/95 px-3 py-2 text-xs text-foreground opacity-0 shadow-lg transition-opacity"
        style={{ transform: "translate(0px, 0px)" }}
      >
        <div ref={tooltipTitleRef} className="font-medium" />
        <div ref={tooltipSubtitleRef} className="text-muted-foreground" />
        <div ref={tooltipHintRef} className="mt-1 text-[11px] text-orange-400" />
      </div>
    </div>
  );
};
