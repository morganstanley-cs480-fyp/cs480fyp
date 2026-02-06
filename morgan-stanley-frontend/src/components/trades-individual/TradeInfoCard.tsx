//  Collapsible trade information card on right side

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, Info, Calendar, Clock, Activity, AlertTriangle } from "lucide-react";
import type { Trade, Transaction, Exception } from "@/lib/mockData";
import { formatDateShort } from "@/lib/utils";

interface TradeInfoCardProps {
  trade: Trade;
  transactions: Transaction[];
  exceptions: Exception[];
  showTradeInfo: boolean;
  onToggle: () => void;
  getStatusBadgeClassName: (status: string) => string;
}

export function TradeInfoCard({
  trade,
  transactions,
  exceptions,
  showTradeInfo,
  onToggle,
  getStatusBadgeClassName,
}: TradeInfoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="size-5 text-[#002B51]" />
            <CardTitle className="text-lg">Trade Information</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
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
              <p className="text-sm text-black/75 mb-1">Trade ID</p>
              <p className="font-medium text-black">{trade.trade_id}</p>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Account</p>
              <p className="font-medium text-black">{trade.account}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-black/75 mb-1">Asset Type</p>
              <p className="font-medium text-black">{trade.asset_type}</p>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Status</p>
              <Badge variant="secondary" className={getStatusBadgeClassName(trade.status)}>
                {trade.status}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-black/75 mb-1">Booking System</p>
              <p className="font-medium text-black">{trade.booking_system}</p>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Affirmation System</p>
              <p className="font-medium text-black">{trade.affirmation_system}</p>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Clearing House</p>
              <p className="font-medium text-black">{trade.clearing_house}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-black/75 mb-1">Created</p>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-black/50" />
                <p className="text-sm text-black">{formatDateShort(trade.create_time)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Last Updated</p>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-black/50" />
                <p className="text-sm text-black">{formatDateShort(trade.update_time)}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-black/75 mb-1">Total Transactions</p>
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-[#002B51]" />
                <p className="text-2xl font-semibold">{transactions.length}</p>
              </div>
              <p className="text-xs text-black/75 mt-1">
                {transactions.filter((t) => t.status === "COMPLETED").length} completed
              </p>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Exceptions</p>
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-600" />
                <p className="text-2xl font-semibold">{exceptions.length}</p>
              </div>
              <p className="text-xs text-black/75 mt-1">
                {exceptions.filter((e) => e.status === "PENDING").length} pending
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
