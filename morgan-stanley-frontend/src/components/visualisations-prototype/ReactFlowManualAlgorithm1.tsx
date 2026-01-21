import { useMemo } from 'react';
import { 
  ReactFlow,
  Background, 
  Controls, 
  Handle, 
  Position, 
  getSmoothStepPath,
  MarkerType 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Landmark, ShieldCheck, ArrowRightLeft, Cpu, Activity } from 'lucide-react';

// Current assumption - 1 clearing house and maximum 4 entities, which will be positioned
// to the top, right, below and left of the clearing house.

/**
 * 1. THE OFFSET ALGORITHM
 * Calculates perpendicular offsets to prevent line overlap.
 * North/South pairs offset on X. East/West pairs offset on Y.
 */
const LANE_GAP = 35; 

const WorkflowEdge = ({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, style, markerEnd
}) => {
  const laneIndex = data?.lane || 0;
  const totalLanes = data?.totalLanes || 1;
  
  const centerShift = ((totalLanes - 1) * LANE_GAP) / 2;
  const offset = (laneIndex * LANE_GAP) - centerShift;

  const isVertical = sourcePosition === Position.Top || sourcePosition === Position.Bottom;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: isVertical ? sourceX + offset : sourceX,
    sourceY: isVertical ? sourceY : sourceY + offset,
    sourcePosition,
    targetX: isVertical ? targetX + offset : targetX,
    targetY: isVertical ? targetY : targetY + offset,
    targetPosition,
    borderRadius: 12,
  });

  return (
    <>
      <path id={id} d={edgePath} style={style} className="react-flow__edge-path stroke-[2.5px]" markerEnd={markerEnd} />
      <g transform={`translate(${labelX - 10}, ${labelY - 10})`}>
        <circle r="10" cx="10" cy="10" fill="white" stroke="#94a3b8" strokeWidth="1" />
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

/**
 * 2. CUSTOM ENTITY NODE
 * Provides handles on all four sides to support the radial layout.
 */
const EntityNode = ({ data }) => {
  const isHub = data.isHub;
  return (
    <div className={`p-4 rounded-xl border-2 shadow-xl min-w-[180px] bg-white ${isHub ? 'border-blue-600' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3 mb-2">
        {isHub ? <ShieldCheck className="text-blue-600" /> : <Landmark className="text-slate-400" />}
        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">
          {isHub ? 'Central Clearing' : 'Participant'}
        </span>
      </div>
      <div className="text-sm font-bold text-slate-900 uppercase italic truncate">{data.label}</div>
      
      {/* Explicitly defined handles with IDs matching their positions */}
      <Handle type="source" position={Position.Top} id="top" className="opacity-0" />
      <Handle type="target" position={Position.Top} id="top" className="opacity-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="opacity-0" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="opacity-0" />
      <Handle type="source" position={Position.Left} id="left" className="opacity-0" />
      <Handle type="target" position={Position.Left} id="left" className="opacity-0" />
      <Handle type="source" position={Position.Right} id="right" className="opacity-0" />
      <Handle type="target" position={Position.Right} id="right" className="opacity-0" />
    </div>
  );
};

const nodeTypes = { entity: EntityNode };
const edgeTypes = { workflow: WorkflowEdge };

/**
 * 3. LAYOUT GENERATOR
 * Positions participants in a star pattern around the CCP hub.
 */
function generateRadialLayout(participants, transactions) {
  const nodes = [];
  const edges = [];
  const HUB_ID = 'CCP';
  
  // A. The Hub at the origin
  nodes.push({
    id: HUB_ID,
    type: 'entity',
    position: { x: 0, y: 0 },
    data: { label: 'Global CCP', isHub: true }
  });

  // B. Participant placement (North, East, South, West)
  const posMapping = [
    { x: 0, y: -450, pos: Position.Top },    
    { x: 550, y: 0, pos: Position.Right },   
    { x: 0, y: 450, pos: Position.Bottom },  
    { x: -550, y: 0, pos: Position.Left }    
  ];

  participants.forEach((name, i) => {
    nodes.push({
      id: name,
      type: 'entity',
      position: { x: posMapping[i].x, y: posMapping[i].y },
      data: { label: name, hubAnchor: posMapping[i].pos }
    });
  });

  const pairLaneTracker = {};

  // C. Edge generation with Lane logic
  transactions.forEach((tx, i) => {
    const pairKey = [tx.from, tx.to].sort().join('::');
    const lane = pairLaneTracker[pairKey] || 0;
    pairLaneTracker[pairKey] = lane + 1;

    const participantId = tx.from === HUB_ID ? tx.to : tx.from;
    const participantNode = nodes.find(n => n.id === participantId);
    const hubAnchor = participantNode.data.hubAnchor;

    const sourcePos = tx.from === HUB_ID ? hubAnchor : getInversePos(hubAnchor);
    const targetPos = tx.to === HUB_ID ? hubAnchor : getInversePos(hubAnchor);

    edges.push({
      id: `e-${i}`,
      source: tx.from,
      target: tx.to,
      type: 'workflow',
      data: { step: i + 1, lane: lane },
      // explicit handle identification ensures straight lines
      sourceHandle: sourcePos, 
      targetHandle: targetPos,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      style: { stroke: '#cbd5e1', strokeWidth: 2 }
    });
  });

  // Calculate totals to center the lanes
  edges.forEach(e => {
    const pairKey = [e.source, e.target].sort().join('::');
    e.data.totalLanes = pairLaneTracker[pairKey];
  });

  return { nodes, edges };
}

const getInversePos = (pos) => {
  if (pos === Position.Top) return Position.Bottom;
  if (pos === Position.Bottom) return Position.Top;
  if (pos === Position.Left) return Position.Right;
  return Position.Left;
};

const entities = ['Investment Bank A', 'Hedge Fund X', 'Broker Dealer C', 'Pension Fund Y'];
const transactions = [
  { from: 'Investment Bank A', to: 'CCP' },
  { from: 'CCP', to: 'Investment Bank A' },
  { from: 'Investment Bank A', to: 'CCP' },
  { from: 'Hedge Fund X', to: 'CCP' },
  { from: 'CCP', to: 'Hedge Fund X' },
  { from: 'Broker Dealer C', to: 'CCP' },
  { from: 'CCP', to: 'Broker Dealer C' },
  { from: 'Pension Fund Y', to: 'CCP' },
  { from: 'CCP', to: 'Pension Fund Y' },
];

export default function App() {
  const { nodes, edges } = useMemo(() => generateRadialLayout(entities, transactions), []);

  return (
    <div className="h-screen w-screen bg-slate-50">
      <div className="absolute top-10 left-10 z-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Activity className="text-white" size={24} />
          </div>
          OTC Hub Audit
        </h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-11">
          Radial Symmetry Layout Engine
        </p>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}