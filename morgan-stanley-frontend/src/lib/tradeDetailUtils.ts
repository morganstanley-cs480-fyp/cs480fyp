import React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import type { Transaction, Exception } from "@/lib/api/types";

// export function getStatusColor(status: string): "default" | "destructive" | "secondary" | "outline" {
//   switch (status) {
//     case "CLEARED":
//       return "default";
//     case "ALLEGED":
//       return "secondary";
//     case "REJECTED":
//       return "destructive";
//     case "CANCELLED":
//       return "outline";
//     default:
//       return "secondary";
//   }
// }

export function getStatusBadgeClassName(status: string): string {
  switch (status) {
    case "CLEARED":
      return "bg-green-600 text-white border-green-600";
    case "ALLEGED":
      return "bg-yellow-400 text-black border-yellow-400";
    case "CANCELLED":
      return "bg-black text-white border-black";
    case "REJECTED":
      return "bg-red-600 text-white border-red-600";
    default:
      return "bg-black/10 text-black border-black/10";
  }
}

export function getPriorityBadgeClassName(status: string): string {
  switch (status) {
    case "LOW":
      return "bg-blue-600 text-white border-blue-400";
    case "MEDIUM":
      return "bg-yellow-400 text-white border-yellow-300";
    case "HIGH":
      return "bg-orange-600 text-white border-orange-400";
    case "CRITICAL":
      return "bg-red-600 text-white border-red-400";
    default:
      return "bg-black/10 text-white border-black/10";
  }
}

export function getTransactionStatusColor(status: string): "default" | "destructive" | "secondary" {
  switch (status) {
    case "CLEARED":
      return "default";
    case "ALLEGED":
      return "secondary";
    case "REJECTED":
      return "destructive";
    default:
      return "secondary";
  }
}

  export const getExceptionStatusClassName = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "CLOSED":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-black/[0.04] text-black/75 border-black/10";
    }
  };

export function getPriorityColor(priority: string): "default" | "destructive" | "secondary" {
  if (priority === "HIGH") return "destructive";
  if (priority === "MEDIUM") return "default";
  return "secondary";
}

export function getPriorityIcon(priority: string): React.ReactElement {
  if (priority === "HIGH" || priority === "CRITICAL") return React.createElement(AlertTriangle, { className: "size-4 text-red-600" });
  if (priority === "MEDIUM") return React.createElement(AlertTriangle, { className: "size-4 text-orange-600" });
  return React.createElement(Clock, { className: "size-4 text-yellow-600" });
}

export function getTransactionBackgroundColor(transaction: Transaction, exceptions: Exception[]) {
  // const hasException = exceptions.some((exc) => exc.trans_id === transaction.id);

  switch (transaction.status?.toUpperCase()) {
    case 'CLEARED':
      return 'bg-green-50 border-green-200';
    case 'REJECTED':
      return 'bg-red-50 border-red-200';
    case 'ALLEGED':
      return 'bg-yellow-50 border-yellow-200';
    case 'CANCELLED':
    default: 
      return 'bg-gray-50 border-gray-200';
  }
}

export function getRelatedExceptions(transId: number, exceptions: Exception[]): Exception[] {
  return exceptions.filter((exc) => exc.trans_id === transId);
}
