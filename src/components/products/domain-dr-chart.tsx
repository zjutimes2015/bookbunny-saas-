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
import { useIsMobile } from '@/hooks/use-mobile';
import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

interface DomainDrChartProps {
  data: Array<{ date: string; value: number | null }>;
  isLoading?: boolean;
}

const chartConfig = {
  value: {
    label: 'Domain Rating',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export function DomainDrChart({ data, isLoading = false }: DomainDrChartProps) {
  const isMobile = useIsMobile();

  // Process data
  const chartData = data.map((item) => ({
    date: item.date,
    value: item.value ?? 0,
  }));

  // Filter data based on screen size
  const filteredData = React.useMemo(() => {
    if (isMobile) {
      // Show last 3 months on mobile
      return chartData.slice(-3);
    }
    return chartData;
  }, [chartData, isMobile]);

  const gradientId = 'fill-domain-rating-trend';

  // Format value
  const formatValue = (value: number): string => {
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Domain Rating Trend
        </CardTitle>
        <CardDescription>Historical domain rating changes</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center">
            <div className="text-muted-foreground">No data available</div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-value)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-value)"
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
                defaultIndex={
                  isMobile ? -1 : Math.floor(filteredData.length / 2)
                }
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });
                    }}
                    formatter={(value) => [formatValue(Number(value)), '']}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="value"
                type="natural"
                fill={`url(#${gradientId})`}
                stroke="var(--color-value)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
