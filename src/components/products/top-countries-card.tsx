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
import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';

interface TopCountriesCardProps {
  countries: Record<string, number>;
  isLoading?: boolean;
}

// Chart colors mapped to indices
const chartColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export function TopCountriesCard({
  countries,
  isLoading = false,
}: TopCountriesCardProps) {
  // Transform and sort data for chart
  const { chartData, chartConfig } = React.useMemo(() => {
    const sortedEntries = Object.entries(countries)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // Limit to top 5 countries

    const data = sortedEntries.map(([country, share], index) => ({
      country,
      countryKey: country.toLowerCase().replace(/\s+/g, '-'),
      share: share * 100,
      fill: `var(--color-${country.toLowerCase().replace(/\s+/g, '-')})`,
    }));

    const config: ChartConfig = {
      share: {
        label: 'Share',
      },
      ...Object.fromEntries(
        sortedEntries.map(([country], index) => [
          country.toLowerCase().replace(/\s+/g, '-'),
          {
            label: country,
            color: chartColors[index % chartColors.length],
          },
        ])
      ),
    };

    return { chartData: data, chartConfig: config };
  }, [countries]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Top Countries</CardTitle>
        <CardDescription>Geographic distribution</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading...</div>
        ) : chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[180px]">
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 0 }}
              barSize={20}
            >
              <YAxis
                dataKey="country"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                width={40}
              />
              <XAxis dataKey="share" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => `${Number(value).toFixed(1)}%`}
                    nameKey="country"
                  />
                }
              />
              <Bar dataKey="share" layout="vertical" radius={5}>
                <LabelList
                  dataKey="share"
                  position="right"
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  className="fill-foreground text-xs"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="text-muted-foreground text-sm">No data available</div>
        )}
      </CardContent>
    </Card>
  );
}
