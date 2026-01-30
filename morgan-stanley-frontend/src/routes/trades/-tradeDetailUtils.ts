import React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { type Transaction, type Exception } from "@/lib/mockData";

export function getStatusColor(status: string): "default" | "destructive" | "secondary" | "outline" {
  switch (status) {
    case "CLEARED":
      return "default";
    case "ALLEGED":
      return "secondary";
    case "REJECTED":
      return "destructive";
    case "CANCELLED":
      return "outline";
    default:
      return "secondary";
  }
}

export function getStatusBadgeClassName(status: string): string {
  switch (status) {
    case "CLEARED":
      return "bg-green-600 text-white border-green-600";
    case "ALLEGED":
      return "bg-yellow-400 text-slate-900 border-yellow-400";
    case "CANCELLED":
      return "bg-black text-white border-black";
    case "REJECTED":
      return "bg-red-600 text-white border-red-600";
    default:
      return "bg-slate-200 text-slate-900 border-slate-200";
  }
}

export function getTransactionStatusColor(status: string): "default" | "destructive" | "secondary" {
  switch (status) {
    case "COMPLETED":
      return "default";
    case "PENDING":
      return "secondary";
    case "FAILED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function getPriorityColor(priority: string): "default" | "destructive" | "secondary" {
  if (priority === "HIGH") return "destructive";
  if (priority === "MEDIUM") return "default";
  return "secondary";
}

export function getPriorityIcon(priority: string): React.ReactElement {
  if (priority === "HIGH") return React.createElement(AlertTriangle, { className: "size-4 text-red-600" });
  if (priority === "MEDIUM") return React.createElement(AlertTriangle, { className: "size-4 text-orange-600" });
  return React.createElement(Clock, { className: "size-4 text-yellow-600" });
}

export function getTransactionBackgroundColor(transaction: Transaction, exceptions: Exception[]) {
  const hasException = exceptions.some((exc) => exc.trans_id === transaction.trans_id);

  if (hasException) {
    return "bg-red-50 border-red-300";
  }

  if (transaction.status === "COMPLETED") {
    return "bg-green-50 border-green-300";
  }

  if (transaction.status === "PENDING") {
    return "bg-slate-100 border-slate-300";
  }

  if (transaction.status === "FAILED") {
    return "bg-red-50 border-red-300";
  }

  return "bg-slate-100 border-slate-300";
}

export function getRelatedExceptions(transId: string, exceptions: Exception[]): Exception[] {
  return exceptions.filter((exc) => exc.trans_id === transId);
}
