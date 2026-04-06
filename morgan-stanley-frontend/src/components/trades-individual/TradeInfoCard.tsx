//  Collapsible trade information card - now as inner content

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, Info, Calendar, Clock, Activity, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import type { Trade, Transaction, Exception } from "@/lib/api/types";
import { formatDateShort } from "@/lib/utils";
import { getPriorityColor } from "@/lib/tradeDetailUtils";
import { useNavigate } from "@tanstack/react-router";
import { getExceptionStatusClassName } from "@/lib/tradeDetailUtils";
import { getPriorityBadgeClassName } from "@/lib/tradeDetailUtils";

interface TradeInfoCardProps {
  trade: Trade;
  transactions: Transaction[];
  exceptions: Exception[];
  showTradeInfo: boolean;
  onToggle: () => void;
  getStatusBadgeClassName: (status: string) => string;
  isConnected?: boolean;
  connectionStatus?: string;
  embedded?: boolean;
}

export function TradeInfoCard({
  trade,
  transactions,
  exceptions,
  showTradeInfo,
  onToggle,
  getStatusBadgeClassName,
  isConnected = false,
  connectionStatus = "Disconnected",  
  embedded = false,
}: TradeInfoCardProps) {
  const navigate = useNavigate();

   const getLatestTransactionStatus = () => {
    if (transactions.length === 0) {
      return trade.status; // Fallback to trade status if no transactions
    }
    
    // Sort transactions by step (descending) to get the latest one
    const sortedTransactions = [...transactions].sort((a, b) => b.step - a.step);
    return sortedTransactions[0].status;
  };

    const latestTransactionStatus = getLatestTransactionStatus();

  const openExceptionPage = (exceptionId: number) => {
    const exceptionPath = `/exceptions/${exceptionId}`;

    if (embedded && typeof window !== 'undefined' && window.top && window.top !== window) {
      window.top.location.assign(exceptionPath);
      return;
    }

    navigate({ to: '/exceptions/$exceptionId', params: { exceptionId: `${exceptionId}` } });
  };

  return (
    <>
      {/* Toggle Header */}
      <div className={`flex items-center justify-between border-t ${embedded ? 'py-2' : 'py-3'}`}>
        <div className="flex items-center gap-2">
          <Info className={`${embedded ? 'size-4' : 'size-5'} text-[#002B51]`} />
          <h3 className={`${embedded ? 'text-base' : 'text-lg'} font-semibold`}>Trade Information</h3>

          {/* Live Update Status Indicator */}
          <div className="flex items-center gap-1 ml-2">
            {isConnected ? (
              <>
                <Wifi className="size-4 text-green-600" />
                <span className={`text-xs text-green-600 font-medium ${embedded ? 'hidden sm:inline' : ''}`}>Connection status for live updates: {connectionStatus}</span>
              </>
            ) : (
              <>
                <WifiOff className="size-4 text-gray-400" />
                <span className={`text-xs text-gray-400 ${embedded ? 'hidden sm:inline' : ''}`}>Connection status for live updates: {connectionStatus}</span>
              </>
            )}
          </div>          
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
        <Tabs defaultValue="summary" className={embedded ? 'pb-2' : 'pb-4'}>
          <TabsList className="w-full">
            <TabsTrigger value="summary">Trade Info</TabsTrigger>
            <TabsTrigger value="exceptions">Exceptions ({exceptions.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="space-y-4">
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
                <Badge variant="secondary" className={getStatusBadgeClassName(latestTransactionStatus)}>
                  {latestTransactionStatus}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Second Row - Systems */}
            <div className="grid grid-cols-4 gap-4">
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
          </TabsContent>
          <TabsContent value="exceptions" className="space-y-3">
            {exceptions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-black/60">
                No exceptions for this trade.
              </div>
            ) : (
              <div className="space-y-3">
                {exceptions.map((exception) => (
                  <div
                    key={exception.id}
                    className="rounded-lg border border-red-200 bg-red-50/50 p-3 cursor-pointer"
                    onClick={() => openExceptionPage(exception.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openExceptionPage(exception.id);
                      }
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-black">
                        Exception {exception.id}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className={getExceptionStatusClassName(exception.status)}>
                          {exception.status}
                        </Badge>
                        <Badge variant={getPriorityColor(exception.priority)} className={getPriorityBadgeClassName(exception.priority)}>
                          {exception.priority}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-black/80 mt-2">{exception.msg}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-black/70 mt-2">
                      <div>
                        Transaction {exception.trans_id}
                      </div>
                      <div>
                        Created {formatDateShort(exception.create_time)}
                      </div>
                      <div>
                        Updated {formatDateShort(exception.update_time)}
                      </div>
                      <div>
                        Comment {exception.comment || "-"}
                      </div>
                    </div>
                    {exception.status !== "CLOSED" && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#002B51] text-white hover:bg-[#002B51]/90"
                        onClick={(event) => {
                          event.stopPropagation();
                          openExceptionPage(exception.id);
                        }}
                      >
                        View exception
                      </Button>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}