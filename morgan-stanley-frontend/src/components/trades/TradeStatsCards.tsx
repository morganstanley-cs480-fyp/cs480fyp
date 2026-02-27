import { Card, CardContent } from "@/components/ui/card";
import type { Trade } from "@/lib/api/types";

interface TradeStatsCardsProps {
  trades: Trade[];
}

export function TradeStatsCards({ trades }: TradeStatsCardsProps) {
  const stats = {
    CLEARED: trades.filter(t => t.status === "CLEARED").length,
    ALLEGED: trades.filter(t => t.status === "ALLEGED").length,
    REJECTED: trades.filter(t => t.status === "REJECTED").length,
    CANCELLED: trades.filter(t => t.status === "CANCELLED").length,
  };

  const cards = [
    {
      status: "CLEARED",
      count: stats.CLEARED,
      label: "Successfully processed",
      dotColor: "bg-green-500",
      textColor: "text-green-600",
    },
    {
      status: "ALLEGED",
      count: stats.ALLEGED,
      label: "Pending confirmation",
      dotColor: "bg-yellow-500",
      textColor: "text-yellow-600",
    },
    {
      status: "REJECTED",
      count: stats.REJECTED,
      label: "Requires attention",
      dotColor: "bg-red-500",
      textColor: "text-red-600",
    },
    {
      status: "CANCELLED",
      count: stats.CANCELLED,
      label: "Voided trades",
      dotColor: "bg-black",
      textColor: "text-black",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.status} className="border border-black/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${card.dotColor}`} />
              <span className="text-xs font-semibold text-black uppercase tracking-wide">
                {card.status}
              </span>
            </div>
            <div className={`text-3xl font-bold ${card.textColor} mb-1`}>
              {card.count.toLocaleString()}
            </div>
            <div className="text-xs text-black/60">{card.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
