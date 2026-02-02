import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Landmark, ShieldCheck, ArrowRight, ArrowLeft, Activity } from "lucide-react";
import type { Transaction } from "@/lib/mockData";

interface EntityDetailPanelProps {
  entityName: string;
  isHub: boolean;
  transactions: Transaction[];
}

export function EntityDetailPanel({ entityName, isHub, transactions }: EntityDetailPanelProps) {
  // Filter transactions related to this entity
  const entityTransactions = transactions.filter(t => 
    t.entity === entityName || (isHub && t.entity === 'CCP')
  );

  // Calculate statistics
  const inboundCount = entityTransactions.filter(t => 
    t.direction?.toLowerCase().includes('from_ccp') || 
    t.direction?.toLowerCase().includes('receive')
  ).length;
  
  const outboundCount = entityTransactions.filter(t => 
    t.direction?.toLowerCase().includes('to_ccp') || 
    t.direction?.toLowerCase().includes('send')
  ).length;

  const statusCounts = entityTransactions.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="animate-in fade-in-50 duration-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          {isHub ? (
            <ShieldCheck className="size-8 text-[#002B51]" />
          ) : (
            <Landmark className="size-8 text-black/50" />
          )}
          <div className="flex-1">
            <CardTitle className="text-xl">{entityName}</CardTitle>
            <CardDescription>
              {isHub ? 'Central Clearing House' : 'Market Participant'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Transaction Statistics */}
        <div>
          <h3 className="text-sm font-semibold text-black/75 mb-3 flex items-center gap-2">
            <Activity className="size-4" />
            Transaction Activity
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
              <div className="text-2xl font-bold text-black">{entityTransactions.length}</div>
              <div className="text-xs text-black/75 mt-1">Total</div>
            </div>
            <div className="bg-[#002B51]/5 rounded-lg p-3 text-center border border-[#002B51]/20">
              <div className="text-2xl font-bold text-[#002B51] flex items-center justify-center gap-1">
                <ArrowLeft className="size-4" />
                {inboundCount}
              </div>
              <div className="text-xs text-[#002B51] mt-1">Inbound</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <div className="text-2xl font-bold text-green-700 flex items-center justify-center gap-1">
                {outboundCount}
                <ArrowRight className="size-4" />
              </div>
              <div className="text-xs text-green-600 mt-1">Outbound</div>
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-black/75 mb-3">Status Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                <Badge variant="secondary" className="text-xs">
                  {status}
                </Badge>
                <span className="text-sm font-semibold text-black/75">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <h3 className="text-sm font-semibold text-black/75 mb-3">Recent Transactions</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {entityTransactions.slice(0, 5).map((transaction) => (
              <div 
                key={transaction.trans_id} 
                className="p-2 bg-white rounded border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-black/75">{transaction.trans_id}</span>
                  <Badge variant="secondary" className="text-xs">
                    {transaction.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-black/50">
                  <span className="capitalize">{transaction.type}</span>
                  <span>•</span>
                  <span>Step {transaction.step}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
