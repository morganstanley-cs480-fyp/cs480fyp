// Column definitions hook

import { ArrowUpDown } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Exception } from "@/lib/mockData";

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
  return [
    {
      accessorKey: "exception_id",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Exception ID
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium text-slate-900">
          {row.getValue("exception_id")}
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "trade_id",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Trade ID
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium text-slate-900">
          {row.getValue("trade_id")}
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "msg",
      header: "Exception Message / Type",
      cell: ({ row }) => <div className="text-sm">{row.getValue("msg")}</div>,
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
        <div className="text-sm text-slate-600">{row.getValue("comment")}</div>
      ),
      enableColumnFilter: true,
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
            <ArrowUpDown className="size-4 ml-2" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm text-slate-600">
          {row.getValue("create_time")}
        </div>
      ),
      enableColumnFilter: true,
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
        <div className="text-sm text-slate-600">
          {row.getValue("update_time")}
        </div>
      ),
      enableColumnFilter: true,
    },
  ];
}
