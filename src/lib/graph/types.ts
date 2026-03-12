export interface GraphColor {
  fill: string;
  stroke?: string;
}

export interface GraphNodeInput {
  id: string;
  type?: string;
  label?: string;
  color?: GraphColor;
  weight?: number;
  links: Record<string, true>;
  meta?: Record<string, unknown>;
}

export interface GraphData {
  nodes: Record<string, GraphNodeInput>;
}

export interface GraphForceOptions {
  centerStrength?: number;
  linkStrength?: number;
  linkDistance?: number;
  repelStrength?: number;
  collisionStrength?: number;
}

export interface GraphRenderOptions {
  nodeSizeMultiplier?: number;
  lineSizeMultiplier?: number;
  textFadeMultiplier?: number;
  showArrow?: boolean;
}

export interface GraphTheme {
  background: string;
  fill: string;
  fillFocused: string;
  fillMuted: string;
  line: string;
  lineHighlight: string;
  arrow: string;
  text: string;
  textMuted: string;
  ring: string;
}

export interface GraphNodeSnapshot {
  id: string;
  label: string;
  type: string;
  meta?: Record<string, unknown>;
}

export interface GraphHoverPayload {
  node: GraphNodeSnapshot;
  x: number;
  y: number;
}

export interface GraphRendererCallbacks {
  onNodeClick?: (node: GraphNodeSnapshot) => void;
  onNodeRightClick?: (node: GraphNodeSnapshot) => void;
  onNodeHover?: (payload: GraphHoverPayload) => void;
  onNodeUnhover?: () => void;
}

export interface GraphRendererOptions extends GraphRendererCallbacks {
  theme: GraphTheme;
  renderOptions?: GraphRenderOptions;
  forces?: GraphForceOptions;
}

export interface SimulationSeedNode {
  position: [number, number] | false;
  radius: number;
}

export interface SimulationDataMessage {
  nodes: Record<string, SimulationSeedNode>;
  links: Array<[string, string]>;
  alpha?: number;
  run?: boolean;
}

export interface SimulationForceNodeMessage {
  forceNode: {
    id: string;
    x: number | null;
    y: number | null;
  };
  alpha?: number;
  alphaTarget?: number;
  run?: boolean;
}

export interface SimulationForcesMessage {
  forces: GraphForceOptions;
  alpha?: number;
  run?: boolean;
}

export type SimulationMessage =
  | SimulationDataMessage
  | SimulationForceNodeMessage
  | SimulationForcesMessage;

export interface SimulationResultMessage {
  id: string[];
  buffer: ArrayBuffer;
}
