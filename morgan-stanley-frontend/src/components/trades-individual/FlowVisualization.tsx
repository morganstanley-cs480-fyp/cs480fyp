// Timeline/System flow tabs container - split into two different flows next time

import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Clock, Network, Pause, Play, RotateCcw, Landmark, ShieldCheck, Maximize2, Minimize2 } from "lucide-react";
import { TimelineTransactionCard } from "./TimelineTransactionCard";
import type { Transaction, Exception } from "@/lib/api/types";
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  type ReactFlowInstance,
} from '@xyflow/react';
import "@xyflow/react/dist/style.css";
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';

const HUB_ID = 'CCP';
const NODE_WIDTH = 180;
const NODE_HEIGHT = 120;
const HUB_MIN_WIDTH = NODE_WIDTH * 8;
const EDGE_COLOR = '#002B51';
const EDGE_OFFSET = 22;
const PARTICIPANT_MARGIN = 16;
const HUB_MARGIN = 40;
const PLAYBACK_INTERVAL_MS = 900;

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

  const laneOffset =
    totalOffsets > 1 ? (offsetIndex - (totalOffsets - 1) / 2) * EDGE_OFFSET : 0;

  const x = clamp(otherCenter.x + laneOffset, minX, maxX);
  return { x, y };
}

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // Function to find closest point on a rectangle perimeter
    const closestPointOnRect = (point: Point, rect: typeof ccpBounds): { point: Point; dist: number } => {
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

    // Find closest point on CCP to the departure point (shortest distance)
    const ccpConnectionPoint: Point = closestPointOnRect(departurePoint, ccpBounds).point;

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

  const handleEdgeMouseEnter = () => {
    if (!data?.onEdgeHoverChange || !data?.transaction) return;

    data.onEdgeHoverChange({
      transaction: data.transaction,
      pendingExceptionCount: data.pendingExceptionCount ?? 0,
      step: Number(data.transaction.step ?? data.step ?? 0),
      sourceId: source,
      targetId: target,
    });
  };

  const handleEdgeMouseLeave = () => {
    data?.onEdgeHoverChange?.(null);
  };

  // Determine color based on transaction status and exceptions
  const hasExceptions = data?.hasExceptions ?? false;
  const transaction = data?.transaction;
  const status = transaction?.status || 'ALLEGED';
  
  // Determine badge colors based on status and exceptions - REJECTED takes priority
  let badgeBackgroundColor = 'white';
  let badgeBorderColor = '#cbd5e1';
  let badgeTextColor = '#000000';
  
  switch (status.toUpperCase()) {
    case 'CLEARED':
      // ✅ Green scheme (matches bg-green-50 border-green-200)
      badgeBackgroundColor = '#f0fdf4'; // green-50
      badgeBorderColor = '#bbf7d0';      // green-200
      badgeTextColor = '#15803d';        // green-700
      break;
      
    case 'REJECTED':
      // ✅ Red scheme (matches bg-red-50 border-red-200) 
      badgeBackgroundColor = '#fef2f2'; // red-50
      badgeBorderColor = '#fecaca';      // red-200
      badgeTextColor = '#dc2626';        // red-600
      break;
      
    case 'ALLEGED':
      // ✅ Yellow scheme (matches bg-yellow-50 border-yellow-200)
      badgeBackgroundColor = '#fefce8'; // yellow-50
      badgeBorderColor = '#fde68a';      // yellow-200  
      badgeTextColor = '#d97706';        // yellow-600
      break;
      
    case 'CANCELLED':
    default:
      // ✅ Gray scheme (matches bg-gray-50 border-gray-200)
      badgeBackgroundColor = '#f9fafb'; // gray-50
      badgeBorderColor = '#e5e7eb';      // gray-200
      badgeTextColor = '#6b7280';        // gray-500
      break;
  }
  
  // ✅ Override with exception indicator if needed (optional - only for non-CLEARED)
  if (hasExceptions && status !== 'CLEARED') {
    // Add subtle exception indicator (slightly darker border)
    badgeBorderColor = status === 'ALLEGED' ? '#facc15' : badgeBorderColor; // Make yellow more prominent
  }


  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke: EDGE_COLOR, strokeWidth: 2.25, strokeLinecap: 'round', cursor:'pointer' }}
        markerEnd={markerEnd}
        onClick={handleEdgeClick}
        onMouseEnter={handleEdgeMouseEnter}
        onMouseLeave={handleEdgeMouseLeave}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
            pointerEvents: 'auto',
          }}
          onClick={handleEdgeClick}
          onMouseEnter={handleEdgeMouseEnter}
          onMouseLeave={handleEdgeMouseLeave}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: `2px solid ${badgeBorderColor}`,
              backgroundColor: badgeBackgroundColor,
              color: badgeTextColor,
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
            }}
          >
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
  const status = data.status || 'ALLEGED';

  // Get background color based on status
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'CLEARED':
        return 'bg-green-50';
      case 'ALLEGED':
        return 'bg-slate-50';
      case 'REJECTED':
        return 'bg-red-50';
      case 'CANCELLED':
        return 'bg-yellow-50';
      default:
        return 'bg-slate-50';
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'CLEARED':
        return 'border-green-400';
      case 'ALLEGED':
        return 'border-black/10';
      case 'REJECTED':
        return 'border-red-400';
      case 'CANCELLED':
        return 'border-yellow-400';
      default:
        return 'border-black/10';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onEntitySelect) {
      data.onEntitySelect(data.label, isHub);
    }
  };

  // Override colors for hub entity to be blue
  const getHubBgColor = () => 'bg-blue-50';
  const getHubBorderColor = () => 'border-blue-400';

  return (
    <div
      onClick={handleClick}
      className={`p-4 rounded-lg border-2 shadow-md flex flex-col justify-center cursor-pointer hover:shadow-lg transition-all text-center subpixel-antialiased ${
        isHub ? getHubBgColor() : getStatusBgColor(status)} ${
        isHub ? getHubBorderColor() : getStatusBorderColor(status)} ${
        isHub ? 'hover:border-[#002B51]' : 'hover:border-black/15'
      }`}
      style={{ width, height: NODE_HEIGHT, boxSizing: 'border-box' }}
    >
      <div className="flex items-center gap-2 mb-1 justify-center">
        {isHub ? (
          <ShieldCheck className="text-[#002B51]" size={16} />
        ) : (
          <Landmark className="text-black/50" size={16} />
        )}
        <span className="text-[10px] font-bold uppercase tracking-wide text-black/60">
          {isHub ? 'Central Clearing' : 'Participant'}
        </span>
      </div>
      <div className="text-sm font-bold text-black uppercase truncate tracking-wide">{data.label}</div>

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

interface EdgeHoverState {
  transaction: Transaction;
  pendingExceptionCount: number;
  step: number;
  sourceId: string;
  targetId: string;
}

async function generateElkLayout(
  participants: string[], 
  transactionFlows: TransactionFlow[], 
  clearingHouse: string,
  onEntitySelect: (entityName: string, isHub: boolean) => void,
  allTransactions: Transaction[],
  sortedTransactions: Transaction[],
  _exceptions: Exception[],
  onTransactionSelect: (transaction: Transaction) => void,
  getRelatedExceptions: (trans_id: number) => Exception[],
  onEdgeHoverChange: (hoverState: EdgeHoverState | null) => void
) {
  try {
    const elk = new ELK();
    
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
  
  // Group transactions by entity and get the latest status
  const transactionsByEntity: Record<string, Transaction[]> = {};
  allTransactions.forEach((tx) => {
    if (tx.entity && tx.entity !== 'CCP') {
      if (!transactionsByEntity[tx.entity]) {
        transactionsByEntity[tx.entity] = [];
      }
      transactionsByEntity[tx.entity].push(tx);
    }
  });
  
  // For each entity, find the most recent transaction status
  Object.entries(transactionsByEntity).forEach(([entity, entityTransactions]) => {
    // Sort by step descending to get the latest transaction
    const sortedEntityTx = entityTransactions.sort((a, b) => b.step - a.step);
    const latestTransaction = sortedEntityTx[0];
    
    // Use the actual transaction status directly
    entityStatusMap[entity] = latestTransaction.status;
    
  });

  const nodeLookup: Record<string, { x: number; y: number; width: number }> = {};
  layout.children?.forEach((n) => {
    const isHub = n.id === HUB_ID;
    const x = (n.x ?? 0) - xCenter;
    const y = n.y ?? 0;
    const width = isHub ? hubWidth : NODE_WIDTH;
    const status = isHub ? 'CLEARED' : (entityStatusMap[n.id!] || 'ALLEGED');

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
    
    // Check if this transaction has exceptions (only count PENDING exceptions for non-CLEARED transactions)
    const pendingExceptionCount = correspondingTransaction
      ? (() => {
          if (correspondingTransaction.status === 'CLEARED') {
            return 0;
          }
          const relatedExceptions = getRelatedExceptions(correspondingTransaction.id);
          return relatedExceptions.filter(exc => exc.status === 'PENDING').length;
        })()
      : 0;
    const hasExceptions = pendingExceptionCount > 0;

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
        hasExceptions,
        pendingExceptionCount,
        onEdgeClick: onTransactionSelect,
        onEdgeHoverChange,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR, width: 18, height: 18 },
    });
  });

  return { nodes, edges };
  } catch (error) {
    console.error('💥 Error in generateElkLayout:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Unknown error');
    throw error;
  }
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
  const [initialLayoutData, setInitialLayoutData] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(!transactions || transactions.length === 0 ? false : true);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<EdgeHoverState | null>(null);
  const [playbackStep, setPlaybackStep] = useState<number>(Number.MAX_SAFE_INTEGER);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasManualNodeInteraction, setHasManualNodeInteraction] = useState(false);
  const flowContainerRef = useRef<HTMLDivElement | null>(null);
  const fitBoostTimeoutRef = useRef<number | null>(null);

  // ✅ Enhanced function to get related exceptions with transaction status check
  const getFilteredRelatedExceptions = useCallback((transaction: Transaction): Exception[] => {
    // If transaction is CLEARED, don't show any exceptions
    if (transaction.status === 'CLEARED') {
      return [];
    }
    
    // Otherwise, only show PENDING exceptions
    const relatedExceptions = getRelatedExceptions(transaction.id);
    return relatedExceptions.filter(exc => exc.status === 'PENDING');
  }, [getRelatedExceptions]);

  // Use mergedTransactions for all rendering (combines API + WebSocket data)
  const sortedTransactions = [...transactions].sort((a, b) => a.step - b.step);
  const maxPlaybackStep = useMemo(
    () => sortedTransactions.reduce((max, transaction) => Math.max(max, transaction.step), 0),
    [sortedTransactions],
  );
  const effectivePlaybackStep = maxPlaybackStep === 0 ? 0 : Math.min(playbackStep, maxPlaybackStep);

  useEffect(() => {
    if (maxPlaybackStep === 0) {
      setPlaybackStep(0);
      setIsPlaying(false);
      return;
    }

    setPlaybackStep((current) => {
      if (current === Number.MAX_SAFE_INTEGER || current === 0) {
        return maxPlaybackStep;
      }
      return Math.min(current, maxPlaybackStep);
    });
  }, [maxPlaybackStep]);

  useEffect(() => {
    if (!isPlaying || maxPlaybackStep <= 1) {
      return;
    }

    const timerId = window.setInterval(() => {
      setPlaybackStep((current) => {
        const normalized = current === Number.MAX_SAFE_INTEGER ? 1 : Math.max(1, current);
        return Math.min(normalized + 1, maxPlaybackStep);
      });
    }, PLAYBACK_INTERVAL_MS);

    return () => window.clearInterval(timerId);
  }, [isPlaying, maxPlaybackStep]);

  useEffect(() => {
    if (isPlaying && maxPlaybackStep > 0 && effectivePlaybackStep >= maxPlaybackStep) {
      setIsPlaying(false);
    }
  }, [effectivePlaybackStep, isPlaying, maxPlaybackStep]);

  const renderedLayoutData = useMemo(() => {
    if (maxPlaybackStep === 0 || effectivePlaybackStep >= maxPlaybackStep) {
      return layoutData;
    }

    const visibleEdges = layoutData.edges.filter((edge) => {
      const transactionStep = Number(edge.data?.transaction?.step ?? edge.data?.step ?? 0);
      return transactionStep <= effectivePlaybackStep;
    });

    const visibleNodeIds = new Set<string>();
    visibleEdges.forEach((edge) => {
      visibleNodeIds.add(edge.source);
      visibleNodeIds.add(edge.target);
    });
    visibleNodeIds.add(HUB_ID);

    const visibleNodes = layoutData.nodes.filter((node) => visibleNodeIds.has(node.id));

    return {
      nodes: visibleNodes,
      edges: visibleEdges,
    };
  }, [effectivePlaybackStep, layoutData, maxPlaybackStep]);

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
        setInitialLayoutData({ nodes: [], edges: [] });
        setHasManualNodeInteraction(false);
        setIsLoading(false);
      };
      initializeEmptyState();
      return;
    }

    
    generateElkLayout(entities, validFlows, clearingHouse, onEntitySelect, transactions, sortedTransactions, exceptions, onTransactionSelect, getRelatedExceptions, setHoveredEdge)
      .then((result) => {
        const clonedNodes = result.nodes.map((node) => ({
          ...node,
          position: { ...node.position },
          data: { ...(node.data as Record<string, unknown>) },
        }));
        const clonedEdges = result.edges.map((edge) => ({
          ...edge,
          data: edge.data ? { ...(edge.data as Record<string, unknown>) } : edge.data,
        }));

        const clonedLayout = { nodes: clonedNodes, edges: clonedEdges };
        setLayoutData(clonedLayout);
        setInitialLayoutData(clonedLayout);
        setHasManualNodeInteraction(false);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('❌ ELK layout failed:', error);
        console.error('Error details:', error.stack || error.message);
        setIsLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, clearingHouse, exceptions]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setLayoutData((prev) => ({
      ...prev,
      nodes: applyNodeChanges(changes, prev.nodes),
    }));

    if (changes.length > 0) {
      setHasManualNodeInteraction(true);
    }

    setHoveredEdge(null);
  }, []);

  const handleResetLayout = useCallback(() => {
    if (initialLayoutData.nodes.length === 0) return;

    const resetNodes = initialLayoutData.nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      data: { ...(node.data as Record<string, unknown>) },
    }));

    setLayoutData((prev) => ({
      ...prev,
      nodes: resetNodes,
      edges: initialLayoutData.edges,
    }));
    setHasManualNodeInteraction(false);
    setHoveredEdge(null);
  }, [initialLayoutData]);

  const nodeTypes = useMemo(() => ({ entity: EntityNode }), []);
  const edgeTypes = useMemo(() => ({ workflow: WorkflowEdge }), []);

  const fitToTopBottomNodes = useCallback((options?: { duration?: number; applyBoost?: boolean }) => {
    if (!reactFlowInstance || renderedLayoutData.nodes.length === 0) return;

    const duration = options?.duration ?? 320;
    const applyBoost = options?.applyBoost ?? true;

    const getNodeWidth = (node: Node): number => {
      const data = node.data as { width?: number } | undefined;
      return typeof data?.width === 'number' ? data.width : NODE_WIDTH;
    };

    const topNode = renderedLayoutData.nodes.reduce((currentTop, node) =>
      node.position.y < currentTop.position.y ? node : currentTop
    );

    const bottomNode = renderedLayoutData.nodes.reduce((currentBottom, node) =>
      node.position.y > currentBottom.position.y ? node : currentBottom
    );

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;

    renderedLayoutData.nodes.forEach((node) => {
      const nodeWidth = getNodeWidth(node);
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x + nodeWidth);
    });

    const topY = topNode.position.y;
    const bottomY = bottomNode.position.y + NODE_HEIGHT;

    const verticalSpan = Math.max(1, bottomY - topY);
    const horizontalSpan = Math.max(1, maxX - minX);

    const verticalPadding = Math.max(36, verticalSpan * 0.06);
    const horizontalPadding = Math.max(56, horizontalSpan * 0.045);

    reactFlowInstance.fitBounds(
      {
        x: minX - horizontalPadding,
        y: topY - verticalPadding,
        width: horizontalSpan + horizontalPadding * 2,
        height: verticalSpan + verticalPadding * 2,
      },
      {
        duration,
        minZoom: 0.5,
        maxZoom: 2,
      }
    );

    if (fitBoostTimeoutRef.current) {
      window.clearTimeout(fitBoostTimeoutRef.current);
      fitBoostTimeoutRef.current = null;
    }

    if (applyBoost) {
      fitBoostTimeoutRef.current = window.setTimeout(() => {
        const boostedZoom = Math.min(2, reactFlowInstance.getZoom() * 1.12);
        reactFlowInstance.zoomTo(boostedZoom, { duration: 180 });
      }, duration + 20);
    }
  }, [renderedLayoutData.nodes, reactFlowInstance]);

  useEffect(() => {
    return () => {
      if (fitBoostTimeoutRef.current) {
        window.clearTimeout(fitBoostTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isContainerFullscreen = document.fullscreenElement === flowContainerRef.current;
      setIsFullscreen(isContainerFullscreen);

      if (
        activeTab !== 'system' ||
        isLoading ||
        renderedLayoutData.nodes.length === 0 ||
        !reactFlowInstance
      ) {
        return;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitToTopBottomNodes({ duration: 240, applyBoost: false });
        });
      });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [activeTab, fitToTopBottomNodes, isLoading, reactFlowInstance, renderedLayoutData.nodes.length]);

  const handleToggleFullscreen = useCallback(async () => {
    const container = flowContainerRef.current;
    if (!container) return;

    if (document.fullscreenElement === container) {
      await document.exitFullscreen();
      return;
    }

    await container.requestFullscreen();
  }, []);

  useEffect(() => {
    if (activeTab !== 'system' || isLoading || renderedLayoutData.nodes.length === 0 || !reactFlowInstance || hasManualNodeInteraction) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      fitToTopBottomNodes();
    });

    return () => cancelAnimationFrame(frameId);
  }, [activeTab, hasManualNodeInteraction, isLoading, renderedLayoutData.nodes, reactFlowInstance, fitToTopBottomNodes]);

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
                        {sortedTransactions.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                No transactions found for this trade.
                            </div>
                        ) : (
                            sortedTransactions.map((transaction, index) => {
                                const relatedExceptions = getFilteredRelatedExceptions(transaction);

                                return (
                                    <TimelineTransactionCard
                                        key={transaction.id}
                                        transaction={transaction}
                                        index={index}
                                        isSelected={selectedTransaction?.id === transaction.id}
                                        isLast={index === sortedTransactions.length - 1}
                                        relatedExceptions={relatedExceptions}
                                        getTransactionBackgroundColor={getTransactionBackgroundColor}
                                        getTransactionStatusColor={getTransactionStatusColor}
                                        onClick={() => onTransactionSelect(transaction)}
                                    />
                                );
                            })
                        )}
                    </div>
                </div>
            </>
        ) : (
          <>
            <CardDescription className="mb-4">
              System architecture and data flow visualization. Hover an edge marker for details.
            </CardDescription>
            {maxPlaybackStep > 0 && (
              <div className="mb-4 rounded-md border border-black/10 bg-white px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-semibold text-black/70 uppercase tracking-wide">Playback Step</span>
                    <span className="ml-3 font-mono text-black/60">
                      Step {Math.max(1, effectivePlaybackStep)} / {maxPlaybackStep}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 min-w-[92px]"
                      disabled={maxPlaybackStep <= 1}
                      onClick={() => {
                        if (effectivePlaybackStep >= maxPlaybackStep) {
                          setPlaybackStep(1);
                          setIsPlaying(true);
                          return;
                        }
                        setIsPlaying((prev) => !prev);
                      }}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="mr-1 size-3.5" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 size-3.5" />
                          Play
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={initialLayoutData.nodes.length === 0}
                      onClick={handleResetLayout}
                    >
                      <RotateCcw className="mr-1 size-3.5" />
                      Reset Layout
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={handleToggleFullscreen}
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize2 className="mr-1 size-3.5" />
                          Exit Full Screen
                        </>
                      ) : (
                        <>
                          <Maximize2 className="mr-1 size-3.5" />
                          Full Screen
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Slider
                  value={[Math.max(1, effectivePlaybackStep)]}
                  min={1}
                  max={Math.max(1, maxPlaybackStep)}
                  step={1}
                  onValueChange={(values) => {
                    setPlaybackStep(values[0] ?? 1);
                    setIsPlaying(false);
                  }}
                  disabled={maxPlaybackStep <= 1}
                />
              </div>
            )}
            <div
              ref={flowContainerRef}
              className={`border rounded-lg relative w-full ${isFullscreen ? 'h-full bg-white' : 'h-[800px] bg-slate-50'}`}
            >
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-black/75 font-bold">Computing ELK Layout...</div>
                </div>
              ) : (
                <>
                  <ReactFlow
                    nodes={renderedLayoutData.nodes}
                    edges={renderedLayoutData.edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onInit={setReactFlowInstance}
                    onNodesChange={onNodesChange}
                    onNodeDragStop={() => {
                      setHasManualNodeInteraction(true);
                      setIsPlaying(false);
                      requestAnimationFrame(() => {
                        fitToTopBottomNodes({ duration: 220, applyBoost: false });
                      });
                    }}
                    onPaneClick={() => setHoveredEdge(null)}
                    nodesConnectable={false}
                    selectionOnDrag={false}
                    minZoom={0.1}
                    maxZoom={2}
                  >
                    <Background color="#e2e8f0" gap={20} />
                    <Controls />
                  </ReactFlow>

                  {hoveredEdge && (
                    <div className="pointer-events-none absolute left-3 top-3 z-20 w-72 rounded-md border border-black/10 bg-white/95 p-3 shadow-sm backdrop-blur-sm">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-black/50">Transaction Hover</div>
                      <div className="grid grid-cols-2 gap-y-1 text-xs text-black/80">
                        <span className="text-black/50">ID</span>
                        <span className="font-mono">{hoveredEdge.transaction.id}</span>
                        <span className="text-black/50">Step</span>
                        <span className="font-mono">{hoveredEdge.step}</span>
                        <span className="text-black/50">Path</span>
                        <span className="truncate">{hoveredEdge.sourceId} → {hoveredEdge.targetId}</span>
                        <span className="text-black/50">Status</span>
                        <span className="font-semibold">{hoveredEdge.transaction.status}</span>
                        <span className="text-black/50">Pending Exceptions</span>
                        <span className="font-mono">{hoveredEdge.pendingExceptionCount}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}