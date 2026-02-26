// Custom hook for table column definitions

import { ArrowUpDown } from "lucide-react";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Trade } from "@/lib/api/types";
import { formatDateShort } from "@/lib/utils";
import { getStatusBadgeClassName } from "@/routes/trades/-tradeDetailUtils";

export function useTradeColumns(): ColumnDef<Trade>[] {
  const SortHeader = ({ column, label }: { column: Column<Trade>; label: string }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="h-8 p-0 w-full justify-center hover:bg-transparent text-sm font-semibold text-black uppercase tracking-wider"
    >
      {label}
      <ArrowUpDown className="ml-1.5 size-3 opacity-50" />
    </Button>
  );

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
      accessorKey: "id",
      size: 110,
      header: ({ column }) => <SortHeader column={column} label="Trade ID" />,
      cell: ({ row }) => (
        <span className="text-sm text-black">
          {row.getValue("id")}
        </span>
      ),
      filterFn: (row, columnId, filterValue: string) =>
        String(row.getValue(columnId)).includes(filterValue),
    },
    {
      accessorKey: "account",
      size: 100,
      header: ({ column }) => <SortHeader column={column} label="Account" />,
      cell: ({ row }) => (
        <div className="text-sm text-black">{row.getValue("account")}</div>
      ),
    },
    {
      accessorKey: "asset_type",
      size: 90,
      header: ({ column }) => <SortHeader column={column} label="Asset Type" />,
      cell: ({ row }) => (
        <div className="text-sm text-black">{row.getValue("asset_type")}</div>
      ),
    },
    {
      accessorKey: "booking_system",
      size: 130,
      header: ({ column }) => <SortHeader column={column} label="Booking System" />,
      cell: ({ row }) => (
        <div className="text-sm text-black">{row.getValue("booking_system")}</div>
      ),
    },
    {
      accessorKey: "affirmation_system",
      size: 140,
      header: ({ column }) => <SortHeader column={column} label="Affirmation System" />,
      cell: ({ row }) => (
        <div className="text-sm text-black">{row.getValue("affirmation_system")}</div>
      ),
    },
    {
      accessorKey: "clearing_house",
      size: 110,
      header: ({ column }) => <SortHeader column={column} label="Clearing House" />,
      cell: ({ row }) => (
        <div className="text-sm text-black">{row.getValue("clearing_house")}</div>
      ),
    },
    {
      accessorKey: "create_time",
      size: 160,
      header: ({ column }) => <SortHeader column={column} label="Create Time" />,
      cell: ({ row }) => (
        <span className="text-sm text-black">{formatDateShort(row.getValue("create_time") as string)}</span>
      ),
      filterFn: (row, columnId, filterValue) =>
        matchesDateRange(row.getValue(columnId) as string, filterValue),
    },
    {
      accessorKey: "update_time",
      size: 160,
      header: ({ column }) => <SortHeader column={column} label="Update Time" />,
      cell: ({ row }) => (
        <span className="text-sm text-black">{formatDateShort(row.getValue("update_time") as string)}</span>
      ),
      filterFn: (row, columnId, filterValue) =>
        matchesDateRange(row.getValue(columnId) as string, filterValue),
    },
    {
      accessorKey: "status",
      size: 110,
      header: ({ column }) => <SortHeader column={column} label="Status" />,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge className={`${getStatusBadgeClassName(status)}`} variant="secondary">
            {status}
          </Badge>
        );
      },
    },
  ];
}
