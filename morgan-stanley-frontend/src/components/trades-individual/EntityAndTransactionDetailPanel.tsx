// Created so that the panel card will contain only either entity or transaction details (can house both)
// Current implementation of having separate entity / transaction details may make the screen look too cluttered.
import { EntityDetailPanel} from "@/components/trades-individual/EntityDetailPanel.tsx";
import type {TransactionDetailPanel} from "@/components/trades-individual/TransactionDetailPanel.tsx";
import type {Trade} from "@/lib/api/types.ts";
import type {Transaction} from "@/lib/mockData.ts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface EntityAndTransactionDetailPanelProps {
    selected: Trade | Transaction | null;
    selectedEntityPanel: typeof EntityDetailPanel
    selectedTransactionPanel: typeof TransactionDetailPanel
}

export const EntityAndTransactionDetailPanel({
    selected,
    selectedEntityPanel,
    selectedTransactionPanel
}: EntityAndTransactionDetailPanelProps) {
    if (!selected) {
        return (
            <Card className="sticky">

            </Card>
        )
    }
}
