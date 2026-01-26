import { useMemo } from 'react';
import { 
  ReactFlow,
  Background, 
  Controls, 
  Handle, 
  Position, 
  MarkerType 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Landmark, ShieldCheck, Activity } from 'lucide-react';

// Layout: Adaptive top/bottom rows with a centered elongated clearing house
// Handles variable node counts and multiple edges without overlap

const NODE_WIDTH = 140;
const NODE_HEIGHT = 96;
const NODE_GAP = 120;
const VERTICAL_DISTANCE = 260;
const MIN_HUB_WIDTH = NODE_WIDTH * 3 + NODE_GAP * 2;
const EDGE_OFFSET = 18; // spacing between parallel edges
const EDGE_COLOR = '#2563eb'; // vivid arrow color for clarity

// ---------- Geometry helpers ----------
type Point = { x: number; y: number };

function perp(v: Point): Point {
  return { x: -v.y, y: v.x };
}

function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function intersectLineWithRect(p1: Point, p2: Point, rectCenter: Point, w: number, h: number): Point {
  // Axis-aligned rectangle intersection; returns the closest point to p2 lying on the rect border
  const halfW = w / 2;
  const halfH = h / 2;
  const left = rectCenter.x - halfW;
  const right = rectCenter.x + halfW;
  const top = rectCenter.y - halfH;
  const bottom = rectCenter.y + halfH;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const candidates: Point[] = [];

  // Vertical sides
  if (dx !== 0) {
    const tLeft = (left - p1.x) / dx;
    const yLeft = p1.y + tLeft * dy;
    if (tLeft >= 0 && tLeft <= 1 && yLeft >= top && yLeft <= bottom) {
      candidates.push({ x: left, y: yLeft });
    }

    const tRight = (right - p1.x) / dx;
    const yRight = p1.y + tRight * dy;
    if (tRight >= 0 && tRight <= 1 && yRight >= top && yRight <= bottom) {
      candidates.push({ x: right, y: yRight });
    }
  }

  // Horizontal sides
  if (dy !== 0) {
    const tTop = (top - p1.y) / dy;
    const xTop = p1.x + tTop * dx;
    if (tTop >= 0 && tTop <= 1 && xTop >= left && xTop <= right) {
      candidates.push({ x: xTop, y: top });
    }

    const tBottom = (bottom - p1.y) / dy;
    const xBottom = p1.x + tBottom * dx;
    if (tBottom >= 0 && tBottom <= 1 && xBottom >= left && xBottom <= right) {
      candidates.push({ x: xBottom, y: bottom });
    }
  }

  if (candidates.length === 0) return p2;

  // Choose the intersection closest to p2
  let best = candidates[0];
  let bestDist = (best.x - p2.x) ** 2 + (best.y - p2.y) ** 2;
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    const d = (c.x - p2.x) ** 2 + (c.y - p2.y) ** 2;
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

const WorkflowEdge = ({
  id, sourceX, sourceY, targetX, targetY,
  data, markerEnd
}: any) => {
  const offsetIndex = data?.offsetIndex || 0;
  const totalOffsets = data?.totalOffsets || 1;

  // Axis vector from source to target and its perpendicular for lane offsets
  const axis = normalize({ x: targetX - sourceX, y: targetY - sourceY });
  const perpendicular = perp(axis);

  // Symmetric lane offset
  const laneOffset = (offsetIndex - (totalOffsets - 1) / 2) * EDGE_OFFSET;

  // Apply offset to both endpoints
  const p1: Point = {
    x: sourceX + perpendicular.x * laneOffset,
    y: sourceY + perpendicular.y * laneOffset,
  };
  const p2: Point = {
    x: targetX + perpendicular.x * laneOffset,
    y: targetY + perpendicular.y * laneOffset,
  };

  // Trim endpoints to node borders using rectangle intersection
  const sourceSize = data?.sourceSize || { w: NODE_WIDTH, h: NODE_HEIGHT };
  const targetSize = data?.targetSize || { w: NODE_WIDTH, h: NODE_HEIGHT };

  const p1Trimmed = intersectLineWithRect(p2, p1, { x: sourceX, y: sourceY }, sourceSize.w, sourceSize.h);
  const p2Trimmed = intersectLineWithRect(p1, p2, { x: targetX, y: targetY }, targetSize.w, targetSize.h);

  const edgePath = `M ${p1Trimmed.x} ${p1Trimmed.y} L ${p2Trimmed.x} ${p2Trimmed.y}`;

  return (
    <>
      <path
        id={id}
        d={edgePath}
        className="react-flow__edge-path stroke-[2.25px] fill-none"
        stroke={EDGE_COLOR}
        strokeLinecap="round"
        markerEnd={markerEnd}
      />
      <g transform={`translate(${(p1Trimmed.x + p2Trimmed.x) / 2 - 10}, ${(p1Trimmed.y + p2Trimmed.y) / 2 - 10})`}>
        <circle r="10" cx="10" cy="10" fill="white" stroke="#cbd5e1" strokeWidth="1" />
        <text
          x="10"
          y="14"
          textAnchor="middle"
          className="text-[9px] font-black fill-slate-500 select-none pointer-events-none"
        >
          {data.step}
        </text>
      </g>
    </>
  );
};

const EntityNode = ({ data }: any) => {
  const isHub = data.isHub;
  const width = isHub ? data.width : NODE_WIDTH;

  return (
    <div
      className={`p-3 rounded-lg border-2 shadow-md bg-white flex flex-col justify-center ${
        isHub ? 'border-blue-500' : 'border-slate-300'
      }`}
      style={{ width }}
    >
      <div className="flex items-center gap-2 mb-1">
        {isHub ? (
          <ShieldCheck className="text-blue-500" size={14} />
        ) : (
          <Landmark className="text-slate-400" size={14} />
        )}
        <span className="text-[8px] font-bold uppercase tracking-tight text-slate-400">
          {isHub ? 'Central Clearing' : 'Participant'}
        </span>
      </div>
      <div className="text-xs font-bold text-slate-900 uppercase truncate">
        {data.label}
      </div>

      {/* Top and Bottom handles for clean vertical flow */}
      <Handle
        type="target"
        position={Position.Top}
        id="in-top"
        className="opacity-0"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="out-top"
        className="opacity-0"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="in-bottom"
        className="opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out-bottom"
        className="opacity-0"
      />
    </div>
  );
};


const nodeTypes = { entity: EntityNode };
const edgeTypes = { workflow: WorkflowEdge };

/**
 * Layout Generator - Adaptive Top-Bottom with centered clearing house
 * - Supports 1-6+ nodes (ceil half on top, rest bottom)
 * - Hub width adapts to the widest row
 * - Parallel edges offset horizontally to avoid overlap
 */
function generateTopBottomLayout(
  participants: string[],
  transactions: Array<{ from: string; to: string }>
) {
  const nodes: any[] = [];
  const edges: any[] = [];
  const HUB_ID = 'CCP';

  // Distribute participants per requirements
  const topCount = participants.length <= 3
    ? participants.length
    : Math.ceil(participants.length / 2);
  const bottomCount = participants.length - topCount;

  // Hub width adapts to the widest row
  const topWidth = topCount * NODE_WIDTH + Math.max(0, topCount - 1) * NODE_GAP;
  const bottomWidth = bottomCount * NODE_WIDTH + Math.max(0, bottomCount - 1) * NODE_GAP;
  const hubWidthNeeded = Math.max(topWidth, bottomWidth, MIN_HUB_WIDTH);

  // Central hub
  nodes.push({
    id: HUB_ID,
    type: 'entity',
    position: { x: -hubWidthNeeded / 2, y: -NODE_HEIGHT / 2 },
    data: { label: 'Central Clearing House', isHub: true, width: hubWidthNeeded }
  });

  // Top nodes: evenly spaced, centered
  let topX = -topWidth / 2;
  for (let i = 0; i < topCount; i++) {
    nodes.push({
      id: participants[i],
      type: 'entity',
      position: { x: topX, y: -VERTICAL_DISTANCE - NODE_HEIGHT / 2 },
      data: {
        label: participants[i],
        nodeIndex: i,
        isTopNode: true,
        width: NODE_WIDTH,
        height: NODE_HEIGHT
      }
    });
    topX += NODE_WIDTH + NODE_GAP;
  }

  // Bottom nodes: evenly spaced, centered
  let bottomX = -bottomWidth / 2;
  for (let i = 0; i < bottomCount; i++) {
    nodes.push({
      id: participants[topCount + i],
      type: 'entity',
      position: { x: bottomX, y: VERTICAL_DISTANCE - NODE_HEIGHT / 2 },
      data: {
        label: participants[topCount + i],
        nodeIndex: topCount + i,
        isTopNode: false,
        width: NODE_WIDTH,
        height: NODE_HEIGHT
      }
    });
    bottomX += NODE_WIDTH + NODE_GAP;
  }

  // Track edges per unordered pair for symmetric offsets
  const pairEdgeTracker: Record<string, number> = {};
  const pairEdgeCounts: Record<string, number> = {};

  // First pass: count total edges per pair
  transactions.forEach((tx) => {
    const key = [tx.from, tx.to].sort().join('::');
    pairEdgeCounts[key] = (pairEdgeCounts[key] || 0) + 1;
  });

  // Second pass: create edges with proper offsets
  transactions.forEach((tx, stepIndex) => {
    const isFromHub = tx.from === HUB_ID;
    const participantId = isFromHub ? tx.to : tx.from;
    const participantNode = nodes.find((n) => n.id === participantId);
    const isTopNode = participantNode.data.isTopNode;
    const participantSize = { w: participantNode.data.width, h: participantNode.data.height };

    const key = [tx.from, tx.to].sort().join('::');
    const offsetIndex = pairEdgeTracker[key] || 0;
    const totalOffsets = pairEdgeCounts[key] || 1;

    // Directional handles keep flow straight; hub uses top handles for top row, bottom for bottom row
    const sourceHandle = isFromHub
      ? (isTopNode ? 'out-top' : 'out-bottom')
      : (isTopNode ? 'out-bottom' : 'out-top');
    const targetHandle = isFromHub
      ? (isTopNode ? 'in-top' : 'in-bottom')
      : (isTopNode ? 'in-bottom' : 'in-top');

    edges.push({
      id: `e-${stepIndex}`,
      source: tx.from,
      target: tx.to,
      type: 'workflow',
      sourceHandle,
      targetHandle,
      data: {
        step: stepIndex + 1,
        offsetIndex,
        totalOffsets,
        sourceSize: tx.from === HUB_ID ? { w: hubWidthNeeded, h: NODE_HEIGHT } : participantSize,
        targetSize: tx.to === HUB_ID ? { w: hubWidthNeeded, h: NODE_HEIGHT } : participantSize,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR, width: 20, height: 20 }
    });

    pairEdgeTracker[key] = offsetIndex + 1;
  });

  return { nodes, edges };
}

const entities = [
  'Investment Bank A',
  'Hedge Fund X',
  'Broker Dealer C',
  'Pension Fund Y',
  'Asset Manager Z',
  'Insurance Corp'
];

const transactions = [
  // Two edges each way per participant to demonstrate parallel offset
  { from: 'Investment Bank A', to: 'CCP' },
  { from: 'CCP', to: 'Investment Bank A' },
  { from: 'Investment Bank A', to: 'CCP' },
  { from: 'CCP', to: 'Investment Bank A' },

  { from: 'Hedge Fund X', to: 'CCP' },
  { from: 'CCP', to: 'Hedge Fund X' },
  { from: 'Hedge Fund X', to: 'CCP' },
  { from: 'CCP', to: 'Hedge Fund X' },

  { from: 'Broker Dealer C', to: 'CCP' },
  { from: 'CCP', to: 'Broker Dealer C' },
  { from: 'Broker Dealer C', to: 'CCP' },
  { from: 'CCP', to: 'Broker Dealer C' },

  { from: 'Pension Fund Y', to: 'CCP' },
  { from: 'CCP', to: 'Pension Fund Y' },
  { from: 'Pension Fund Y', to: 'CCP' },
  { from: 'CCP', to: 'Pension Fund Y' },

  { from: 'Asset Manager Z', to: 'CCP' },
  { from: 'CCP', to: 'Asset Manager Z' },
  { from: 'Asset Manager Z', to: 'CCP' },
  { from: 'CCP', to: 'Asset Manager Z' },

  { from: 'Insurance Corp', to: 'CCP' },
  { from: 'CCP', to: 'Insurance Corp' },
  { from: 'Insurance Corp', to: 'CCP' },
  { from: 'CCP', to: 'Insurance Corp' }
];

export default function App() {
  const { nodes, edges } = useMemo(
    () => generateTopBottomLayout(entities, transactions),
    []
  );

  return (
    <div className="h-screen w-screen bg-slate-50">
      <div className="absolute top-10 left-10 z-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Activity className="text-white" size={24} />
          </div>
          Trade Flow Visualization
        </h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-11">
          Clean Top-to-Bottom Layout • No Overlapping Edges
        </p>
      </div>

      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView>
        <Background color="#e2e8f0" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}