// Individual transaction timeline item

import { Badge } from "@/components/ui/badge";
import { Clock, ArrowDownRight, AlertCircle } from "lucide-react";
import type { Transaction, Exception } from '@/lib/api/types';
import { formatDateShort } from "@/lib/utils";

interface TimelineTransactionCardProps {
  transaction: Transaction;
  index: number;
  isSelected: boolean;
  isLast: boolean;
  relatedExceptions: Exception[];
  getTransactionBackgroundColor: (transaction: Transaction) => string;
  getTransactionStatusColor: (status: string) => "default" | "destructive" | "secondary";
  onClick: () => void;
}

export function TimelineTransactionCard({
  transaction,
  index,
  isSelected,
  isLast,
  relatedExceptions,
  getTransactionBackgroundColor,
  getTransactionStatusColor,
  onClick,
}: TimelineTransactionCardProps) {
  const bgColor = getTransactionBackgroundColor(transaction).split(" ")[0];
  const borderColor = getTransactionBackgroundColor(transaction).split(" ")[1];

  return (
    <div>
      <div
        onClick={onClick}
        className={`relative pl-12 pb-4 cursor-pointer transition-all ${
          isSelected ? "opacity-100" : "opacity-80 hover:opacity-100"
        }`}
      >
        {/* Timeline line and dot */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-black/10">
          {isLast && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-black/12 rounded-full"></div>
          )}
        </div>
        <div
          className={`absolute left-2 top-2 w-5 h-5 rounded-full border-4 ${borderColor} ${bgColor} flex items-center justify-center z-10`}
        >
          <span className="text-[10px] font-bold">{index + 1}</span>
        </div>

        {/* Transaction Card */}
        <div
          className={`border rounded-lg p-3 ${bgColor} ${borderColor} ${
            isSelected ? "ring-2 ring-[#002B51]" : ""
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{transaction.trans_id}</span>
                <Badge variant="outline" className="text-xs">
                  Step {index + 1}
                </Badge>
              </div>
              <p className="text-xs text-black/75">{transaction.entity}</p>
            </div>
            <Badge
              variant={transaction.direction === "SEND" ? "default" : "secondary"}
              className="text-xs"
            >
              {transaction.direction}
            </Badge>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="size-3 text-black/50" />
            <p className="text-xs text-black/75">{transaction.type}</p>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant={getTransactionStatusColor(transaction.status)} className="text-xs">
              {transaction.status}
            </Badge>
            {relatedExceptions.length > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="size-3" />
                <span className="text-xs">
                  {relatedExceptions.length} Exception{relatedExceptions.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 mt-2 text-xs text-black/50">
            <Clock className="size-3" />
            <span>{formatDateShort(transaction.create_time)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
