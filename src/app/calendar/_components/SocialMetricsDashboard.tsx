
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getSocialMetrics } from '../actions';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users, Eye } from 'lucide-react';

type MetricsData = Awaited<ReturnType<typeof getSocialMetrics>>;

const chartConfig = {
  engagement: {
    label: "Engagement",
    color: "hsl(var(--primary))",
  },
  reach: {
    label: "Reach",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

export function SocialMetricsDashboard() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSocialMetrics()
      .then(data => setMetrics(data))
      .catch(err => console.error("Failed to fetch social metrics:", err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
      </div>
    );
  }

  if (!metrics) {
    return <p>Could not load social metrics.</p>;
  }

  return (
    <div className="space-y-8">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.kpis.totalEngagement.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">{metrics.kpis.engagementChange}% from last month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.kpis.totalReach.toLocaleString()}</div>
                     <p className="text-xs text-muted-foreground">{metrics.kpis.reachChange}% from last month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.kpis.totalImpressions.toLocaleString()}</div>
                     <p className="text-xs text-muted-foreground">{metrics.kpis.impressionsChange}% from last month</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Engagement Over Time</CardTitle>
                <CardDescription>Shows total likes, comments, and shares per day.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-80">
                     <LineChart data={metrics.engagementOverTime}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line type="monotone" dataKey="engagement" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Recent Post Performance</CardTitle>
                <CardDescription>Comparison of reach and engagement for your last 5 posts.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={chartConfig} className="h-96">
                    <BarChart data={metrics.recentPostPerformance}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="reach" fill="hsl(var(--accent))" radius={4} />
                        <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    </div>
  );
}
