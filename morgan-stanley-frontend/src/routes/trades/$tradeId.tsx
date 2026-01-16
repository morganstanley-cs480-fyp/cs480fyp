import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowDownRight,
  AlertCircle,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  Network,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getTradeById,
  getTransactionsForTrade,
  getExceptionsForTrade,
  type Trade,
  type Transaction,
  type Exception,
} from "@/lib/mockData";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export const Route = createFileRoute("/trades/$tradeId")({
  component: TradeDetailPage,
});

function TradeDetailPage() {
  const { tradeId } = Route.useParams();
  const navigate = useNavigate();

  const trade = getTradeById(tradeId);
  const transactions = getTransactionsForTrade(tradeId);
  const exceptions = getExceptionsForTrade(tradeId);

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showTradeInfo, setShowTradeInfo] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "system">("system");

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

  const getStatusColor = (status: string) => {
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

  const getTransactionStatusColor = (status: string) => {
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

  const getPriorityColor = (priority: string) => {
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
    const hasException = exceptions.some(
      (exc) => exc.trans_id === transaction.trans_id
    );

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

  const getRelatedExceptions = (transId: string) => {
    return exceptions.filter((exc) => exc.trans_id === transId);
  };

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
                onClick={() => navigate({ to: "/trades" })}
              >
                <ArrowLeft className="size-4 mr-2" />
                Back to Trades
              </Button>
              <div>
                <CardTitle>Trade Clearing Flow Visualization</CardTitle>
                <CardDescription className="mt-2">
                  Interactive flow diagram and transaction timeline for Trade{" "}
                  {trade.trade_id}
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
          <Card>
            <CardHeader className="pb-3">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "system" | "timeline")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="system"
                    className="flex items-center gap-2"
                  >
                    <Network className="size-4" />
                    System Flow
                  </TabsTrigger>
                  <TabsTrigger
                    value="timeline"
                    className="flex items-center gap-2"
                  >
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
                        const bgColor =
                          getTransactionBackgroundColor(transaction).split(
                            " "
                          )[0];
                        const borderColor =
                          getTransactionBackgroundColor(transaction).split(
                            " "
                          )[1];
                        const relatedExceptions = getRelatedExceptions(
                          transaction.trans_id
                        );

                        return (
                          <div key={transaction.trans_id}>
                            <div
                              onClick={() =>
                                setSelectedTransaction(transaction)
                              }
                              className={`relative pl-12 pb-4 cursor-pointer transition-all ${
                                selectedTransaction?.trans_id ===
                                transaction.trans_id
                                  ? "opacity-100"
                                  : "opacity-80 hover:opacity-100"
                              }`}
                            >
                              {/* Timeline line and dot */}
                              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200">
                                {index === transactions.length - 1 && (
                                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-slate-300 rounded-full"></div>
                                )}
                              </div>
                              <div
                                className={`absolute left-2 top-2 w-5 h-5 rounded-full border-4 ${borderColor} ${bgColor} flex items-center justify-center z-10`}
                              >
                                <span className="text-[10px] font-bold">
                                  {index + 1}
                                </span>
                              </div>

                              {/* Transaction Card */}
                              <div
                                className={`border rounded-lg p-3 ${bgColor} ${borderColor} ${
                                  selectedTransaction?.trans_id ===
                                  transaction.trans_id
                                    ? "ring-2 ring-blue-500"
                                    : ""
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium">
                                        {transaction.trans_id}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Step {index + 1}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-slate-600">
                                      {transaction.entity}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={
                                      transaction.direction === "SEND"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {transaction.direction}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                  <ArrowDownRight className="size-3 text-slate-500" />
                                  <p className="text-xs text-slate-700">
                                    {transaction.type}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant={getTransactionStatusColor(
                                      transaction.status
                                    )}
                                    className="text-xs"
                                  >
                                    {transaction.status}
                                  </Badge>
                                  {relatedExceptions.length > 0 && (
                                    <div className="flex items-center gap-1 text-red-600">
                                      <AlertCircle className="size-3" />
                                      <span className="text-xs">
                                        {relatedExceptions.length} Exception
                                        {relatedExceptions.length > 1
                                          ? "s"
                                          : ""}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                                  <Clock className="size-3" />
                                  <span>{transaction.create_time}</span>
                                </div>
                              </div>
                            </div>
                          </div>
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
        </div>

        {/* Right Side - Trade Info & Transaction Details */}
        <div className="space-y-6">
          {/* Trade Information Card - Collapsible */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="size-5 text-blue-600" />
                  <CardTitle className="text-lg">Trade Information</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTradeInfo(!showTradeInfo)}
                  className="h-8 w-8 p-0"
                >
                  {showTradeInfo ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </Button>
              </div>
            </CardHeader>

            {showTradeInfo && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Trade ID</p>
                    <p className="font-medium text-slate-900">
                      {trade.trade_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Account</p>
                    <p className="font-medium text-slate-900">
                      {trade.account}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Asset Type</p>
                    <p className="font-medium text-slate-900">
                      {trade.asset_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Status</p>
                    <Badge variant={getStatusColor(trade.status)}>
                      {trade.status}
                    </Badge>
                  </div>
                </div>

                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      Booking System
                    </p>
                    <p className="font-medium text-slate-900">
                      {trade.booking_system}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      Affirmation System
                    </p>
                    <p className="font-medium text-slate-900">
                      {trade.affirmation_system}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      Clearing House
                    </p>
                    <p className="font-medium text-slate-900">
                      {trade.clearing_house}
                    </p>
                  </div>
                </div>
                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Created</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-slate-500" />
                      <p className="text-sm text-slate-900">
                        {trade.create_time}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600 mb-1">Last Updated</p>
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-slate-500" />
                      <p className="text-sm text-slate-900">
                        {trade.update_time}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      Total Transactions
                    </p>
                    <div className="flex items-center gap-2">
                      <Activity className="size-5 text-blue-600" />
                      <p className="text-2xl font-semibold">
                        {transactions.length}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {
                        transactions.filter((t) => t.status === "COMPLETED")
                          .length
                      }{" "}
                      completed
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-600 mb-1">Exceptions</p>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-5 text-red-600" />
                      <p className="text-2xl font-semibold">
                        {exceptions.length}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {exceptions.filter((e) => e.status === "PENDING").length}{" "}
                      pending
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Transaction Details */}
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>
                {selectedTransaction
                  ? `Showing details for transaction ${selectedTransaction.trans_id}`
                  : "Click on a transaction in the timeline to view details"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTransaction ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        Transaction ID
                      </p>
                      <p className="font-medium text-slate-900">
                        {selectedTransaction.trans_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Trade ID</p>
                      <p className="font-medium text-slate-900">
                        {selectedTransaction.trade_id}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-slate-600 mb-1">Entity</p>
                    <p className="text-slate-900">
                      {selectedTransaction.entity}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Direction</p>
                      <Badge
                        variant={
                          selectedTransaction.direction === "SEND"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {selectedTransaction.direction}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Type</p>
                      <p className="text-sm text-slate-900">
                        {selectedTransaction.type}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Step</p>
                      <p className="text-lg text-slate-900">
                        {selectedTransaction.step}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Status</p>
                      <Badge
                        variant={getTransactionStatusColor(
                          selectedTransaction.status
                        )}
                      >
                        {selectedTransaction.status}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Created</p>
                      <p className="text-sm text-slate-900">
                        {selectedTransaction.create_time}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        Last Updated
                      </p>
                      <p className="text-sm text-slate-900">
                        {selectedTransaction.update_time}
                      </p>
                    </div>
                  </div>

                  {/* Related Exceptions */}
                  {getRelatedExceptions(selectedTransaction.trans_id).length >
                    0 && (
                    <>
                      <Separator />

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="size-5 text-red-600" />
                          <h3 className="font-semibold text-slate-900">
                            Related Exceptions (
                            {
                              getRelatedExceptions(selectedTransaction.trans_id)
                                .length
                            }
                            )
                          </h3>
                        </div>

                        {getRelatedExceptions(selectedTransaction.trans_id).map(
                          (exception) => (
                            <div
                              key={exception.exception_id}
                              className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3"
                            >
                              <div>
                                <p className="text-sm text-slate-600 mb-1">
                                  Exception ID
                                </p>
                                <p className="font-medium text-slate-900">
                                  {exception.exception_id}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm text-slate-600 mb-1">
                                  Message
                                </p>
                                <p className="text-sm text-slate-900">
                                  {exception.msg}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-slate-600 mb-1">
                                    Priority
                                  </p>
                                  <div className="flex items-center gap-2">
                                    {getPriorityIcon(exception.priority)}
                                    <Badge
                                      variant={getPriorityColor(
                                        exception.priority
                                      )}
                                    >
                                      {exception.priority}
                                    </Badge>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-600 mb-1">
                                    Status
                                  </p>
                                  <Badge
                                    variant={
                                      exception.status === "CLOSED"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {exception.status}
                                  </Badge>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-slate-600 mb-1">
                                  Comment
                                </p>
                                <p className="text-sm text-slate-900">
                                  {exception.comment}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm text-slate-600 mb-1">
                                  Created
                                </p>
                                <p className="text-xs text-slate-900">
                                  {exception.create_time}
                                </p>
                              </div>

                              {exception.status === "PENDING" && (
                                <>
                                  <Separator />
                                  <Button
                                    className="w-full"
                                    onClick={() =>
                                      navigate({ to: "/exceptions" })
                                    }
                                  >
                                    <Check className="size-4 mr-2" />
                                    Resolve Exception
                                  </Button>
                                </>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <ArrowRight className="size-12 mx-auto mb-3 opacity-50" />
                  <p>Select a transaction from the timeline</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
