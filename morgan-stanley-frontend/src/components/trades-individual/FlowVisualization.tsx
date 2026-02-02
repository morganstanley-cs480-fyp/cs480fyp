// Timeline/System flow tabs container - split into two different flows next time

import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Network } from "lucide-react";
import { TimelineTransactionCard } from "./TimelineTransactionCard";
import type { Transaction, Exception } from "@/lib/mockData";
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
import "@xyflow/react/dist/style.css";
import { Landmark, ShieldCheck } from 'lucide-react';
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const HUB_ID = 'CCP';
const NODE_WIDTH = 140;
const NODE_HEIGHT = 96;
const HUB_MIN_WIDTH = NODE_WIDTH * 10;
const EDGE_COLOR = '#002B51';
const EDGE_OFFSET = 22;
const PARTICIPANT_MARGIN = 16;
const HUB_MARGIN = 40;

type Point = { x: number; y: number };
type Size = { w: number; h: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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

  const laneOffset =
    totalOffsets > 1 ? (offsetIndex - (totalOffsets - 1) / 2) * EDGE_OFFSET : 0;

  const x = clamp(otherCenter.x + laneOffset, minX, maxX);
  return { x, y };
}

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

  let x = clamp(participantX + laneOffset, pMin, pMax);
  x = clamp(x, hMin, hMax);
  return x;
}

function WorkflowEdge(props: EdgeProps) {
  const { id, source, target, data, markerEnd } = props;

  const nodes = useNodes();
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);

  if (!sourceNode || !targetNode) return null;

  const sourceId: string = data?.sourceId;
  const targetId: string = data?.targetId;

  const sourceIsHub = sourceId === HUB_ID;
  const targetIsHub = targetId === HUB_ID;

  const sourceWidth = sourceNode.data?.width ?? NODE_WIDTH;
  const targetWidth = targetNode.data?.width ?? NODE_WIDTH;
  
  const sourceSize: Size = { w: sourceWidth, h: NODE_HEIGHT };
  const targetSize: Size = { w: targetWidth, h: NODE_HEIGHT };

  const offsetIndex = data?.offsetIndex ?? 0;
  const totalOffsets = data?.totalOffsets ?? 1;
  const laneOffset =
    totalOffsets > 1 ? (offsetIndex - (totalOffsets - 1) / 2) * EDGE_OFFSET : 0;

  const sourceCenter: Point = { 
    x: sourceNode.position.x + sourceWidth / 2, 
    y: sourceNode.position.y + NODE_HEIGHT / 2 
  };
  const targetCenter: Point = { 
    x: targetNode.position.x + targetWidth / 2, 
    y: targetNode.position.y + NODE_HEIGHT / 2 
  };

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

  const halfHeight = NODE_HEIGHT / 2;
  const start = {
    x: axisX,
    y: sourceCenter.y + (targetCenter.y > sourceCenter.y ? halfHeight : -halfHeight)
  };

  const end = {
    x: axisX,
    y: targetCenter.y + (sourceCenter.y > targetCenter.y ? halfHeight : -halfHeight)
  };

  const startClipped = intersectLineWithRectBorder(end, start, sourceCenter, sourceSize);
  const endClipped = intersectLineWithRectBorder(startClipped, end, targetCenter, targetSize);

  const midY = (startClipped.y + endClipped.y) / 2;
  const path = `M ${startClipped.x} ${startClipped.y} L ${axisX} ${midY} L ${axisX} ${endClipped.y}`;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke: EDGE_COLOR, strokeWidth: 2.25, strokeLinecap: 'round' }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${axisX}px, ${(startClipped.y + endClipped.y) / 2}px)`,
            pointerEvents: 'none',
          }}
        >
          <div className="w-6 h-6 rounded-full bg-white border border-slate-300 text-[11px] font-semibold text-black/75 flex items-center justify-center shadow-sm">
            {data?.step ?? ''}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const EntityNode = ({ data }: { data: { isHub?: boolean; width?: number; status?: string; label: string; onEntitySelect?: () => void } }) => {
  const isHub = data.isHub;
  const width = data.width || NODE_WIDTH;
  const status = data.status || 'PENDING';

  // Get background color based on status
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50';
      case 'PENDING':
        return 'bg-slate-50';
      case 'FAILED':
        return 'bg-red-50';
      default:
        return 'bg-slate-50';
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'border-green-400';
      case 'PENDING':
        return 'border-slate-300';
      case 'FAILED':
        return 'border-red-400';
      default:
        return 'border-slate-300';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onEntitySelect) {
      data.onEntitySelect(data.label, isHub);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3 rounded-lg border-2 shadow-md flex flex-col justify-center cursor-pointer hover:shadow-lg transition-all text-center ${
        getStatusBgColor(status)} ${getStatusBorderColor(status)} ${
        isHub ? 'hover:border-[#002B51]' : 'hover:border-slate-400'
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

      <Handle type="target" position={Position.Top} id="in-top" className="opacity-0" />
      <Handle type="source" position={Position.Top} id="out-top" className="opacity-0" />
      <Handle type="target" position={Position.Bottom} id="in-bottom" className="opacity-0" />
      <Handle type="source" position={Position.Bottom} id="out-bottom" className="opacity-0" />
    </div>
  );
};

const nodeTypes = { entity: EntityNode };
const edgeTypes = { workflow: WorkflowEdge };

interface TransactionFlow {
  from: string;
  to: string;
}

async function generateElkLayout(
  participants: string[], 
  transactionFlows: TransactionFlow[], 
  clearingHouse: string,
  onEntitySelect: (entityName: string, isHub: boolean) => void,
  allTransactions: Transaction[],
  exceptions: Exception[]
) {
  const topCount = participants.length <= 3 ? participants.length : Math.ceil(participants.length / 2);
  const bottomCount = participants.length - topCount;

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

  const elkEdges = transactionFlows.map((tx, i) => ({
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

  const layout = await elk.layout(graph);

  const xs: number[] = [];
  layout.children?.forEach((n) => xs.push(n.x ?? 0));
  const xCenter = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Map entity names to their most recent transaction status
  const entityStatusMap: Record<string, string> = {};
  allTransactions.forEach((tx) => {
    if (tx.entity && tx.entity !== 'CCP') {
      entityStatusMap[tx.entity] = tx.status; // Latest status (transactions are ordered by step)
    }
  });

  const nodeLookup: Record<string, { x: number; y: number; width: number }> = {};
  layout.children?.forEach((n) => {
    const isHub = n.id === HUB_ID;
    const x = (n.x ?? 0) - xCenter;
    const y = n.y ?? 0;
    const width = isHub ? hubWidth : NODE_WIDTH;
    const status = isHub ? 'COMPLETED' : (entityStatusMap[n.id!] || 'PENDING');

    nodeLookup[n.id!] = { x, y, width };

    nodes.push({
      id: n.id!,
      type: 'entity',
      position: { x, y },
      data: { 
        label: isHub ? clearingHouse : n.id, 
        isHub, 
        width,
        status,
        onEntitySelect 
      },
      draggable: true,
      selectable: true,
    });
  });

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
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR, width: 18, height: 18 },
    });
  });

  return { nodes, edges };
}

interface FlowVisualizationProps {
  activeTab: "timeline" | "system";
  onTabChange: (tab: "timeline" | "system") => void;
  transactions: Transaction[];
  clearingHouse: string;
  selectedTransaction: Transaction | null;
  onTransactionSelect: (transaction: Transaction) => void;
  onEntitySelect: (entityName: string, isHub: boolean) => void;
  exceptions: Exception[];
  getRelatedExceptions: (transId: string) => Exception[];
  getTransactionBackgroundColor: (transaction: Transaction) => string;
  getTransactionStatusColor: (status: string) => "default" | "destructive" | "secondary";
}

export function FlowVisualization({
  activeTab,
  onTabChange,
  transactions,
  clearingHouse,
  selectedTransaction,
  onTransactionSelect,
  onEntitySelect,
  exceptions,
  getRelatedExceptions,
  getTransactionBackgroundColor,
  getTransactionStatusColor,
}: FlowVisualizationProps) {
  const [layoutData, setLayoutData] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(!transactions || transactions.length === 0 ? false : true);

  // Generate dynamic flow visualization based on actual transaction data
  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      return;
    }

    // Extract unique entities from transactions (excluding CCP)
    const entities = [...new Set(
      transactions
        .map(t => t.entity)
        .filter(e => e && e !== 'CCP' && e !== 'Central Clearing House')
    )];

    // Sort transactions by step to maintain order
    const sortedTransactions = [...transactions].sort((a, b) => a.step - b.step);

    // Build flows based on transaction direction
    const flows: TransactionFlow[] = sortedTransactions.map(tx => {
      const direction = tx.direction?.toUpperCase() || '';
      
      // Map direction to flow (from -> to)
      if (direction.includes('TO_CCP') || direction === 'TO CCP' || direction === 'SEND') {
        return { from: tx.entity, to: HUB_ID };
      } else if (direction.includes('FROM_CCP') || direction === 'FROM CCP' || direction === 'RECEIVE') {
        return { from: HUB_ID, to: tx.entity };
      } else if (direction.includes('INTERNAL') || direction === 'PROCESS') {
        // For internal processing, show as CCP to CCP (self-loop handled by layout)
        return { from: HUB_ID, to: HUB_ID };
      } else {
        // Default: assume it's going to CCP
        return { from: tx.entity, to: HUB_ID };
      }
    });

    // Filter out invalid flows and self-loops to CCP
    const validFlows = flows.filter(f => 
      f.from && f.to && !(f.from === HUB_ID && f.to === HUB_ID)
    );

    if (entities.length === 0 && validFlows.length === 0) {
      // No valid data to display
      // Initialize empty state outside of effect to avoid cascading renders
      const initializeEmptyState = () => {
        setLayoutData({ nodes: [], edges: [] });
        setIsLoading(false);
      };
      initializeEmptyState();
      return;
    }

    generateElkLayout(entities, validFlows, clearingHouse, onEntitySelect, transactions, exceptions)
      .then((result) => {
        setLayoutData(result);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('ELK layout failed:', error);
        setIsLoading(false);
      });
  }, [transactions, clearingHouse, onEntitySelect, exceptions]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setLayoutData((prev) => ({
      ...prev,
      nodes: applyNodeChanges(changes, prev.nodes),
    }));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as "system" | "timeline")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Network className="size-4" />
              System Flow
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="size-4" />
              Timeline Flow
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        {activeTab === "timeline" ? (
          <>
            <CardDescription className="mb-4">
              Click on a transaction to view details
            </CardDescription>
            <div className="max-h-[800px] overflow-y-auto">
              <div className="space-y-4 px-4 py-2">
                {transactions.map((transaction, index) => {
                  const relatedExceptions = getRelatedExceptions(transaction.trans_id);

                  return (
                    <TimelineTransactionCard
                      key={transaction.trans_id}
                      transaction={transaction}
                      index={index}
                      isSelected={selectedTransaction?.trans_id === transaction.trans_id}
                      isLast={index === transactions.length - 1}
                      relatedExceptions={relatedExceptions}
                      getTransactionBackgroundColor={getTransactionBackgroundColor}
                      getTransactionStatusColor={getTransactionStatusColor}
                      onClick={() => onTransactionSelect(transaction)}
                    />
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            <CardDescription className="mb-4">
              System architecture and data flow visualization
            </CardDescription>
            <div className="h-[800px] border rounded-lg bg-slate-50 relative">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-black/75 font-bold">Computing ELK Layout...</div>
                </div>
              ) : (
                <ReactFlow
                  nodes={layoutData.nodes}
                  edges={layoutData.edges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  onNodesChange={onNodesChange}
                  nodesDraggable
                  nodesConnectable={false}
                  elementsSelectable
                  panOnDrag={[1, 2]}
                  selectionOnDrag={false}
                  zoomOnScroll
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                >
                  <Background color="#e2e8f0" gap={20} />
                  <Controls />
                </ReactFlow>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
