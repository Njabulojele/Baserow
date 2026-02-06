"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Heart,
  ArrowUp,
  ArrowDown,
  Minus,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ClientHealthView() {
  const { data: summary, isLoading: summaryLoading } =
    trpc.clientHealth.getSummary.useQuery();

  const { data: atRiskClients, isLoading: atRiskLoading } =
    trpc.clientHealth.listAtRisk.useQuery();

  const { data: expansionOpportunities, isLoading: expansionLoading } =
    trpc.clientHealth.listExpansionOpportunities.useQuery();

  const utils = trpc.useUtils();

  const calculateMutation = trpc.clientHealth.calculate.useMutation({
    onSuccess: () => {
      toast.success("Health score updated");
      utils.clientHealth.getSummary.invalidate();
      utils.clientHealth.listAtRisk.invalidate();
      utils.clientHealth.listExpansionOpportunities.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleRecalculate = (clientId: string) => {
    calculateMutation.mutate({ clientId });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case "declining":
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isLoading = summaryLoading || atRiskLoading || expansionLoading;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Health
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    getScoreColor(summary?.averageScore ?? 0),
                  )}
                >
                  {summary?.averageScore ?? 0}
                </div>
                <Progress
                  value={summary?.averageScore ?? 0}
                  className={cn("h-1 mt-2")}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Healthy Clients
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-500">
                  {summary?.healthyCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Score above 70</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Needs Attention
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-500">
                  {summary?.needsAttentionCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Score 40-70</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-500">
                  {summary?.atRiskCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Churn risk &gt; 50%
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* At Risk Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              At-Risk Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRiskLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : atRiskClients?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No clients at risk! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {atRiskClients?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{item.client.name}</p>
                      {item.client.companyName && (
                        <p className="text-xs text-muted-foreground">
                          {item.client.companyName}
                        </p>
                      )}
                      {item.churnRiskReason && (
                        <Badge variant="destructive" className="text-xs">
                          {item.churnRiskReason}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div
                          className={cn(
                            "text-lg font-bold",
                            getScoreColor(item.overallScore),
                          )}
                        >
                          {Math.round(item.overallScore)}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                          {getTrendIcon(item.trend)}
                          {Math.round(item.churnRisk * 100)}% risk
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRecalculate(item.clientId)}
                        disabled={calculateMutation.isPending}
                      >
                        <RefreshCw
                          className={cn(
                            "h-4 w-4",
                            calculateMutation.isPending && "animate-spin",
                          )}
                        />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expansion Opportunities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Expansion Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expansionLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : expansionOpportunities?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2" />
                <p>No expansion opportunities identified yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expansionOpportunities?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{item.client.name}</p>
                      {item.client.companyName && (
                        <p className="text-xs text-muted-foreground">
                          {item.client.companyName}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <DollarSign className="h-3 w-3" />$
                        {item.client.lifetimeValue?.toLocaleString() || 0} LTV
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-500">
                          {Math.round(item.expansionPotential * 100)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          potential
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRecalculate(item.clientId)}
                        disabled={calculateMutation.isPending}
                      >
                        <RefreshCw
                          className={cn(
                            "h-4 w-4",
                            calculateMutation.isPending && "animate-spin",
                          )}
                        />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
