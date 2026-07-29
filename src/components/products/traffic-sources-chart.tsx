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
import * as React from 'react';
import { Pie, PieChart } from 'recharts';

interface TrafficSourcesChartProps {
  sources: Record<string, number>;
  isLoading?: boolean;
}

const chartConfig = {
  value: {
    label: 'Share',
  },
  direct: {
    label: 'Direct',
    color: 'var(--chart-1)',
  },
  search: {
    label: 'Search',
    color: 'var(--chart-2)',
  },
  social: {
    label: 'Social',
    color: 'var(--chart-3)',
  },
  referrals: {
    label: 'Referrals',
    color: 'var(--chart-4)',
  },
  'paid-referrals': {
    label: 'Paid Referrals',
    color: 'var(--chart-5)',
  },
  mail: {
    label: 'Mail',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

// Map source names to chart config keys
const sourceKeyMap: Record<string, keyof typeof chartConfig> = {
  Direct: 'direct',
  Search: 'search',
  Social: 'social',
  Referrals: 'referrals',
  'Paid Referrals': 'paid-referrals',
  Mail: 'mail',
};

export function TrafficSourcesChart({
  sources,
  isLoading = false,
}: TrafficSourcesChartProps) {
  // Transform data for pie chart
  const chartData = React.useMemo(() => {
    return Object.entries(sources)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => {
        const key = sourceKeyMap[name] || 'direct';
        return {
          name,
          key,
          value: value * 100, // Convert to percentage
          fill: `var(--color-${key})`,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [sources]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Traffic Sources</CardTitle>
        <CardDescription>Where visitors come from</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading...</div>
        ) : chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="[&_.recharts-pie-label-text]:fill-foreground mx-auto h-[220px] w-full"
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name, item) => (
                      <>
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: item.payload.fill }}
                        />
                        <div className="flex flex-1 items-center justify-between gap-2">
                          <span className="text-muted-foreground">
                            {chartConfig[
                              item.payload.key as keyof typeof chartConfig
                            ]?.label || name}
                          </span>
                          <span className="text-foreground font-mono font-medium tabular-nums">
                            {Number(value).toFixed(1)}%
                          </span>
                        </div>
                      </>
                    )}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="key"
                cx="50%"
                cy="50%"
                outerRadius={50}
                label={({ name, value }) => `${name} ${value.toFixed(1)}%`}
                labelLine={true}
              />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="text-muted-foreground text-sm">No data available</div>
        )}
      </CardContent>
    </Card>
  );
}
