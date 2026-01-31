"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Trophy } from "lucide-react";

export function GoalProgressChart() {
  const { data, isLoading } = trpc.analytics.getGoalProgressStats.useQuery();

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  const AnnualView = () => (
    <div className="space-y-6 pt-4">
      {data?.annualGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed rounded-lg">
          <Trophy className="h-8 w-8 mb-2 opacity-50" />
          <p>No active annual goals found.</p>
        </div>
      ) : (
        data?.annualGoals.map((goal, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate max-w-[180px]">
                  {goal.title}
                </span>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                  {goal.category}
                </Badge>
              </div>
              <span className="font-mono text-xs">{goal.progress}%</span>
            </div>
            <Progress value={goal.progress} className="h-2" />
          </div>
        ))
      )}
    </div>
  );

  const QuarterlyView = () => (
    <div className="space-y-6 pt-4">
      {data?.quarterFocuses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed rounded-lg">
          <Target className="h-8 w-8 mb-2 opacity-50" />
          <p>No quarterly focuses linked yet.</p>
        </div>
      ) : (
        data?.quarterFocuses.map((focus, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate max-w-[180px]">
                  {focus.title}
                </span>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {focus.category}
                </Badge>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {focus.progress}%
              </span>
            </div>
            {/* Use different color for quarterly to differentiate */}
            <Progress
              value={focus.progress}
              className="h-2"
              indicatorClassName="bg-indigo-500"
            />
          </div>
        ))
      )}
    </div>
  );

  return (
    <Card className="h-full border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" />
          Goal Alignment
        </CardTitle>
        <CardDescription>
          Tracking against big picture objectives
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="quarter" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quarter">This Quarter</TabsTrigger>
            <TabsTrigger value="annual">Annual Goals</TabsTrigger>
          </TabsList>
          <TabsContent value="quarter">
            <QuarterlyView />
          </TabsContent>
          <TabsContent value="annual">
            <AnnualView />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
