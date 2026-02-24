// Custom hook for table column definitions

import { ArrowUpDown } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Trade } from "@/lib/api/types";
import { formatDateShort } from "@/lib/utils";
import { getStatusBadgeClassName } from "@/routes/trades/-tradeDetailUtils";

export function useTradeColumns(): ColumnDef<Trade>[] {
  const matchesDateRange = (
    value: string,
    filterValue: string | { from?: string; to?: string } | undefined
  ) => {
    if (!filterValue) return true;
    if (typeof filterValue === "string") {
      const formatted = formatDateShort(value);
      return formatted.toLowerCase().includes(filterValue.toLowerCase());
    }
    const { from, to } = filterValue;
    if (!from && !to) return true;
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return false;
    const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    if (fromTime && timestamp < fromTime) return false;
    if (toTime && timestamp > toTime) return false;
    return true;
  };

  return [
    {
      accessorKey: "trade_id",
      header: "Trade ID",
      cell: ({ row }) => (
        <div className="font-medium text-black ml-2">
          {row.getValue("trade_id")}
        </div>
      ),
    },
    {
      accessorKey: "account",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Account
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{row.getValue("account")}</div>
      ),
    },
    {
      accessorKey: "asset_type",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Asset Type
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{row.getValue("asset_type")}</div>
      ),
    },
    {
      accessorKey: "booking_system",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Booking System
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{row.getValue("booking_system")}</div>
      ),
    },
    {
      accessorKey: "affirmation_system",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Affirmation System
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{row.getValue("affirmation_system")}</div>
      ),
    },
    {
      accessorKey: "clearing_house",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Clearing House
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{row.getValue("clearing_house")}</div>
      ),
    },
    {
      accessorKey: "create_time",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Create Time
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{formatDateShort(row.getValue("create_time") as string)}</div>
      ),
      filterFn: (row, columnId, filterValue) =>
        matchesDateRange(row.getValue(columnId) as string, filterValue),
    },
    {
      accessorKey: "update_time",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Update Time
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{formatDateShort(row.getValue("update_time") as string)}</div>
      ),
      filterFn: (row, columnId, filterValue) =>
        matchesDateRange(row.getValue(columnId) as string, filterValue),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge className={`mr-2 ${getStatusBadgeClassName(status)}`} variant="secondary">
            {status}
          </Badge>
        );
      },
    },
  ];
}
