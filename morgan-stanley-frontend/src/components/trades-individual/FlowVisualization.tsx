// Timeline/System flow tabs container - split into two different flows next time

import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Network } from "lucide-react";
import { TimelineTransactionCard } from "./TimelineTransactionCard";
import type { Transaction, Exception } from "@/lib/api/types";
import { useEffect, useState, useCallback, useMemo } from 'react';
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

  const sourceWidth = data?.sourceWidth ?? NODE_WIDTH;
  const targetWidth = data?.targetWidth ?? NODE_WIDTH;
  
  // Get node bounds
  const sourceBounds = {
    left: sourceNode.position.x,
    right: sourceNode.position.x + sourceWidth,
    top: sourceNode.position.y,
    bottom: sourceNode.position.y + NODE_HEIGHT,
    centerX: sourceNode.position.x + sourceWidth / 2,
    centerY: sourceNode.position.y + NODE_HEIGHT / 2
  };
  
  const targetBounds = {
    left: targetNode.position.x,
    right: targetNode.position.x + targetWidth,
    top: targetNode.position.y,
    bottom: targetNode.position.y + NODE_HEIGHT,
    centerX: targetNode.position.x + targetWidth / 2,
    centerY: targetNode.position.y + NODE_HEIGHT / 2
  };

  const isCCPSource = source === HUB_ID;
  const isCCPTarget = target === HUB_ID;
  const isCCPInvolved = isCCPSource || isCCPTarget;
  
  // Get pair spacing information
  const edgeIndexInPair = data?.edgeIndexInPair ?? 0;
  const totalEdgesInPair = Math.max(1, data?.totalEdgesInPair ?? 1);

  let startPoint: Point;
  let endPoint: Point;

  if (isCCPInvolved) {
    // One node is CCP, the other is the outer node
    const outerBounds = isCCPSource ? targetBounds : sourceBounds;
    const ccpBounds = isCCPSource ? sourceBounds : targetBounds;

    // Determine which direction the outer node is from CCP
    const outerAboveCCP = outerBounds.bottom < ccpBounds.top;
    const outerBelowCCP = outerBounds.top > ccpBounds.bottom;
    const outerLeftOfCCP = outerBounds.right < ccpBounds.left;
    const outerRightOfCCP = outerBounds.left > ccpBounds.right;

    // Calculate departure point from outer node (distributed along its edge)
    let departurePoint: Point;

    if (outerBelowCCP) {
      // Outer node is below CCP - distribute along its top edge
      const spacing = outerBounds.right - outerBounds.left;
      const x = outerBounds.left + (spacing / (totalEdgesInPair + 1)) * (edgeIndexInPair + 1);
      departurePoint = { x, y: outerBounds.top };
    } else if (outerAboveCCP) {
      // Outer node is above CCP - distribute along its bottom edge
      const spacing = outerBounds.right - outerBounds.left;
      const x = outerBounds.left + (spacing / (totalEdgesInPair + 1)) * (edgeIndexInPair + 1);
      departurePoint = { x, y: outerBounds.bottom };
    } else if (outerRightOfCCP) {
      // Outer node is to the right of CCP - distribute along its left edge
      const spacing = NODE_HEIGHT;
      const y = outerBounds.top + (spacing / (totalEdgesInPair + 1)) * (edgeIndexInPair + 1);
      departurePoint = { x: outerBounds.left, y };
    } else {
      // Outer node is to the left of CCP - distribute along its right edge
      const spacing = NODE_HEIGHT;
      const y = outerBounds.top + (spacing / (totalEdgesInPair + 1)) * (edgeIndexInPair + 1);
      departurePoint = { x: outerBounds.right, y };
    }

    // Find closest point on CCP to the departure point (shortest distance)
    let ccpConnectionPoint: Point;
    
    // Function to find closest point on a rectangle perimeter
    const closestPointOnRect = (point: Point, rect: any): { point: Point; dist: number } => {
      // Clamp the x and y to the rectangle bounds
      const clampedX = Math.max(rect.left, Math.min(rect.right, point.x));
      const clampedY = Math.max(rect.top, Math.min(rect.bottom, point.y));
      
      // The closest point on the perimeter is the clamped point
      const closest = { x: clampedX, y: clampedY };
      
      // Calculate distance
      const dx = point.x - closest.x;
      const dy = point.y - closest.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      return { point: closest, dist };
    };

    const result = closestPointOnRect(departurePoint, ccpBounds);
    ccpConnectionPoint = result.point;

    // Set start and end points based on direction
    if (isCCPSource) {
      startPoint = ccpConnectionPoint;
      endPoint = departurePoint;
    } else {
      startPoint = departurePoint;
      endPoint = ccpConnectionPoint;
    }
  } else {
    // Non-CCP connection - distribute normally on both sides
    const targetBelowSource = targetBounds.top > sourceBounds.bottom;
    const targetAboveSource = targetBounds.bottom < sourceBounds.top;
    const targetRightOfSource = targetBounds.left > sourceBounds.right;

    if (targetBelowSource) {
      const sourceSpacing = sourceWidth / (totalEdgesInPair + 1);
      const sourceX = sourceBounds.left + sourceSpacing * (edgeIndexInPair + 1);
      
      const targetSpacing = targetWidth / (totalEdgesInPair + 1);
      const targetX = targetBounds.left + targetSpacing * (edgeIndexInPair + 1);
      
      startPoint = { x: sourceX, y: sourceBounds.bottom };
      endPoint = { x: targetX, y: targetBounds.top };
    } else if (targetAboveSource) {
      const sourceSpacing = sourceWidth / (totalEdgesInPair + 1);
      const sourceX = sourceBounds.left + sourceSpacing * (edgeIndexInPair + 1);
      
      const targetSpacing = targetWidth / (totalEdgesInPair + 1);
      const targetX = targetBounds.left + targetSpacing * (edgeIndexInPair + 1);
      
      startPoint = { x: sourceX, y: sourceBounds.top };
      endPoint = { x: targetX, y: targetBounds.bottom };
    } else if (targetRightOfSource) {
      const sourceLaneGap = NODE_HEIGHT / (totalEdgesInPair + 1);
      const sourceY = sourceBounds.top + sourceLaneGap * (edgeIndexInPair + 1);
      
      const targetLaneGap = NODE_HEIGHT / (totalEdgesInPair + 1);
      const targetY = targetBounds.top + targetLaneGap * (edgeIndexInPair + 1);
      
      startPoint = { x: sourceBounds.right, y: sourceY };
      endPoint = { x: targetBounds.left, y: targetY };
    } else {
      const sourceLaneGap = NODE_HEIGHT / (totalEdgesInPair + 1);
      const sourceY = sourceBounds.top + sourceLaneGap * (edgeIndexInPair + 1);
      
      const targetLaneGap = NODE_HEIGHT / (totalEdgesInPair + 1);
      const targetY = targetBounds.top + targetLaneGap * (edgeIndexInPair + 1);
      
      startPoint = { x: sourceBounds.left, y: sourceY };
      endPoint = { x: targetBounds.right, y: targetY };
    }
  }

  // Calculate midpoint for label
  const midX = (startPoint.x + endPoint.x) / 2;
  const midY = (startPoint.y + endPoint.y) / 2;

  // Straight line - shortest path
  const path = `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;

  const handleEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.onEdgeClick && data?.transaction) {
      data.onEdgeClick(data.transaction);
    }
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke: EDGE_COLOR, strokeWidth: 2.25, strokeLinecap: 'round', cursor:'pointer' }}
        markerEnd={markerEnd}
        onClick={handleEdgeClick}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
            pointerEvents: 'auto',
          }}
          onClick={handleEdgeClick}
        >
      <div className="w-6 h-6 rounded-full bg-white border border-slate-300 text-[11px] font-semibold text-black/75 flex items-center justify-center shadow-sm cursor-pointer hover:border-[#002B51] hover:shadow-md transition-all">
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
  sortedTransactions: Transaction[],
  exceptions: Exception[],
  onTransactionSelect: (transaction: Transaction) => void // Add this parameter

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

  // Count edges per node pair
  const pairCounts: Record<string, number> = {};
  layout.edges?.forEach((e) => {
    const sourceId = e.sources[0];
    const targetId = e.targets[0];
    const pairKey = [sourceId, targetId].sort().join('::');
    pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
  });

  // Track which index this edge is within its node pair
  const pairSeen: Record<string, number> = {};
  
  layout.edges?.forEach((e, idx) => {
    const sourceId = e.sources[0];
    const targetId = e.targets[0];
    const pairKey = [sourceId, targetId].sort().join('::');

    const edgeIndexInPair = pairSeen[pairKey] || 0;
    const totalEdgesInPair = pairCounts[pairKey] || 1;
    pairSeen[pairKey] = edgeIndexInPair + 1;

    const sourceNode = nodeLookup[sourceId];
    const targetNode = nodeLookup[targetId];

    // Find the corresponding transaction for this edge
    const correspondingTransaction = sortedTransactions[idx] || null;

    edges.push({
      id: e.id!,
      source: sourceId,
      target: targetId,
      type: 'workflow',
      data: {
        sourceId,
        targetId,
        step: idx + 1,
        edgeIndexInPair,
        totalEdgesInPair,
        sourceWidth: sourceNode.width ?? NODE_WIDTH,
        targetWidth: targetNode.width ?? NODE_WIDTH,
        transaction: correspondingTransaction,
        onEdgeClick: onTransactionSelect,
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
  getRelatedExceptions: (trans_id: number) => Exception[];
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

    generateElkLayout(entities, validFlows, clearingHouse, onEntitySelect, transactions, sortedTransactions, exceptions, onTransactionSelect)
      .then((result) => {
        setLayoutData(result);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('ELK layout failed:', error);
        setIsLoading(false);
      });
  }, [transactions, clearingHouse, onEntitySelect, exceptions, onTransactionSelect]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setLayoutData((prev) => ({
      ...prev,
      nodes: applyNodeChanges(changes, prev.nodes),
    }));
  }, []);

  const nodeTypes = useMemo(() => ({ entity: EntityNode }), []);
  const edgeTypes = useMemo(() => ({ workflow: WorkflowEdge }), []);

  // Dynamically calculate padding based on number of nodes to fit all entities
  const calculateFitViewPadding = () => {
    const nodeCount = layoutData.nodes.length;
    if (nodeCount <= 1) return 0.8;
    if (nodeCount <= 3) return 0.6;
    if (nodeCount <= 5) return 0.4;
    if (nodeCount <= 10) return 0.25;
    return 0.15;
  };

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
                  panOnDrag={true}
                  selectionOnDrag={false}
                  zoomOnScroll
                  fitView
                  fitViewOptions={{ padding: calculateFitViewPadding() }}
                  minZoom={0.1}
                  maxZoom={2}
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
