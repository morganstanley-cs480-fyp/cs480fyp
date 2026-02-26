// Simple exception statistics dashboard

import { Card, CardContent } from "@/components/ui/card";

export interface ExceptionStats {
  total: number;
  high: number;
  medium: number;
  low: number;
  closed: number;
}

interface StatsOverviewProps {
  stats: ExceptionStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const cards = [
    { label: "Pending Exceptions", value: stats.total,  valueColor: "text-black",        dotColor: "bg-[#002B51]",   sub: "Awaiting resolution" },
    { label: "High Priority",      value: stats.high,   valueColor: "text-red-600",       dotColor: "bg-red-600",     sub: "Requires urgent attention" },
    { label: "Medium Priority",    value: stats.medium, valueColor: "text-orange-500",    dotColor: "bg-orange-500",  sub: "Action recommended" },
    { label: "Low Priority",       value: stats.low,    valueColor: "text-yellow-600",    dotColor: "bg-yellow-500",  sub: "Monitor as needed" },
    { label: "Closed",             value: stats.closed, valueColor: "text-black/50",      dotColor: "bg-black/30",    sub: "Successfully resolved" },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-4 px-5">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${card.dotColor}`} />
              <span className="text-xs font-semibold text-black/50 uppercase tracking-wider">{card.label}</span>
            </div>
            <div className={`text-3xl font-bold font-mono tracking-tight ${card.valueColor}`}>{card.value}</div>
            <div className="text-xs text-black/40 mt-1">{card.sub}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
