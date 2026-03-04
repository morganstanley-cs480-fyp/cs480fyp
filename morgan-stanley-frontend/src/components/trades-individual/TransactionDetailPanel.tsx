// Individual transaction details
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import type { Transaction, Exception } from "@/lib/api/types";
import { formatDateShort } from "@/lib/utils";

interface TransactionDetailPanelProps {
  selectedTransaction: Transaction;
  relatedExceptions: Exception[];
  getTransactionStatusColor: (status: string) => "default" | "destructive" | "secondary";
  getPriorityColor: (priority: string) => "default" | "destructive" | "secondary";
  getPriorityIcon: (priority: string) => React.ReactElement;
  onResolveException: (exceptionId: string) => void;
}

export function TransactionDetailPanel({
  selectedTransaction,
  relatedExceptions,
  getTransactionStatusColor,
  getPriorityColor,
  getPriorityIcon,
  onResolveException,
}: TransactionDetailPanelProps) {

    // if (!selectedTransaction) {
    //   return (
    //     <Card className="sticky top-6">
    //       <CardHeader>
    //         <CardTitle>Transaction Details</CardTitle>
    //         <CardDescription>
    //           Click on a transaction in the timeline to view details
    //         </CardDescription>
    //       </CardHeader>
    //       <CardContent>
    //         <div className="text-center py-12 text-black/50">
    //           <ArrowRight className="size-12 mx-auto mb-3 opacity-50" />
    //           <p>Select a transaction from the timeline</p>
    //         </div>
    //       </CardContent>
    //     </Card>
    //   );
    // }

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle>Transaction Details</CardTitle>
        <CardDescription>
          Showing details for transaction {selectedTransaction.id}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-black/75 mb-1">Transaction ID</p>
              <p className="font-medium text-black">{selectedTransaction.id}</p>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Trade ID</p>
              <p className="font-medium text-black">{selectedTransaction.trade_id}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-black/75 mb-1">Entity</p>
            <p className="text-black">{selectedTransaction.entity}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-black/75 mb-1">Direction</p>
              <Badge
                variant={selectedTransaction.direction === "SEND" ? "default" : "secondary"}
              >
                {selectedTransaction.direction}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Type</p>
              <p className="text-sm text-black">{selectedTransaction.type}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-black/75 mb-1">Step</p>
              <p className="text-lg text-black">{selectedTransaction.step}</p>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Status</p>
              <Badge variant={getTransactionStatusColor(selectedTransaction.status)}>
                {selectedTransaction.status}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-black/75 mb-1">Created</p>
              <p className="text-sm text-black">{formatDateShort(selectedTransaction.create_time)}</p>
            </div>
            <div>
              <p className="text-sm text-black/75 mb-1">Last Updated</p>
              <p className="text-sm text-black">{formatDateShort(selectedTransaction.update_time)}</p>
            </div>
          </div>

          {relatedExceptions.length > 0 && (
            <>
              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-5 text-red-600" />
                  <h3 className="font-semibold text-black">
                    Related Exceptions ({relatedExceptions.length})
                  </h3>
                </div>

                {relatedExceptions.map((exception) => (
                  <div
                    key={exception.id}
                    className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3"
                  >
                    <div>
                      <p className="text-sm text-black/75 mb-1">Exception ID</p>
                      <p className="font-medium text-black">{exception.id}</p>
                    </div>

                    <div>
                      <p className="text-sm text-black/75 mb-1">Message</p>
                      <p className="text-sm text-black">{exception.msg}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-black/75 mb-1">Priority</p>
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(exception.priority)}
                          <Badge variant={getPriorityColor(exception.priority)}>
                            {exception.priority}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-black/75 mb-1">Status</p>
                        <Badge
                          variant={exception.status === "CLOSED" ? "default" : "secondary"}
                        >
                          {exception.status}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-black/75 mb-1">Comment</p>
                      <p className="text-sm text-black">{exception.comment}</p>
                    </div>

                    <div>
                      <p className="text-sm text-black/75 mb-1">Created</p>
                      <p className="text-xs text-black">{exception.create_time}</p>
                    </div>

                    {exception.status === "PENDING" && (
                      <>
                        <Separator />
                        <Button
                          className="w-full"
                          onClick={() => onResolveException(String(exception.id))}
                        >
                          View Exception
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
