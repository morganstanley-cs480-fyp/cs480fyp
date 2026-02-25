import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {useEffect, useState} from "react";
import {ArrowLeft, AlertCircle} from "lucide-react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import type { Exception, Trade, Transaction } from "@/lib/api/types";
import { tradeFlowService } from "@/lib/api/tradeFlowService";
import { searchService } from "@/lib/api/searchService";

// Component imports
import {TradeInfoCard} from "@/components/trades-individual/TradeInfoCard";
import {FlowVisualization} from "@/components/trades-individual/FlowVisualization";
// import {TransactionDetailPanel} from "@/components/trades-individual/TransactionDetailPanel";
// import {EntityDetailPanel} from "@/components/trades-individual/EntityDetailPanel";

// Utility imports
import {
    getStatusBadgeClassName,
    getTransactionStatusColor,
    // getPriorityColor,
    // getPriorityIcon,
    getTransactionBackgroundColor,
    getRelatedExceptions,
} from "./-tradeDetailUtils";
import { requireAuth } from "@/lib/utils";
  import {EntityAndTransactionDetailPanel} from "@/components/trades-individual/EntityAndTransactionDetailPanel";

export const Route = createFileRoute("/trades/$tradeId")({
  beforeLoad: requireAuth,
  component: TradeDetailPage,
});

function TradeDetailPage() {
    const {tradeId} = Route.useParams();
    const navigate = useNavigate();

    const [trade, setTrade] = useState<Trade | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [exceptions, setExceptions] = useState<Exception[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<{ name: string; isHub: boolean } | null>(null);
    const [lastSelectedType, setLastSelectedType] = useState<'entity' | 'transaction' | null>(null);

    const [showTradeInfo, setShowTradeInfo] = useState(true);
    const [activeTab, setActiveTab] = useState<"timeline" | "system">("system");

    // Params are strings.
    const handleResolveException = (exceptionId: string) => {
        navigate({
            to: "/exceptions/$exceptionId",
            params: {exceptionId},
        });
    };

    const handleEntitySelect = (entityName: string, isHub: boolean) => {
        setSelectedEntity({name: entityName, isHub});
        setLastSelectedType("entity");
    };

    const handleTransactionSelect = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setLastSelectedType("transaction");
    };

    useEffect(() => {
        let isActive = true;

        const loadTradeData = async () => {
            setIsLoading(true);
            setLoadError(null);

            try {
                const tradeIdNumber = Number(tradeId);
                const [tradeData, transactionsData, exceptionsData] = await Promise.all([
                    tradeFlowService.getTradeById(tradeIdNumber),
                    tradeFlowService.getTransactionsByTradeId(tradeIdNumber),
                    searchService.getExceptionsByTrade(tradeIdNumber),
                ]);

                if (!isActive) return;
                setTrade(tradeData);
                setTransactions(transactionsData);
                setExceptions(exceptionsData);
            } catch (error) {
                if (!isActive) return;
                console.error('Failed to load trade detail data:', error);
                setLoadError('Failed to load trade details from the database.');
                setTrade(null);
                setTransactions([]);
                setExceptions([]);
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        loadTradeData();

        return () => {
            isActive = false;
        };
    }, [tradeId]);

    if (isLoading) {
        return (
            <div className="p-6 w-full mx-auto">
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-black/50">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="mt-2 text-sm">Loading trade details...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loadError || !trade) {
        return (
            <div className="p-6 w-full mx-auto">
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-black/50">
                            <AlertCircle className="size-12 mx-auto mb-3 opacity-50"/>
                            <p className="text-lg font-medium mb-2">Trade Not Found</p>
                            <p className="text-sm mb-4">
                                {loadError ?? `The trade with ID "${tradeId}" could not be found.`}
                            </p>
                            <Button onClick={() => navigate({to: "/trades"})}>
                                <ArrowLeft className="size-4 mr-2"/>
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
            {/* Header with Trade Info */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.history.back()}
                            >
                                <ArrowLeft className="size-4 mr-2"/>
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

                {/* Trade Information Card Content */}
                <CardContent className="pt-0">
                    <TradeInfoCard
                        trade={trade}
                        transactions={transactions}
                        exceptions={exceptions}
                        showTradeInfo={showTradeInfo}
                        onToggle={() => setShowTradeInfo(!showTradeInfo)}
                        getStatusBadgeClassName={getStatusBadgeClassName}
                    />
                </CardContent>
            </Card>

            {/* Main Content - Split View */}
            <div className="grid grid-cols-2 gap-6">
                {/* Left Side - Flow Visualization */}
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

                {/* Right Side - Transaction & Entity Details */}
                <div className="space-y-6">
                    {/* Entity Details */}

                    <EntityAndTransactionDetailPanel
                        selectedEntity={selectedEntity}
                        selectedTransaction={selectedTransaction}
                        lastSelectedType={lastSelectedType}
                        transactions={transactions}
                        relatedExceptions={selectedTransaction ? getRelatedExceptions(selectedTransaction.trans_id, exceptions) : []}
                        onResolveException={handleResolveException}
                    />

                </div>
            </div>
        </div>
    );
}