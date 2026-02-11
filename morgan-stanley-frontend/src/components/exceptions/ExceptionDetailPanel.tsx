// Side panel details when you click on an Exception from the table

import { CheckCircle, XCircle, Eye, Check } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Exception } from "@/lib/mockData";

interface ExceptionDetailPanelProps {
  exception: Exception | null;
  onClose: () => void;
  getPriorityColor: (priority: string) => "destructive" | "default" | "secondary";
}

export function ExceptionDetailPanel({
  exception,
  onClose,
  getPriorityColor,
}: ExceptionDetailPanelProps) {
  const navigate = useNavigate();

  if (!exception) return null;

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Exception Details</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <XCircle className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-black/75 mb-1">
              Exception ID
            </p>
            <p className="text-black">
              {exception.exception_id}
            </p>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-black/75 mb-1">Trade ID</p>
            <p className="text-black">
              {exception.trade_id}
            </p>
          </div>

          <div>
            <p className="text-sm text-black/75 mb-1">
              Transaction ID
            </p>
            <p className="text-black">
              {exception.trans_id}
            </p>
          </div>

          <div>
            <p className="text-sm text-black/75 mb-1">
              Exception Message
            </p>
            <p className="text-black">{exception.msg}</p>
          </div>

          <div>
            <p className="text-sm text-black/75 mb-1">Priority</p>
            <Badge
              variant={getPriorityColor(exception.priority)}
            >
              {exception.priority}
            </Badge>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-black/75 mb-1">Comments</p>
            <p className="text-sm text-black">
              {exception.comment}
            </p>
          </div>

          <div>
            <p className="text-sm text-black/75 mb-1">
              Exception Time
            </p>
            <p className="text-sm text-black">
              {exception.create_time}
            </p>
          </div>

          <div>
            <p className="text-sm text-black/75 mb-1">Last Update</p>
            <p className="text-sm text-black">
              {exception.update_time}
            </p>
          </div>

          <Separator />

          {exception.status === "PENDING" && (
            <>
              <Button
                variant="outline"
                className="w-full mb-2"
                onClick={() =>
                  navigate({
                    to: "/trades/$tradeId",
                    params: { tradeId: exception.trade_id.toString() },
                  })
                }
              >
                <Eye className="size-4 mr-2" />
                View Associated Trade
              </Button>
              <Button
                className="w-full"
                onClick={() =>
                  navigate({
                    to: "/exceptions/$exceptionId",
                    params: { exceptionId: exception.exception_id.toString() },
                  })
                }
              >
                <Check className="size-4 mr-2" />
                Resolve Exception
              </Button>
            </>
          )}

          {exception.status === "CLOSED" && (
            <Badge
              className="w-full justify-center py-2"
              variant="default"
            >
              <CheckCircle className="size-4 mr-2" />
              Closed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
