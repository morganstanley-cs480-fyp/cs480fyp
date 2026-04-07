// Exception details as a left-side panel

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Exception } from "@/lib/api/types";
import { getExceptionStatusClassName, getPriorityBadgeClassName } from "@/lib/tradeDetailUtils";
import type { ReactNode } from "react";

interface ExceptionDetailSidebarProps {
  exception: Exception;
  getPriorityColor: (priority: string) => "default" | "destructive" | "secondary";
  children?: ReactNode;
}

export function ExceptionDetailSidebar({ exception, getPriorityColor, children }: ExceptionDetailSidebarProps) {
  return (
    <div className="w-full xl:w-100 shrink-0">
      <Card className="h-fit sticky top-6">
        <CardHeader>
          <CardTitle className="text-md">Exception Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs font-semibold text-black/60 uppercase tracking-wide">Exception</p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-black/75 mb-1">Exception ID</p>
                <p className="font-medium text-black">{exception.id}</p>
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
                <p className="font-medium text-black wrap-break-word">{exception.msg}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-black/75 mb-1">Priority</p>
                  <Badge variant={getPriorityColor(exception.priority)} className={getPriorityBadgeClassName(exception.priority)}>
                    {exception.priority}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm text-black/75 mb-1">Status</p>
                  <Badge variant="secondary" className={getExceptionStatusClassName(exception.status)}>
                    {exception.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-black/75 mb-1">Exception Time</p>
                <p className="text-sm text-black break-all">{exception.create_time}</p>
              </div>

              <div>
                <p className="text-sm text-black/75 mb-1">Update Time</p>
                <p className="text-sm text-black break-all">{exception.update_time}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-black/75 mb-1">Comments</p>
                <p className="text-sm text-black wrap-break-word whitespace-pre-wrap">{exception.comment}</p>
              </div>
            </div>
          </div>

          {children ? (
            <>
              <Separator />
              {children}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
