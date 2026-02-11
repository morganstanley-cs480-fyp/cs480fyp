//  Collapsible trade information card - now as inner content

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
    <>
      {/* Toggle Header */}
      <div className="flex items-center justify-between py-3 border-t">
        <div className="flex items-center gap-2">
          <Info className="size-5 text-[#002B51]" />
          <h3 className="text-lg font-semibold">Trade Information</h3>
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

      {showTradeInfo && (
        <div className="space-y-4 pb-4">
          {/* First Row - Basic Info */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-black/75 mb-1">Trade ID</p>
              <p className="font-medium text-black">{trade.trade_id}</p>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Account</p>
              <p className="font-medium text-black">{trade.account}</p>
            </div>

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

          {/* Second Row - Systems */}
          <div className="grid grid-cols-3 gap-4">
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

          {/* Third Row - Timestamps and Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-black/75 mb-1">Created</p>
              <div className="flex items-center gap-1">
                <Calendar className="size-3 text-black/50" />
                <p className="text-sm text-black">{formatDateShort(trade.create_time)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Last Updated</p>
              <div className="flex items-center gap-1">
                <Clock className="size-3 text-black/50" />
                <p className="text-sm text-black">{formatDateShort(trade.update_time)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Transactions</p>
              <div className="flex items-center gap-1">
                <Activity className="size-4 text-[#002B51]" />
                <p className="text-lg font-semibold">{transactions.length}</p>
                <p className="text-xs text-black/50">
                  ({transactions.filter((t) => t.status === "COMPLETED").length} done)
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Exceptions</p>
              <div className="flex items-center gap-1">
                <AlertTriangle className="size-4 text-red-600" />
                <p className="text-lg font-semibold">{exceptions.length}</p>
                <p className="text-xs text-black/50">
                  ({exceptions.filter((e) => e.status === "PENDING").length} pending)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}