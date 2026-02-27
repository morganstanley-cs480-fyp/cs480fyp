// Column definitions hook

import { ArrowUpDown } from "lucide-react";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Exception } from "@/lib/api/types";

interface UseExceptionColumnsOptions {
  getPriorityColor: (priority: string) => "destructive" | "default" | "secondary";
  getPriorityIcon: (priority: string) => React.ReactElement;
  getStatusBadgeVariant: (status: string) => "default" | "secondary";
}

export function useExceptionColumns({
  getPriorityColor,
  getPriorityIcon,
  getStatusBadgeVariant,
}: UseExceptionColumnsOptions): ColumnDef<Exception>[] {
  const SortHeader = ({ column, label }: { column: Column<Exception>; label: string }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="h-8 p-0 hover:bg-transparent text-sm font-semibold text-black uppercase tracking-wider"
    >
      {label}
      <ArrowUpDown className="ml-1.5 size-3 opacity-50" />
    </Button>
  );

  return [
    {
      accessorKey: "id",
      header: ({ column }) => <SortHeader column={column} label="Exception ID" />,
      cell: ({ row }) => (
        <span className="text-sm text-black">
          {row.getValue("id")}
        </span>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "trade_id",
      header: ({ column }) => <SortHeader column={column} label="Trade ID" />,
      cell: ({ row }) => (
        <span className="text-sm text-black">
          {row.getValue("trade_id")}
        </span>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "msg",
      header: "Exception Message / Type",
      cell: ({ row }) => <div className="text-sm text-black">{row.getValue("msg")}</div>,
      enableColumnFilter: true,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge className="mr-2" variant={getStatusBadgeVariant(status)}>
            {status}
          </Badge>
        );
      },
      enableColumnFilter: false,
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        return (
          <div className="flex items-center gap-2">
            {getPriorityIcon(priority)}
            <Badge variant={getPriorityColor(priority)}>{priority}</Badge>
          </div>
        );
      },
      enableColumnFilter: false,
    },
    {
      accessorKey: "comment",
      header: "Comments",
      cell: ({ row }) => (
        <div className="text-sm text-black">{row.getValue("comment")}</div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "create_time",
      header: ({ column }) => <SortHeader column={column} label="Create Time" />,
      cell: ({ row }) => (
        <span className="text-sm text-black">
          {row.getValue("create_time")}
        </span>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "update_time",
      header: ({ column }) => <SortHeader column={column} label="Update Time" />,
      cell: ({ row }) => (
        <span className="text-sm text-black">
          {row.getValue("update_time")}
        </span>
      ),
      enableColumnFilter: true,
    },
  ];
}
