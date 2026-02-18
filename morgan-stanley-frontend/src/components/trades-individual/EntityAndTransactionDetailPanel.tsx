// Created so that the panel card will contain only either entity or transaction details (can house both)
// Current implementation of having separate entity / transaction details may make the screen look too cluttered.

import {EntityDetailPanel} from "@/components/trades-individual/EntityDetailPanel.tsx";
import {TransactionDetailPanel} from "@/components/trades-individual/TransactionDetailPanel.tsx";
import type {Exception, Transaction} from "@/lib/mockData.ts";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {ArrowRight} from "lucide-react";
import {
    getPriorityColor,
    getPriorityIcon,
    getTransactionStatusColor
} from "@/routes/trades/-tradeDetailUtils.ts";

interface EntityAndTransactionDetailPanelProps {
    // selected: Trade | Transaction | null;
    // selectedEntityPanel: typeof EntityDetailPanel
    // selectedTransactionPanel: typeof TransactionDetailPanel
    // selected?: Transaction | {name: string; isHub: boolean } | null;
    selectedEntity?: { name: string; isHub: boolean } | null;
    selectedTransaction?: Transaction | null;
    lastSelectedType?: 'entity' | 'transaction' | null;
    transactions?: Transaction[];
    relatedExceptions?: Exception[];
    // getTransactionStatusColor: (status: string) => "default" | "destructive" | "secondary";
    // getPriorityColor: (priority: string) => "default" | "destructive" | "secondary";
    // getPriorityIcon: (priority: string) => React.ReactElement;
    onResolveException: (exceptionId: string) => void;
    // onPanelClose: () => void;
}

export const EntityAndTransactionDetailPanel = ({
                                                    selectedEntity,
                                                    selectedTransaction,
                                                    lastSelectedType,
                                                    transactions,
                                                    relatedExceptions,
                                                    // getTransactionStatusColor,
                                                    // getPriorityColor,
                                                    // getPriorityIcon,
                                                    onResolveException,
                                                    // onPanelClose,
                                                }: EntityAndTransactionDetailPanelProps) => {
    if (!selectedEntity && !selectedTransaction) {
        return (
            <Card className="sticky top-6">
                <CardTitle className="flex flex-col gap-2">
                    <CardHeader> Entity / Transaction Detail Panel</CardHeader>
                    <CardDescription className="mx-6">Select a participant or transaction from diagram to view more.</CardDescription>
                </CardTitle>
                <CardContent>
                    <div className="text-center py-12 text-black/50">
                        <ArrowRight className="mx-auto size-12 mb-3 opacity-50"/>
                        <p>Select a participant or transaction from the timeline</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (selectedEntity && transactions && lastSelectedType == "entity") {
        return <EntityDetailPanel entityName={selectedEntity.name}
                                  isHub={selectedEntity.isHub}
                                  transactions={transactions} />
        // onClose={onPanelClose}/>
    } else if (selectedTransaction && relatedExceptions) {
        return <TransactionDetailPanel selectedTransaction={selectedTransaction}
                                       relatedExceptions={relatedExceptions}
                                       getTransactionStatusColor={getTransactionStatusColor}
                                       getPriorityColor={getPriorityColor} getPriorityIcon={getPriorityIcon}
                                       onResolveException={onResolveException}/>
    } else {
        return (
            <Card className="sticky text-red-500">
                <CardTitle className="text-start">
                    <CardHeader> Entity / Transaction Detail Panel</CardHeader>
                    <CardDescription>Please re-select a participant or transaction from diagram to view
                        more.</CardDescription>
                </CardTitle>
                <CardContent>
                    <div className="mx-auto py-12 text-black/50">
                        <ArrowRight className="size-12 mb-3 opacity-50"/>
                        <p>Re-select a participant or transaction from the timeline</p>
                    </div>
                </CardContent>
            </Card>
        )
    }
}
