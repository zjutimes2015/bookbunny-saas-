'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatTraffic } from '@/lib/formatter';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

interface DomainTrafficChartProps {
  data: Array<{ date: string; value: number }>;
  isLoading?: boolean;
}

const chartConfig = {
  traffic: {
    label: 'Traffic',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export function DomainTrafficChart({
  data,
  isLoading = false,
}: DomainTrafficChartProps) {
  // Process data for chart
  const processedData = data.map((item) => ({
    date: item.date,
    traffic: item.value,
  }));

  const gradientId = 'fill-traffic-trend';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Traffic Trend</CardTitle>
        <CardDescription>Last 3 Months Traffic</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center">
            <div className="text-muted-foreground">No data available</div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={processedData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-traffic)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-traffic)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                defaultIndex={Math.floor(processedData.length / 2)}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                    }}
                    formatter={(value) => [formatTraffic(Number(value)), '']}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="traffic"
                type="natural"
                fill={`url(#${gradientId})`}
                stroke="var(--color-traffic)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
