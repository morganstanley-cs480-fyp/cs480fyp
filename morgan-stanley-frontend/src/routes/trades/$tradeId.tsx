import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getTradeById,
  getTransactionsForTrade,
  getExceptionsForTrade,
  type Transaction,
  type Exception,
} from "@/lib/mockData";

// Component imports
import { TradeInfoCard } from "@/components/trades-individual/TradeInfoCard";
import { FlowVisualization } from "@/components/trades-individual/FlowVisualization";
import { TransactionDetailPanel } from "@/components/trades-individual/TransactionDetailPanel";

export const Route = createFileRoute("/trades/$tradeId")({
  component: TradeDetailPage,
});

function TradeDetailPage() {
  const { tradeId } = Route.useParams();
  const navigate = useNavigate();

  const trade = getTradeById(tradeId);
  const transactions = getTransactionsForTrade(tradeId);
  const exceptions = getExceptionsForTrade(tradeId);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTradeInfo, setShowTradeInfo] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "system">("system");

  const getStatusColor = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case "CLEARED":
        return "default";
      case "ALLEGED":
        return "secondary";
      case "REJECTED":
        return "destructive";
      case "CANCELLED":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getTransactionStatusColor = (status: string): "default" | "destructive" | "secondary" => {
    switch (status) {
      case "COMPLETED":
        return "default";
      case "PENDING":
        return "secondary";
      case "FAILED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getPriorityColor = (priority: string): "default" | "destructive" | "secondary" => {
    if (priority === "HIGH") return "destructive";
    if (priority === "MEDIUM") return "default";
    return "secondary";
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === "HIGH")
      return <AlertTriangle className="size-4 text-red-600" />;
    if (priority === "MEDIUM")
      return <AlertTriangle className="size-4 text-orange-600" />;
    return <Clock className="size-4 text-yellow-600" />;
  };

  const getTransactionBackgroundColor = (transaction: Transaction) => {
    // Check if this transaction has an associated exception
    const hasException = exceptions.some((exc) => exc.trans_id === transaction.trans_id);

    if (hasException) {
      return "bg-red-50 border-red-300";
    }

    if (transaction.status === "COMPLETED") {
      return "bg-green-50 border-green-300";
    }

    if (transaction.status === "PENDING") {
      return "bg-slate-100 border-slate-300";
    }

    if (transaction.status === "FAILED") {
      return "bg-red-50 border-red-300";
    }

    return "bg-slate-100 border-slate-300";
  };

  const getRelatedExceptions = (transId: string): Exception[] => {
    return exceptions.filter((exc) => exc.trans_id === transId);
  };

  const handleResolveException = (exceptionId: string) => {
    navigate({
      to: "/exceptions/$exceptionId",
      params: { exceptionId },
    });
  };

  if (!trade) {
    return (
      <div className="p-6 w-full mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
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
              variant={getStatusColor(trade.status)}
              className="text-lg px-4 py-2"
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
            selectedTransaction={selectedTransaction}
            onTransactionSelect={setSelectedTransaction}
            getRelatedExceptions={getRelatedExceptions}
            getTransactionBackgroundColor={getTransactionBackgroundColor}
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
            getStatusColor={getStatusColor}
          />

          {/* Transaction Details */}
          <TransactionDetailPanel
            selectedTransaction={selectedTransaction}
            relatedExceptions={
              selectedTransaction ? getRelatedExceptions(selectedTransaction.trans_id) : []
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
