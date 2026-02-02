// Exception details as a left-side panel

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Exception } from "@/lib/mockData";

interface ExceptionDetailSidebarProps {
  exception: Exception;
  getPriorityColor: (priority: string) => "default" | "destructive" | "secondary";
}

export function ExceptionDetailSidebar({ exception, getPriorityColor }: ExceptionDetailSidebarProps) {
  return (
    <div className="w-[280px] shrink-0">
      <Card className="h-fit sticky top-6">
        <CardHeader>
          <CardTitle className="text-lg">Exception Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-black/75 mb-1">Exception ID</p>
            <p className="font-medium text-black">{exception.exception_id}</p>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-black/75 mb-1">Trade ID</p>
            <p className="font-medium text-black">{exception.trade_id}</p>
          </div>

          <div>
            <p className="text-sm text-black/75 mb-1">Transaction ID</p>
            <p className="font-medium text-black">{exception.trans_id}</p>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-black/75 mb-1">Exception Type</p>
            <p className="font-medium text-black">{exception.msg}</p>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-black/75 mb-1">Priority</p>
            <Badge variant={getPriorityColor(exception.priority)}>
              {exception.priority}
            </Badge>
          </div>

          <div>
            <p className="text-sm text-black/75 mb-1">Status</p>
            <Badge variant={exception.status === 'CLOSED' ? 'default' : 'secondary'}>
              {exception.status}
            </Badge>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-black/75 mb-1">Comments</p>
            <p className="text-sm text-black">{exception.comment}</p>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-black/75 mb-1">Exception Time</p>
            <p className="text-sm text-black">{exception.create_time}</p>
          </div>

          <div>
            <p className="text-sm text-black/75 mb-1">Last Update</p>
            <p className="text-sm text-black">{exception.update_time}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
