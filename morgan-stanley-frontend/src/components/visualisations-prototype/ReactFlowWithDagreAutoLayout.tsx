// import React, { useState, useCallback, useEffect, useMemo } from "react";
// import {
//   ReactFlow,
//   applyNodeChanges,
//   applyEdgeChanges,
//   addEdge,
//   Background,
//   Controls,
//   MarkerType,
//   Handle,
//   Position,
//   getSmoothStepPath,
// } from "@xyflow/react";
// import dagre from "@dagrejs/dagre";
// import "@xyflow/react/dist/style.css";

// // Shadcn UI Imports
// import {
//   Card,
//   CardContent,

//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { 
//   X, Landmark, Globe, User, ShieldCheck, Zap, 
//   ArrowRightLeft, Activity, Server, Database, ChevronRight 
// } from "lucide-react";

// /**
//  * DYNAMIC WORKFLOW EDGE
//  * This component solves the "joining arrows" problem by calculating a Y-offset
//  * for every edge. If multiple edges exist between the same two entities,
//  * they are assigned unique "lanes" so they render as separate parallel lines.
//  */
// const WorkflowEdge = ({
//   id,
//   sourceX,
//   sourceY,
//   targetX,
//   targetY,
//   sourcePosition,
//   targetPosition,
//   style = {},
//   markerEnd,
//   data,
// }) => {
//   // 'lane' and 'totalLanes' are calculated during data transformation
//   const lane = data?.lane || 0;
//   const totalLanes = data?.totalLanes || 1;
//   const step = data?.step || 1;
  
//   // Calculate offset to center the group of parallel lines around the handle
//   const laneSpacing = 25;
//   const offset = (lane - (totalLanes - 1) / 2) * laneSpacing;

//   const [edgePath, labelX, labelY] = getSmoothStepPath({
//     sourceX,
//     sourceY: sourceY + offset,
//     sourcePosition,
//     targetX,
//     targetY: targetY + offset,
//     targetPosition,
//     borderRadius: 12,
//   });

//   return (
//     <>
//       <path
//         id={id}
//         style={style}
//         className="react-flow__edge-path stroke-[2.5px] transition-all duration-300 hover:stroke-[#002B51]"
//         d={edgePath}
//         markerEnd={markerEnd}
//       />
//       {/* Step Badge */}
//       <g transform={`translate(${labelX - 12}, ${labelY - 12})`}>
//         <circle r="11" cx="12" cy="12" fill="white" stroke="#cbd5e1" strokeWidth="1" className="shadow-sm" />
//         <text
//           x="12"
//           y="16"
//           textAnchor="middle"
//           className="text-[10px] font-black fill-slate-600 select-none pointer-events-none"
//         >
//           {step}
//         </text>
//       </g>
//     </>
//   );
// };

// /**
//  * DYNAMIC SELF-LOOP EDGE
//  * Custom path for internal entity steps (source === target)
//  */
// const SelfLoopEdge = ({ id, sourceX, sourceY, markerEnd, style, data }) => {
//   const lane = data?.lane || 0;
//   const step = data?.step || 1;
//   const radius = 35 + (lane * 15);
  
//   const edgePath = `M ${sourceX} ${sourceY - 10} 
//                     C ${sourceX - radius} ${sourceY - radius * 2}, 
//                       ${sourceX + radius} ${sourceY - radius * 2}, 
//                       ${sourceX} ${sourceY - 10}`;

//   return (
//     <>
//       <path id={id} style={style} className="react-flow__edge-path fill-none stroke-[2px]" d={edgePath} markerEnd={markerEnd} />
//       <g transform={`translate(${sourceX - 10}, ${sourceY - radius * 1.5})`}>
//         <circle r="10" cx="10" cy="10" fill="white" stroke="#cbd5e1" strokeWidth="1" />
//         <text x="10" y="14" textAnchor="middle" className="text-[9px] font-bold fill-slate-500">
//           {step}
//         </text>
//       </g>
//     </>
//   );
// };

// const EntityNode = ({ data }) => {
//   const Icon = data.icon || Server;
//   return (
//     <div className="flex flex-col rounded-xl bg-white border border-slate-200 shadow-sm min-w-[220px] overflow-hidden group hover:border-[#002B51] transition-all hover:shadow-md">
//       <div className={`px-4 py-2 flex items-center justify-between border-b bg-slate-50/50 text-black/50`}>
//         <div className="flex items-center gap-2">
//           <Icon size={12} />
//           <span className="text-[9px] font-black uppercase tracking-widest opacity-70">System Node</span>
//         </div>
//       </div>
//       <div className="p-4 bg-white">
//         <div className="text-sm font-bold text-black leading-tight">
//           {data.label}
//         </div>
//       </div>
//       <Handle type="target" position={Position.Left} className="!opacity-0" />
//       <Handle type="source" position={Position.Right} className="!opacity-0" />
//     </div>
//   );
// };

// const nodeTypes = { entity: EntityNode };
// const edgeTypes = { workflow: WorkflowEdge, selfloop: SelfLoopEdge };

// /**
//  * AUTO-LAYOUT LOGIC USING DAGRE
//  */
// const dagreGraph = new dagre.graphlib.Graph();
// dagreGraph.setDefaultEdgeLabel(() => ({}));

// const getLayoutedElements = (nodes, edges) => {
//   dagreGraph.setGraph({ rankdir: "LR", ranksep: 350, nodesep: 200 });
//   dagreGraph.nodes().forEach(n => dagreGraph.removeNode(n));
//   dagreGraph.edges().forEach(e => dagreGraph.removeEdge(e.v, e.w));
  
//   nodes.forEach((n) => dagreGraph.setNode(n.id, { width: 220, height: 100 }));
//   edges.forEach((e) => dagreGraph.setEdge(e.source, e.target));
  
//   dagre.layout(dagreGraph);
  
//   return {
//     nodes: nodes.map(n => {
//       const nodeWithPosition = dagreGraph.node(n.id);
//       return { 
//         ...n, 
//         position: { x: nodeWithPosition.x - 110, y: nodeWithPosition.y - 50 } 
//       };
//     }),
//     edges
//   };
// };

// /**
//  * DYNAMIC DATA TRANSFORMATION
//  * Builds nodes and edges from a raw transaction list.
//  * Implements "Lane Counting" to prevent overlapping parallel lines.
//  */
// function transformTradeData(transactions) {
//   const nodes = [];
//   const edges = [];
//   const entities = new Set();
  
//   // Track how many edges exist between a pair of nodes (undirected)
//   const pairCounts = new Map();

//   // First pass: identify unique entities
//   transactions.forEach(t => {
//     entities.add(t.source);
//     entities.add(t.destination);
//   });

//   entities.forEach(entity => {
//     nodes.push({
//       id: entity,
//       type: 'entity',
//       data: { label: entity, icon: entity.toLowerCase().includes('client') ? User : Landmark }
//     });
//   });

//   // Second pass: build edges with lane assignments
//   transactions.forEach((txn, index) => {
//     const isSelf = txn.source === txn.destination;
//     const pairKey = [txn.source, txn.destination].sort().join(':::');
    
//     // Get current lane index for this pair
//     const currentLane = pairCounts.get(pairKey) || 0;
//     pairCounts.set(pairKey, currentLane + 1);

//     edges.push({
//       id: `e-${index}`,
//       source: txn.source,
//       target: txn.destination,
//       type: isSelf ? 'selfloop' : 'workflow',
//       data: { 
//         step: index + 1, 
//         transType: txn.type,
//         lane: currentLane,
//         // We'll update 'totalLanes' in a final pass
//       },
//     });
//   });

//   // Final pass: add total lane count to each edge for centering logic
//   edges.forEach(edge => {
//     const pairKey = [edge.source, edge.target].sort().join(':::');
//     edge.data.totalLanes = pairCounts.get(pairKey);
//   });

//   return getLayoutedElements(nodes, edges);
// }

// // --- DYNAMIC MOCK DATA ---
// const mockTradeData = [
//   { source: "Client Portal", destination: "Investment Bank", type: "Order Submission" },
//   { source: "Investment Bank", destination: "Investment Bank", type: "KYC Compliance Check" },
//   { source: "Investment Bank", destination: "Clearing House", type: "Margin Verification" },
//   { source: "Clearing House", destination: "Global Exchange", type: "Market Execution" },
//   { source: "Global Exchange", destination: "Clearing House", type: "Trade Fill (Confirmation)" },
//   { source: "Clearing House", destination: "Investment Bank", type: "Settlement Ready" },
//   { source: "Investment Bank", destination: "Client Portal", type: "Trade Confirmation" },
//   { source: "Client Portal", destination: "Client Portal", type: "Digital Archival" },
// ];

// export default function App() {
//   const [nodes, setNodes] = useState([]);
//   const [edges, setEdges] = useState([]);
//   const [selectedEdge, setSelectedEdge] = useState(null);

//   useEffect(() => {
//     const initializeData = () => {
//       const { nodes: lNodes, edges: lEdges } = transformTradeData(mockTradeData);
//       setNodes(lNodes);
//       setEdges(lEdges.map(e => ({
//         ...e,
//         markerEnd: { 
//           type: MarkerType.ArrowClosed, 
//           color: e.source === e.target ? '#94a3b8' : '#002B51' 
//         },
//         style: {
//           stroke: e.source === e.target ? '#cbd5e1' : '#002B51',
//           strokeWidth: 2.5
//         }
//       })));
//     };
//     initializeData();
//   }, []);

//   const onNodesChange = useCallback((c) => setNodes((ns) => applyNodeChanges(c, ns)), []);
//   const onEdgesChange = useCallback((c) => setEdges((es) => applyEdgeChanges(c, es)), []);

//   return (
//     <div className="h-screen w-screen flex bg-slate-50 font-sans text-black overflow-hidden">
//       <div className={`transition-all duration-700 relative ${selectedEdge ? "w-3/5" : "w-full"}`}>
//         <ReactFlow
//           nodes={nodes}
//           edges={edges}
//           nodeTypes={nodeTypes}
//           edgeTypes={edgeTypes}
//           onNodesChange={onNodesChange}
//           onEdgesChange={onEdgesChange}
//           onEdgeClick={(_, e) => setSelectedEdge(e)}
//           fitView
//         >
//           <Background color="#cbd5e1" gap={20} variant="dots" />
//           <Controls />
//         </ReactFlow>
        
//         {!selectedEdge && (
//           <div className="absolute top-10 left-10 pointer-events-none">
//             <h1 className="text-3xl font-black text-black tracking-tighter flex items-center gap-3">
//               <Activity className="text-[#002B51]" /> 
//               Dynamic Audit Flow
//             </h1>
//             <p className="text-black/50 text-[10px] font-bold uppercase tracking-widest mt-1">
//               Automated Lifecycle Visualization
//             </p>
//           </div>
//         )}
//       </div>

//       {selectedEdge && (
//         <div className="w-2/5 p-10 border-l bg-white shadow-2xl z-10 animate-in slide-in-from-right duration-500">
//           <div className="flex justify-between items-center mb-10">
//             <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
//               <div className="w-1.5 h-8 bg-[#002B51] rounded-full" />
//               Intelligence
//             </h2>
//             <Button variant="ghost" size="icon" onClick={() => setSelectedEdge(null)} className="rounded-full h-10 w-10">
//               <X />
//             </Button>
//           </div>

//           <Card className="border-t-[10px] border-t-[#002B51] rounded-[2rem] overflow-hidden shadow-2xl border-slate-100">
//             <CardHeader className="bg-slate-50/50 pb-8 border-b border-slate-100 px-8 pt-8">
//                <div className="bg-[#002B51] text-white text-[10px] font-black px-4 py-1.5 rounded-lg w-fit mb-6 uppercase tracking-widest">
//                  STEP {selectedEdge.data?.step}
//                </div>
//                <CardTitle className="text-4xl font-black text-black leading-none tracking-tight">
//                  {selectedEdge.data?.transType}
//                </CardTitle>
//             </CardHeader>
//             <CardContent className="p-10 space-y-10">
//                <div className="flex items-center justify-between bg-white border border-slate-100 p-8 rounded-3xl shadow-sm">
//                   <div className="text-center flex-1">
//                     <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-2 leading-none">Source</p>
//                     <p className="text-sm font-bold text-black uppercase">{selectedEdge.source}</p>
//                   </div>
//                   <ArrowRightLeft className="text-[#002B51] mx-4" size={20} />
//                   <div className="text-center flex-1">
//                     <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-2 leading-none">Target</p>
//                     <p className="text-sm font-bold text-black uppercase">{selectedEdge.target}</p>
//                   </div>
//                </div>
               
//                <div className="bg-[#002B51]/5 p-6 rounded-2xl border border-[#002B51]/10">
//                  <p className="text-xs text-black/75 leading-relaxed font-medium">
//                    This automated stage verifies the transition between <span className="text-[#002B51] font-bold">{selectedEdge.source}</span> and <span className="text-[#002B51] font-bold">{selectedEdge.target}</span> within the immutable trade protocol.
//                  </p>
//                </div>
//             </CardContent>
//           </Card>
//         </div>
//       )}
//     </div>
//   );
// }
