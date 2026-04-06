import { useEffect, useState } from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { Trade, Transaction } from '@/lib/api/types';
import { tradeFlowService } from '@/lib/api/tradeFlowService';

interface ExceptionTradeFlowProps {
  transactionId: number;
  fallbackTradeId?: number;
  embedded?: boolean;
}

export function ExceptionTradeFlow({ transactionId, fallbackTradeId, embedded = false }: ExceptionTradeFlowProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [trade, setTrade] = useState<Trade | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadTradeFlowDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const tx = await tradeFlowService.getTransactionById(transactionId);
        if (!isActive) return;

        setTransaction(tx);

        const resolvedTradeId = tx.trade_id || fallbackTradeId;
        if (!resolvedTradeId) {
          setTrade(null);
          return;
        }

        const td = await tradeFlowService.getTradeById(resolvedTradeId);
        if (!isActive) return;

        setTrade(td);
      } catch (fetchError) {
        if (!isActive) return;
        setTransaction(null);
        setTrade(null);
        setError('Failed to load linked trade and transaction details.');
        console.error('Failed to load exception trade flow details:', fetchError);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadTradeFlowDetails();

    return () => {
      isActive = false;
    };
  }, [transactionId, fallbackTradeId]);

  const tradeId = trade?.trade_id ?? transaction?.trade_id ?? fallbackTradeId;

  const body = (
    <>
      {loading && (
        <div className="text-sm text-black/60">
          Loading trade and transaction details...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
          <AlertTriangle className="size-4" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-black/60 uppercase tracking-wide">Trade</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-black/60">Trade ID</p>
                <p className="font-medium text-black wrap-break-word">{trade?.trade_id ?? '-'}</p>
              </div>
              <div>
                <p className="text-black/60">Status</p>
                <p className="font-medium text-black wrap-break-word">{trade?.status ?? '-'}</p>
              </div>
              <div>
                <p className="text-black/60">Account</p>
                <p className="font-medium text-black wrap-break-word">{trade?.account ?? '-'}</p>
              </div>
              <div>
                <p className="text-black/60">Asset Type</p>
                <p className="font-medium text-black wrap-break-word">{trade?.asset_type ?? '-'}</p>
              </div>
              <div>
                <p className="text-black/60">Booking System</p>
                <p className="font-medium text-black wrap-break-word">{trade?.booking_system ?? '-'}</p>
              </div>
              <div>
                <p className="text-black/60">Clearing House</p>
                <p className="font-medium text-black wrap-break-word">{trade?.clearing_house ?? '-'}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-semibold text-black/60 uppercase tracking-wide">Transaction</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-black/60">Transaction ID</p>
                <p className="font-medium text-black wrap-break-word">{transaction?.id ?? '-'}</p>
              </div>
              <div>
                <p className="text-black/60">Status</p>
                <p className="font-medium text-black wrap-break-word">{transaction?.status ?? '-'}</p>
              </div>
              <div>
                <p className="text-black/60">Step</p>
                <p className="font-medium text-black wrap-break-word">{transaction?.step ?? '-'}</p>
              </div>
              <div>
                <p className="text-black/60">Type</p>
                <p className="font-medium text-black wrap-break-word">{transaction?.type ?? '-'}</p>
              </div>
              <div>
                <p className="text-black/60">Direction</p>
                <p className="font-medium text-black wrap-break-word">{transaction?.direction ? transaction.direction.toUpperCase() : '-'}</p>
              </div>
              <div>
                <p className="text-black/60">Entity</p>
                <p className="font-medium text-black wrap-break-word">{transaction?.entity ?? '-'}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {tradeId && (
        <Button
          variant="outline"
          className="w-full border-black/15 text-black/75 hover:border-[#002B51] hover:text-[#002B51]"
          onClick={() => setShowTradeModal(true)}
        >
          Open Trade Page
          <ArrowRight className="ml-2 size-4" />
        </Button>
      )}

      {tradeId && (
        <Dialog open={showTradeModal} onOpenChange={setShowTradeModal}>
          <DialogContent
            className="flex flex-col overflow-hidden p-6"
            style={{ width: '80vw', maxWidth: '80vw', height: '80vh' }}
          >
            <div className="flex-1 min-h-0 overflow-hidden rounded-md border border-black/10 bg-white">
              <iframe
                title={`Trade ${tradeId}`}
                src={`/trades/${tradeId}?embedded=1`}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-2">
        {/* <p className="text-sm text-black/75 mb-1">Exception Trade Flow</p> */}
        <div className="space-y-4">{body}</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Exception Trade Flow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  );
}
