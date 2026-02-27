import { useEffect, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  applyNodeChanges,
  useNodes,
  type Node,
  type Edge,
  type EdgeProps,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Landmark, ShieldCheck } from 'lucide-react';
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';

const HUB_ID = 'CCP';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 96;
const HUB_MIN_WIDTH = NODE_WIDTH * 10; // elongated hub (doubled)
const EDGE_COLOR = '#002B51';
const EDGE_OFFSET = 22; // spacing between parallel edges on hub/participant borders
const PARTICIPANT_MARGIN = 16;
const HUB_MARGIN = 40;

type Point = { x: number; y: number };
type Size = { w: number; h: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function hubBorderPoint(
  hubCenter: Point,
  hubSize: Size,
  otherCenter: Point,
  offsetIndex: number,
  totalOffsets: number
): Point {
  const halfW = hubSize.w / 2;
  const halfH = hubSize.h / 2;
  const useTopEdge = otherCenter.y < hubCenter.y;
  const y = useTopEdge ? hubCenter.y - halfH : hubCenter.y + halfH;

  const cornerMargin = Math.min(60, hubSize.w * 0.2);
  const minX = hubCenter.x - halfW + cornerMargin;
  const maxX = hubCenter.x + halfW - cornerMargin;

  // Symmetric lane offsets
  const laneOffset =
    totalOffsets > 1 ? (offsetIndex - (totalOffsets - 1) / 2) * EDGE_OFFSET : 0;

  const x = clamp(otherCenter.x + laneOffset, minX, maxX);
  return { x, y };
}

/**
 * Pick a point on participant’s top/bottom border, aligned to other node’s x with mild spread.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function participantBorderPoint(
  nodeCenter: Point,
  nodeSize: Size,
  otherCenter: Point,
  offsetIndex: number,
  totalOffsets: number
): Point {
  const halfW = nodeSize.w / 2;
  const halfH = nodeSize.h / 2;

  const connectOnTop = otherCenter.y < nodeCenter.y;
  const y = connectOnTop ? nodeCenter.y - halfH : nodeCenter.y + halfH;

  const cornerMargin = Math.min(32, nodeSize.w * 0.16);
  const minX = nodeCenter.x - halfW + cornerMargin;
  const maxX = nodeCenter.x + halfW - cornerMargin;

  const laneGap = 12;
  const laneOffset =
    totalOffsets > 1 ? (offsetIndex - (totalOffsets - 1) / 2) * laneGap : 0;

  const x = clamp(otherCenter.x + laneOffset, minX, maxX);
  return { x, y };
}

/**
 * Intersect segment (from->to) with rect border; return hit closest to "to".
 */
function intersectLineWithRectBorder(from: Point, to: Point, rectCenter: Point, rectSize: Size): Point {
  const halfW = rectSize.w / 2;
  const halfH = rectSize.h / 2;

  const left = rectCenter.x - halfW;
  const right = rectCenter.x + halfW;
  const top = rectCenter.y - halfH;
  const bottom = rectCenter.y + halfH;

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const hits: Point[] = [];

  if (dx !== 0) {
    const tL = (left - from.x) / dx;
    const yL = from.y + tL * dy;
    if (tL >= 0 && tL <= 1 && yL >= top && yL <= bottom) hits.push({ x: left, y: yL });

    const tR = (right - from.x) / dx;
    const yR = from.y + tR * dy;
    if (tR >= 0 && tR <= 1 && yR >= top && yR <= bottom) hits.push({ x: right, y: yR });
  }

  if (dy !== 0) {
    const tT = (top - from.y) / dy;
    const xT = from.x + tT * dx;
    if (tT >= 0 && tT <= 1 && xT >= left && xT <= right) hits.push({ x: xT, y: top });

    const tB = (bottom - from.y) / dy;
    const xB = from.x + tB * dx;
    if (tB >= 0 && tB <= 1 && xB >= left && xB <= right) hits.push({ x: xB, y: bottom });
  }

  if (!hits.length) return to;

  let best = hits[0];
  let bestD = (best.x - to.x) ** 2 + (best.y - to.y) ** 2;
  for (let i = 1; i < hits.length; i++) {
    const h = hits[i];
    const d = (h.x - to.x) ** 2 + (h.y - to.y) ** 2;
    if (d < bestD) {
      best = h;
      bestD = d;
    }
  }
  return best;
}

/**
 * Compute a shared X axis for a vertical (perpendicular) edge, honoring lane offsets
 * and clamping to both participant and hub usable widths.
 */
function computeAxisX(
  participantX: number,
  hubX: number,
  laneOffset: number,
  participantHalfW: number,
  hubHalfW: number
) {
  const pMin = participantX - participantHalfW + PARTICIPANT_MARGIN;
  const pMax = participantX + participantHalfW - PARTICIPANT_MARGIN;

  const hMin = hubX - hubHalfW + HUB_MARGIN;
  const hMax = hubX + hubHalfW - HUB_MARGIN;

  // start from participant + lane offset, clamp to participant, then hub
  let x = clamp(participantX + laneOffset, pMin, pMax);
  x = clamp(x, hMin, hMax);
  return x;
}

/**
 * Custom straight edge with:
 * - hub-side anchor sliding along hub border (top/bottom) near participant projection
 * - participant-side clipped to its border
 * - symmetric offsets for parallel edges
 * - numbered label
 */
function WorkflowEdge(props: EdgeProps) {
  const { id, source, target, data, markerEnd } = props;

  // Get current node positions dynamically (updates when nodes are dragged)
  const nodes = useNodes();
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);

  if (!sourceNode || !targetNode) return null;

  const sourceId: string = data?.sourceId;

  const sourceIsHub = sourceId === HUB_ID;

  // Get actual node dimensions from node data (handles dynamic hub width)
  const sourceWidth = sourceNode.data?.width ?? NODE_WIDTH;
  const targetWidth = targetNode.data?.width ?? NODE_WIDTH;
  
  const sourceSize: Size = { w: sourceWidth, h: NODE_HEIGHT };
  const targetSize: Size = { w: targetWidth, h: NODE_HEIGHT };

  const offsetIndex = data?.offsetIndex ?? 0;
  const totalOffsets = data?.totalOffsets ?? 1;
  const laneOffset =
    totalOffsets > 1 ? (offsetIndex - (totalOffsets - 1) / 2) * EDGE_OFFSET : 0;

  // Determine arrow color based on exception status
  const hasException = data?.hasException ?? false;
  const isCleared = data?.isCleared ?? false;
  let arrowColor = EDGE_COLOR; // default color
  if (hasException) {
    arrowColor = '#ef4444'; // red for exception
  } else if (isCleared) {
    arrowColor = '#22c55e'; // green for cleared
  }

  // Calculate true node centers from positions (updates dynamically when dragged)
  const sourceCenter: Point = { 
    x: sourceNode.position.x + sourceWidth / 2, 
    y: sourceNode.position.y + NODE_HEIGHT / 2 
  };
  const targetCenter: Point = { 
    x: targetNode.position.x + targetWidth / 2, 
    y: targetNode.position.y + NODE_HEIGHT / 2 
  };

  // Decide which node is the participant (non-hub) to base the axis on
  const participantCenter = sourceIsHub ? targetCenter : sourceCenter;
  const hubCenter = sourceIsHub ? sourceCenter : targetCenter;

  const participantHalfW = (sourceIsHub ? targetWidth : sourceWidth) / 2;
  const hubHalfW = (sourceIsHub ? sourceWidth : targetWidth) / 2;

  const axisX = computeAxisX(
    participantCenter.x,
    hubCenter.x,
    laneOffset,
    participantHalfW,
    hubHalfW
  );

  // Start/end on borders, perpendicular (vertical) entry
  const halfHeight = NODE_HEIGHT / 2;
  const start = {
    x: axisX,
    y: sourceCenter.y + (targetCenter.y > sourceCenter.y ? halfHeight : -halfHeight)
  };

  const end = {
    x: axisX,
    y: targetCenter.y + (sourceCenter.y > targetCenter.y ? halfHeight : -halfHeight)
  };

  // Trim to exact rectangle borders using geometry
  const startClipped = intersectLineWithRectBorder(end, start, sourceCenter, sourceSize);
  const endClipped = intersectLineWithRectBorder(startClipped, end, targetCenter, targetSize);

  // Vertical polyline to keep perpendicular at both ends
  const midY = (startClipped.y + endClipped.y) / 2;
  const path = `M ${startClipped.x} ${startClipped.y} L ${axisX} ${midY} L ${axisX} ${endClipped.y}`;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke: EDGE_COLOR, strokeWidth: 2.25, strokeLinecap: 'round' }}
        markerEnd={{ type: MarkerType.ArrowClosed, color: EDGE_COLOR, width: 18, height: 18 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${axisX}px, ${(startClipped.y + endClipped.y) / 2}px)`,
            pointerEvents: 'none',
          }}
        >
          <div
            className="w-6 h-6 rounded-full border text-[11px] font-semibold flex items-center justify-center shadow-sm"
            style={{
              backgroundColor: hasException ? '#fecaca' : isCleared ? '#bbf7d0' : 'white',
              borderColor: hasException ? '#ef4444' : isCleared ? '#22c55e' : '#cbd5e1',
              color: hasException ? '#7f1d1d' : isCleared ? '#15803d' : '#000000',
              opacity: 0.9,
            }}
          >
            {data?.step ?? ''}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const EntityNode = ({ data }: { data: { isHub?: boolean; width?: number; label: string } }) => {
  const isHub = data.isHub;
  const width = data.width || NODE_WIDTH;

  return (
    <div
      className={`p-3 rounded-lg border-2 shadow-md bg-white flex flex-col justify-center cursor-grab active:cursor-grabbing text-center ${
        isHub ? 'border-[#002B51]' : 'border-slate-300'
      }`}
      style={{ width, height: NODE_HEIGHT, boxSizing: 'border-box' }}
    >
      <div className="flex items-center gap-2 mb-1 justify-center">
        {isHub ? (
          <ShieldCheck className="text-[#002B51]" size={14} />
        ) : (
          <Landmark className="text-black/50" size={14} />
        )}
        <span className="text-[8px] font-bold uppercase tracking-tight text-black/50">
          {isHub ? 'Central Clearing' : 'Participant'}
        </span>
      </div>
      <div className="text-xs font-bold text-black uppercase truncate">{data.label}</div>

      {/* hidden handles; geometry-based anchoring */}
      <Handle type="target" position={Position.Top} id="in-top" className="opacity-0" />
      <Handle type="source" position={Position.Top} id="out-top" className="opacity-0" />
      <Handle type="target" position={Position.Bottom} id="in-bottom" className="opacity-0" />
      <Handle type="source" position={Position.Bottom} id="out-bottom" className="opacity-0" />
    </div>
  );
};

const nodeTypes = { entity: EntityNode };
const edgeTypes = { workflow: WorkflowEdge };

interface Transaction {
  from: string;
  to: string;
  hasException?: boolean;
  isCleared?: boolean;
}

/**
 * ELK layout with constrained layers:
 * layer 0: top participants
 * layer 1: hub
 * layer 2: bottom participants
 */
async function generateElkLayout(participants: string[], transactions: Transaction[]) {
  try {
    const elk = new ELK();
    
    const topCount = participants.length <= 3 ? participants.length : Math.ceil(participants.length / 2);
    const bottomCount = participants.length - topCount;

    // Estimate hub width from widest row
    const rowWidth = (count: number) => (count > 0 ? count * NODE_WIDTH + (count - 1) * 40 : 0);
    const hubWidth = Math.max(HUB_MIN_WIDTH, rowWidth(topCount), rowWidth(bottomCount));

    const elkNodes: { id: string; width: number; height: number; layoutOptions?: Record<string, string> }[] = [
      {
        id: HUB_ID,
        width: hubWidth,
        height: NODE_HEIGHT,
        layoutOptions: { 'layered.layering.layer': '1' },
      },
    ];

    for (let i = 0; i < topCount; i++) {
      elkNodes.push({
        id: participants[i],
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        layoutOptions: { 'layered.layering.layer': '0' },
      });
    }
    for (let i = 0; i < bottomCount; i++) {
      elkNodes.push({
        id: participants[topCount + i],
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        layoutOptions: { 'layered.layering.layer': '2' },
      });
    }

    const elkEdges = transactions.map((tx, i) => ({
      id: `e-${i}`,
      sources: [tx.from],
      targets: [tx.to],
    }));

    const graph: ElkNode = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.layered.spacing.nodeNodeBetweenLayers': '180',
        'elk.spacing.nodeNode': '80',
        'elk.layered.layering.strategy': 'LONGEST_PATH',
      },
      children: elkNodes,
      edges: elkEdges,
    };

    console.log('ELK graph config:', { nodeCount: elkNodes.length, edgeCount: elkEdges.length });
    
    // Add timeout to prevent hanging
    const layoutPromise = elk.layout(graph);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('ELK layout timed out after 5 seconds')), 5000)
    );
    
    const layout = await Promise.race([layoutPromise, timeoutPromise]) as typeof graph;
    console.log('ELK layout result:', layout);

    // center layout horizontally around x=0
    const xs: number[] = [];
    layout.children?.forEach((n) => xs.push(n.x ?? 0));
    const xCenter = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    interface NodeLookupEntry {
      x: number;
      y: number;
      width: number;
    }
    const nodeLookup: Record<string, NodeLookupEntry> = {};
    layout.children?.forEach((n) => {
      const isHub = n.id === HUB_ID;
      const x = (n.x ?? 0) - xCenter;
      const y = n.y ?? 0;
      const width = isHub ? hubWidth : NODE_WIDTH;

      nodeLookup[n.id!] = { x, y, width };

      nodes.push({
        id: n.id!,
        type: 'entity',
        position: { x, y },
        data: { label: isHub ? 'Central Clearing House' : n.id, isHub, width },
        draggable: true,
        selectable: true,
      });
    });

    // Count edges per unordered pair for parallel offsets
    const pairCounts: Record<string, number> = {};
    layout.edges?.forEach((e) => {
      const s = e.sources[0];
      const t = e.targets[0];
      const key = [s, t].sort().join('::');
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    });

    const pairSeen: Record<string, number> = {};
    layout.edges?.forEach((e, idx) => {
      const sourceId = e.sources[0];
      const targetId = e.targets[0];
      const key = [sourceId, targetId].sort().join('::');

      const offsetIndex = pairSeen[key] || 0;
      const totalOffsets = pairCounts[key] || 1;
      pairSeen[key] = offsetIndex + 1;

      const sourceNode = nodeLookup[sourceId];
      const targetNode = nodeLookup[targetId];

      // Find the original transaction to get exception status
      const originalTransaction = transactions.find(
        tx => (tx.from === sourceId && tx.to === targetId) || 
              transactions.indexOf(tx) === idx
      );

      edges.push({
        id: e.id!,
        source: sourceId,
        target: targetId,
        type: 'workflow',
        data: {
          sourceId,
          targetId,
          step: idx + 1,
          offsetIndex,
          totalOffsets,
          sourceSize: { w: sourceNode.width ?? NODE_WIDTH, h: NODE_HEIGHT },
          targetSize: { w: targetNode.width ?? NODE_WIDTH, h: NODE_HEIGHT },
          hasException: originalTransaction?.hasException ?? false,
          isCleared: originalTransaction?.isCleared ?? false,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR, width: 18, height: 18 },
      });
    });

    console.log('✅ Generated visualization:', { nodeCount: nodes.length, edgeCount: edges.length });
    return { nodes, edges };
  } catch (error) {
    console.error('❌ Error in generateElkLayout:', error);
    
    // Fallback: Create simple manual layout
    console.log('⚠️  Falling back to manual layout');
    return createSimpleLayout(participants, transactions);
  }
}

/**
 * Create a simple layout when ELK fails
 */
function createSimpleLayout(participants: string[], transactions: Transaction[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Top row
  const topCount = Math.ceil(participants.length / 2);
  const bottomCount = participants.length - topCount;
  const spacing = 200;
  const hubY = 300;
  
  // Create top participants
  for (let i = 0; i < topCount; i++) {
    nodes.push({
      id: participants[i],
      type: 'entity',
      position: {
        x: (i - topCount / 2) * spacing,
        y: 0
      },
      data: { label: participants[i], isHub: false, width: NODE_WIDTH },
      draggable: true,
      selectable: true,
    });
  }
  
  // Add hub
  nodes.push({
    id: HUB_ID,
    type: 'entity',
    position: { x: 0, y: hubY },
    data: { label: 'Central Clearing House', isHub: true, width: NODE_WIDTH * 4 },
    draggable: true,
    selectable: true,
  });
  
  // Create bottom participants
  for (let i = 0; i < bottomCount; i++) {
    nodes.push({
      id: participants[topCount + i],
      type: 'entity',
      position: {
        x: (i - bottomCount / 2) * spacing,
        y: hubY * 2
      },
      data: { label: participants[topCount + i], isHub: false, width: NODE_WIDTH },
      draggable: true,
      selectable: true,
    });
  }
  
  // Create edges
  transactions.forEach((tx, idx) => {
    edges.push({
      id: `e-${idx}`,
      source: tx.from,
      target: tx.to,
      type: 'workflow',
      data: {
        sourceId: tx.from,
        targetId: tx.to,
        step: idx + 1,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR, width: 18, height: 18 },
    });
  });
  
  console.log('📍 Fallback layout created:', { nodeCount: nodes.length, edgeCount: edges.length });
  return { nodes, edges };
}

const entities = [
  'Investment Bank A',
  'Hedge Fund X',
  'Broker Dealer C',
  'Pension Fund Y',
  'Asset Manager Z',
  'Insurance Corp',
];

const transactions: Transaction[] = [
  { from: 'Investment Bank A', to: 'CCP', hasException: true },
  { from: 'CCP', to: 'Investment Bank A', isCleared: true },
  { from: 'Investment Bank A', to: 'CCP' },
  { from: 'CCP', to: 'Investment Bank A' },

  { from: 'Hedge Fund X', to: 'CCP', isCleared: true },
  { from: 'CCP', to: 'Hedge Fund X' },
  { from: 'Hedge Fund X', to: 'CCP' },
  { from: 'CCP', to: 'Hedge Fund X', hasException: true },

  { from: 'Broker Dealer C', to: 'CCP' },
  { from: 'CCP', to: 'Broker Dealer C' },
  { from: 'Broker Dealer C', to: 'CCP', hasException: true },
  { from: 'CCP', to: 'Broker Dealer C', isCleared: true },

  { from: 'Pension Fund Y', to: 'CCP' },
  { from: 'CCP', to: 'Pension Fund Y', isCleared: true },
  { from: 'Pension Fund Y', to: 'CCP', hasException: true },
  { from: 'CCP', to: 'Pension Fund Y' },

  { from: 'Asset Manager Z', to: 'CCP' },
  { from: 'CCP', to: 'Asset Manager Z' },
  { from: 'Asset Manager Z', to: 'CCP' },
  { from: 'CCP', to: 'Asset Manager Z', hasException: true },

  { from: 'Insurance Corp', to: 'CCP', isCleared: true },
  { from: 'CCP', to: 'Insurance Corp' },
  { from: 'Insurance Corp', to: 'CCP' },
  { from: 'CCP', to: 'Insurance Corp' },
];

export default function ReactFlowWithElkAutoLayout() {
  console.log('🚀 ReactFlowWithElkAutoLayout component mounted!');
  
  const [layoutData, setLayoutData] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selection, setSelection] = useState<
    | { kind: 'node'; id: string; label: string; role: string }
    | { kind: 'edge'; id: string; from: string; to: string; step?: number }
    | null
  >(null);

  useEffect(() => {
    console.log('Starting ELK layout generation with', entities.length, 'entities and', transactions.length, 'transactions');
    generateElkLayout(entities, transactions)
      .then((result) => {
        console.log('ELK layout generated successfully:', result.nodes.length, 'nodes,', result.edges.length, 'edges');
        setLayoutData(result);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('ELK layout failed:', error);
        console.error('Full error stack:', error.stack);
        setIsLoading(false);
      });
  }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setLayoutData((prev) => ({
      ...prev,
      nodes: applyNodeChanges(changes, prev.nodes),
    }));
  }, []);

  interface EntityNodeData {
    label: string;
    isHub: boolean;
  }

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const nodeData = node.data as EntityNodeData;
    setSelection({
      kind: 'node',
      id: node.id,
      label: nodeData?.label ?? node.id,
      role: nodeData?.isHub ? 'Central Clearing House' : 'Participant',
    });
  }, []);

  interface EdgeData {
    sourceId?: string;
    targetId?: string;
    step?: number;
  }

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const data = (edge.data as EdgeData) ?? {};
    setSelection({
      kind: 'edge',
      id: edge.id,
      from: data.sourceId ?? edge.source,
      to: data.targetId ?? edge.target,
      step: data.step,
    });
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelection(null);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center">
        <div className="text-black/75 font-bold">Computing ELK Layout...</div>
      </div>
    );
  }

  if (!layoutData.nodes || layoutData.nodes.length === 0) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="text-black/75 font-bold">No visualization data available</div>
        <div className="text-sm text-black/50">Check browser console for errors</div>
        <pre className="bg-white p-4 rounded border border-slate-200 max-w-md text-xs overflow-auto">
          Nodes: {layoutData.nodes.length}
          {'\n'}
          Edges: {layoutData.edges.length}
        </pre>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-50">
      <ReactFlow
        nodes={layoutData.nodes}
        edges={layoutData.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnDrag={[1, 2]}          // middle/right button pans; left button drags nodes
        selectionOnDrag={false}
        zoomOnScroll
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls />
      </ReactFlow>

      {selection && (
        <div className="absolute top-0 right-0 h-full w-80 max-w-xs bg-white border-l border-slate-200 shadow-xl z-20 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-black/50 uppercase tracking-wide">Details</div>
            <button
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              onClick={() => setSelection(null)}
            >
              Close
            </button>
          </div>

          {selection.kind === 'node' ? (
            <div className="space-y-2">
              <div className="text-sm font-bold text-black truncate">{selection.label}</div>
              <div className="text-xs text-black/75">Role: {selection.role}</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-bold text-black">Edge {selection.step ?? selection.id}</div>
              <div className="text-xs text-black/75">From: {selection.from}</div>
              <div className="text-xs text-black/75">To: {selection.to}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
