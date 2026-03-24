// Simple exception statistics dashboard

import { Card, CardContent } from "@/components/ui/card";

export interface ExceptionStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  closed: number;
}

export type StatsCardKey = "pending" | "critical" | "high" | "medium" | "low" | "closed";

interface StatsOverviewProps {
  stats: ExceptionStats;
  activeCards?: StatsCardKey[];
  onCardClick?: (card: StatsCardKey) => void;
}

export function StatsOverview({ stats, activeCards = [], onCardClick }: StatsOverviewProps) {
  const cards = [
    { key: "pending" as const, label: "Pending Exceptions", value: stats.total, valueColor: "text-black", dotColor: "bg-[#002B51]", sub: "Awaiting resolution" },
    { key: "critical" as const, label: "Critical Priority", value: stats.critical, valueColor: "text-red-600", dotColor: "bg-red-600", sub: "Requires urgent attention" },
    { key: "high" as const, label: "High Priority", value: stats.high, valueColor: "text-orange-500", dotColor: "bg-orange-500", sub: "Resolve as soon as possible" },
    { key: "medium" as const, label: "Medium Priority", value: stats.medium, valueColor: "text-yellow-600", dotColor: "bg-yellow-500", sub: "Action recommended" },
    { key: "low" as const, label: "Low Priority", value: stats.low, valueColor: "text-blue-600", dotColor: "bg-blue-500", sub: "Monitor as needed" },
    { key: "closed" as const, label: "Closed", value: stats.closed, valueColor: "text-black/50", dotColor: "bg-black/30", sub: "Successfully resolved" },
  ];

  return (
    <div className="grid grid-cols-6 gap-4">
      {cards.map((card) => (
        <button
          key={card.label}
          type="button"
          onClick={() => onCardClick?.(card.key)}
          className="w-full text-left"
        >
          <Card
            className={`hover:shadow-md transition-shadow cursor-pointer ${
              activeCards.includes(card.key) ? "ring-2 ring-[#002B51]/25 border-[#002B51]/35" : ""
            }`}
          >
            <CardContent className="pt-4 pb-4 px-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${card.dotColor}`} />
                <span className="text-xs font-semibold text-black/50 uppercase tracking-wider">{card.label}</span>
              </div>
              <div className={`text-3xl font-bold font-mono tracking-tight ${card.valueColor}`}>{card.value}</div>
              <div className="text-xs text-black/40 mt-1">{card.sub}</div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
