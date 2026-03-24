// Created so that the panel card will contain only either entity or transaction details (can house both)
// Current implementation of having separate entity / transaction details may make the screen look too cluttered.

import {EntityDetailPanel} from "@/components/trades-individual/EntityDetailPanel.tsx";
import {TransactionDetailPanel} from "@/components/trades-individual/TransactionDetailPanel.tsx";
import type { Exception, Transaction } from "@/lib/api/types";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {ArrowRight} from "lucide-react";
import { useCallback, useMemo } from "react";
import {
    getPriorityColor,
    getPriorityIcon,
    getTransactionStatusColor
} from "@/lib/tradeDetailUtils";

interface EntityAndTransactionDetailPanelProps {
    selectedEntity?: { name: string; isHub: boolean } | null;
    selectedTransaction?: Transaction | null;
    lastSelectedType?: 'entity' | 'transaction' | null;
    transactions?: Transaction[];
    relatedExceptions?: Exception[];
    onViewException: (exceptionId: string) => void;

}

export const EntityAndTransactionDetailPanel = ({
    selectedEntity,
    selectedTransaction,
    lastSelectedType,
    transactions,
    relatedExceptions,
    onViewException,

}: EntityAndTransactionDetailPanelProps) => {

    const currentTransaction = useMemo(() => {
        if (!selectedTransaction || !transactions) {
            return selectedTransaction;
        }
        
        // Find the most current version of this transaction
        const updatedTransaction = transactions.find(t => t.id === selectedTransaction.id);
        return updatedTransaction || selectedTransaction;
    }, [selectedTransaction, transactions]);


    // ✅ Filter exceptions based on current transaction status
    const getFilteredRelatedExceptions = useCallback((): Exception[] => {
        if (!currentTransaction || !relatedExceptions) {
            return [];
        }

        // If transaction is CLEARED, don't show any exceptions
        if (currentTransaction.status === 'CLEARED') {
            console.log(`🎯 Transaction ${currentTransaction.id} is CLEARED - hiding all exceptions`);
            return [];
        }
        
        // Otherwise, only show PENDING exceptions
        const pendingExceptions = relatedExceptions.filter(exc => exc.status === 'PENDING');
        
        console.log(`📊 Transaction ${currentTransaction.id} (${currentTransaction.status}) - showing ${pendingExceptions.length}/${relatedExceptions.length} exceptions`);
        return pendingExceptions;
    }, [currentTransaction, relatedExceptions]);

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
        return <EntityDetailPanel 
            entityName={selectedEntity.name}
            isHub={selectedEntity.isHub}
            transactions={transactions} 
        />
    } else if (currentTransaction) {
        // ✅ Use filtered exceptions instead of raw relatedExceptions
        const filteredExceptions = getFilteredRelatedExceptions();
        
        return <TransactionDetailPanel 
            selectedTransaction={currentTransaction}
            relatedExceptions={filteredExceptions} // ✅ Pass filtered exceptions
            getTransactionStatusColor={getTransactionStatusColor}
            getPriorityColor={getPriorityColor} 
            getPriorityIcon={getPriorityIcon}
            onViewException={onViewException}
        />
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