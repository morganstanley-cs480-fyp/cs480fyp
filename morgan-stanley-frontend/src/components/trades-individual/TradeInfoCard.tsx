//  Collapsible trade information card - now as inner content

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, Info, Calendar, Clock, Activity, AlertTriangle } from "lucide-react";
import type { Trade, Transaction, Exception } from "@/lib/api/types";
import { formatDateShort } from "@/lib/utils";
import { getPriorityColor } from "@/routes/trades/-tradeDetailUtils";
import { useNavigate } from "@tanstack/react-router";

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
  const navigate = useNavigate();
  const getExceptionStatusClassName = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "CLOSED":
      case "RESOLVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "IGNORED":
        return "bg-slate-200 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

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
        <Tabs defaultValue="summary" className="pb-4">
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
                <Badge variant="secondary" className={getStatusBadgeClassName(trade.status)}>
                  {trade.status}
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
                    key={exception.exception_id}
                    className="rounded-lg border border-red-200 bg-red-50/50 p-3 cursor-pointer"
                    onClick={() => navigate({ to: "/exceptions/$exceptionId", params: { exceptionId: `${exception.exception_id}` } })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate({ to: "/exceptions/$exceptionId", params: { exceptionId: `${exception.exception_id}` } });
                      }
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-black">
                        Exception {exception.exception_id}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className={getExceptionStatusClassName(exception.status)}>
                          {exception.status}
                        </Badge>
                        <Badge variant={getPriorityColor(exception.priority)}>
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
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#002B51] text-white hover:bg-[#002B51]/90"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate({
                            to: "/exceptions/$exceptionId",
                            params: { exceptionId: `${exception.exception_id}` },
                          });
                        }}
                      >
                        View exception
                      </Button>
                    </div>
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