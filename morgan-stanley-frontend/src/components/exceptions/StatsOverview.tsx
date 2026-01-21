// Simple exception statistics dashboard

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  return (
    <div className="grid grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-600">
            Pending Exceptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-600">
            High Priority
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl text-red-600">{stats.high}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-600">
            Medium Priority
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl text-orange-600">{stats.medium}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-600">
            Low Priority
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl text-yellow-600">{stats.low}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-600">
            Closed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl text-slate-600">{stats.closed}</div>
        </CardContent>
      </Card>
    </div>
  );
}
