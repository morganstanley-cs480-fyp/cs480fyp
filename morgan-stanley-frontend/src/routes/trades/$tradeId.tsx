import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getTradeById,
  getTransactionsForTrade,
  getExceptionsForTrade,
  type Transaction,
} from "@/lib/mockData";

// Component imports
import { TradeInfoCard } from "@/components/trades-individual/TradeInfoCard";
import { FlowVisualization } from "@/components/trades-individual/FlowVisualization";
import { TransactionDetailPanel } from "@/components/trades-individual/TransactionDetailPanel";
import { EntityDetailPanel } from "@/components/trades-individual/EntityDetailPanel";

// Utility imports
import {
  getStatusBadgeClassName,
  getTransactionStatusColor,
  getPriorityColor,
  getPriorityIcon,
  getTransactionBackgroundColor,
  getRelatedExceptions,
} from "./-tradeDetailUtils";

export const Route = createFileRoute("/trades/$tradeId")({
  component: TradeDetailPage,
});

function TradeDetailPage() {
  const { tradeId } = Route.useParams();
  const navigate = useNavigate();

  const trade = getTradeById(Number(tradeId));
  const transactions = getTransactionsForTrade(Number(tradeId));
  const exceptions = getExceptionsForTrade(Number(tradeId));

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<{ name: string; isHub: boolean } | null>(null);
  const [showTradeInfo, setShowTradeInfo] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "system">("system");

  const handleResolveException = (exceptionId: string) => {
    navigate({
      to: "/exceptions/$exceptionId",
      params: { exceptionId },
    });
  };

  const handleEntitySelect = (entityName: string, isHub: boolean) => {
    setSelectedEntity({ name: entityName, isHub });
    setSelectedTransaction(null); // Clear transaction selection
  };

  const handleTransactionSelect = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setSelectedEntity(null); // Clear entity selection
  };

  if (!trade) {
    return (
      <div className="p-6 w-full mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-black/50">
              <AlertCircle className="size-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-2">Trade Not Found</p>
              <p className="text-sm mb-4">
                The trade with ID "{tradeId}" could not be found.
              </p>
              <Button onClick={() => navigate({ to: "/trades" })}>
                <ArrowLeft className="size-4 mr-2" />
                Back to Trades
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div>
                <CardTitle>Trade Clearing Flow Visualization</CardTitle>
                <CardDescription className="mt-2">
                  Interactive flow diagram and transaction timeline for{" "}
                  <span className="font-extrabold">Trade {trade.trade_id}</span>
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={`text-lg px-4 py-2 ${getStatusBadgeClassName(trade.status)}`}
            >
              {trade.status}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content - Split View */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Side - Timeline/System Flow Tabs */}
        <div className="space-y-6">
          <FlowVisualization
            activeTab={activeTab}
            onTabChange={setActiveTab}
            transactions={transactions}
            clearingHouse={trade.clearing_house}
            selectedTransaction={selectedTransaction}
            onTransactionSelect={handleTransactionSelect}
            onEntitySelect={handleEntitySelect}
            exceptions={exceptions}
            getRelatedExceptions={(transId) => getRelatedExceptions(transId, exceptions)}
            getTransactionBackgroundColor={(transaction) => getTransactionBackgroundColor(transaction, exceptions)}
            getTransactionStatusColor={getTransactionStatusColor}
          />
        </div>

        {/* Right Side - Trade Info & Transaction Details */}
        <div className="space-y-6">
          {/* Trade Information Card - Collapsible */}
          <TradeInfoCard
            trade={trade}
            transactions={transactions}
            exceptions={exceptions}
            showTradeInfo={showTradeInfo}
            onToggle={() => setShowTradeInfo(!showTradeInfo)}
            getStatusBadgeClassName={getStatusBadgeClassName}
          />

          {/* Entity Details */}
          {selectedEntity && (
            <EntityDetailPanel
              entityName={selectedEntity.name}
              isHub={selectedEntity.isHub}
              transactions={transactions}
            />
          )}

          {/* Transaction Details */}
          <TransactionDetailPanel
            selectedTransaction={selectedTransaction}
            relatedExceptions={
              selectedTransaction ? getRelatedExceptions(selectedTransaction.trans_id, exceptions) : []
            }
            getTransactionStatusColor={getTransactionStatusColor}
            getPriorityColor={getPriorityColor}
            getPriorityIcon={getPriorityIcon}
            onResolveException={handleResolveException}
          />
        </div>
      </div>
    </div>
  );
}
