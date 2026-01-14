import { useState, useCallback, useEffect } from "react";
import  {
    ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
  MarkerType,
  Handle,
  Position,
  getSmoothStepPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Shadcn UI Imports
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  X, Landmark, User, ShieldCheck, Zap, 
  ArrowRightLeft, Activity, Cpu 
} from "lucide-react";

/**
 * GRID CONSTANTS
 * As defined in production_layout_strategy.md
 */
const COLUMN_WIDTH = 450;
const ROW_HEIGHT = 280;
const INITIAL_MARGIN = 100;
const LANE_SPACING = 30;

/**
 * DYNAMIC WORKFLOW EDGE
 * Uses the 'lane' data property to create parallel lanes for overlapping paths.
 */
const WorkflowEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const step = data?.step || 1;
  const lane = data?.lane || 0;
  const totalLanes = data?.totalLanes || 1;
  
  // Calculate lane offset to center the group of lines
  const offset = (lane - (totalLanes - 1) / 2) * LANE_SPACING;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY: sourceY + offset,
    sourcePosition,
    targetX,
    targetY: targetY + offset,
    targetPosition,
    borderRadius: 12,
  });


  return (
    <>
      {/* Invisible wider path for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        className="cursor-pointer"
      />
      
      {/* Visible path */}
      <path
        id={id}
        style={style}
        className="react-flow__edge-path stroke-[2.5px] transition-all duration-300 hover:stroke-blue-500 pointer-events-none"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Step number badge - now clickable */}
      <g 
        transform={`translate(${labelX - 12}, ${labelY - 12})`}
        className="cursor-pointer"
        style={{ pointerEvents: 'all' }}
      >
        <circle 
          r="16" 
          cx="12" 
          cy="12" 
          fill="transparent"
        />
        <circle r="11" cx="12" cy="12" fill="white" stroke="#cbd5e1" strokeWidth="1" className="pointer-events-none" />
        <text
          x="12"
          y="16"
          textAnchor="middle"
          className="text-[10px] font-black fill-slate-600 select-none pointer-events-none"
        >
          {step}
        </text>
      </g>
    </>
  );
};

const EntityNode = ({ data }) => {
  const Icon = data.isSystem ? Cpu : (data.label.toLowerCase().includes('client') ? User : Landmark);
  return (
    <div className={`flex flex-col rounded-xl border shadow-sm min-w-[220px] overflow-hidden transition-all ${data.isSystem ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'}`}>
      <div className={`px-4 py-2 flex items-center justify-between border-b ${data.isSystem ? 'bg-slate-200 text-slate-700' : 'bg-blue-50/50 text-blue-700'}`}>
        <div className="flex items-center gap-2">
          <Icon size={12} />
          <span className="text-[9px] font-black uppercase tracking-widest opacity-80">
            {data.isSystem ? 'Internal System' : 'Network Entity'}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-sm font-bold text-slate-900 tracking-tight uppercase leading-none italic">{data.label}</div>
      </div>

      <Handle type="target" position={Position.Left} id="target-left" className="!opacity-0" />
      <Handle type="source" position={Position.Left} id="source-left" className="!opacity-0" />
      <Handle type="source" position={Position.Right} id="source-right" className="!opacity-0" />
      <Handle type="target" position={Position.Right} id="target-right" className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!opacity-0" />
      <Handle type="target" position={Position.Top} id="target-top" className="!opacity-0" />
    </div>
  );
};

const nodeTypes = { entity: EntityNode };
const edgeTypes = { workflow: WorkflowEdge };

/**
 * PRODUCTION POSITIONING LOGIC
 * Calculates coordinates based on a Column-Based Grid.
 */
function transformTradeToGrid(transactions) {
  const nodes = [];
  const edges = [];
  const entitySet = new Set();
  const pairCounts = new Map();

  // Column Mapping based on Business Domains
  const domainColumns = {
    "Client Portal": 0,
    "Investment Bank": 1,
    "Clearing House": 2,
    "Global Exchange": 3
  };

  // 1. Sanitize: Convert self-loops to System nodes
  const sanitizedTxns = transactions.map(t => 
    t.source === t.destination ? { ...t, destination: `${t.source} Module`, isInternal: true } : t
  );

  // 2. Generate Nodes based on Grid Formula
  sanitizedTxns.forEach(t => {
    [t.source, t.destination].forEach(id => {
      if (!entitySet.has(id)) {
        entitySet.add(id);
        const baseEntity = id.replace(" Module", "");
        const isSystem = id.includes(" Module");
        
        nodes.push({
          id,
          type: 'entity',
          position: {
            x: INITIAL_MARGIN + (domainColumns[baseEntity] ?? 0) * COLUMN_WIDTH,
            y: INITIAL_MARGIN + (isSystem ? ROW_HEIGHT : 0)
          },
          data: { label: id, isSystem }
        });
      }
    });
  });

  // 3. Generate Edges with Lane logic and Handle selection
  sanitizedTxns.forEach((txn, index) => {
    const pairKey = [txn.source, txn.destination].sort().join(':::');
    const currentLane = pairCounts.get(pairKey) || 0;
    pairCounts.set(pairKey, currentLane + 1);

    const sourceNode = nodes.find(n => n.id === txn.source);
    const targetNode = nodes.find(n => n.id === txn.destination);
    
    // Determine flow direction for handles
    const isBackwards = targetNode.position.x < sourceNode.position.x;
    const isVertical = sourceNode.position.x === targetNode.position.x;

    edges.push({
      id: `e-${index}`,
      source: txn.source,
      target: txn.destination,
      // Handle Selection Logic
      sourceHandle: isVertical ? 'source-bottom' : (isBackwards ? 'source-left' : 'source-right'),
      targetHandle: isVertical ? 'target-top' : (isBackwards ? 'target-right' : 'target-left'),
      type: 'workflow',
      data: { 
        step: index + 1, 
        transType: txn.type,
        lane: currentLane
      },
    });
  });

  // Final Pass: Update total lanes for centering
  edges.forEach(edge => {
    const pairKey = [edge.source, edge.target].sort().join(':::');
    edge.data.totalLanes = pairCounts.get(pairKey);
  });

  return { nodes, edges };
}

// --- MOCK DATA ---
const mockTradeData = [
  { source: "Client Portal", destination: "Investment Bank", type: "Trade Order Initiation" },
  { source: "Investment Bank", destination: "Investment Bank", type: "KYC/AML Fraud Check" },
  { source: "Investment Bank", destination: "Clearing House", type: "Netting Instruction" },
  { source: "Clearing House", destination: "Global Exchange", type: "Market Execution" },
  { source: "Global Exchange", destination: "Clearing House", type: "Fill Confirmation" },
  { source: "Clearing House", destination: "Investment Bank", type: "Settlement Notice" },
  { source: "Investment Bank", destination: "Client Portal", type: "Trade Confirmation" },
  { source: "Client Portal", destination: "Client Portal", type: "Final Data Archival" },
];

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);

  useEffect(() => {
    const { nodes: gridNodes, edges: gridEdges } = transformTradeToGrid(mockTradeData);
    setNodes(gridNodes);
    setEdges(gridEdges.map(e => {
      const isReturn = e.targetHandle === 'target-right';
      return {
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed, color: isReturn ? '#94a3b8' : '#2563eb' },
        style: { stroke: isReturn ? '#cbd5e1' : '#3b82f6', strokeWidth: 2.5 }
      }
    }));
  }, []);

  const onNodesChange = useCallback((c) => setNodes((ns) => applyNodeChanges(c, ns)), []);
  const onEdgesChange = useCallback((c) => setEdges((es) => applyEdgeChanges(c, es)), []);

  return (
    <div className="h-screen w-screen flex bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <div className={`h-full transition-all duration-500 relative ${selectedEdge ? "w-3/5" : "w-full"}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={(_, e) => setSelectedEdge(e)}
          fitView
          minZoom={0.1}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={true}          
        >
          <Background color="#cbd5e1" gap={25} variant="dots" />
          <Controls />
        </ReactFlow>
        
        {!selectedEdge && (
          <div className="absolute top-10 left-10 pointer-events-none">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
              <Activity className="text-blue-600" /> Production Trade Audit
            </h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
              Grid-Based Deterministic Layout
            </p>
          </div>
        )}
      </div>

      {selectedEdge && (
        <div className="w-2/5 h-full p-10 border-l bg-white shadow-2xl z-10 animate-in slide-in-from-right duration-500 overflow-auto">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Event Protocol</h2>
            <Button variant="ghost" size="icon" onClick={() => setSelectedEdge(null)} className="rounded-full h-10 w-10">
              <X />
            </Button>
          </div>

          <Card className="border-t-[10px] border-t-blue-600 rounded-[2rem] overflow-hidden shadow-2xl border-slate-100">
            <CardHeader className="bg-slate-50/50 pb-8 border-b border-slate-100 px-8 pt-8">
               <div className="bg-blue-600 text-white text-[10px] font-black px-4 py-1.5 rounded-lg w-fit mb-6 uppercase tracking-widest">
                 STEP {selectedEdge.data?.step}
               </div>
               <CardTitle className="text-4xl font-black text-slate-900 leading-none tracking-tight">
                 {selectedEdge.data?.transType}
               </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
               <div className="flex items-center justify-between bg-white border border-slate-100 p-8 rounded-3xl shadow-sm">
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">Origin</p>
                    <p className="text-sm font-bold text-slate-900 uppercase">{selectedEdge.source}</p>
                  </div>
                  <ArrowRightLeft className="text-blue-500 mx-4" size={20} />
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">Target</p>
                    <p className="text-sm font-bold text-slate-900 uppercase">{selectedEdge.target}</p>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}