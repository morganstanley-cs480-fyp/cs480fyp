// Timeline/System flow tabs container - split into two different flows next time

import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Network } from "lucide-react";
import { TimelineTransactionCard } from "./TimelineTransactionCard";
import type { Transaction, Exception } from "@/lib/mockData";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface FlowVisualizationProps {
  activeTab: "timeline" | "system";
  onTabChange: (tab: "timeline" | "system") => void;
  transactions: Transaction[];
  selectedTransaction: Transaction | null;
  onTransactionSelect: (transaction: Transaction) => void;
  getRelatedExceptions: (transId: string) => Exception[];
  getTransactionBackgroundColor: (transaction: Transaction) => string;
  getTransactionStatusColor: (status: string) => "default" | "destructive" | "secondary";
}

export function FlowVisualization({
  activeTab,
  onTabChange,
  transactions,
  selectedTransaction,
  onTransactionSelect,
  getRelatedExceptions,
  getTransactionBackgroundColor,
  getTransactionStatusColor,
}: FlowVisualizationProps) {
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
            <div className="h-[800px] border rounded-lg bg-slate-50">
              <ReactFlow nodes={[]} edges={[]} fitView>
                <Background />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
