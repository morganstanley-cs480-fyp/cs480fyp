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
import { Landmark, ShieldCheck, Activity } from 'lucide-react';

interface Transaction {
  from: string;
  to: string;
}

interface TradeFlowVisualizationProps {
  participants: string[];
  transactions: Transaction[];
  title?: string;
  subtitle?: string;
}

const LANE_GAP = 30;

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

const EntityNode = ({ data }) => {
  const isHub = data.isHub;
  const nodeWidth = isHub ? 'min-w-[500px]' : 'min-w-[160px]';
  
  return (
    <div className={`p-4 rounded-xl border-2 shadow-xl ${nodeWidth} bg-white ${isHub ? 'border-blue-600' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3 mb-2">
        {isHub ? <ShieldCheck className="text-blue-600" /> : <Landmark className="text-slate-400" />}
        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">
          {isHub ? 'Central Clearing' : 'Participant'}
        </span>
      </div>
      <div className="text-sm font-bold text-slate-900 uppercase italic truncate">{data.label}</div>
      
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

function generateTopBottomLayout(participants: string[], transactions: Transaction[]) {
  const nodes = [];
  const edges = [];
  const HUB_ID = 'CCP';
  
  // Add central clearing house
  nodes.push({
    id: HUB_ID,
    type: 'entity',
    position: { x: 0, y: 0 },
    data: { label: 'Central Clearing House', isHub: true }
  });

  // Distribute participants: top and bottom
  const topNodeCount = Math.ceil(participants.length / 2);
  const bottomNodeCount = participants.length - topNodeCount;
  
  const topSpacing = topNodeCount === 1 ? 0 : (topNodeCount - 1) * 200;
  const topStartX = -topSpacing / 2;
  
  const bottomSpacing = bottomNodeCount === 1 ? 0 : (bottomNodeCount - 1) * 200;
  const bottomStartX = -bottomSpacing / 2;

  // Add top nodes
  for (let i = 0; i < topNodeCount; i++) {
    const name = participants[i];
    nodes.push({
      id: name,
      type: 'entity',
      position: { x: topStartX + i * 200, y: -350 },
      data: { label: name, connectionPoint: Position.Top }
    });
  }

  // Add bottom nodes
  for (let i = 0; i < bottomNodeCount; i++) {
    const name = participants[topNodeCount + i];
    nodes.push({
      id: name,
      type: 'entity',
      position: { x: bottomStartX + i * 200, y: 350 },
      data: { label: name, connectionPoint: Position.Bottom }
    });
  }

  const pairLaneTracker = {};

  // Generate edges
  transactions.forEach((tx, i) => {
    const pairKey = [tx.from, tx.to].sort().join('::');
    const lane = pairLaneTracker[pairKey] || 0;
    pairLaneTracker[pairKey] = lane + 1;

    const isFromHub = tx.from === HUB_ID;
    const participantId = isFromHub ? tx.to : tx.from;
    const participantNode = nodes.find(n => n.id === participantId);
    const participantConnectionPoint = participantNode.data.connectionPoint;

    const sourcePos = isFromHub ? participantConnectionPoint : Position.Bottom;
    const targetPos = isFromHub ? participantConnectionPoint : Position.Top;

    edges.push({
      id: `e-${i}`,
      source: tx.from,
      target: tx.to,
      type: 'workflow',
      data: { step: i + 1, lane: lane },
      sourceHandle: sourcePos, 
      targetHandle: targetPos,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      style: { stroke: '#cbd5e1', strokeWidth: 2 }
    });
  });

  // Calculate total lanes per pair
  edges.forEach(e => {
    const pairKey = [e.source, e.target].sort().join('::');
    e.data.totalLanes = pairLaneTracker[pairKey];
  });

  return { nodes, edges };
}

export function TradeFlowVisualization({
  participants,
  transactions,
  title = 'Trade Flow Visualization',
  subtitle = 'Top-to-Bottom Layout with Central Clearing House'
}: TradeFlowVisualizationProps) {
  const { nodes, edges } = useMemo(() => generateTopBottomLayout(participants, transactions), [participants, transactions]);

  return (
    <div className="h-screen w-screen bg-slate-50">
      <div className="absolute top-10 left-10 z-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Activity className="text-white" size={24} />
          </div>
          {title}
        </h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-11">
          {subtitle}
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
