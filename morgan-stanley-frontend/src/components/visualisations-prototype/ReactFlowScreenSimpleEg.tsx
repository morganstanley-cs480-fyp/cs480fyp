import { useState, useCallback } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialNodes = [
  { id: "n1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
  { id: "n2", position: { x: 0, y: 100 }, data: { label: "Node 2" } },
];

const initialEdges = [
  {
    id: "n1-n2",
    label: "Step 1",
    source: "n1",
    target: "n2",
    data: {
      transId: "2N94227",
      time: "1.75559E+12",
      entity: "CLEARING HOUSE",
      direction: "SEND",
      transType: "Trade Approval Sys",
      transStatus: "SEND",
      step: 1,
    },
  },
];

export default function ReactFlowScreenWithEg() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedEdge, setSelectedEdge] = useState(null);

  const onNodesChange = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );
  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    []
  );

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
  }, []);

  return (
    <div className="h-screen w-screen flex">
      <div className={selectedEdge ? "w-1/2" : "w-full"}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          fitView
        />
      </div>

      {selectedEdge && (
        <div className="w-1/2 p-4 border-l bg-background overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>
                {selectedEdge.source} → {selectedEdge.target}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-semibold">Transaction ID:</span>{" "}
                {selectedEdge.data?.transId || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Time:</span>{" "}
                {selectedEdge.data?.time || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Entity:</span>{" "}
                {selectedEdge.data?.entity || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Direction:</span>{" "}
                {selectedEdge.data?.direction || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Transaction Type:</span>{" "}
                {selectedEdge.data?.transType || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Status:</span>{" "}
                {selectedEdge.data?.transStatus || "N/A"}
              </div>
              <div>
                <span className="font-semibold">Step:</span>{" "}
                {selectedEdge.data?.step || "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
